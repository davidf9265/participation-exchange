import { Module } from '@nestjs/common';
import { ListingsModule } from './listings/listings.module';
import { PortfolioModule } from './portfolio/portfolio.module';

@Module({
  imports: [ListingsModule, PortfolioModule],
})
export class AppModule {}
