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
var TelegramDailyJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramDailyJob = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const reports_service_1 = require("../reports/reports.service");
const settings_service_1 = require("../settings/settings.service");
const telegram_service_1 = require("./telegram.service");
let TelegramDailyJob = TelegramDailyJob_1 = class TelegramDailyJob {
    settingsService;
    reportsService;
    telegramService;
    logger = new common_1.Logger(TelegramDailyJob_1.name);
    lastSentDate = null;
    constructor(settingsService, reportsService, telegramService) {
        this.settingsService = settingsService;
        this.reportsService = reportsService;
        this.telegramService = telegramService;
    }
    async sendDailyReportIfDue() {
        try {
            const settings = await this.settingsService.getSettings();
            if (!settings.telegramEnabled)
                return;
            if (!settings.telegramBotToken?.trim() || !settings.telegramChatId?.trim()) {
                return;
            }
            if (!this.telegramService.isDueNow(settings.telegramDailyTime))
                return;
            const today = this.telegramService.todayIsoLocal();
            if (this.lastSentDate === today)
                return;
            const report = await this.reportsService.getDailyReport(today);
            await this.telegramService.sendConfiguredDailyReport(report);
            this.lastSentDate = today;
            this.logger.log(`Daily Telegram report sent for ${today}`);
        }
        catch (error) {
            this.logger.error('Failed to send daily Telegram report', error instanceof Error ? error.stack : String(error));
        }
    }
};
exports.TelegramDailyJob = TelegramDailyJob;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TelegramDailyJob.prototype, "sendDailyReportIfDue", null);
exports.TelegramDailyJob = TelegramDailyJob = TelegramDailyJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [settings_service_1.SettingsService,
        reports_service_1.ReportsService,
        telegram_service_1.TelegramService])
], TelegramDailyJob);
//# sourceMappingURL=telegram-daily.job.js.map