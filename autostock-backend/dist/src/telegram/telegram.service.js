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
var TelegramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const common_1 = require("@nestjs/common");
const settings_service_1 = require("../settings/settings.service");
let TelegramService = TelegramService_1 = class TelegramService {
    settingsService;
    logger = new common_1.Logger(TelegramService_1.name);
    constructor(settingsService) {
        this.settingsService = settingsService;
    }
    async sendMessage(text, botToken, chatId) {
        const token = botToken.trim();
        const chat = chatId.trim();
        if (!token || !chat) {
            throw new common_1.BadRequestException('Telegram Bot Token و Chat ID مطلوبان');
        }
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chat,
                    text,
                    parse_mode: 'HTML',
                }),
            });
        }
        catch (error) {
            this.logger.error('Telegram API request failed', error);
            throw new common_1.ServiceUnavailableException('تعذّر الاتصال بـ Telegram');
        }
        const body = (await response.json());
        if (!response.ok || !body.ok) {
            const reason = body.description ?? `HTTP ${response.status}`;
            this.logger.warn(`Telegram send failed: ${reason}`);
            throw new common_1.BadRequestException(`فشل إرسال Telegram: ${reason}`);
        }
        return { ok: true };
    }
    buildDailyReportMessage(report, currency = 'د.ع') {
        const unit = currency;
        const top = report.topProducts[0];
        const topLine = top
            ? `${this.escapeHtml(top.name)} (${this.formatCount(top.qty)})`
            : '—';
        return [
            `📊 <b>تقرير يوم ${this.escapeHtml(report.date)}</b>`,
            `💰 المبيعات: <b>${this.formatAmount(report.totalSales)}</b> ${unit}`,
            `💵 نقد: ${this.formatAmount(report.paymentBreakdown.cash)} | 📋 آجل: ${this.formatAmount(report.paymentBreakdown.debt)}`,
            `📈 الربح: <b>${this.formatAmount(report.netProfit)}</b> ${unit}`,
            `🧾 الفواتير: <b>${this.formatCount(report.salesCount)}</b>`,
            `💳 دفعات مستلمة: ${this.formatAmount(report.paymentsReceived)} ${unit}`,
            `⚠️ ديون جديدة: ${this.formatAmount(report.totalNewDebt)} ${unit}`,
            `🏆 أكثر منتج: ${topLine}`,
        ].join('\n');
    }
    buildTestMessage() {
        const now = new Date().toLocaleString('ar-IQ', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
        return [
            '✅ <b>رسالة اختبار — AutoStock ERP</b>',
            'تم ربط Telegram بنجاح.',
            `🕐 ${this.escapeHtml(now)}`,
        ].join('\n');
    }
    async sendConfiguredTestMessage() {
        const settings = await this.settingsService.getSettings();
        if (!settings.telegramBotToken?.trim() || !settings.telegramChatId?.trim()) {
            throw new common_1.BadRequestException('أدخل Bot Token و Chat ID واحفظ الإعدادات قبل الاختبار');
        }
        return this.sendMessage(this.buildTestMessage(), settings.telegramBotToken, settings.telegramChatId);
    }
    async sendConfiguredDailyReport(report) {
        const settings = await this.settingsService.getSettings();
        if (!settings.telegramBotToken?.trim() || !settings.telegramChatId?.trim()) {
            throw new common_1.BadRequestException('Telegram غير مُعد بالكامل');
        }
        return this.sendMessage(this.buildDailyReportMessage(report, settings.currency), settings.telegramBotToken, settings.telegramChatId);
    }
    isDueNow(configuredTime, now = new Date()) {
        const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(configuredTime.trim());
        if (!match)
            return false;
        const targetMinutes = Number(match[1]) * 60 + Number(match[2]);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        return Math.abs(currentMinutes - targetMinutes) <= 1;
    }
    todayIsoLocal(now = new Date()) {
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    formatAmount(value) {
        return value.toLocaleString('ar-IQ', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    }
    formatCount(value) {
        return value.toLocaleString('ar-IQ', { maximumFractionDigits: 0 });
    }
    escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
};
exports.TelegramService = TelegramService;
exports.TelegramService = TelegramService = TelegramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], TelegramService);
//# sourceMappingURL=telegram.service.js.map