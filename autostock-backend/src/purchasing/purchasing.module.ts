import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { EventsModule } from '../events/events.module';
import { PurchasingController } from './purchasing.controller';
import { PurchasingService } from './purchasing.service';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [PurchasingController],
  providers: [
    SuppliersService,
    PurchasingService,
    JwtAuthGuard,
    RolesGuard,
    IdempotencyInterceptor,
  ],
})
export class PurchasingModule {}
