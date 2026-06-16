import { Prisma, PrismaClient } from '@prisma/client';
import { EventType } from '../event-types.enum';
import {
  effectiveCartonCost,
  unitsPerCartonValue,
} from '../../common/utils/product-cost.util';

type Decimal = Prisma.Decimal;

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

export interface EventRow {
  id: string;
  eventType: string;
  createdBy: string;
  occurredAt?: Date;
}

interface StockItemPayload {
  productId: string;
  locationId: string;
  qty: Decimal | number | string;
  unitCost: Decimal | number | string;
}

interface StockAdjustItemPayload {
  productId: string;
  locationId: string;
  actualQty: Decimal | number | string;
  unitCost: Decimal | number | string;
}

interface SaleCreatedPayload {
  saleId?: string;
  items: StockItemPayload[];
}

interface PurchaseReceivedPayload {
  items: StockItemPayload[];
}

interface ReturnProcessedPayload {
  items: StockItemPayload[];
}

interface StockAdjustedPayload {
  items: StockAdjustItemPayload[];
}

export class StockHandler {
  async apply(
    tx: TransactionClient,
    eventRow: EventRow,
    payload: unknown,
  ): Promise<void> {
    switch (eventRow.eventType) {
      case EventType.SALE_CREATED:
        await this.handleSaleCreated(tx, eventRow, payload as SaleCreatedPayload);
        break;
      case EventType.PURCHASE_RECEIVED:
        await this.handlePurchaseReceived(
          tx,
          eventRow,
          payload as PurchaseReceivedPayload,
        );
        break;
      case EventType.RETURN_PROCESSED:
        await this.handleReturnProcessed(
          tx,
          eventRow,
          payload as ReturnProcessedPayload,
        );
        break;
      case EventType.STOCK_ADJUSTED:
        await this.handleStockAdjusted(
          tx,
          eventRow,
          payload as StockAdjustedPayload,
        );
        break;
    }
  }

  private async handleSaleCreated(
    tx: TransactionClient,
    eventRow: EventRow,
    payload: SaleCreatedPayload,
  ): Promise<void> {
    for (const item of payload.items) {
      const qty = toDecimal(item.qty);
      const movement = await tx.stockMovement.create({
        data: {
          eventId: eventRow.id,
          productId: item.productId,
          locationId: item.locationId,
          direction: 'OUT',
          quantity: positiveQty(qty),
          sourceType: 'SALE',
          sourceId: payload.saleId,
          unitCost: toDecimal(item.unitCost),
          createdBy: eventRow.createdBy,
          createdAt: resolveCreatedAt(eventRow),
        },
      });

      const currentQty = await this.getCurrentQuantity(
        tx,
        item.productId,
        item.locationId,
      );

      await this.upsertBalance(
        tx,
        item.productId,
        item.locationId,
        currentQty.minus(qty),
        movement.id,
      );
    }
  }

  private async handlePurchaseReceived(
    tx: TransactionClient,
    eventRow: EventRow,
    payload: PurchaseReceivedPayload,
  ): Promise<void> {
    for (const item of payload.items) {
      await this.updateWeightedAverageCost(
        tx,
        item.productId,
        item.qty,
        item.unitCost,
      );

      const qty = toDecimal(item.qty);
      const movement = await tx.stockMovement.create({
        data: {
          eventId: eventRow.id,
          productId: item.productId,
          locationId: item.locationId,
          direction: 'IN',
          quantity: positiveQty(qty),
          sourceType: 'PURCHASE',
          unitCost: toDecimal(item.unitCost),
          createdBy: eventRow.createdBy,
          createdAt: resolveCreatedAt(eventRow),
        },
      });

      const currentQty = await this.getCurrentQuantity(
        tx,
        item.productId,
        item.locationId,
      );

      await this.upsertBalance(
        tx,
        item.productId,
        item.locationId,
        currentQty.plus(qty),
        movement.id,
      );
    }
  }

