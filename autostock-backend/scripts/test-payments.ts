/**
 * E2E test — Payments (PAYMENT_MADE) + P&L report
 * Run: npx ts-node --compiler-options {"module":"CommonJS"} scripts/test-payments.ts
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AccountingService } from '../src/accounting/accounting.service';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { EventCoreService } from '../src/events/event-core.service';
import { EventType } from '../src/events/event-types.enum';
import { PurchasingService } from '../src/purchasing/purchasing.service';
import { SalesService } from '../src/sales/sales.service';

const TAG = `E2E-PAYMENTS-${Date.now()}`;

function pass(label: string, detail?: string): void {
  console.log(`✅ PASS: ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, detail?: string): never {
  console.error(`❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
  process.exitCode = 1;
  throw new Error(label);
}

function assertTrue(condition: boolean, label: string, detail?: string): void {
  if (condition) pass(label, detail);
  else fail(label, detail);
}

async function sumPaymentJournalForEvent(
  prisma: PrismaService,
  eventId: string,
): Promise<{
  totalDebit: Prisma.Decimal;
  totalCredit: Prisma.Decimal;
  cashDebit: Prisma.Decimal;
  cashCredit: Prisma.Decimal;
  arDebit: Prisma.Decimal;
  arCredit: Prisma.Decimal;
  apDebit: Prisma.Decimal;
  apCredit: Prisma.Decimal;
}> {
  const entries = await prisma.journalEntry.findMany({
    where: { eventId },
    include: { lines: { include: { account: true } } },
  });

  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);
  let cashDebit = new Prisma.Decimal(0);
  let cashCredit = new Prisma.Decimal(0);
  let arDebit = new Prisma.Decimal(0);
  let arCredit = new Prisma.Decimal(0);
  let apDebit = new Prisma.Decimal(0);
  let apCredit = new Prisma.Decimal(0);

  for (const entry of entries) {
    for (const line of entry.lines) {
      totalDebit = totalDebit.plus(line.debit);
      totalCredit = totalCredit.plus(line.credit);
      if (line.account.code === '1000') {
        cashDebit = cashDebit.plus(line.debit);
        cashCredit = cashCredit.plus(line.credit);
      }
      if (line.account.code === '1200') {
        arDebit = arDebit.plus(line.debit);
        arCredit = arCredit.plus(line.credit);
      }
      if (line.account.code === '2000') {
        apDebit = apDebit.plus(line.debit);
        apCredit = apCredit.plus(line.credit);
      }
    }
  }

  return {
    totalDebit,
    totalCredit,
    cashDebit,
    cashCredit,
    arDebit,
    arCredit,
    apDebit,
    apCredit,
  };
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const prisma = app.get(PrismaService);
  const salesService = app.get(SalesService);
  const accountingService = app.get(AccountingService);
  const purchasingService = app.get(PurchasingService);
  const eventCore = app.get(EventCoreService);

  const ids: {
    categoryId?: string;
    customerId?: string;
    supplierId?: string;
    productId?: string;
    locationId?: string;
    saleIds: string[];
    poIds: string[];
    eventClientUuids: string[];
  } = { saleIds: [], poIds: [], eventClientUuids: [] };

  console.log(`\n=== Payments E2E Test [${TAG}] ===\n`);

  try {
    const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
    if (!admin) fail('Seed admin user exists');

    console.log('Setup: customer, supplier, product, location, stock...');
    const category = await prisma.category.create({
      data: { name: `${TAG}-category` },
    });
    ids.categoryId = category.id;

    const customer = await prisma.customer.create({
      data: { name: `${TAG}-customer`, phone: '333', type: 'retail' },
    });
    ids.customerId = customer.id;

    const supplier = await prisma.supplier.create({
      data: { name: `${TAG}-supplier`, phone: '4444444444' },
    });
    ids.supplierId = supplier.id;

    const product = await prisma.product.create({
      data: {
        sku: `${TAG}-sku`,
        name: `${TAG}-product`,
        categoryId: category.id,
        costPrice: 10,
        retailPrice: 18,
        wholesalePrice: 15,
        minStockAlert: 5,
        unit: 'pcs',
      },
    });
    ids.productId = product.id;

    const location = await prisma.location.create({
      data: { zone: 'P', shelf: '1', code: `${TAG}-loc` },
    });
    ids.locationId = location.id;

    const setupUuid = randomUUID();
    ids.eventClientUuids.push(setupUuid);
    const setupResult = await eventCore.dispatch({
      clientUuid: setupUuid,
      type: EventType.STOCK_ADJUSTED,
      payload: {
        items: [
          {
            productId: product.id,
            locationId: location.id,
            actualQty: 100,
            unitCost: 10,
          },
        ],
        reason: `${TAG} initial stock`,
      },
      createdBy: admin.id,
      deviceId: 'test-script',
      occurredAt: new Date(),
    });
    assertTrue(setupResult.status === 'APPLIED', 'Setup stock APPLIED');

    const saleItem = {
      productId: product.id,
      locationId: location.id,
      unitCost: 10,
    };

    // --- Test 1: Customer payment IN ---
    console.log('\nTest 1: Customer payment IN (debt sale + payment 200)...');

    const saleResult = await salesService.create(
      {
        customerId: customer.id,
        type: 'retail',
        paymentType: 'debt',
        items: [{ ...saleItem, qty: 20, unitPrice: 18 }],
      },
      admin.id,
    );
    console.log('Debt sale result:', JSON.stringify(saleResult, null, 2));
    assertTrue(saleResult.status === 'APPLIED', 'Test 1 debt sale APPLIED');
    if (saleResult.status !== 'APPLIED') fail('Test 1 debt sale not APPLIED');

    const saleDomain = saleResult.result as { domain?: { saleId: string } };
    ids.saleIds.push(saleDomain.domain!.saleId);

    const sale = await prisma.sale.findUnique({
      where: { id: saleDomain.domain!.saleId },
    });
    if (!sale) fail('Test 1 Sale row exists');
    ids.eventClientUuids.push(sale.clientUuid);

    const custBalBeforePay = await prisma.customerBalanceView.findUnique({
      where: { customerId: customer.id },
    });
    if (!custBalBeforePay) fail('Test 1 CustomerBalanceView exists after sale');
    assertTrue(
      new Prisma.Decimal(custBalBeforePay.balance).equals(360),
      'Test 1 CustomerBalanceView = 360 before payment',
      custBalBeforePay.balance.toString(),
    );

    const pay1Result = await accountingService.createPayment(
      {
        partyType: 'CUSTOMER',
        partyId: customer.id,
        amount: 200,
        direction: 'IN',
        method: 'cash',
      },
      admin.id,
    );
    console.log('Payment result:', JSON.stringify(pay1Result, null, 2));
    assertTrue(pay1Result.status === 'APPLIED', 'Test 1 payment APPLIED');
    if (pay1Result.status !== 'APPLIED') fail('Test 1 payment not APPLIED');

    const pay1Domain = pay1Result.result as {
      domain?: { paymentId: string };
      eventId: string;
    };
    const payment1 = await prisma.payment.findUnique({
      where: { id: pay1Domain.domain!.paymentId },
    });
    if (!payment1) fail('Test 1 Payment row exists');
    ids.eventClientUuids.push(payment1.clientUuid);

    const pay1Event = await prisma.eventLog.findUnique({
      where: { id: pay1Domain.eventId },
    });
    if (!pay1Event) fail('Test 1 payment EventLog exists');
    assertTrue(pay1Event.status === 'APPLIED', 'Test 1 EventLog APPLIED');

    const j1 = await sumPaymentJournalForEvent(prisma, pay1Event.id);
    assertTrue(j1.totalDebit.equals(j1.totalCredit), 'Test 1 Journal balanced');
    assertTrue(
      j1.cashDebit.equals(200),
      'Test 1 Dr Cash = 200',
      j1.cashDebit.toString(),
    );
    assertTrue(
      j1.arCredit.equals(200),
      'Test 1 Cr AccountsReceivable = 200',
      j1.arCredit.toString(),
    );

    const custBalAfterPay = await prisma.customerBalanceView.findUnique({
      where: { customerId: customer.id },
    });
    if (!custBalAfterPay) fail('Test 1 CustomerBalanceView after payment');
    assertTrue(
      new Prisma.Decimal(custBalAfterPay.balance).equals(160),
      'Test 1 CustomerBalanceView = 160 (360 - 200)',
      custBalAfterPay.balance.toString(),
    );

    const test1PaymentClientUuid = payment1.clientUuid;

    // --- Test 2: Supplier payment OUT ---
    console.log('\nTest 2: Supplier payment OUT (purchase receive + payment 100)...');

    const poUuid = randomUUID();
    const po = await prisma.purchaseOrder.create({
      data: {
        clientUuid: poUuid,
        supplierId: supplier.id,
        status: 'draft',
        createdBy: admin.id,
        items: {
          create: {
            productId: product.id,
            qty: 10,
            unitCost: 15,
          },
        },
      },
    });
    ids.poIds.push(po.id);

    const receiveResult = await purchasingService.receive(
      po.id,
      { locationId: location.id },
      admin.id,
    );
    console.log('Receive result:', JSON.stringify(receiveResult, null, 2));
    assertTrue(receiveResult.status === 'APPLIED', 'Test 2 purchase receive APPLIED');
    ids.eventClientUuids.push(poUuid);

    const supBalBeforePay = await prisma.supplierBalanceView.findUnique({
      where: { supplierId: supplier.id },
    });
    if (!supBalBeforePay) fail('Test 2 SupplierBalanceView exists after receive');
    assertTrue(
      new Prisma.Decimal(supBalBeforePay.balance).equals(150),
      'Test 2 SupplierBalanceView = 150 before payment',
      supBalBeforePay.balance.toString(),
    );

    const pay2Result = await accountingService.createPayment(
      {
        partyType: 'SUPPLIER',
        partyId: supplier.id,
        amount: 100,
        direction: 'OUT',
        method: 'cash',
      },
      admin.id,
    );
    console.log('Payment result:', JSON.stringify(pay2Result, null, 2));
    assertTrue(pay2Result.status === 'APPLIED', 'Test 2 payment APPLIED');
    if (pay2Result.status !== 'APPLIED') fail('Test 2 payment not APPLIED');

    const pay2Domain = pay2Result.result as {
      domain?: { paymentId: string };
      eventId: string;
    };
    const payment2 = await prisma.payment.findUnique({
      where: { id: pay2Domain.domain!.paymentId },
    });
    if (!payment2) fail('Test 2 Payment row exists');
    ids.eventClientUuids.push(payment2.clientUuid);

    const pay2Event = await prisma.eventLog.findUnique({
      where: { id: pay2Domain.eventId },
    });
    if (!pay2Event) fail('Test 2 payment EventLog exists');

    const j2 = await sumPaymentJournalForEvent(prisma, pay2Event.id);
    assertTrue(j2.totalDebit.equals(j2.totalCredit), 'Test 2 Journal balanced');
    assertTrue(
      j2.apDebit.equals(100),
      'Test 2 Dr AccountsPayable = 100',
      j2.apDebit.toString(),
    );
    assertTrue(
      j2.cashCredit.equals(100),
      'Test 2 Cr Cash = 100',
      j2.cashCredit.toString(),
    );

    const supBalAfterPay = await prisma.supplierBalanceView.findUnique({
      where: { supplierId: supplier.id },
    });
    if (!supBalAfterPay) fail('Test 2 SupplierBalanceView after payment');
    assertTrue(
      new Prisma.Decimal(supBalAfterPay.balance).equals(50),
      'Test 2 SupplierBalanceView = 50 (150 - 100)',
      supBalAfterPay.balance.toString(),
    );

    // --- Test 3: P&L report ---
    console.log('\nTest 3: P&L report...');
    const periodStart = new Date();
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date();
    periodEnd.setHours(23, 59, 59, 999);

    const pl = await accountingService.getProfitAndLoss(periodStart, periodEnd);
    console.log('P&L report:', JSON.stringify(pl, null, 2));

    assertTrue(pl.revenue === 360, 'Test 3 Revenue = 360', String(pl.revenue));
    assertTrue(pl.cogs === 200, 'Test 3 COGS = 200', String(pl.cogs));
    assertTrue(pl.returns === 0, 'Test 3 Returns = 0', String(pl.returns));
    assertTrue(
      pl.netProfit === 160,
      'Test 3 Net Profit = 160 (360 - 0 - 200)',
      String(pl.netProfit),
    );

    // --- Test 4: Idempotency ---
    console.log('\nTest 4: Idempotency (replay Test 1 payment clientUuid)...');
    const journalCountBeforeT4 = await prisma.journalEntry.count({
      where: { eventId: pay1Event.id },
    });
    const paymentCountBeforeT4 = await prisma.payment.count({
      where: { partyId: customer.id },
    });
    const custBalBeforeT4 = await prisma.customerBalanceView.findUnique({
      where: { customerId: customer.id },
    });

    const pay4Result = await eventCore.dispatch({
      clientUuid: test1PaymentClientUuid,
      type: EventType.PAYMENT_MADE,
      payload: {
        partyType: 'CUSTOMER',
        partyId: customer.id,
        amount: 200,
        direction: 'IN',
        method: 'cash',
      },
      createdBy: admin.id,
      deviceId: 'test-script',
      occurredAt: new Date(),
    });
    console.log('Result:', JSON.stringify(pay4Result, null, 2));

    assertTrue(pay4Result.status === 'APPLIED', 'Test 4 idempotent replay APPLIED');

    const journalCountAfterT4 = await prisma.journalEntry.count({
      where: { eventId: pay1Event.id },
    });
    assertTrue(
      journalCountAfterT4 === journalCountBeforeT4,
      'Test 4 no duplicate JournalEntry',
      `${journalCountBeforeT4} -> ${journalCountAfterT4}`,
    );

    const paymentCountAfterT4 = await prisma.payment.count({
      where: { partyId: customer.id },
    });
    assertTrue(
      paymentCountAfterT4 === paymentCountBeforeT4,
      'Test 4 no duplicate Payment row',
      `${paymentCountBeforeT4} -> ${paymentCountAfterT4}`,
    );

    const custBalAfterT4 = await prisma.customerBalanceView.findUnique({
      where: { customerId: customer.id },
    });
    if (!custBalAfterT4 || !custBalBeforeT4) fail('Test 4 CustomerBalanceView exists');
    assertTrue(
      new Prisma.Decimal(custBalAfterT4.balance).equals(custBalBeforeT4.balance),
      'Test 4 CustomerBalanceView unchanged',
      `${custBalBeforeT4.balance.toString()} -> ${custBalAfterT4.balance.toString()}`,
    );

    console.log('\n=== ALL PAYMENTS E2E CHECKS PASSED ===\n');
  } finally {
    console.log('Cleanup: removing test data...');
    await cleanup(prisma, ids);
    await app.close();
    console.log('Cleanup done.\n');
  }
}

async function cleanup(
  prisma: PrismaService,
  ids: {
    categoryId?: string;
    customerId?: string;
    supplierId?: string;
    productId?: string;
    locationId?: string;
    saleIds: string[];
    poIds: string[];
    eventClientUuids: string[];
  },
): Promise<void> {
  await prisma.payment.deleteMany({
    where: {
      OR: [
        ids.customerId ? { partyId: ids.customerId } : undefined,
        ids.supplierId ? { partyId: ids.supplierId } : undefined,
      ].filter(Boolean) as { partyId: string }[],
    },
  });

  for (const clientUuid of ids.eventClientUuids) {
    const eventLog = await prisma.eventLog.findUnique({ where: { clientUuid } });
    if (!eventLog) continue;

    const entries = await prisma.journalEntry.findMany({
      where: { eventId: eventLog.id },
      select: { id: true },
    });
    const entryIds = entries.map((e) => e.id);
    if (entryIds.length > 0) {
      await prisma.journalLine.deleteMany({ where: { entryId: { in: entryIds } } });
      await prisma.journalEntry.deleteMany({ where: { id: { in: entryIds } } });
    }

    await prisma.stockMovement.deleteMany({ where: { eventId: eventLog.id } });
    await prisma.eventLog.delete({ where: { id: eventLog.id } });
  }

  if (ids.productId && ids.locationId) {
    await prisma.stockBalanceView.deleteMany({
      where: { productId: ids.productId, locationId: ids.locationId },
    });
  }

  if (ids.customerId) {
    await prisma.customerBalanceView.deleteMany({
      where: { customerId: ids.customerId },
    });
  }

  if (ids.supplierId) {
    await prisma.supplierBalanceView.deleteMany({
      where: { supplierId: ids.supplierId },
    });
  }

  if (ids.saleIds.length > 0) {
    await prisma.return.deleteMany({ where: { saleId: { in: ids.saleIds } } });
    await prisma.saleItem.deleteMany({ where: { saleId: { in: ids.saleIds } } });
    await prisma.sale.deleteMany({ where: { id: { in: ids.saleIds } } });
  }

  if (ids.poIds.length > 0) {
    await prisma.purchaseItem.deleteMany({
      where: { poId: { in: ids.poIds } },
    });
    await prisma.purchaseOrder.deleteMany({ where: { id: { in: ids.poIds } } });
  }

  if (ids.productId) {
    await prisma.product.delete({ where: { id: ids.productId } }).catch(() => undefined);
  }
  if (ids.locationId) {
    await prisma.location.delete({ where: { id: ids.locationId } }).catch(() => undefined);
  }
  if (ids.customerId) {
    await prisma.customer.delete({ where: { id: ids.customerId } }).catch(() => undefined);
  }
  if (ids.supplierId) {
    await prisma.supplier.delete({ where: { id: ids.supplierId } }).catch(() => undefined);
  }
  if (ids.categoryId) {
    await prisma.category.delete({ where: { id: ids.categoryId } }).catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  console.error('\nTest failed with error:', error);
  process.exit(1);
});
