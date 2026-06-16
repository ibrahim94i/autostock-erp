import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { EventsModule } from '../events/events.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [SalesController],
  providers: [SalesService, JwtAuthGuard, RolesGuard, IdempotencyInterceptor],
})
export class SalesModule {}
