import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    let locations = await this.prisma.location.findMany({
      orderBy: [{ zone: 'asc' }, { code: 'asc' }],
    });

    if (locations.length === 0) {
      await this.prisma.location.create({
        data: {
          zone: 'المخزن الرئيسي',
          shelf: '1',
          code: 'MAIN',
        },
      });

      locations = await this.prisma.location.findMany({
        orderBy: [{ zone: 'asc' }, { code: 'asc' }],
      });
    }

    return locations;
  }
}
