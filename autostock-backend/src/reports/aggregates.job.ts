import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportsService } from './reports.service';

@Injectable()
export class AggregatesJob {
  constructor(private readonly reportsService: ReportsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async refreshDashboardAggregates(): Promise<void> {
    await this.reportsService.refreshAggregates();
  }
}
