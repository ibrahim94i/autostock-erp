import { Prisma, PrismaClient } from '@prisma/client';
import { EventType } from '../event-types.enum';

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

interface JournalLineInput {
  accountKey: AccountKey;
  debit: Decimal;
  credit: Decimal;
  partyType?: string;
  partyId?: string;
}

interface SaleItemPayload {
  qty: Decimal | number | string;
  unitPrice: Decimal | number | string;
  unitCost: Decimal | number | string;
}

interface SaleCreatedPayload {
  saleId?: string;
  customerId?: string;
  paymentType: string;
  items: SaleItemPayload[];
  memo?: string;
}

interface PurchaseItemPayload {
  qty: Decimal | number | string;
  unitCost: Decimal | number | string;
}

interface PurchaseReceivedPayload {
  supplierId: string;
  purchaseOrderId?: string;
  items: PurchaseItemPayload[];
  memo?: string;
}

interface PaymentMadePayload {
  direction: string;
  partyType: string;
  partyId: string;
  amount: Decimal | number | string;
  memo?: string;
}

interface ReturnItemPayload {
  qty: Decimal | number | string;
  unitCost: Decimal | number | string;
}

interface ReturnProcessedPayload {
  refundAmount: Decimal | number | string;
  refundMethod: string;
  customerId?: string;
  returnId?: string;
  items: ReturnItemPayload[];
  memo?: string;
}

interface StockAdjustAccountingItem {
  diff: Decimal | number | string;
  unitCost: Decimal | number | string;
}

interface StockAdjustedPayload {
  items: StockAdjustAccountingItem[];
  memo?: string;
}

const ACCOUNT_CODES = {
  Cash: '1000',
  Inventory: '1100',
  AccountsReceivable: '1200',
  AccountsPayable: '2000',
  Sales: '4000',
  COGS: '5000',
  SalesReturns: '4100',
  InventoryGain: '4200',
  InventoryShrinkage: '5100',
} as const;

type AccountKey = keyof typeof ACCOUNT_CODES;

export class AccountingHandler {
  async apply(
    tx: TransactionClient,
    eventRow: EventRow,
    payload: unknown,
  ): Promise<void> {
    const accounts = await this.resolveAccounts(tx);

    switch (eventRow.eventType) {
      case EventType.SALE_CREATED:
        await this.handleSaleCreated(
          tx,
          eventRow,
          payload as SaleCreatedPayload,
          accounts,
        );
        break;
      case EventType.PURCHASE_RECEIVED:
        await this.handlePurchaseReceived(
          tx,
          eventRow,
          payload as PurchaseReceivedPayload,
          accounts,
        );
        break;
      case EventType.PAYMENT_MADE:
        await this.handlePaymentMade(
          tx,
          eventRow,
          payload as PaymentMadePayload,
          accounts,
        );
        break;
      case EventType.RETURN_PROCESSED:
        await this.handleReturnProcessed(
          tx,
          eventRow,
          payload as ReturnProcessedPayload,
          accounts,
        );
        break;
      case EventType.STOCK_ADJUSTED:
        await this.handleStockAdjusted(
          tx,
          eventRow,
          payload as StockAdjustedPayload,
          accounts,
        );
        break;
    }
  }

  private async handleSaleCreated(
    tx: TransactionClient,
    eventRow: EventRow,
    payload: SaleCreatedPayload,
    accounts: Record<AccountKey, string>,
  ): Promise<void> {
    const total = payload.items.reduce(
      (sum, item) => sum.plus(toDecimal(item.qty).mul(toDecimal(item.unitPrice))),
      zero(),
    );
    const cogs = payload.items.reduce(
      (sum, item) => sum.plus(toDecimal(item.qty).mul(toDecimal(item.unitCost))),
      zero(),
    );

    const lines: JournalLineInput[] = [];
    const isCashSale = payload.paymentType.toUpperCase() === 'CASH';

    if (isCashSale) {
      lines.push(
        { accountKey: 'Cash', debit: total, credit: zero() },
        { accountKey: 'Sales', debit: zero(), credit: total },
      );
    } else {
      lines.push(
        {
          accountKey: 'AccountsReceivable',
          debit: total,
          credit: zero(),
          partyType: 'CUSTOMER',
          partyId: payload.customerId,
        },
        { accountKey: 'Sales', debit: zero(), credit: total },
      );
    }

    if (!cogs.isZero()) {
      lines.push(
        { accountKey: 'COGS', debit: cogs, credit: zero() },
        { accountKey: 'Inventory', debit: zero(), credit: cogs },
      );
    }

    await this.createBalancedEntry(tx, eventRow, {
      sourceType: 'SALE',
      sourceId: payload.saleId,
      memo: payload.memo,
      lines,
      accounts,
    });
  }

