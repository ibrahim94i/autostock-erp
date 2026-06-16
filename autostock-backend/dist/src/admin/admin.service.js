"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const expenses_service_1 = require("../expenses/expenses.service");
let AdminService = class AdminService {
    prisma;
    expensesService;
    constructor(prisma, expensesService) {
        this.prisma = prisma;
        this.expensesService = expensesService;
    }
    async resetAllData() {
        await this.prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "CashTransaction",
        "Expense",
        "Receipt",
        "Return",
        "SaleItem",
        "Sale",
        "Payment",
        "PurchaseItem",
        "PurchaseOrder",
        "StockMovement",
        "StockBalanceView",
        "JournalLine",
        "JournalEntry",
        "EventLog",
        "DashboardAggregate",
        "CashRegister",
        "Product",
        "Category",
        "Customer",
        "CustomerBalanceView",
        "Supplier",
        "SupplierBalanceView",
        "Location"
      RESTART IDENTITY CASCADE;
    `);
        await this.prisma.$executeRawUnsafe(`
      ALTER SEQUENCE IF EXISTS "EventLog_serverSeq_seq" RESTART WITH 1;
    `);
        await this.prisma.location.create({
            data: {
                zone: 'المخزن الرئيسي',
                shelf: '1',
                code: 'MAIN',
            },
        });
        await this.prisma.category.create({
            data: { name: 'عام' },
        });
        await this.expensesService.seedDefaultCategories();
        const settings = await this.prisma.settings.findFirst();
        if (settings) {
            await this.prisma.settings.update({
                where: { id: settings.id },
                data: { nextReceiptNumber: 1 },
            });
        }
        return { message: 'تم حذف جميع البيانات التشغيلية بنجاح' };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        expenses_service_1.ExpensesService])
], AdminService);
//# sourceMappingURL=admin.service.js.map