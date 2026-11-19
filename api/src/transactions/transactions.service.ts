import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Minimum purchase amount (open question 1 in the spec, not decided yet).
 * Set it to a Decimal to enforce it; null disables the check.
 */
const MIN_PURCHASE_AMOUNT: Prisma.Decimal | null = null;

/** Retries after the first attempt, for deadlocks, serialization failures and transaction timeouts. */
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 25;

/**
 * Transient failures: P2034 (write conflict / deadlock), P2028 (transaction
 * timeout or maxWait exceeded), the raw Postgres SQLSTATEs behind P2034, and
 * 55P03 (lock_not_available, raised when LOCK_TIMEOUT expires).
 */
const RETRYABLE_CODES = new Set(['P2034', 'P2028', '40001', '40P01', '55P03']);

const TX_OPTIONS = {
  maxWait: 5_000,
  timeout: 10_000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
};

/**
 * Longest a statement waits for a row lock inside the transaction. Prisma's
 * transaction timeout does not cancel a statement already blocked on a lock,
 * so Postgres must cut the wait itself. Keep it well below TX_OPTIONS.timeout.
 * Worst case is MAX_RETRIES + 1 attempts x this value, plus backoff.
 */
const LOCK_TIMEOUT = '2s';

const PARTICIPATION_INCLUDE = {
  listing: { include: { sellerCu: true } },
} satisfies Prisma.ParticipationInclude;

export type ParticipationWithListing = Prisma.ParticipationGetPayload<{
  include: typeof PARTICIPATION_INCLUDE;
}>;

