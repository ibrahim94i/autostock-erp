import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AggregatesJob } from './aggregates.job';
import { DashboardReportsController, ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardReportsController, ReportsController],
  providers: [ReportsService, AggregatesJob, JwtAuthGuard, RolesGuard],
  exports: [ReportsService],
})
export class ReportsModule {}
