import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { effectiveCartonCost } from '../common/utils/product-cost.util';
import { CreateProductDto } from './dto/create-product.dto';
import {
  BulkImportProductItemDto,
  BulkImportProductsDto,
} from './dto/bulk-import-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export interface FindProductsQuery {
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindProductsQuery): Promise<PaginatedProducts> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { active: true };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return product;
  }

  async getAverageCost(id: string): Promise<{
    productId: string;
    averageCost: Prisma.Decimal;
    lastUpdated: Date | null;
  }> {
    const product = await this.findOne(id);

    const latestBalance = await this.prisma.stockBalanceView.findFirst({
      where: { productId: id },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    const effective = effectiveCartonCost(product);

    return {
      productId: id,
      averageCost: effective,
      lastUpdated: latestBalance?.updatedAt ?? null,
    };
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const sku = await this.resolveUniqueSku((dto.sku?.trim() || dto.name.trim()));

    return this.prisma.product.create({
      data: {
        sku,
        name: dto.name,
        categoryId: dto.categoryId,
        costPrice: dto.costPrice,
        averageCost: dto.costPrice,
        retailPrice: dto.retailPrice,
        wholesalePrice: dto.wholesalePrice,
        minStockAlert: dto.minStockAlert,
        unit: dto.unit,
        unitsPerCarton: dto.unitsPerCarton ?? 1,
      },
    });
  }

  private async resolveUniqueSku(base: string): Promise<string> {
    const sanitized = base.replace(/\s+/g, '-').slice(0, 40) || `P-${randomBytes(3).toString('hex')}`;
    let candidate = sanitized;
    for (let i = 0; i < 100; i += 1) {
      const existing = await this.prisma.product.findFirst({
        where: { sku: { equals: candidate, mode: 'insensitive' } },
      });
      if (!existing) {
        return candidate;
      }
      candidate = `${sanitized}-${i + 2}`;
    }
    return `${sanitized}-${Date.now().toString(36)}`;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const product = await this.findOne(id);

    await this.prisma.product.update({
      where: { id },
      data: {
        active: false,
        sku: `__deleted__${product.id.slice(0, 8)}__${Date.now()}`,
      },
    });

    return { deleted: true };
  }

  async bulkImport(items: BulkImportProductItemDto[]): Promise<{
    imported: number;
    skipped: Array<{ row: number; sku: string; reason: string }>;
    createdCategories: string[];
  }> {
    const skipped: Array<{ row: number; sku: string; reason: string }> = [];
    const createdCategories: string[] = [];
    let imported = 0;

    const categories = await this.prisma.category.findMany();
    const categoryByName = new Map(
      categories.map((category) => [
        category.name.trim().toLowerCase(),
        category.id,
      ]),
    );

    const existingProducts = await this.prisma.product.findMany({
      where: { active: true },
      select: { sku: true },
    });
    const existingSkus = new Set(
      existingProducts.map((product) => product.sku.toLowerCase()),
    );
    const batchSkus = new Set<string>();

    for (let index = 0; index < items.length; index += 1) {
      const row = index + 1;
      const item = items[index];
      const categoryKey = item.categoryName.trim().toLowerCase();
      let categoryId = categoryByName.get(categoryKey);

      if (!categoryId) {
        const created = await this.prisma.category.create({
          data: { name: item.categoryName.trim() },
        });
        categoryId = created.id;
        categoryByName.set(categoryKey, categoryId);
        createdCategories.push(created.name);
      }

      const requestedSku = item.sku?.trim();
      let sku: string;

      if (requestedSku) {
        const skuKey = requestedSku.toLowerCase();
        if (existingSkus.has(skuKey) || batchSkus.has(skuKey)) {
          skipped.push({
            row,
            sku: requestedSku,
            reason: 'SKU مكرر',
          });
          continue;
        }
        sku = requestedSku;
      } else {
        sku = await this.resolveUniqueSku(item.name.trim());
        const skuKey = sku.toLowerCase();
        if (existingSkus.has(skuKey) || batchSkus.has(skuKey)) {
          skipped.push({
            row,
            sku,
            reason: 'SKU مكرر',
          });
          continue;
        }
      }

      await this.prisma.product.create({
        data: {
          sku,
          name: item.name.trim(),
          categoryId,
          costPrice: item.costPrice,
          averageCost: item.costPrice,
          retailPrice: item.retailPrice,
          wholesalePrice: item.wholesalePrice,
          minStockAlert: item.minStockAlert ?? 0,
          unit: item.unit.trim(),
          unitsPerCarton: item.unitsPerCarton ?? 1,
        },
      });

      batchSkus.add(sku.toLowerCase());
      existingSkus.add(sku.toLowerCase());
      imported += 1;
    }

    return { imported, skipped, createdCategories };
  }
}