export type PurchaseResult = {
  participation: ParticipationWithListing;
  /** True when the Idempotency-Key was already used and nothing was written. */
  replayed: boolean;
};

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  /**
   * Buys `amount` of a listing on behalf of the viewer. `amount` must already
   * be a validated decimal string (see CreateParticipationDto). `idempotencyKey`
   * must already be validated and normalized to lowercase (see the controller).
   */
  async purchase(
    listingId: string,
    amountInput: string,
    idempotencyKey: string,
  ): Promise<PurchaseResult> {
    const amount = new Prisma.Decimal(amountInput);

    try {
      return await this.withConflictRetry(() =>
        this.prisma.$transaction(
          (tx) => this.executePurchase(tx, listingId, amount, idempotencyKey),
          TX_OPTIONS,
        ),
      );
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      // A concurrent request with the same key committed first. Our transaction
      // has already rolled back, so the winning row is read outside of it.
      return this.replayAfterConflict(listingId, amount, idempotencyKey);
    }
  }

  private async executePurchase(
    tx: Prisma.TransactionClient,
    listingId: string,
    amount: Prisma.Decimal,
    idempotencyKey: string,
  ): Promise<PurchaseResult> {
    // 0. Bound the row-lock wait (see LOCK_TIMEOUT). Must be the first statement
    //    of the transaction. Constant value, no user input.
    await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${LOCK_TIMEOUT}'`);

    // 1. Buyer: always the viewer's credit union, never taken from the client.
    const buyer = await this.accounts.getViewer(tx);

    // 2. Idempotency shortcut. The unique index is the real guarantee.
    const previous = await this.findReplay(tx, buyer.id, listingId, amount, idempotencyKey);
    if (previous) {
      return previous;
    }

    // 3. Listing.
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException(`Listing ${listingId} not found`);
    }

    // 4. Business rules. These reads are advisory: the conditional update in
    //    step 5 is what actually enforces availability under concurrency.
    //    A same-key winner may have committed after step 2 and funded the
    //    listing, so each rejection first re-checks the stored key.
    if (listing.status !== 'OPEN') {
      const replay = await this.findReplay(tx, buyer.id, listingId, amount, idempotencyKey);
      if (replay) return replay;
      throw new ConflictException(`Listing ${listingId} is not open for purchase`);
    }
    if (listing.sellerCuId === buyer.id) {
      throw new UnprocessableEntityException('A credit union cannot buy its own listing');
    }
    if (MIN_PURCHASE_AMOUNT && amount.lt(MIN_PURCHASE_AMOUNT)) {
      throw new UnprocessableEntityException(
        `Minimum purchase amount is ${MIN_PURCHASE_AMOUNT.toFixed(2)}`,
      );
    }
    if (amount.gt(listing.remainingAmount)) {
      const replay = await this.findReplay(tx, buyer.id, listingId, amount, idempotencyKey);
      if (replay) return replay;
      throw new UnprocessableEntityException(
        `Amount exceeds the remaining ${listing.remainingAmount.toFixed(2)} of this listing`,
      );
    }

    // 5. Conditional decrement. Takes the row lock until commit, so a concurrent
    //    purchase either runs first or sees the new remainingAmount.
    // updatedAt is set explicitly in every updateMany below, so each balance change is stamped.
    const decremented = await tx.listing.updateMany({
      where: { id: listingId, status: 'OPEN', remainingAmount: { gte: amount } },
      data: { remainingAmount: { decrement: amount }, updatedAt: new Date() },
    });
    if (decremented.count === 0) {
      // Either the listing changed, or a concurrent request with the same key
      // committed while we waited for the row lock. A new statement sees that
      // committed row under ReadCommitted, so check for it before failing.
      const replay = await this.findReplay(tx, buyer.id, listingId, amount, idempotencyKey);
      if (replay) return replay;
      throw new ConflictException(
        'The listing was bought or changed by another purchase; refresh and try again',
      );
    }

    // 6. Participation, stored with its idempotency key. A duplicate key raises
    //    P2002 here and is handled outside the transaction.
    //    yieldRate and termMonths are a snapshot of the listing's terms at purchase
    //    time (listing read in step 3, inside this same transaction).
    const participation = await tx.participation.create({
      data: {
        listingId,
        buyerCuId: buyer.id,
        amount,
        idempotencyKey,
        yieldRate: listing.yieldRate,
        termMonths: listing.termMonths,
      },
    });

    // 7. FUNDED when the balance reaches zero. Conditional on the stored value.
    await tx.listing.updateMany({
      where: { id: listingId, remainingAmount: 0 },
      data: { status: 'FUNDED', updatedAt: new Date() },
    });

    // 8. Final verification inside the transaction. Any mismatch rolls back.
    const after = await tx.listing.findUniqueOrThrow({ where: { id: listingId } });
    const sold = await tx.participation.aggregate({
      where: { listingId },
      _sum: { amount: true },
    });
    const soldTotal = sold._sum.amount ?? new Prisma.Decimal(0);
    const balanced = after.remainingAmount.eq(after.principalAmount.minus(soldTotal));
    const statusMatches = !after.remainingAmount.isZero() || after.status === 'FUNDED';
    if (!balanced || !after.remainingAmount.gte(0) || !statusMatches) {
      this.logger.error(
        `CRITICAL: listing ${listingId} failed final verification after purchase; rolling back`,
      );
      throw new InternalServerErrorException('Purchase could not be verified and was rolled back');
    }

    // 9. Re-read after the FUNDED update, so the body shows the listing's final
    //    status (the create above was made before that update). Same shape as /portfolio.
    const final = await tx.participation.findUniqueOrThrow({
      where: { id: participation.id },
      include: PARTICIPATION_INCLUDE,
    });
    return { participation: final, replayed: false };
  }

  /**
   * Returns the stored purchase for this buyer and key as a replay, or null when
   * the key is unused. Replays return the current state of the listing, not the
   * state at the time of the original purchase.
   */
  private async findReplay(
    tx: Prisma.TransactionClient,
    buyerCuId: string,
    listingId: string,
    amount: Prisma.Decimal,
    idempotencyKey: string,
  ): Promise<PurchaseResult | null> {
    const stored = await tx.participation.findUnique({
      where: { buyerCuId_idempotencyKey: { buyerCuId, idempotencyKey } },
      include: PARTICIPATION_INCLUDE,
    });
    if (!stored) {
      return null;
    }
    return { participation: assertSamePayload(stored, listingId, amount), replayed: true };
  }

  private async replayAfterConflict(
    listingId: string,
    amount: Prisma.Decimal,
    idempotencyKey: string,
  ): Promise<PurchaseResult> {
    const buyer = await this.accounts.getViewer();
    const winner = await this.prisma.participation.findUnique({
      where: { buyerCuId_idempotencyKey: { buyerCuId: buyer.id, idempotencyKey } },
      include: PARTICIPATION_INCLUDE,
    });
    if (!winner) {
      throw new InternalServerErrorException('Idempotency conflict without a stored purchase');
    }
    return { participation: assertSamePayload(winner, listingId, amount), replayed: true };
  }

  /** Retries the whole transaction on deadlock, serialization or timeout conflicts. */
  private async withConflictRetry<T>(run: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await run();
      } catch (error) {
        if (!isRetryableConflict(error)) {
          throw error;
        }
        if (attempt >= MAX_RETRIES) {
          this.logger.warn(`Purchase gave up after ${attempt + 1} conflicting attempts`);
          throw new ServiceUnavailableException('Purchase conflicted with another write; retry later');
        }
        const jitter = Math.random() * RETRY_BASE_MS;
        await sleep(RETRY_BASE_MS * 2 ** attempt + jitter);
      }
    }
  }
}

/** A reused key must carry the same listing and amount as the stored purchase. */
function assertSamePayload(
  stored: ParticipationWithListing,
  listingId: string,
  amount: Prisma.Decimal,
): ParticipationWithListing {
  if (stored.listingId !== listingId || !stored.amount.eq(amount)) {
    throw new UnprocessableEntityException(
      'Idempotency-Key was already used for a different listing or amount',
    );
  }
  return stored;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function isRetryableConflict(error: unknown): boolean {
  return collectErrorCodes(error).some((code) => RETRYABLE_CODES.has(code));
}

/**
 * Prisma wraps driver errors; the SQLSTATE can sit in several nested fields.
 * Observed for a LOCK_TIMEOUT (55P03) with Prisma 7 + adapter-pg: the top-level
 * code is P2039, and the SQLSTATE is at meta.driverAdapterError.cause.code and
 * cause.originalCode (depth 3, the limit below).
 */
function collectErrorCodes(value: unknown, depth = 0): string[] {
  if (typeof value !== 'object' || value === null || depth > 3) {
    return [];
  }
  const fields = value as Record<string, unknown>;
  const codes: string[] = [];
  for (const key of ['code', 'originalCode']) {
    const found = fields[key];
    if (typeof found === 'string') {
      codes.push(found);
    }
  }
  for (const key of ['cause', 'meta', 'driverAdapterError']) {
    codes.push(...collectErrorCodes(fields[key], depth + 1));
  }
  return codes;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
