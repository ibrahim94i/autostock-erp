import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export interface ActivityLogQuery {
  userId?: string;
  from?: string;
  to?: string;
  eventType?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ActivityLogQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const where: Prisma.EventLogWhereInput = {};

    if (query.userId) {
      where.createdBy = query.userId;
    }

    if (query.eventType) {
      where.eventType = query.eventType;
    }

    if (query.from || query.to) {
      where.occurredAt = {};
      if (query.from) {
        where.occurredAt.gte = new Date(`${query.from}T00:00:00.000Z`);
      }
      if (query.to) {
        where.occurredAt.lte = new Date(`${query.to}T23:59:59.999Z`);
      }
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.eventLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.eventLog.count({ where }),
    ]);

    const userIds = [...new Set(items.map((item) => item.createdBy))];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, username: true },
        })
      : [];

    const userById = new Map(users.map((user) => [user.id, user]));

    return {
      items: items.map((item) => ({
        id: item.id,
        eventType: item.eventType,
        status: item.status,
        occurredAt: item.occurredAt,
        appliedAt: item.appliedAt,
        createdBy: item.createdBy,
        user: userById.get(item.createdBy) ?? null,
        payload: item.payload,
        entity: this.extractEntity(item.eventType, item.payload),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async listUsers() {
    const rows = await this.prisma.eventLog.findMany({
      distinct: ['createdBy'],
      select: { createdBy: true },
    });

    const userIds = rows.map((row) => row.createdBy);
    if (userIds.length === 0) {
      return [];
    }

    return this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, username: true },
      orderBy: { name: 'asc' },
    });
  }

  listEventTypes() {
    return [
      'SALE_CREATED',
      'PURCHASE_RECEIVED',
      'STOCK_ADJUSTED',
      'PAYMENT_MADE',
      'RETURN_PROCESSED',
    ];
  }

  private extractEntity(
    eventType: string,
    payload: Prisma.JsonValue,
  ): { type: string; id: string | null; label: string | null } {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { type: 'unknown', id: null, label: null };
    }

    const data = payload as Record<string, unknown>;

    switch (eventType) {
      case 'SALE_CREATED':
        return {
          type: 'sale',
          id: typeof data.saleId === 'string' ? data.saleId : null,
          label: 'فاتورة مبيعات',
        };
      case 'RETURN_PROCESSED':
        return {
          type: 'return',
          id: typeof data.saleId === 'string' ? data.saleId : null,
          label: 'مرتجع مبيعات',
        };
      case 'PURCHASE_RECEIVED':
        return {
          type: 'purchase',
          id:
            typeof data.purchaseOrderId === 'string'
              ? data.purchaseOrderId
              : null,
          label: 'استلام مشتريات',
        };
      case 'PAYMENT_MADE':
        return {
          type: 'payment',
          id: typeof data.partyId === 'string' ? data.partyId : null,
          label:
            typeof data.partyType === 'string'
              ? `دفعة ${data.partyType}`
              : 'دفعة',
        };
      case 'STOCK_ADJUSTED':
        return {
          type: 'stock',
          id: null,
          label: 'تعديل مخزون',
        };
      default:
        return { type: eventType, id: null, label: eventType };
    }
  }
}
