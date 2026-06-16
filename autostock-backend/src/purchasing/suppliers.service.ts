import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, Supplier } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

export interface FindSuppliersQuery {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedSuppliers {
  items: Supplier[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SupplierBalanceResponse {
  supplierId: string;
  balance: Prisma.Decimal | number;
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindSuppliersQuery): Promise<PaginatedSuppliers> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }

    return supplier;
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    return this.prisma.supplier.create({
      data: {
        name: dto.name,
        phone: dto.phone ?? '',
      },
    });
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    await this.findOne(id);

    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone ?? '' } : {}),
      },
    });
  }

  async remove(id: string): Promise<{ deleted: true }> {
    await this.findOne(id);

    const balanceView = await this.prisma.supplierBalanceView.findUnique({
      where: { supplierId: id },
    });
    const balance = balanceView ? Number(balanceView.balance) : 0;
    if (Math.abs(balance) > 0.0001) {
      throw new UnprocessableEntityException('لا يمكن حذف مورد له رصيد');
    }

    const poCount = await this.prisma.purchaseOrder.count({ where: { supplierId: id } });
    if (poCount > 0) {
      throw new UnprocessableEntityException('لا يمكن حذف مورد له أوامر شراء');
    }

    await this.prisma.supplier.delete({ where: { id } });
    return { deleted: true };
  }

  async getBalance(id: string): Promise<SupplierBalanceResponse> {
    await this.findOne(id);

    const balanceView = await this.prisma.supplierBalanceView.findUnique({
      where: { supplierId: id },
    });

    return {
      supplierId: id,
      balance: balanceView?.balance ?? 0,
    };
  }
}
