import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [AuthModule],
  controllers: [LocationsController],
  providers: [LocationsService, JwtAuthGuard],
})
export class LocationsModule {}
