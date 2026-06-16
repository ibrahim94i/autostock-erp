import { Body, Controller, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { ResetDataDto } from './dto/reset-data.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('reset-data')
  @Roles('admin')
  resetData(@Body() _dto: ResetDataDto) {
    return this.adminService.resetAllData();
  }
}
