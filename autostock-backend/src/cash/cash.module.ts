import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';

@Module({
  imports: [AuthModule],
  controllers: [CashController],
  providers: [CashService, JwtAuthGuard, RolesGuard],
})
export class CashModule {}
