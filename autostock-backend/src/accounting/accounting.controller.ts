import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { AccountingService } from './accounting.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PlQueryDto } from './dto/pl-query.dto';

@Controller()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Roles('accountant', 'admin', 'cashier')
  createPayment(
    @Body() dto: CreatePaymentDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.accountingService.createPayment(dto, req.user.userId);
  }

  @Get('reports/profit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('accountant', 'admin')
  getProfitReport(@Query() query: PlQueryDto) {
    return this.accountingService.getProfitAndLoss(
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('accountant', 'admin')
  listAccounts() {
    return this.accountingService.listAccounts();
  }
}
