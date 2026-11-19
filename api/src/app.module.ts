import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { ListingsModule } from './listings/listings.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [AccountsModule, ListingsModule, PortfolioModule, TransactionsModule],
})
export class AppModule {}
