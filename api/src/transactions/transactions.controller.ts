import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { CreateParticipationDto } from './dto/create-participation.dto';
import { TransactionsService } from './transactions.service';

/** The subset of the Express response this controller uses (no @types/express here). */
type ResponseLike = {
  status(code: number): ResponseLike;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
};

/** Declared here, not on ListingsController, to avoid a circular import. */
@Controller('listings/:listingId/participations')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Uses @Res() instead of passthrough: with passthrough Nest forces 201 for
   * POST after the handler runs, which would overwrite the 200 of a replay.
   */
  @Post()
  async create(
    @Param('listingId') listingId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: CreateParticipationDto,
    @Res() res: ResponseLike,
  ): Promise<void> {
    if (!idempotencyKey || !isUUID(idempotencyKey, '4')) {
      throw new BadRequestException('Idempotency-Key header is required and must be a UUID v4');
    }
    // UUIDs are case-insensitive: store and compare one canonical (lowercase) form.
    const key = idempotencyKey.toLowerCase();

    try {
      const result = await this.transactionsService.purchase(listingId, body.amount, key);
      if (result.replayed) {
        res.setHeader('Idempotent-Replay', 'true');
        res.status(200).json(result.participation);
      } else {
        res.status(201).json(result.participation);
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        res.setHeader('Retry-After', '1');
      }
      throw error;
    }
  }
}
