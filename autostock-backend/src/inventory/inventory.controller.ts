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
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { InventoryService } from './inventory.service';

@Controller('stock')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Roles('warehouse', 'admin')
  reconcile(
    @Body() dto: AdjustStockDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.inventoryService.reconcile(dto, req.user.userId);
  }

  @Get('balances')
  @UseGuards(JwtAuthGuard)
  getBalances(@Query() query: StockQueryDto) {
    return this.inventoryService.getBalances(query);
  }

  @Get('low-alerts')
  @UseGuards(JwtAuthGuard)
  getLowAlerts() {
    return this.inventoryService.getLowAlerts();
  }
}
