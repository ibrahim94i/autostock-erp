import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportsModule } from '../reports/reports.module';
import { SettingsModule } from '../settings/settings.module';
import { TelegramDailyJob } from './telegram-daily.job';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [AuthModule, SettingsModule, ReportsModule],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramDailyJob, JwtAuthGuard, RolesGuard],
})
export class TelegramModule {}
