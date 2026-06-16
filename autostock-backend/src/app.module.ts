import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AccountingModule } from './accounting/accounting.module';
import { AuthModule } from './auth/auth.module';
import { BackupModule } from './backup/backup.module';
import { CashModule } from './cash/cash.module';
import { CategoriesModule } from './categories/categories.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { CustomersModule } from './customers/customers.module';
import { InventoryModule } from './inventory/inventory.module';
import { LocationsModule } from './locations/locations.module';
import { ProductsModule } from './products/products.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { SalesModule } from './sales/sales.module';
import { SyncModule } from './sync/sync.module';
import { TelegramModule } from './telegram/telegram.module';
import { ActivityLogModule } from './activity-log/activity-log.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    CustomersModule,
    PurchasingModule,
    InventoryModule,
    LocationsModule,
    SalesModule,
    AccountingModule,
    CashModule,
    ExpensesModule,
    ReceiptsModule,
    ReportsModule,
    SettingsModule,
    TelegramModule,
    BackupModule,
    SyncModule,
    AdminModule,
    ActivityLogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
