import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ActivityLogService } from './activity-log.service';

@Controller('activity-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('eventType') eventType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityLogService.findAll({
      userId,
      from,
      to,
      eventType,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('users')
  listUsers() {
    return this.activityLogService.listUsers();
  }

  @Get('event-types')
  listEventTypes() {
    return this.activityLogService.listEventTypes();
  }
}