  private async handlePurchaseReceived(
    tx: TransactionClient,
    eventRow: EventRow,
    payload: PurchaseReceivedPayload,
    accounts: Record<AccountKey, string>,
  ): Promise<void> {
    const total = payload.items.reduce(
      (sum, item) => sum.plus(toDecimal(item.qty).mul(toDecimal(item.unitCost))),
      zero(),
    );

    await this.createBalancedEntry(tx, eventRow, {
      sourceType: 'PURCHASE',
      sourceId: payload.purchaseOrderId,
      memo: payload.memo,
      lines: [
        { accountKey: 'Inventory', debit: total, credit: zero() },
        {
          accountKey: 'AccountsPayable',
          debit: zero(),
          credit: total,
          partyType: 'SUPPLIER',
          partyId: payload.supplierId,
        },
      ],
      accounts,
    });
  }

  private async handlePaymentMade(
    tx: TransactionClient,
    eventRow: EventRow,
    payload: PaymentMadePayload,
    accounts: Record<AccountKey, string>,
  ): Promise<void> {
    const amount = toDecimal(payload.amount);
    const direction = payload.direction.toUpperCase();

    const lines: JournalLineInput[] =
      direction === 'IN'
        ? [
            { accountKey: 'Cash', debit: amount, credit: zero() },
            {
              accountKey: 'AccountsReceivable',
              debit: zero(),
              credit: amount,
              partyType: 'CUSTOMER',
              partyId: payload.partyId,
            },
          ]
        : [
            {
              accountKey: 'AccountsPayable',
              debit: amount,
              credit: zero(),
              partyType: 'SUPPLIER',
              partyId: payload.partyId,
            },
            { accountKey: 'Cash', debit: zero(), credit: amount },
          ];

    await this.createBalancedEntry(tx, eventRow, {
      sourceType: 'PAYMENT',
      sourceId: payload.partyId,
      memo: payload.memo,
      lines,
      accounts,
    });
  }

  private async handleReturnProcessed(
    tx: TransactionClient,
    eventRow: EventRow,
    payload: ReturnProcessedPayload,
    accounts: Record<AccountKey, string>,
  ): Promise<void> {
    const refund = toDecimal(payload.refundAmount);
    const cogs = payload.items.reduce(
      (sum, item) => sum.plus(toDecimal(item.qty).mul(toDecimal(item.unitCost))),
      zero(),
    );
    const isCashRefund = payload.refundMethod.toUpperCase() === 'CASH';

    const lines: JournalLineInput[] = [
      { accountKey: 'SalesReturns', debit: refund, credit: zero() },
    ];

    if (isCashRefund) {
      lines.push({ accountKey: 'Cash', debit: zero(), credit: refund });
    } else {
      lines.push({
        accountKey: 'AccountsReceivable',
        debit: zero(),
        credit: refund,
        partyType: 'CUSTOMER',
        partyId: payload.customerId,
      });
    }

    if (!cogs.isZero()) {
      lines.push(
        { accountKey: 'Inventory', debit: cogs, credit: zero() },
        { accountKey: 'COGS', debit: zero(), credit: cogs },
      );
    }

    await this.createBalancedEntry(tx, eventRow, {
      sourceType: 'RETURN',
      sourceId: payload.returnId,
      memo: payload.memo,
      lines,
      accounts,
    });
  }

  private async handleStockAdjusted(
    tx: TransactionClient,
    eventRow: EventRow,
    payload: StockAdjustedPayload,
    accounts: Record<AccountKey, string>,
  ): Promise<void> {
    const value = payload.items.reduce(
      (sum, item) => sum.plus(toDecimal(item.diff).mul(toDecimal(item.unitCost))),
      zero(),
    );

    if (value.isZero()) {
      return;
    }

    const lines: JournalLineInput[] = value.greaterThan(0)
      ? [
          { accountKey: 'Inventory', debit: value, credit: zero() },
          { accountKey: 'InventoryGain', debit: zero(), credit: value },
        ]
      : [
          {
            accountKey: 'InventoryShrinkage',
            debit: value.abs(),
            credit: zero(),
          },
          { accountKey: 'Inventory', debit: zero(), credit: value.abs() },
        ];

    await this.createBalancedEntry(tx, eventRow, {
      sourceType: 'ADJUSTMENT',
      memo: payload.memo,
      lines,
      accounts,
    });
  }

