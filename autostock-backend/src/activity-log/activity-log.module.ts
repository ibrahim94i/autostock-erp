import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogService } from './activity-log.service';

@Module({
  imports: [AuthModule],
  controllers: [ActivityLogController],
  providers: [ActivityLogService, JwtAuthGuard, RolesGuard],
})
export class ActivityLogModule {}
