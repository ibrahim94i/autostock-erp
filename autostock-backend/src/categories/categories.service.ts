import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, parentId: true },
    });
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { name: dto.name.trim() },
      select: { id: true, name: true, parentId: true },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    try {
      return await this.prisma.category.update({
        where: { id },
        data: { name: dto.name!.trim() },
        select: { id: true, name: true, parentId: true },
      });
    } catch {
      throw new NotFoundException('الفئة غير موجودة');
    }
  }
}
