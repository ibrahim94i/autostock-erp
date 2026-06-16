import { ReportsService } from '../reports/reports.service';
import { SettingsService } from '../settings/settings.service';
import { TelegramService } from './telegram.service';
export declare class TelegramDailyJob {
    private readonly settingsService;
    private readonly reportsService;
    private readonly telegramService;
    private readonly logger;
    private lastSentDate;
    constructor(settingsService: SettingsService, reportsService: ReportsService, telegramService: TelegramService);
    sendDailyReportIfDue(): Promise<void>;
}
