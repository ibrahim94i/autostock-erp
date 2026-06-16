import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BackupController } from './backup.controller';
import { BackupCronJob } from './backup.cron';
import { BackupService } from './backup.service';

@Module({
  imports: [AuthModule],
  controllers: [BackupController],
  providers: [BackupService, BackupCronJob, JwtAuthGuard, RolesGuard],
})
export class BackupModule {}
