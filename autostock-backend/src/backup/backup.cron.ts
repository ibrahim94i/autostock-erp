import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BackupService } from './backup.service';

@Injectable()
export class BackupCronJob {
  private readonly logger = new Logger(BackupCronJob.name);

  constructor(private readonly backupService: BackupService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledBackup(): Promise<void> {
    await this.backupService.runAutoBackupIfDue();
  }
}