  private async resolveAccounts(
    tx: TransactionClient,
  ): Promise<Record<AccountKey, string>> {
    const codes = Object.values(ACCOUNT_CODES);
    const rows = await tx.account.findMany({
      where: { code: { in: codes } },
    });

    const byCode = new Map(rows.map((row) => [row.code, row.id]));
    const accounts = {} as Record<AccountKey, string>;

    for (const [key, code] of Object.entries(ACCOUNT_CODES) as [
      AccountKey,
      string,
    ][]) {
      const accountId = byCode.get(code);
      if (!accountId) {
        throw new Error(`Account not found for code ${code} (${key})`);
      }
      accounts[key] = accountId;
    }

    return accounts;
  }

  private async createBalancedEntry(
    tx: TransactionClient,
    eventRow: EventRow,
    options: {
      sourceType: string;
      sourceId?: string;
      memo?: string;
      lines: JournalLineInput[];
      accounts: Record<AccountKey, string>;
    },
  ): Promise<void> {
    const normalizedLines = options.lines.filter(
      (line) => !line.debit.isZero() || !line.credit.isZero(),
    );

    if (normalizedLines.length === 0) {
      return;
    }

    this.assertBalanced(normalizedLines);

    const entry = await tx.journalEntry.create({
      data: {
        eventId: eventRow.id,
        entryDate: resolveEntryDate(eventRow),
        sourceType: options.sourceType,
        sourceId: options.sourceId,
        memo: options.memo,
        createdBy: eventRow.createdBy,
      },
    });

    for (const line of normalizedLines) {
      await tx.journalLine.create({
        data: {
          entryId: entry.id,
          accountId: options.accounts[line.accountKey],
          debit: line.debit,
          credit: line.credit,
          partyType: line.partyType,
          partyId: line.partyId,
        },
      });

      await this.applyPartyBalanceChange(tx, entry.id, line);
    }
  }

  private assertBalanced(lines: JournalLineInput[]): void {
    let totalDebit = zero();
    let totalCredit = zero();

    for (const line of lines) {
      if (line.debit.gt(0) && line.credit.gt(0)) {
        throw new Error('Journal line cannot have both debit and credit');
      }
      if (line.debit.lt(0) || line.credit.lt(0)) {
        throw new Error('Journal line amounts must be non-negative');
      }

      totalDebit = totalDebit.plus(line.debit);
      totalCredit = totalCredit.plus(line.credit);
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new Error(
        `Unbalanced journal entry: debit=${totalDebit.toString()} credit=${totalCredit.toString()}`,
      );
    }
  }

  private async applyPartyBalanceChange(
    tx: TransactionClient,
    entryId: string,
    line: JournalLineInput,
  ): Promise<void> {
    if (!line.partyType || !line.partyId) {
      return;
    }

    const updatedAt = new Date();

    if (
      line.partyType === 'CUSTOMER' &&
      line.accountKey === 'AccountsReceivable'
    ) {
      const delta = line.debit.minus(line.credit);
      await this.upsertCustomerBalance(tx, line.partyId, delta, entryId, updatedAt);
      return;
    }

    if (
      line.partyType === 'SUPPLIER' &&
      line.accountKey === 'AccountsPayable'
    ) {
      const delta = line.credit.minus(line.debit);
      await this.upsertSupplierBalance(tx, line.partyId, delta, entryId, updatedAt);
    }
  }

  private async upsertCustomerBalance(
    tx: TransactionClient,
    customerId: string,
    delta: Decimal,
    lastEntryId: string,
    updatedAt: Date,
  ): Promise<void> {
    const existing = await tx.customerBalanceView.findUnique({
      where: { customerId },
    });
    const balance = (existing ? toDecimal(existing.balance) : zero()).plus(delta);

    await tx.customerBalanceView.upsert({
      where: { customerId },
      create: { customerId, balance, lastEntryId, updatedAt },
      update: { balance, lastEntryId, updatedAt },
    });
  }

  private async upsertSupplierBalance(
    tx: TransactionClient,
    supplierId: string,
    delta: Decimal,
    lastEntryId: string,
    updatedAt: Date,
  ): Promise<void> {
    const existing = await tx.supplierBalanceView.findUnique({
      where: { supplierId },
    });
    const balance = (existing ? toDecimal(existing.balance) : zero()).plus(delta);

    await tx.supplierBalanceView.upsert({
      where: { supplierId },
      create: { supplierId, balance, lastEntryId, updatedAt },
      update: { balance, lastEntryId, updatedAt },
    });
  }
}

function zero(): Decimal {
  return new Prisma.Decimal(0);
}

function toDecimal(value: Decimal | number | string): Decimal {
  return new Prisma.Decimal(value);
}

function resolveEntryDate(eventRow: EventRow): Date {
  return eventRow.occurredAt ?? new Date();
}
