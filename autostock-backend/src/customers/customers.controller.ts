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
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.findAll({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier', 'accountant')
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier', 'accountant')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier', 'accountant')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.remove(id);
  }

  @Get('balances/bulk')
  @UseGuards(JwtAuthGuard)
  getBalancesBulk(@Query('ids') ids?: string) {
    const idList = ids
      ? ids
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : undefined;
    return this.customersService.getBalancesBulk(idList);
  }

  @Get(':id/balance')
  @UseGuards(JwtAuthGuard)
  getBalance(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.getBalance(id);
  }

  @Get(':id/statement')
  @UseGuards(JwtAuthGuard)
  getStatement(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.getStatement(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }
}
