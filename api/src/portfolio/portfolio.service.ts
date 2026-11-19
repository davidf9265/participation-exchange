import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VIEWER_CU_ID } from '../viewer';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.participation.findMany({
      where: { buyerCuId: VIEWER_CU_ID },
      include: { listing: { include: { sellerCu: true } } },
      orderBy: { purchasedAt: 'desc' },
    });
  }
}
