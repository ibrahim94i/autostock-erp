import { Controller, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TelegramService } from './telegram.service';

@Controller('telegram')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('test')
  @Roles('admin')
  sendTest() {
    return this.telegramService.sendConfiguredTestMessage();
  }
}
