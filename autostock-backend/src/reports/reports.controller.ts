import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  DailyReportQueryDto,
  DateRangeQueryDto,
  SalesReportQueryDto,
} from './dto/reports-query.dto';
import { ReportsService } from './reports.service';

@Controller('dashboard')
export class DashboardReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  getSummary() {
    return this.reportsService.getSummary();
  }
}

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  @Roles('admin', 'accountant')
  getDailyReport(@Query() query: DailyReportQueryDto) {
    return this.reportsService.getDailyReport(query.date);
  }

  @Get('sales')
  @Roles('admin', 'accountant')
  getSalesReport(@Query() query: SalesReportQueryDto) {
    return this.reportsService.getSalesReport(
      query.from,
      query.to,
      query.groupBy ?? 'day',
    );
  }

  @Get('products')
  @Roles('admin', 'accountant')
  getProductsReport(@Query() query: DateRangeQueryDto) {
    return this.reportsService.getProductsReport(query.from, query.to);
  }

  @Get('customers')
  @Roles('admin', 'accountant')
  getCustomersReport(@Query() query: DateRangeQueryDto) {
    return this.reportsService.getCustomersReport(query.from, query.to);
  }

  @Get('inventory-movement')
  @Roles('admin', 'accountant', 'warehouse')
  getInventoryMovementReport(@Query() query: DateRangeQueryDto) {
    return this.reportsService.getInventoryMovementReport(query.from, query.to);
  }
}
