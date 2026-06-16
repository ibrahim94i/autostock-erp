import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportsService } from '../reports/reports.service';
import { SettingsService } from '../settings/settings.service';
import { TelegramService } from './telegram.service';

@Injectable()
export class TelegramDailyJob {
  private readonly logger = new Logger(TelegramDailyJob.name);
  private lastSentDate: string | null = null;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly reportsService: ReportsService,
    private readonly telegramService: TelegramService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sendDailyReportIfDue(): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings();
      if (!settings.telegramEnabled) return;
      if (!settings.telegramBotToken?.trim() || !settings.telegramChatId?.trim()) {
        return;
      }
      if (!this.telegramService.isDueNow(settings.telegramDailyTime)) return;

      const today = this.telegramService.todayIsoLocal();
      if (this.lastSentDate === today) return;

      const report = await this.reportsService.getDailyReport(today);
      await this.telegramService.sendConfiguredDailyReport(report);
      this.lastSentDate = today;
      this.logger.log(`Daily Telegram report sent for ${today}`);
    } catch (error) {
      this.logger.error(
        'Failed to send daily Telegram report',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
