import {

  BadRequestException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { randomUUID } from 'crypto';

import { PrismaService } from '../common/prisma/prisma.service';
import { pieceUnitCostFromProduct } from '../common/utils/product-cost.util';

import {

  DispatchResult,

  EventCoreService,

} from '../events/event-core.service';

import { EventType } from '../events/event-types.enum';

import { CreateReturnDto } from './dto/create-return.dto';
import { CreateSaleDto } from './dto/create-sale.dto';



@Injectable()

export class SalesService {

  constructor(

    private readonly prisma: PrismaService,

    private readonly eventCoreService: EventCoreService,

  ) {}



  async create(dto: CreateSaleDto, createdBy: string): Promise<DispatchResult> {

    if (dto.paymentType === 'debt' && !dto.customerId) {

      throw new BadRequestException('customerId is required when paymentType is debt');

    }



    const clientUuid = randomUUID();

    const productIds = [...new Set(dto.items.map((item) => item.productId))];

    const products = await this.prisma.product.findMany({

      where: { id: { in: productIds } },

    });

    const averageCostByProduct = new Map(

      products.map((product) => [

        product.id,

        pieceUnitCostFromProduct(product),

      ]),

    );

    const saleItems = dto.items.map((item) => ({

      ...item,

      unitCost:

        averageCostByProduct.get(item.productId) ??

        new Prisma.Decimal(item.unitCost),

    }));

    const subtotal = saleItems.reduce(

      (sum, item) => sum.plus(new Prisma.Decimal(item.qty).mul(item.unitPrice)),

      new Prisma.Decimal(0),

    );



    return this.eventCoreService.dispatch({

      clientUuid,

      type: EventType.SALE_CREATED,

      payload: {

        customerId: dto.customerId ?? null,

        type: dto.type,

        paymentType: dto.paymentType,

        items: saleItems.map((item) => ({

          productId: item.productId,

          locationId: item.locationId,

          qty: item.qty,

          unitPrice: item.unitPrice,

          unitCost: item.unitCost,

        })),

      },

      createdBy,

      deviceId: 'sales-api',

      occurredAt: new Date(),

      onCommit: async (tx) => {

        const sale = await tx.sale.create({

          data: {

            clientUuid,

            customerId: dto.customerId,

            type: dto.type,

            paymentType: dto.paymentType,

            subtotal,

            status: 'completed',

            createdBy,

            items: {

              create: saleItems.map((item) => ({

                productId: item.productId,

                qty: item.qty,

                unitPrice: item.unitPrice,

                unitCost: item.unitCost,

              })),

            },

          },

        });



        return { saleId: sale.id };

      },

    });

  }



  async createReturn(
    saleId: string,
    dto: CreateReturnDto,
    createdBy: string,
  ): Promise<DispatchResult> {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true },
    });

    if (!sale) {
      throw new NotFoundException(`Sale ${saleId} not found`);
    }

    if (dto.refundMethod === 'credit' && !sale.customerId) {
      throw new BadRequestException(
        'credit refund requires a customer on the original sale',
      );
    }

    const soldByProduct = new Map<string, Prisma.Decimal>();
    for (const item of sale.items) {
      const current = soldByProduct.get(item.productId) ?? new Prisma.Decimal(0);
      soldByProduct.set(item.productId, current.plus(item.qty));
    }

    const existingReturns = await this.prisma.return.findMany({
      where: { saleId: sale.id },
    });

    const returnedByProduct = new Map<string, Prisma.Decimal>();
    for (const ret of existingReturns) {
      const current =
        returnedByProduct.get(ret.productId) ?? new Prisma.Decimal(0);
      returnedByProduct.set(ret.productId, current.plus(ret.qty));
    }

    const requestByProduct = new Map<string, Prisma.Decimal>();
    for (const item of dto.items) {
      const current =
        requestByProduct.get(item.productId) ?? new Prisma.Decimal(0);
      requestByProduct.set(
        item.productId,
        current.plus(new Prisma.Decimal(item.qty)),
      );
    }

    for (const [productId, requestQty] of requestByProduct) {
      const soldQty = soldByProduct.get(productId);
      if (!soldQty) {
        throw new BadRequestException(
          `Product ${productId} was not sold on this invoice`,
        );
      }

      const alreadyReturned =
        returnedByProduct.get(productId) ?? new Prisma.Decimal(0);
      const totalReturned = alreadyReturned.plus(requestQty);

      if (totalReturned.gt(soldQty)) {
        throw new BadRequestException(
          `Return quantity for product ${productId} exceeds sold quantity: sold ${soldQty.toString()}, already returned ${alreadyReturned.toString()}, requested ${requestQty.toString()}`,
        );
      }
    }

    const clientUuid = randomUUID();
    const totalReturnQty = dto.items.reduce(
      (sum, item) => sum.plus(new Prisma.Decimal(item.qty)),
      new Prisma.Decimal(0),
    );

    return this.eventCoreService.dispatch({
      clientUuid,
      type: EventType.RETURN_PROCESSED,
      payload: {
        saleId: sale.id,
        customerId: sale.customerId ?? undefined,
        refundMethod: dto.refundMethod,
        refundAmount: dto.refundAmount,
        reason: dto.reason,
        items: dto.items.map((item) => ({
          productId: item.productId,
          locationId: item.locationId,
          qty: item.qty,
          unitCost: item.unitCost,
        })),
      },
      createdBy,
      deviceId: 'sales-api',
      occurredAt: new Date(),
      onCommit: async (tx) => {
        const returnIds: string[] = [];

        for (const item of dto.items) {
          const itemRefund = new Prisma.Decimal(dto.refundAmount)
            .mul(item.qty)
            .div(totalReturnQty);

          const ret = await tx.return.create({
            data: {
              clientUuid: randomUUID(),
              saleId: sale.id,
              productId: item.productId,
              qty: item.qty,
              reason: dto.reason,
              refundAmount: itemRefund,
            },
          });

          returnIds.push(ret.id);
        }

        return { returnIds };
      },
    });
  }

  async findOne(id: string) {

    const sale = await this.prisma.sale.findUnique({

      where: { id },

      include: {

        items: {

          include: { product: true },

        },

        customer: true,

        returns: {

          include: { product: true },

        },

      },

    });



    if (!sale) {

      throw new NotFoundException(`Sale ${id} not found`);

    }



    return sale;

  }



  async getInvoice(id: string) {

    const sale = await this.findOne(id);



    const eventLog = await this.prisma.eventLog.findUnique({

      where: { clientUuid: sale.clientUuid },

    });



    const journalEntries = eventLog

      ? await this.prisma.journalEntry.findMany({

          where: { eventId: eventLog.id },

          include: {

            lines: {

              include: { account: true },

            },

          },

          orderBy: { entryDate: 'asc' },

        })

      : [];



    const returnedByProduct = new Map<string, Prisma.Decimal>();
    for (const ret of sale.returns) {
      const current =
        returnedByProduct.get(ret.productId) ?? new Prisma.Decimal(0);
      returnedByProduct.set(ret.productId, current.plus(ret.qty));
    }

    return {

      sale,

      items: sale.items,

      returns: sale.returns,

      returnedByProduct: Object.fromEntries(
        [...returnedByProduct.entries()].map(([productId, qty]) => [
          productId,
          qty.toString(),
        ]),
      ),

      event: eventLog,

      journalEntries,

    };

  }

}


