import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
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
import { LogReceiptDto } from './dto/log-receipt.dto';
import { ReceiptsQueryDto } from './dto/receipts-query.dto';
import { ReceiptsService } from './receipts.service';

@Controller('receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post('log')
  @Roles('admin', 'cashier')
  log(
    @Body() dto: LogReceiptDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.receiptsService.log(dto, req.user.userId);
  }

  @Get()
  @Roles('admin', 'cashier', 'accountant')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.receiptsService.findAll({ page, limit, from, to, search });
  }

  @Get('next-number')
  @Roles('admin', 'cashier', 'accountant')
  getNextNumber() {
    return this.receiptsService.getNextNumber();
  }

  @Get(':saleId')
  @Roles('admin', 'cashier', 'accountant')
  findBySaleId(@Param('saleId', ParseUUIDPipe) saleId: string) {
    return this.receiptsService.findBySaleId(saleId);
  }
}
