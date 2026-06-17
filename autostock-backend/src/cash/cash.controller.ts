import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CashService } from './cash.service';
import { CashHistoryQueryDto } from './dto/cash-history-query.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { CreateCashDepositDto } from './dto/create-cash-deposit.dto';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';

@Controller('cash')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Post('open')
  @Roles('admin', 'cashier', 'accountant')
  open(
    @Body() dto: OpenCashRegisterDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.cashService.open(dto, req.user.userId);
  }

  @Get('today')
  @Roles('admin', 'cashier', 'accountant')
  getToday() {
    return this.cashService.getToday();
  }

  @Post('close')
  @Roles('admin', 'cashier', 'accountant')
  close(
    @Body() dto: CloseCashRegisterDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.cashService.close(dto, req.user.userId);
  }

  @Post('deposit')
  @Roles('admin', 'cashier', 'accountant')
  deposit(
    @Body() dto: CreateCashDepositDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.cashService.createDeposit(dto, req.user.userId);
  }

  @Get('history')
  @Roles('admin', 'cashier', 'accountant')
  getHistory(@Query() query: CashHistoryQueryDto) {
    return this.cashService.getHistory(query);
  }
}
