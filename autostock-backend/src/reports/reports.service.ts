import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

const PL_ACCOUNT_CODES = {
  sales: '4000',
  salesReturns: '4100',
  cogs: '5000',
} as const;

const PERIOD_TODAY = 'today';

export interface TopProductEntry {
  productId: string;
  productName: string;
  totalQty: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const rows = await this.prisma.dashboardAggregate.findMany({
      orderBy: { metricKey: 'asc' },
    });

    const summary: Record<
      string,
      { value: unknown; period: string; computedAt: Date }
    > = {};

    for (const row of rows) {
      if (row.metricKey === 'top_products') {
        summary[row.metricKey] = {
          value: this.parseTopProducts(row.period),
          period: row.period,
          computedAt: row.computedAt,
        };
      } else {
        summary[row.metricKey] = {
          value: new Prisma.Decimal(row.value).toNumber(),
          period: row.period,
          computedAt: row.computedAt,
        };
      }
    }

    return summary;
  }

  async refreshAggregates(): Promise<void> {
    const todayStart = this.startOfToday();
    const now = new Date();
    const computedAt = now;

    const salesToday = await this.computeSalesToday(todayStart, now);
    await this.upsertMetric(
      'sales_today',
      salesToday,
      PERIOD_TODAY,
      computedAt,
    );

    const netProfitToday = await this.computeNetProfitToday(todayStart, now);
    await this.upsertMetric(
      'net_profit_today',
      netProfitToday,
      PERIOD_TODAY,
      computedAt,
    );

    const totalCustomerDebt = await this.computeTotalCustomerDebt();
    await this.upsertMetric(
      'total_customer_debt',
      totalCustomerDebt,
      PERIOD_TODAY,
      computedAt,
    );

    const topProducts = await this.computeTopProducts();
    await this.upsertMetric(
      'top_products',
      new Prisma.Decimal(topProducts.length),
      JSON.stringify(topProducts),
      computedAt,
    );

    const lowStockCount = await this.computeLowStockCount();
    await this.upsertMetric(
      'low_stock_count',
      lowStockCount,
      PERIOD_TODAY,
      computedAt,
    );
  }

  private startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private async computeSalesToday(from: Date, to: Date): Promise<Prisma.Decimal> {
    const result = await this.prisma.sale.aggregate({
      _sum: { subtotal: true },
      where: {
        createdAt: { gte: from, lte: to },
      },
    });

    return result._sum.subtotal ?? new Prisma.Decimal(0);
  }

  private async computeNetProfitToday(
    from: Date,
    to: Date,
  ): Promise<Prisma.Decimal> {
    const accounts = await this.prisma.account.findMany({
      where: {
        code: {
          in: [
            PL_ACCOUNT_CODES.sales,
            PL_ACCOUNT_CODES.salesReturns,
            PL_ACCOUNT_CODES.cogs,
          ],
        },
      },
    });

    if (accounts.length === 0) {
      return new Prisma.Decimal(0);
    }

    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId: { in: accounts.map((a) => a.id) },
        entry: {
          entryDate: { gte: from, lte: to },
        },
      },
      include: { account: true },
    });

    let revenue = new Prisma.Decimal(0);
    let returns = new Prisma.Decimal(0);
    let cogsDebit = new Prisma.Decimal(0);
    let cogsCredit = new Prisma.Decimal(0);

    for (const line of lines) {
      switch (line.account.code) {
        case PL_ACCOUNT_CODES.sales:
          revenue = revenue.plus(line.credit);
          break;
        case PL_ACCOUNT_CODES.salesReturns:
          returns = returns.plus(line.debit);
          break;
        case PL_ACCOUNT_CODES.cogs:
          cogsDebit = cogsDebit.plus(line.debit);
          cogsCredit = cogsCredit.plus(line.credit);
          break;
      }
    }

    const cogs = cogsDebit.minus(cogsCredit);
    return revenue.minus(returns).minus(cogs);
  }

  private async computeTotalCustomerDebt(): Promise<Prisma.Decimal> {
    const balances = await this.prisma.customerBalanceView.findMany();

    return balances.reduce((sum, row) => {
      const balance = new Prisma.Decimal(row.balance);
      return balance.gt(0) ? sum.plus(balance) : sum;
    }, new Prisma.Decimal(0));
  }

  private async computeTopProducts(): Promise<TopProductEntry[]> {
    const grouped = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { qty: true },
    });

    const sorted = grouped
      .map((row) => ({
        productId: row.productId,
        totalQty: row._sum.qty ?? new Prisma.Decimal(0),
      }))
      .sort((a, b) => b.totalQty.comparedTo(a.totalQty))
      .slice(0, 5);

    if (sorted.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: sorted.map((s) => s.productId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((p) => [p.id, p.name]));

    return sorted.map((row) => ({
      productId: row.productId,
      productName: nameById.get(row.productId) ?? row.productId,
      totalQty: row.totalQty.toNumber(),
    }));
  }

  private async computeLowStockCount(): Promise<Prisma.Decimal> {
    const balances = await this.prisma.stockBalanceView.findMany({
      include: { product: { select: { minStockAlert: true } } },
    });

    const lowProductIds = new Set<string>();
    for (const balance of balances) {
      if (
        new Prisma.Decimal(balance.quantity).lt(balance.product.minStockAlert)
      ) {
        lowProductIds.add(balance.productId);
      }
    }

    return new Prisma.Decimal(lowProductIds.size);
  }

  private parseTopProducts(period: string): TopProductEntry[] {
    try {
      const parsed: unknown = JSON.parse(period);
      return Array.isArray(parsed) ? (parsed as TopProductEntry[]) : [];
    } catch {
      return [];
    }
  }

  private async upsertMetric(
    metricKey: string,
    value: Prisma.Decimal,
    period: string,
    computedAt: Date,
  ): Promise<void> {
    const existing = await this.prisma.dashboardAggregate.findFirst({
      where: { metricKey },
      orderBy: { computedAt: 'desc' },
    });

    if (existing) {
      await this.prisma.dashboardAggregate.update({
        where: { id: existing.id },
        data: { value, period, computedAt },
      });
      return;
    }

    await this.prisma.dashboardAggregate.create({
      data: { metricKey, value, period, computedAt },
    });
  }

  async getDailyReport(date: string) {
    const { from, to } = this.parseDateRange(date);

    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const salesCount = sales.length;
    const totalSales = sales.reduce(
      (sum, sale) => sum.plus(sale.subtotal),
      new Prisma.Decimal(0),
    );

    let cash = new Prisma.Decimal(0);
    let debt = new Prisma.Decimal(0);
    for (const sale of sales) {
      if (sale.paymentType.toUpperCase() === 'CASH') {
        cash = cash.plus(sale.subtotal);
      } else {
        debt = debt.plus(sale.subtotal);
      }
    }

    const invoices = sales.map((sale) => {
      const isCash = sale.paymentType.toUpperCase() === 'CASH';
      return {
        saleId: sale.id,
        invoiceNumber: this.formatInvoiceNumber(sale.id),
        customerName: sale.customer?.name ?? 'زبون نقدي',
        amount: sale.subtotal.toNumber(),
        paymentType: isCash ? 'cash' : 'debt',
        paymentLabel: isCash ? 'نقد' : 'آجل',
      };
    });

    const saleIds = sales.map((s) => s.id);
    const saleItems =
      saleIds.length > 0
        ? await this.prisma.saleItem.findMany({
            where: { saleId: { in: saleIds } },
            include: { product: { select: { name: true } } },
          })
        : [];

    const totalCost = saleItems.reduce(
      (sum, item) => sum.plus(item.qty.mul(item.unitCost)),
      new Prisma.Decimal(0),
    );

    const totalReturns = await this.sumReturnsAmount(from, to);
    const journalProfit = await this.computeNetProfitToday(from, to);
    const grossProfit = totalSales.minus(totalCost);
    const netProfit = journalProfit;

    const paymentsReceivedResult = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        partyType: 'CUSTOMER',
        direction: 'IN',
        createdAt: { gte: from, lte: to },
      },
    });
    const paymentsReceived =
      paymentsReceivedResult._sum.amount ?? new Prisma.Decimal(0);

    const productMap = new Map<
      string,
      { name: string; qty: Prisma.Decimal; revenue: Prisma.Decimal }
    >();
    for (const item of saleItems) {
      const existing = productMap.get(item.productId) ?? {
        name: item.product.name,
        qty: new Prisma.Decimal(0),
        revenue: new Prisma.Decimal(0),
      };
      existing.qty = existing.qty.plus(item.qty);
      existing.revenue = existing.revenue.plus(item.qty.mul(item.unitPrice));
      productMap.set(item.productId, existing);
    }

    const topProducts = [...productMap.entries()]
      .map(([productId, row]) => ({
        productId,
        name: row.name,
        qty: row.qty.toNumber(),
        revenue: row.revenue.toNumber(),
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      date,
      totalSales: totalSales.toNumber(),
      totalCost: totalCost.toNumber(),
      grossProfit: grossProfit.toNumber(),
      netProfit: netProfit.toNumber(),
      totalReturns: totalReturns.toNumber(),
      totalNewDebt: debt.toNumber(),
      paymentsReceived: paymentsReceived.toNumber(),
      salesCount,
      invoices,
      topProducts,
      paymentBreakdown: {
        cash: cash.toNumber(),
        debt: debt.toNumber(),
      },
    };
  }

  async getSalesReport(from: string, to: string, groupBy: 'day' | 'month') {
    const range = this.parseRange(from, to);

    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      select: { id: true, createdAt: true, subtotal: true },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = new Map<
      string,
      { totalSales: Prisma.Decimal; salesCount: number; saleIds: string[] }
    >();

    for (const sale of sales) {
      const period = this.formatPeriod(sale.createdAt, groupBy);
      const bucket = buckets.get(period) ?? {
        totalSales: new Prisma.Decimal(0),
        salesCount: 0,
        saleIds: [],
      };
      bucket.totalSales = bucket.totalSales.plus(sale.subtotal);
      bucket.salesCount += 1;
      bucket.saleIds.push(sale.id);
      buckets.set(period, bucket);
    }

    const periods = [...buckets.keys()].sort();
    const result: Array<{
      period: string;
      totalSales: number;
      netProfit: number;
      salesCount: number;
    }> = [];

    for (const period of periods) {
      const bucket = buckets.get(period)!;
      const { from: pFrom, to: pTo } = this.periodToRange(period, groupBy);
      const netProfit = await this.computeNetProfitToday(pFrom, pTo);

      result.push({
        period,
        totalSales: bucket.totalSales.toNumber(),
        netProfit: netProfit.toNumber(),
        salesCount: bucket.salesCount,
      });
    }

    return result;
  }

  async getProductsReport(from: string, to: string) {
    const range = this.parseRange(from, to);

    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      select: { id: true },
    });

    if (sales.length === 0) return [];

    const items = await this.prisma.saleItem.findMany({
      where: { saleId: { in: sales.map((s) => s.id) } },
      include: { product: { select: { id: true, name: true } } },
    });

    const grouped = new Map<
      string,
      {
        name: string;
        qtySold: Prisma.Decimal;
        revenue: Prisma.Decimal;
        cost: Prisma.Decimal;
      }
    >();

    for (const item of items) {
      const row = grouped.get(item.productId) ?? {
        name: item.product.name,
        qtySold: new Prisma.Decimal(0),
        revenue: new Prisma.Decimal(0),
        cost: new Prisma.Decimal(0),
      };
      row.qtySold = row.qtySold.plus(item.qty);
      row.revenue = row.revenue.plus(item.qty.mul(item.unitPrice));
      row.cost = row.cost.plus(item.qty.mul(item.unitCost));
      grouped.set(item.productId, row);
    }

    return [...grouped.entries()]
      .map(([productId, row]) => ({
        productId,
        name: row.name,
        qtySold: row.qtySold.toNumber(),
        revenue: row.revenue.toNumber(),
        cost: row.cost.toNumber(),
        profit: row.revenue.minus(row.cost).toNumber(),
      }))
      .sort((a, b) => b.profit - a.profit);
  }

  async getCustomersReport(from: string, to: string) {
    const range = this.parseRange(from, to);

    const sales = await this.prisma.sale.findMany({
      where: {
        createdAt: { gte: range.from, lte: range.to },
        customerId: { not: null },
      },
      select: { customerId: true, subtotal: true },
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        partyType: 'CUSTOMER',
        createdAt: { gte: range.from, lte: range.to },
      },
      select: { partyId: true, amount: true, direction: true },
    });

    const purchaseMap = new Map<string, Prisma.Decimal>();
    for (const sale of sales) {
      if (!sale.customerId) continue;
      const current = purchaseMap.get(sale.customerId) ?? new Prisma.Decimal(0);
      purchaseMap.set(sale.customerId, current.plus(sale.subtotal));
    }

    const paidMap = new Map<string, Prisma.Decimal>();
    for (const payment of payments) {
      const current = paidMap.get(payment.partyId) ?? new Prisma.Decimal(0);
      const delta =
        payment.direction.toUpperCase() === 'IN'
          ? payment.amount
          : payment.amount.neg();
      paidMap.set(payment.partyId, current.plus(delta));
    }

    const customerIds = new Set([...purchaseMap.keys(), ...paidMap.keys()]);
    if (customerIds.size === 0) return [];

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: [...customerIds] } },
      include: { balance: true },
    });

    return customers
      .map((customer) => ({
        customerId: customer.id,
        name: customer.name,
        totalPurchases: (purchaseMap.get(customer.id) ?? new Prisma.Decimal(0)).toNumber(),
        totalPaid: (paidMap.get(customer.id) ?? new Prisma.Decimal(0)).toNumber(),
        balance: customer.balance
          ? new Prisma.Decimal(customer.balance.balance).toNumber()
          : 0,
      }))
      .sort((a, b) => b.totalPurchases - a.totalPurchases);
  }

  async getInventoryMovementReport(from: string, to: string) {
    const range = this.parseRange(from, to);

    const movements = await this.prisma.stockMovement.findMany({
      where: { createdAt: { lte: range.to } },
      include: { product: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const grouped = new Map<
      string,
      {
        name: string;
        openingQty: Prisma.Decimal;
        inQty: Prisma.Decimal;
        outQty: Prisma.Decimal;
        closingQty: Prisma.Decimal;
      }
    >();

    for (const movement of movements) {
      const row = grouped.get(movement.productId) ?? {
        name: movement.product.name,
        openingQty: new Prisma.Decimal(0),
        inQty: new Prisma.Decimal(0),
        outQty: new Prisma.Decimal(0),
        closingQty: new Prisma.Decimal(0),
      };

      const qty = movement.quantity;
      const isIn = movement.direction.toUpperCase() === 'IN';

      if (movement.createdAt < range.from) {
        row.openingQty = isIn ? row.openingQty.plus(qty) : row.openingQty.minus(qty);
      } else if (movement.createdAt <= range.to) {
        if (isIn) {
          row.inQty = row.inQty.plus(qty);
        } else {
          row.outQty = row.outQty.plus(qty);
        }
      }

      grouped.set(movement.productId, row);
    }

    return [...grouped.entries()]
      .map(([productId, row]) => {
        const closingQty = row.openingQty.plus(row.inQty).minus(row.outQty);
        return {
          productId,
          name: row.name,
          openingQty: row.openingQty.toNumber(),
          inQty: row.inQty.toNumber(),
          outQty: row.outQty.toNumber(),
          closingQty: closingQty.toNumber(),
        };
      })
      .filter((row) => row.inQty !== 0 || row.outQty !== 0 || row.openingQty !== 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }

  private parseDateRange(date: string): { from: Date; to: Date } {
    const from = new Date(`${date}T00:00:00.000`);
    const to = new Date(`${date}T23:59:59.999`);
    return { from, to };
  }

  private formatInvoiceNumber(saleId: string): string {
    return `INV-${saleId.slice(0, 8).toUpperCase()}`;
  }

  private parseRange(from: string, to: string): { from: Date; to: Date } {
    return {
      from: new Date(`${from}T00:00:00.000`),
      to: new Date(`${to}T23:59:59.999`),
    };
  }

  private formatPeriod(date: Date, groupBy: 'day' | 'month'): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    if (groupBy === 'month') return `${y}-${m}`;
    return `${y}-${m}-${d}`;
  }

  private periodToRange(
    period: string,
    groupBy: 'day' | 'month',
  ): { from: Date; to: Date } {
    if (groupBy === 'month') {
      const [y, m] = period.split('-').map(Number);
      const from = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const to = new Date(y, m, 0, 23, 59, 59, 999);
      return { from, to };
    }
    return this.parseDateRange(period);
  }

  private async sumReturnsAmount(from: Date, to: Date): Promise<Prisma.Decimal> {
    const accounts = await this.prisma.account.findMany({
      where: { code: PL_ACCOUNT_CODES.salesReturns },
    });
    if (accounts.length === 0) {
      const returns = await this.prisma.return.findMany({
        where: { sale: { createdAt: { gte: from, lte: to } } },
      });
      return returns.reduce(
        (sum, row) => sum.plus(row.refundAmount),
        new Prisma.Decimal(0),
      );
    }

    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId: { in: accounts.map((a) => a.id) },
        entry: { entryDate: { gte: from, lte: to } },
      },
    });

    return lines.reduce(
      (sum, line) => sum.plus(line.debit),
      new Prisma.Decimal(0),
    );
  }
}
