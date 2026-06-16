import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [AuthModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, JwtAuthGuard, RolesGuard, IdempotencyInterceptor],
  exports: [ExpensesService],
})
export class ExpensesModule {}
