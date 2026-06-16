import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    getSettings(): Promise<{
        id: string;
        updatedAt: Date;
        companyName: string;
        companyPhone: string | null;
        companyAddress: string | null;
        companyLogo: string | null;
        taxNumber: string | null;
        currency: string;
        receiptSize: string;
        defaultTaxRate: number;
        defaultReceiptFooter: string;
        telegramBotToken: string | null;
        telegramChatId: string | null;
        telegramDailyTime: string;
        telegramEnabled: boolean;
        nextReceiptNumber: number;
    }>;
    updateSettings(dto: UpdateSettingsDto): Promise<{
        id: string;
        updatedAt: Date;
        companyName: string;
        companyPhone: string | null;
        companyAddress: string | null;
        companyLogo: string | null;
        taxNumber: string | null;
        currency: string;
        receiptSize: string;
        defaultTaxRate: number;
        defaultReceiptFooter: string;
        telegramBotToken: string | null;
        telegramChatId: string | null;
        telegramDailyTime: string;
        telegramEnabled: boolean;
        nextReceiptNumber: number;
    }>;
}
