import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventType } from './event-types.enum';
import { CashHandler } from '../cash/handlers/cash.handler';
import { AccountingHandler } from './handlers/accounting.handler';
import { StockHandler } from './handlers/stock.handler';
import { EVENT_EFFECTS_MAP } from './mapping/event-effects.map';

type Decimal = Prisma.Decimal;

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

export type { TransactionClient };

export interface EventRow {
  id: string;
  eventType: string;
  createdBy: string;
  occurredAt?: Date;
}

export interface DispatchEventInput {
  clientUuid: string;
  type: EventType;
  payload: unknown;
  createdBy: string;
  deviceId: string;
  localSeq?: number;
  occurredAt: Date;
  branchId?: string;
  onCommit?: (tx: TransactionClient, eventRow: EventRow) => Promise<unknown>;
}

export type DispatchResult =
  | { status: 'APPLIED'; result: unknown }
  | { status: 'REJECTED'; reason: string };

export class ValidationError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'ValidationError';
  }
}

interface StockValidatableItem {
  productId: string;
  locationId: string;
  qty: Decimal | number | string;
}

interface StockAdjustItem {
  productId: string;
  locationId: string;
  actualQty: Decimal | number | string;
  unitCost: Decimal | number | string;
  [key: string]: unknown;
}

interface PayloadWithItems {
  items: StockValidatableItem[] | StockAdjustItem[];
}

const MAX_DISPATCH_ATTEMPTS = 3;

@Injectable()
export class EventCoreService {
  private readonly stockHandler = new StockHandler();
  private readonly accountingHandler = new AccountingHandler();
  private readonly cashHandler = new CashHandler();

  constructor(private readonly prisma: PrismaService) {}

  async dispatch(event: DispatchEventInput): Promise<DispatchResult> {
    for (let attempt = 1; attempt <= MAX_DISPATCH_ATTEMPTS; attempt++) {
      try {
        return await this.dispatchOnce(event);
      } catch (error) {
        if (error instanceof ValidationError) {
          await this.persistRejectedEvent(event, error.reason);
          return { status: 'REJECTED', reason: error.reason };
        }

        if (attempt < MAX_DISPATCH_ATTEMPTS && isTransientError(error)) {
          await sleep(attempt * 100);
          continue;
        }

        throw error;
      }
    }

    throw new Error('Dispatch failed after retries');
  }

  private async dispatchOnce(event: DispatchEventInput): Promise<DispatchResult> {
    const existing = await this.prisma.eventLog.findUnique({
      where: { clientUuid: event.clientUuid },
    });

    if (existing) {
      return this.mapStoredResult(existing);
    }

    try {
      const result = await this.prisma.runInTransaction(async (tx) => {
        const eventLog = await tx.eventLog.create({
          data: {
            clientUuid: event.clientUuid,
            eventType: event.type,
            payload: event.payload as Prisma.InputJsonValue,
            status: 'PENDING',
            occurredAt: event.occurredAt,
            createdBy: event.createdBy,
            deviceId: event.deviceId,
            localSeq: event.localSeq ?? 0,
            branchId: event.branchId,
          },
        });

        const eventRow = {
          id: eventLog.id,
          eventType: event.type,
          createdBy: event.createdBy,
          occurredAt: event.occurredAt,
        };

        if (event.type === EventType.SALE_CREATED) {
          await this.validateStockAvailability(tx, event.payload);
        }

        let handlerPayload = event.payload;

        if (event.type === EventType.STOCK_ADJUSTED) {
          handlerPayload = await this.enrichStockAdjustedPayload(
            tx,
            event.payload,
          );
        }

        const effects = EVENT_EFFECTS_MAP[event.type];

        if (effects.stock) {
          await this.stockHandler.apply(tx, eventRow, handlerPayload);
        }

        if (effects.accounting) {
          await this.accountingHandler.apply(tx, eventRow, handlerPayload);
        }

        if (effects.cash) {
          await this.cashHandler.apply(tx, eventRow, handlerPayload);
        }

        let domain: unknown;
        if (event.onCommit) {
          domain = await event.onCommit(tx, eventRow);
        }

        const summary = {
          eventId: eventLog.id,
          serverSeq: eventLog.serverSeq,
          eventType: event.type,
          ...(domain !== undefined ? { domain } : {}),
        };

        await tx.eventLog.update({
          where: { id: eventLog.id },
          data: {
            status: 'APPLIED',
            appliedAt: new Date(),
            result: summary,
          },
        });

        return summary;
      });

      return { status: 'APPLIED', result };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const replay = await this.prisma.eventLog.findUnique({
          where: { clientUuid: event.clientUuid },
        });
        if (replay) {
          return this.mapStoredResult(replay);
        }
      }

      if (error instanceof ValidationError) {
        throw error;
      }

      throw error;
    }
  }

  private mapStoredResult(eventLog: {
    status: string;
    result: Prisma.JsonValue | null;
  }): DispatchResult {
    if (eventLog.status === 'REJECTED') {
      const stored = eventLog.result as { reason?: string } | null;
      return {
        status: 'REJECTED',
        reason: stored?.reason ?? 'Validation failed',
      };
    }

    return { status: 'APPLIED', result: eventLog.result };
  }

  private async persistRejectedEvent(
    event: DispatchEventInput,
    reason: string,
  ): Promise<void> {
    try {
      await this.prisma.eventLog.create({
        data: {
          clientUuid: event.clientUuid,
          eventType: event.type,
          payload: event.payload as Prisma.InputJsonValue,
          status: 'REJECTED',
          occurredAt: event.occurredAt,
          createdBy: event.createdBy,
          deviceId: event.deviceId,
          localSeq: event.localSeq ?? 0,
          branchId: event.branchId,
          appliedAt: new Date(),
          result: { reason },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }

      throw error;
    }
  }

  private async validateStockAvailability(
    tx: TransactionClient,
    payload: unknown,
  ): Promise<void> {
    const items = this.extractValidatableItems(payload);

    for (const item of items) {
      const balance = await tx.stockBalanceView.findUnique({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: item.locationId,
          },
        },
      });

      const available = balance
        ? toDecimal(balance.quantity)
        : new Prisma.Decimal(0);
      const required = toDecimal(item.qty);

      if (available.lt(required)) {
        throw new ValidationError(
          `Insufficient stock for product ${item.productId} at location ${item.locationId}: available ${available.toString()}, required ${required.toString()}`,
        );
      }
    }
  }

  private async enrichStockAdjustedPayload(
    tx: TransactionClient,
    payload: unknown,
  ): Promise<unknown> {
    const data = payload as { items: StockAdjustItem[] };

    const items = await Promise.all(
      data.items.map(async (item) => {
        const balance = await tx.stockBalanceView.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: item.locationId,
            },
          },
        });

        const currentQty = balance
          ? toDecimal(balance.quantity)
          : new Prisma.Decimal(0);
        const actualQty = toDecimal(item.actualQty);
        const diff = actualQty.minus(currentQty);

        return { ...item, diff };
      }),
    );

    return { ...data, items };
  }

  private extractValidatableItems(payload: unknown): StockValidatableItem[] {
    const data = payload as PayloadWithItems;

    if (!Array.isArray(data?.items)) {
      throw new ValidationError('Event payload must include items array');
    }

    return data.items as StockValidatableItem[];
  }
}

function toDecimal(value: Decimal | number | string): Decimal {
  return new Prisma.Decimal(value);
}

function isTransientError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P2034', 'P2028', 'P1001', 'P1002', 'P1017'].includes(error.code);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('deadlock') || message.includes('timeout');
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
