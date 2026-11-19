import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListingQueryDto } from './dto/listing-query.dto';

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: ListingQueryDto) {
    const where: Prisma.ListingWhereInput = { status: 'OPEN' };

    if (query.grade) {
      where.riskGrade = query.grade;
    }
    if (query.minYield !== undefined) {
      where.yieldRate = { gte: query.minYield };
    }
    if (query.maxTermMonths !== undefined) {
      where.termMonths = { lte: query.maxTermMonths };
    }

    return this.prisma.listing.findMany({
      where,
      include: { sellerCu: true },
      orderBy: [{ yieldRate: 'desc' }, { reference: 'asc' }],
    });
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { sellerCu: true },
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${id} not found`);
    }

    return listing;
  }
}
