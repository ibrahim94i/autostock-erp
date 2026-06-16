"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const admin_module_1 = require("./admin/admin.module");
const accounting_module_1 = require("./accounting/accounting.module");
const auth_module_1 = require("./auth/auth.module");
const backup_module_1 = require("./backup/backup.module");
const cash_module_1 = require("./cash/cash.module");
const categories_module_1 = require("./categories/categories.module");
const expenses_module_1 = require("./expenses/expenses.module");
const prisma_module_1 = require("./common/prisma/prisma.module");
const customers_module_1 = require("./customers/customers.module");
const inventory_module_1 = require("./inventory/inventory.module");
const locations_module_1 = require("./locations/locations.module");
const products_module_1 = require("./products/products.module");
const purchasing_module_1 = require("./purchasing/purchasing.module");
const receipts_module_1 = require("./receipts/receipts.module");
const reports_module_1 = require("./reports/reports.module");
const settings_module_1 = require("./settings/settings.module");
const sales_module_1 = require("./sales/sales.module");
const sync_module_1 = require("./sync/sync.module");
const telegram_module_1 = require("./telegram/telegram.module");
const activity_log_module_1 = require("./activity-log/activity-log.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            products_module_1.ProductsModule,
            categories_module_1.CategoriesModule,
            customers_module_1.CustomersModule,
            purchasing_module_1.PurchasingModule,
            inventory_module_1.InventoryModule,
            locations_module_1.LocationsModule,
            sales_module_1.SalesModule,
            accounting_module_1.AccountingModule,
            cash_module_1.CashModule,
            expenses_module_1.ExpensesModule,
            receipts_module_1.ReceiptsModule,
            reports_module_1.ReportsModule,
            settings_module_1.SettingsModule,
            telegram_module_1.TelegramModule,
            backup_module_1.BackupModule,
            sync_module_1.SyncModule,
            admin_module_1.AdminModule,
            activity_log_module_1.ActivityLogModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map