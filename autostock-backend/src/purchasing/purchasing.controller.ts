import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CreatePoDto } from './dto/create-po.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ReceivePoDto } from './dto/receive-po.dto';
import { PurchasingService } from './purchasing.service';
import { SuppliersService } from './suppliers.service';

@Controller()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class PurchasingController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly purchasingService: PurchasingService,
  ) {}

  @Get('suppliers')
  @UseGuards(JwtAuthGuard)
  findAllSuppliers(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.suppliersService.findAll({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('suppliers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'warehouse')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Patch('suppliers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'warehouse')
  updateSupplier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, dto);
  }

  @Delete('suppliers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'warehouse')
  removeSupplier(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.remove(id);
  }

  @Get('suppliers/:id/balance')
  @UseGuards(JwtAuthGuard)
  getSupplierBalance(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.getBalance(id);
  }

  @Get('suppliers/:id')
  @UseGuards(JwtAuthGuard)
  findOneSupplier(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post('purchase-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'warehouse')
  createPurchaseOrder(
    @Body() dto: CreatePoDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.purchasingService.create(dto, req.user.userId);
  }

  @Get('purchase-orders')
  @UseGuards(JwtAuthGuard)
  findAllPurchaseOrders(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchasingService.findAll({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('purchase-orders/:id')
  @UseGuards(JwtAuthGuard)
  findOnePurchaseOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchasingService.findOne(id);
  }

  @Patch('purchase-orders/:id/receive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Roles('warehouse', 'admin')
  receivePurchaseOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePoDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.purchasingService.receive(id, dto, req.user.userId);
  }

  @Patch('purchase-orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'warehouse')
  updatePurchaseOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePoDto,
  ) {
    return this.purchasingService.update(id, dto);
  }

  @Delete('purchase-orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'warehouse')
  removePurchaseOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchasingService.remove(id);
  }
}
