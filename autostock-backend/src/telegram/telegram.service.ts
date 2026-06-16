import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

interface DailyReportLike {
  date: string;
  totalSales: number;
  netProfit: number;
  salesCount: number;
  totalNewDebt: number;
  paymentsReceived: number;
  paymentBreakdown: { cash: number; debt: number };
  topProducts: Array<{ name: string; qty: number }>;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly settingsService: SettingsService) {}

  async sendMessage(
    text: string,
    botToken: string,
    chatId: string,
  ): Promise<{ ok: true }> {
    const token = botToken.trim();
    const chat = chatId.trim();

    if (!token || !chat) {
      throw new BadRequestException('Telegram Bot Token و Chat ID مطلوبان');
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    let response: Response;
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
    } catch (error) {
      this.logger.error('Telegram API request failed', error);
      throw new ServiceUnavailableException('تعذّر الاتصال بـ Telegram');
    }

    const body = (await response.json()) as {
      ok?: boolean;
      description?: string;
    };

    if (!response.ok || !body.ok) {
      const reason = body.description ?? `HTTP ${response.status}`;
      this.logger.warn(`Telegram send failed: ${reason}`);
      throw new BadRequestException(`فشل إرسال Telegram: ${reason}`);
    }

    return { ok: true };
  }

  buildDailyReportMessage(report: DailyReportLike, currency = 'د.ع'): string {
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

  buildTestMessage(): string {
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

  async sendConfiguredTestMessage(): Promise<{ ok: true }> {
    const settings = await this.settingsService.getSettings();
    if (!settings.telegramBotToken?.trim() || !settings.telegramChatId?.trim()) {
      throw new BadRequestException(
        'أدخل Bot Token و Chat ID واحفظ الإعدادات قبل الاختبار',
      );
    }

    return this.sendMessage(
      this.buildTestMessage(),
      settings.telegramBotToken,
      settings.telegramChatId,
    );
  }

  async sendConfiguredDailyReport(report: DailyReportLike): Promise<{ ok: true }> {
    const settings = await this.settingsService.getSettings();
    if (!settings.telegramBotToken?.trim() || !settings.telegramChatId?.trim()) {
      throw new BadRequestException('Telegram غير مُعد بالكامل');
    }

    return this.sendMessage(
      this.buildDailyReportMessage(report, settings.currency),
      settings.telegramBotToken,
      settings.telegramChatId,
    );
  }

  isDueNow(configuredTime: string, now = new Date()): boolean {
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(configuredTime.trim());
    if (!match) return false;

    const targetMinutes = Number(match[1]) * 60 + Number(match[2]);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return Math.abs(currentMinutes - targetMinutes) <= 1;
  }

  todayIsoLocal(now = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatAmount(value: number): string {
    return value.toLocaleString('ar-IQ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  private formatCount(value: number): string {
    return value.toLocaleString('ar-IQ', { maximumFractionDigits: 0 });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
