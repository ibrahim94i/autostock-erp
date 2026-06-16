import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { EventsModule } from '../events/events.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [InventoryController],
  providers: [InventoryService, JwtAuthGuard, RolesGuard, IdempotencyInterceptor],
})
export class InventoryModule {}
