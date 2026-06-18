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

  buildDailyVoiceSummary(report: DailyReportLike): string {
    const topProduct = report.topProducts[0]?.name ?? 'لا يوجد';
    return [
      'ملخص اليوم.',
      `المبيعات ${this.formatAmount(report.totalSales)} دينار.`,
      `الربح ${this.formatAmount(report.netProfit)} دينار.`,
      `عدد الفواتير ${this.formatCount(report.salesCount)}.`,
      `أكثر منتج مبيعاً ${topProduct}.`,
    ].join(' ');
  }

  buildTestVoiceMessage(): string {
    return 'اختبار صوتي. تم ربط Telegram بنجاح.';
  }

  generateVoiceUrl(text: string): string {
    const encoded = encodeURIComponent(text);
    return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=ar&client=tw-ob`;
  }

  async sendVoiceMessage(
    text: string,
    botToken?: string,
    chatId?: string,
  ): Promise<{
    ok: boolean;
    googleStatusCode?: number;
    fileSizeBytes?: number;
    telegramStatusCode?: number;
    error?: string;
  }> {
    try {
      const settings = await this.settingsService.getSettings();
      const token =
        botToken?.trim() || settings.telegramBotToken?.trim() || '';
      const chat = chatId?.trim() || settings.telegramChatId?.trim() || '';

      if (!token || !chat) {
        const message =
          'أدخل Bot Token و Chat ID واحفظ الإعدادات قبل اختبار الصوت';
        this.logger.warn(`Voice skipped: ${message}`);
        return { ok: false, error: message };
      }

      const googleUrl = this.generateVoiceUrl(text);
      const googleResponse = await fetch(googleUrl, {
        signal: AbortSignal.timeout(10_000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const googleStatusCode = googleResponse.status;
      const audioBuffer = await googleResponse.arrayBuffer();
      const fileSizeBytes = audioBuffer.byteLength;

      this.logger.log(`Google TTS Status Code: ${googleStatusCode}`);
      this.logger.log(`Google TTS file size: ${fileSizeBytes} bytes`);

      if (!googleResponse.ok || fileSizeBytes === 0) {
        return {
          ok: false,
          googleStatusCode,
          fileSizeBytes,
          error: `Google TTS failed with HTTP ${googleStatusCode}`,
        };
      }

      const formData = new FormData();
      formData.append('chat_id', chat);
      formData.append(
        'voice',
        new Blob([audioBuffer], { type: 'audio/mpeg' }),
        'voice.mp3',
      );

      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${token}/sendVoice`,
        {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(10_000),
        },
      );

      const telegramStatusCode = telegramResponse.status;
      this.logger.log(`Telegram Status Code: ${telegramStatusCode}`);

      const telegramBody = (await telegramResponse.json()) as {
        ok?: boolean;
        description?: string;
      };

      if (!telegramResponse.ok || !telegramBody.ok) {
        return {
          ok: false,
          googleStatusCode,
          fileSizeBytes,
          telegramStatusCode,
          error:
            telegramBody.description ??
            `Telegram sendVoice failed with HTTP ${telegramStatusCode}`,
        };
      }

      return {
        ok: true,
        googleStatusCode,
        fileSizeBytes,
        telegramStatusCode,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown voice error';
      this.logger.warn(`Voice message failed (text unaffected): ${message}`);
      return { ok: false, error: message };
    }
  }

  async sendConfiguredTestMessage(): Promise<{
    ok: true;
    voice?: {
      ok: boolean;
      googleStatusCode?: number;
      fileSizeBytes?: number;
      telegramStatusCode?: number;
      error?: string;
    };
  }> {
    const settings = await this.settingsService.getSettings();
    if (!settings.telegramBotToken?.trim() || !settings.telegramChatId?.trim()) {
      throw new BadRequestException(
        'أدخل Bot Token و Chat ID واحفظ الإعدادات قبل الاختبار',
      );
    }

    await this.sendMessage(
      this.buildTestMessage(),
      settings.telegramBotToken,
      settings.telegramChatId,
    );

    if (!settings.enableDailyVoice) {
      return { ok: true };
    }

    const voice = await this.sendVoiceMessage(
      this.buildTestVoiceMessage(),
      settings.telegramBotToken,
      settings.telegramChatId,
    );

    if (!voice.ok) {
      this.logger.warn(
        `Test voice failed — text only sent: ${voice.error ?? 'unknown'}`,
      );
    }

    return { ok: true, voice };
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
