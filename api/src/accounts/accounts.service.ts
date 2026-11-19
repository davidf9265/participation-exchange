import { Injectable } from '@nestjs/common';
import type { CreditUnion, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VIEWER_CU_ID } from '../viewer';

/** Thin access layer over CreditUnion. No business logic lives here. */
@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pass a transaction client (`tx`) when the lookup must be part of a
   * larger unit of work; otherwise the global client is used.
   */
  findById(
    id: string,
    db: Pick<Prisma.TransactionClient, 'creditUnion'> = this.prisma,
  ): Promise<CreditUnion | null> {
    return db.creditUnion.findUnique({ where: { id } });
  }

  /** The credit union acting in this request (see api/src/viewer.ts). */
  async getViewer(
    db: Pick<Prisma.TransactionClient, 'creditUnion'> = this.prisma,
  ): Promise<CreditUnion> {
    const viewer = await this.findById(VIEWER_CU_ID, db);
    if (!viewer) {
      throw new Error(`Viewer credit union ${VIEWER_CU_ID} does not exist; run the seed.`);
    }
    return viewer;
  }
}
