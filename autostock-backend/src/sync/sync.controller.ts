import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PullDto } from './dto/pull.dto';
import { PushDto } from './dto/push.dto';
import { SyncService } from './sync.service';

@Controller('sync')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  @UseGuards(JwtAuthGuard)
  push(
    @Body() dto: PushDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.syncService.push(dto, req.user.userId);
  }

  @Get('pull')
  @UseGuards(JwtAuthGuard)
  pull(@Query() query: PullDto) {
    return this.syncService.pull(query.since ?? 0);
  }
}
