import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

@Controller('sales')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Roles('cashier', 'admin')
  create(
    @Body() dto: CreateSaleDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.salesService.create(dto, req.user.userId);
  }

  @Post(':id/returns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Roles('cashier', 'admin')
  createReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReturnDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.salesService.createReturn(id, dto, req.user.userId);
  }

  @Get(':id/invoice')
  @UseGuards(JwtAuthGuard)
  getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.getInvoice(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.findOne(id);
  }
}
