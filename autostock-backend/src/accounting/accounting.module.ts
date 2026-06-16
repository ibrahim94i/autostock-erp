import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { EventsModule } from '../events/events.module';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [AccountingController],
  providers: [AccountingService, JwtAuthGuard, RolesGuard, IdempotencyInterceptor],
})
export class AccountingModule {}
