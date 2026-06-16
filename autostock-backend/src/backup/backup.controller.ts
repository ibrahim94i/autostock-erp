import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { BackupService } from './backup.service';
import { RestoreBackupDto } from './dto/restore-backup.dto';
import { UpdateBackupScheduleDto } from './dto/update-backup-schedule.dto';

@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('download')
  async download(@Res({ passthrough: false }) res: Response): Promise<void> {
    const payload = await this.backupService.exportBackup();
    const filename = this.backupService.formatBackupFilename(new Date(payload.exportedAt));

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(payload, null, 2));
  }

  @Post('restore/dry-run')
  dryRun(@Body() backupData: Record<string, unknown>) {
    return this.backupService.dryRun(backupData);
  }

  @Post('restore')
  restore(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: RestoreBackupDto,
  ) {
    return this.backupService.restore(req.user.userId, dto.confirmPassword, dto.backupData);
  }

  @Get('schedule')
  getSchedule() {
    return this.backupService.getSchedule();
  }

  @Patch('schedule')
  updateSchedule(@Body() dto: UpdateBackupScheduleDto) {
    return this.backupService.updateSchedule(dto);
  }
}