  private async handleReturnProcessed(
    tx: TransactionClient,
    eventRow: EventRow,
    payload: ReturnProcessedPayload,
  ): Promise<void> {
    for (const item of payload.items) {
      const qty = toDecimal(item.qty);
      const movement = await tx.stockMovement.create({
        data: {
          eventId: eventRow.id,
          productId: item.productId,
          locationId: item.locationId,
          direction: 'IN',
          quantity: positiveQty(qty),
          sourceType: 'RETURN',
          unitCost: toDecimal(item.unitCost),
          createdBy: eventRow.createdBy,
          createdAt: resolveCreatedAt(eventRow),
        },
      });

      const currentQty = await this.getCurrentQuantity(
        tx,
        item.productId,
        item.locationId,
      );

      await this.upsertBalance(
        tx,
        item.productId,
        item.locationId,
        currentQty.plus(qty),
        movement.id,
      );
    }
  }

  private async handleStockAdjusted(
    tx: TransactionClient,
    eventRow: EventRow,
    payload: StockAdjustedPayload,
  ): Promise<void> {
    for (const item of payload.items) {
      const currentQty = await this.getCurrentQuantity(
        tx,
        item.productId,
        item.locationId,
      );
      const actualQty = toDecimal(item.actualQty);
      const diff = actualQty.minus(currentQty);

      if (diff.isZero()) {
        continue;
      }

      const direction = diff.greaterThan(0) ? 'IN' : 'OUT';
      const movementQty = positiveQty(diff);

      const movement = await tx.stockMovement.create({
        data: {
          eventId: eventRow.id,
          productId: item.productId,
          locationId: item.locationId,
          direction,
          quantity: movementQty,
          sourceType: 'ADJUSTMENT',
          unitCost: toDecimal(item.unitCost),
          createdBy: eventRow.createdBy,
          createdAt: resolveCreatedAt(eventRow),
        },
      });

      const newQty = diff.greaterThan(0)
        ? currentQty.plus(diff)
        : currentQty.minus(movementQty);

      await this.upsertBalance(
        tx,
        item.productId,
        item.locationId,
        newQty,
        movement.id,
      );
    }
  }

  private async getCurrentQuantity(
    tx: TransactionClient,
    productId: string,
    locationId: string,
  ): Promise<Decimal> {
    const balance = await tx.stockBalanceView.findUnique({
      where: {
        productId_locationId: { productId, locationId },
      },
    });

    return balance ? toDecimal(balance.quantity) : new Prisma.Decimal(0);
  }

  private async upsertBalance(
    tx: TransactionClient,
    productId: string,
    locationId: string,
    quantity: Decimal,
    lastMovementId: string,
  ): Promise<void> {
    const updatedAt = new Date();

    await tx.stockBalanceView.upsert({
      where: {
        productId_locationId: { productId, locationId },
      },
      create: {
        productId,
        locationId,
        quantity,
        lastMovementId,
        updatedAt,
      },
      update: {
        quantity,
        lastMovementId,
        updatedAt,
      },
    });
  }

  private async updateWeightedAverageCost(
    tx: TransactionClient,
    productId: string,
    purchaseQty: Decimal | number | string,
    purchasePieceCost: Decimal | number | string,
  ): Promise<void> {
    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return;
    }

    const upc = unitsPerCartonValue(product.unitsPerCarton);
    const currentQty = await this.getTotalProductQuantity(tx, productId);
    const currentPieceAvg = effectiveCartonCost(product).div(upc);
    const qty = toDecimal(purchaseQty);
    const pieceCost = toDecimal(purchasePieceCost);
    const newTotalQty = currentQty.plus(qty);

    const newPieceAvg = newTotalQty.isZero()
      ? pieceCost
      : currentQty.mul(currentPieceAvg).plus(qty.mul(pieceCost)).div(newTotalQty);

    const newCartonAvg = newPieceAvg.mul(upc);

    await tx.product.update({
      where: { id: productId },
      data: { averageCost: newCartonAvg },
    });
  }

  private async getTotalProductQuantity(
    tx: TransactionClient,
    productId: string,
  ): Promise<Decimal> {
    const balances = await tx.stockBalanceView.findMany({
      where: { productId },
    });

    return balances.reduce(
      (sum, balance) => sum.plus(toDecimal(balance.quantity)),
      new Prisma.Decimal(0),
    );
  }
}

function toDecimal(value: Decimal | number | string): Decimal {
  return new Prisma.Decimal(value);
}

function positiveQty(qty: Decimal): Decimal {
  return qty.abs();
}

function resolveCreatedAt(eventRow: EventRow): Date {
  return eventRow.occurredAt ?? new Date();
}
