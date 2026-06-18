import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseOrder } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { pieceUnitCostFromCarton } from '../common/utils/product-cost.util';
import {
  DispatchResult,
  EventCoreService,
} from '../events/event-core.service';
import { EventType } from '../events/event-types.enum';
import { CreatePoDto } from './dto/create-po.dto';
import { ReceivePoDto } from './dto/receive-po.dto';
import { SuppliersService } from './suppliers.service';

export interface FindPurchaseOrdersQuery {
  status?: string;
  page?: number;
  limit?: number;
}

export interface PurchaseOrderListItem {
  id: string;
  supplierId: string;
  status: string;
  createdAt: Date;
  supplier: { id: string; name: string };
  items: Array<{
    qty: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    product: { unitsPerCarton: number };
  }>;
}

export interface PaginatedPurchaseOrders {
  items: PurchaseOrderListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class PurchasingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suppliersService: SuppliersService,
    private readonly eventCoreService: EventCoreService,
  ) {}

  async findAll(query: FindPurchaseOrdersQuery): Promise<PaginatedPurchaseOrders> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          supplierId: true,
          status: true,
          createdAt: true,
          supplier: { select: { id: true, name: true } },
          items: {
            select: {
              qty: true,
              unitCost: true,
              product: { select: { unitsPerCarton: true } },
            },
          },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<PurchaseOrder> {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }

    return purchaseOrder;
  }

  async create(dto: CreatePoDto, createdBy: string): Promise<PurchaseOrder> {
    await this.suppliersService.findOne(dto.supplierId);

    return this.prisma.purchaseOrder.create({
      data: {
        clientUuid: randomUUID(),
        supplierId: dto.supplierId,
        status: 'draft',
        createdBy,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            unitCost: item.unitCost,
          })),
        },
      },
      include: {
        supplier: true,
        items: true,
      },
    });
  }

  async receive(
    id: string,
    dto: ReceivePoDto,
    createdBy: string,
  ): Promise<DispatchResult> {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { unitsPerCarton: true } } },
        },
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }

    if (po.status !== 'draft') {
      throw new BadRequestException('already received or invalid');
    }

    const result = await this.eventCoreService.dispatch({
      clientUuid: po.clientUuid,
      type: EventType.PURCHASE_RECEIVED,
      payload: {
        supplierId: po.supplierId,
        poId: po.id,
        items: po.items.map((item) => ({
          productId: item.productId,
          locationId: dto.locationId,
          qty: item.qty,
          unitCost: pieceUnitCostFromCarton(
            item.unitCost,
            item.product.unitsPerCarton,
          ),
        })),
      },
      createdBy,
      deviceId: 'purchasing-api',
      occurredAt: new Date(),
      onCommit: async (tx) => {
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: 'received' },
        });

        return { poId: po.id, status: 'received' };
      },
    });

    return result;
  }

  async update(id: string, dto: CreatePoDto): Promise<PurchaseOrder> {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }
    if (po.status !== 'draft') {
      throw new BadRequestException('لا يمكن تعديل أمر مستلم');
    }

    await this.suppliersService.findOne(dto.supplierId);

    return this.prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({ where: { poId: id } });
      return tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: dto.supplierId,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              unitCost: item.unitCost,
            })),
          },
        },
        include: { supplier: true, items: true },
      });
    });
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }
    if (po.status !== 'draft') {
      throw new BadRequestException('لا يمكن حذف أمر مستلم');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({ where: { poId: id } });
      await tx.purchaseOrder.delete({ where: { id } });
    });

    return { deleted: true };
  }
}
