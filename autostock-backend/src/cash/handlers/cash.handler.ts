import { Prisma, PrismaClient } from '@prisma/client';
import { EventType } from '../../events/event-types.enum';

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

interface SaleItemPayload {
  qty: Decimal | number | string;
  unitPrice: Decimal | number | string;
}

interface SaleCreatedPayload {
  paymentType: string;
  items: SaleItemPayload[];
  memo?: string;
}

interface PaymentMadePayload {
  direction: string;
  partyType: string;
  partyId: string;
  amount: Decimal | number | string;
  memo?: string;
}

const INFLOW_TYPES = new Set(['sale', 'payment_in', 'cash_deposit']);
const OUTFLOW_TYPES = new Set(['payment_out', 'expense']);

export class CashHandler {
  async apply(
    tx: TransactionClient,
    eventRow: EventRow,
    payload: unknown,
  ): Promise<void> {
    const register = await this.findOpenRegisterForDate(
      tx,
      eventRow.occurredAt ?? new Date(),
    );
    if (!register) {
      return;
    }

    const existing = await tx.cashTransaction.findUnique({
      where: { reference: eventRow.id },
    });
    if (existing) {
      return;
    }

    switch (eventRow.eventType) {
      case EventType.SALE_CREATED:
        await this.handleSaleCreated(
          tx,
          eventRow,
          register.id,
          payload as SaleCreatedPayload,
        );
        break;
      case EventType.PAYMENT_MADE:
        await this.handlePaymentMade(
          tx,
          eventRow,
          register.id,
          payload as PaymentMadePayload,
        );
        break;
    }
  }

  private async handleSaleCreated(
    tx: TransactionClient,
    eventRow: EventRow,
    registerId: string,
    payload: SaleCreatedPayload,
  ): Promise<void> {
    if (payload.paymentType.toLowerCase() !== 'cash') {
      return;
    }

    const amount = payload.items.reduce(
      (sum, item) => sum.plus(toDecimal(item.qty).mul(toDecimal(item.unitPrice))),
      zero(),
    );

    if (amount.isZero()) {
      return;
    }

    await tx.cashTransaction.create({
      data: {
        registerId,
        type: 'sale',
        amount,
        description: payload.memo?.trim() || 'بيع نقدي',
        reference: eventRow.id,
        createdBy: eventRow.createdBy,
      },
    });
  }

  private async handlePaymentMade(
    tx: TransactionClient,
    eventRow: EventRow,
    registerId: string,
    payload: PaymentMadePayload,
  ): Promise<void> {
    const amount = toDecimal(payload.amount);
    if (amount.isZero()) {
      return;
    }

    const direction = payload.direction.toUpperCase();
    const type = direction === 'IN' ? 'payment_in' : 'payment_out';
    const partyLabel = payload.partyType === 'CUSTOMER' ? 'عميل' : 'مورد';
    const description =
      payload.memo?.trim() ||
      (direction === 'IN'
        ? `دفعة مستلمة — ${partyLabel}`
        : `دفعة مورد — ${partyLabel}`);

    await tx.cashTransaction.create({
      data: {
        registerId,
        type,
        amount,
        description,
        reference: eventRow.id,
        createdBy: eventRow.createdBy,
      },
    });
  }

  private async findOpenRegisterForDate(
    tx: TransactionClient,
    date: Date,
  ) {
    return tx.cashRegister.findFirst({
      where: {
        date: startOfUtcDay(date),
        status: 'open',
      },
    });
  }
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function isInflowTransaction(type: string): boolean {
  return INFLOW_TYPES.has(type);
}

export function isOutflowTransaction(type: string): boolean {
  return OUTFLOW_TYPES.has(type);
}

function toDecimal(value: Decimal | number | string): Decimal {
  return new Prisma.Decimal(value);
}

function zero(): Decimal {
  return new Prisma.Decimal(0);
}
