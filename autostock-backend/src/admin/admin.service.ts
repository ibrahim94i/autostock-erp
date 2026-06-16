import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ExpensesService } from '../expenses/expenses.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expensesService: ExpensesService,
  ) {}

  async resetAllData(): Promise<{ message: string }> {
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
}
