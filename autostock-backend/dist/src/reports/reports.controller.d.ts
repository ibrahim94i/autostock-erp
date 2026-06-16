import { DailyReportQueryDto, DateRangeQueryDto, SalesReportQueryDto } from './dto/reports-query.dto';
import { ReportsService } from './reports.service';
export declare class DashboardReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getSummary(): Promise<Record<string, {
        value: unknown;
        period: string;
        computedAt: Date;
    }>>;
}
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getDailyReport(query: DailyReportQueryDto): Promise<{
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
    getSalesReport(query: SalesReportQueryDto): Promise<{
        period: string;
        totalSales: number;
        netProfit: number;
        salesCount: number;
    }[]>;
    getProductsReport(query: DateRangeQueryDto): Promise<{
        productId: string;
        name: string;
        qtySold: number;
        revenue: number;
        cost: number;
        profit: number;
    }[]>;
    getCustomersReport(query: DateRangeQueryDto): Promise<{
        customerId: string;
        name: string;
        totalPurchases: number;
        totalPaid: number;
        balance: number;
    }[]>;
    getInventoryMovementReport(query: DateRangeQueryDto): Promise<{
        productId: string;
        name: string;
        openingQty: number;
        inQty: number;
        outQty: number;
        closingQty: number;
    }[]>;
}
