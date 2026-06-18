import { PrismaService } from '../common/prisma/prisma.service';
export interface TopProductEntry {
    productId: string;
    productName: string;
    totalQty: number;
}
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSummary(): Promise<Record<string, {
        value: unknown;
        period: string;
        computedAt: Date;
    }>>;
    refreshAggregates(): Promise<void>;
    private startOfToday;
    private computeSalesToday;
    private computeNetProfitToday;
    private computeTotalCustomerDebt;
    private computeTopProducts;
    private computeLowStockCount;
    private parseTopProducts;
    private upsertMetric;
    getDailyReport(date: string): Promise<{
        date: string;
        totalSales: number;
        totalCost: number;
        grossProfit: number;
        netProfit: number;
        totalReturns: number;
        totalNewDebt: number;
        paymentsReceived: number;
        salesCount: number;
        invoices: {
            saleId: string;
            invoiceNumber: string;
            customerName: string;
            amount: number;
            paymentType: string;
            paymentLabel: string;
        }[];
        topProducts: {
            productId: string;
            name: string;
            qty: number;
            revenue: number;
        }[];
        paymentBreakdown: {
            cash: number;
            debt: number;
        };
    }>;
    getSalesReport(from: string, to: string, groupBy: 'day' | 'month'): Promise<{
        period: string;
        totalSales: number;
        netProfit: number;
        salesCount: number;
    }[]>;
    getProductsReport(from: string, to: string): Promise<{
        productId: string;
        name: string;
        unitsPerCarton: number;
        qtySold: number;
        revenue: number;
        cost: number;
        profit: number;
    }[]>;
    getCustomersReport(from: string, to: string): Promise<{
        customerId: string;
        name: string;
        totalPurchases: number;
        totalPaid: number;
        balance: number;
    }[]>;
    getInventoryMovementReport(from: string, to: string): Promise<{
        productId: string;
        name: string;
        openingQty: number;
        inQty: number;
        outQty: number;
        closingQty: number;
    }[]>;
    private parseDateRange;
    private formatInvoiceNumber;
    private parseRange;
    private formatPeriod;
    private periodToRange;
    private sumReturnsAmount;
}
