import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { EventsModule } from '../events/events.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [SyncController],
  providers: [SyncService, JwtAuthGuard],
})
export class SyncModule {}
