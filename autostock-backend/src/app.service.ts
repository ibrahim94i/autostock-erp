import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'AutoStock ERP API';
  }

  async getHealth(): Promise<{ status: string; db: string; uptime: number }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'connected', uptime: process.uptime() };
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        db: 'disconnected',
        uptime: process.uptime(),
      });
    }
  }
}
