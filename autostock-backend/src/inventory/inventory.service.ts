import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { pieceUnitCostFromCarton } from '../common/utils/product-cost.util';
import {
  DispatchResult,
  EventCoreService,
} from '../events/event-core.service';
import { EventType } from '../events/event-types.enum';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';

export interface PaginatedStockBalances {
  items: Array<{
    productId: string;
    locationId: string;
    quantity: Prisma.Decimal;
    lastMovementId: string;
    updatedAt: Date;
    product?: { id: string; sku: string; name: string; minStockAlert: number };
    location?: { id: string; zone: string; shelf: string; code: string };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LowStockAlert {
  productId: string;
  locationId: string;
  quantity: Prisma.Decimal;
  minStockAlert: number;
  product: { id: string; sku: string; name: string };
  location: { id: string; zone: string; shelf: string; code: string };
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventCoreService: EventCoreService,
  ) {}

  async reconcile(
    dto: AdjustStockDto,
    createdBy: string,
  ): Promise<DispatchResult> {
    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, costPrice: true, unitsPerCarton: true },
    });

    const costByProductId = new Map(
      products.map((product) => [
        product.id,
        pieceUnitCostFromCarton(product.costPrice, product.unitsPerCarton),
      ]),
    );

    for (const productId of productIds) {
      if (!costByProductId.has(productId)) {
        throw new NotFoundException(`Product ${productId} not found`);
      }
    }

    const items = dto.items.map((item) => ({
      productId: item.productId,
      locationId: item.locationId,
      actualQty: item.actualQty,
      unitCost: costByProductId.get(item.productId)!,
    }));

    return this.eventCoreService.dispatch({
      clientUuid: randomUUID(),
      type: EventType.STOCK_ADJUSTED,
      payload: {
        items,
        reason: dto.reason,
      },
      createdBy,
      deviceId: 'inventory-api',
      occurredAt: new Date(),
    });
  }

  async getBalances(query: StockQueryDto): Promise<PaginatedStockBalances> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StockBalanceViewWhereInput = {};

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.locationId) {
      where.locationId = query.locationId;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockBalanceView.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ productId: 'asc' }, { locationId: 'asc' }],
        include: {
          product: {
            select: { id: true, sku: true, name: true, minStockAlert: true },
          },
          location: {
            select: { id: true, zone: true, shelf: true, code: true },
          },
        },
      }),
      this.prisma.stockBalanceView.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getLowAlerts(): Promise<LowStockAlert[]> {
    const balances = await this.prisma.stockBalanceView.findMany({
      include: {
        product: {
          select: { id: true, sku: true, name: true, minStockAlert: true },
        },
        location: {
          select: { id: true, zone: true, shelf: true, code: true },
        },
      },
    });

    return balances
      .filter((balance) =>
        new Prisma.Decimal(balance.quantity).lt(balance.product.minStockAlert),
      )
      .map((balance) => ({
        productId: balance.productId,
        locationId: balance.locationId,
        quantity: balance.quantity,
        minStockAlert: balance.product.minStockAlert,
        product: {
          id: balance.product.id,
          sku: balance.product.sku,
          name: balance.product.name,
        },
        location: balance.location,
      }));
  }
}
