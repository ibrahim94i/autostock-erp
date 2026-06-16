import { Module } from '@nestjs/common';
import { EventCoreService } from './event-core.service';
import { AccountingHandler } from './handlers/accounting.handler';
import { StockHandler } from './handlers/stock.handler';

@Module({
  providers: [
    EventCoreService,
    { provide: StockHandler, useFactory: () => new StockHandler() },
    { provide: AccountingHandler, useFactory: () => new AccountingHandler() },
  ],
  exports: [EventCoreService, StockHandler, AccountingHandler],
})
export class EventsModule {}
