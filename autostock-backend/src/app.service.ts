import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';
import { getTrialStatus, type TrialStatus } from './common/trial/trial.util';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'AutoStock ERP API';
  }

  async getHealth(): Promise<{
    status: string;
    db: string;
    uptime: number;
    trial: TrialStatus;
  }> {
    const trial = getTrialStatus();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: trial.expired ? 'trial_expired' : 'ok',
        db: 'connected',
        uptime: process.uptime(),
        trial,
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        db: 'disconnected',
        uptime: process.uptime(),
        trial,
      });
    }
  }
}
