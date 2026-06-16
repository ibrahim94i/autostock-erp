import { SettingsService } from '../settings/settings.service';
interface DailyReportLike {
    date: string;
    totalSales: number;
    netProfit: number;
    salesCount: number;
    totalNewDebt: number;
    paymentsReceived: number;
    paymentBreakdown: {
        cash: number;
        debt: number;
    };
    topProducts: Array<{
        name: string;
        qty: number;
    }>;
}
export declare class TelegramService {
    private readonly settingsService;
    private readonly logger;
    constructor(settingsService: SettingsService);
    sendMessage(text: string, botToken: string, chatId: string): Promise<{
        ok: true;
    }>;
    buildDailyReportMessage(report: DailyReportLike, currency?: string): string;
    buildTestMessage(): string;
    sendConfiguredTestMessage(): Promise<{
        ok: true;
    }>;
    sendConfiguredDailyReport(report: DailyReportLike): Promise<{
        ok: true;
    }>;
    isDueNow(configuredTime: string, now?: Date): boolean;
    todayIsoLocal(now?: Date): string;
    private formatAmount;
    private formatCount;
    private escapeHtml;
}
export {};
