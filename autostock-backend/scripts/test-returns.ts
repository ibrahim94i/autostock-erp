/**
 * E2E test — Sales returns (RETURN_PROCESSED)
 * Run: npx ts-node --compiler-options {"module":"CommonJS"} scripts/test-returns.ts
 */
import 'dotenv/config';
import { BadRequestException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { EventCoreService } from '../src/events/event-core.service';
import { EventType } from '../src/events/event-types.enum';
import { SalesService } from '../src/sales/sales.service';

const TAG = `E2E-RETURNS-${Date.now()}`;

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

async function getStockQty(
  prisma: PrismaService,
  productId: string,
  locationId: string,
): Promise<Prisma.Decimal> {
  const row = await prisma.stockBalanceView.findUnique({
    where: { productId_locationId: { productId, locationId } },
  });
  return row ? new Prisma.Decimal(row.quantity) : new Prisma.Decimal(0);
}

async function sumReturnJournalForEvent(
  prisma: PrismaService,
  eventId: string,
): Promise<{
  totalDebit: Prisma.Decimal;
  totalCredit: Prisma.Decimal;
  salesReturnsDebit: Prisma.Decimal;
  cashCredit: Prisma.Decimal;
  arCredit: Prisma.Decimal;
  inventoryDebit: Prisma.Decimal;
  cogsCredit: Prisma.Decimal;
}> {
  const entries = await prisma.journalEntry.findMany({
    where: { eventId },
    include: { lines: { include: { account: true } } },
  });

  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);
  let salesReturnsDebit = new Prisma.Decimal(0);
  let cashCredit = new Prisma.Decimal(0);
  let arCredit = new Prisma.Decimal(0);
  let inventoryDebit = new Prisma.Decimal(0);
  let cogsCredit = new Prisma.Decimal(0);

  for (const entry of entries) {
    for (const line of entry.lines) {
      totalDebit = totalDebit.plus(line.debit);
      totalCredit = totalCredit.plus(line.credit);
      if (line.account.code === '4100') {
        salesReturnsDebit = salesReturnsDebit.plus(line.debit);
      }
      if (line.account.code === '1000') {
        cashCredit = cashCredit.plus(line.credit);
      }
      if (line.account.code === '1200') {
        arCredit = arCredit.plus(line.credit);
      }
      if (line.account.code === '1100') {
        inventoryDebit = inventoryDebit.plus(line.debit);
      }
      if (line.account.code === '5000') {
        cogsCredit = cogsCredit.plus(line.credit);
      }
    }
  }

  return {
    totalDebit,
    totalCredit,
    salesReturnsDebit,
    cashCredit,
    arCredit,
    inventoryDebit,
    cogsCredit,
  };
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const prisma = app.get(PrismaService);
  const salesService = app.get(SalesService);
  const eventCore = app.get(EventCoreService);

  const ids: {
    categoryId?: string;
    customerId?: string;
    productId?: string;
    locationId?: string;
    saleIds: string[];
    eventClientUuids: string[];
  } = { saleIds: [], eventClientUuids: [] };

  console.log(`\n=== Returns E2E Test [${TAG}] ===\n`);

  try {
    const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
    if (!admin) fail('Seed admin user exists');

    console.log('Setup: customer, product, location, stock, debt sale...');
    const category = await prisma.category.create({
      data: { name: `${TAG}-category` },
    });
    ids.categoryId = category.id;

    const customer = await prisma.customer.create({
      data: { name: `${TAG}-customer`, phone: '222', type: 'retail' },
    });
    ids.customerId = customer.id;

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
      data: { zone: 'R', shelf: '1', code: `${TAG}-loc` },
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
    assertTrue(
      (await getStockQty(prisma, product.id, location.id)).equals(100),
      'Initial StockBalanceView = 100',
    );

    const saleItem = {
      productId: product.id,
      locationId: location.id,
      unitCost: 10,
    };

    const saleResult = await salesService.create(
      {
        customerId: customer.id,
        type: 'retail',
        paymentType: 'debt',
        items: [{ ...saleItem, qty: 30, unitPrice: 18 }],
      },
      admin.id,
    );
    console.log('Debt sale result:', JSON.stringify(saleResult, null, 2));
    assertTrue(saleResult.status === 'APPLIED', 'Setup debt sale APPLIED');
    if (saleResult.status !== 'APPLIED') fail('Setup debt sale not APPLIED');

    const saleDomain = saleResult.result as { domain?: { saleId: string } };
    const saleId = saleDomain.domain!.saleId;
    ids.saleIds.push(saleId);

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) fail('Setup Sale row exists');
    ids.eventClientUuids.push(sale.clientUuid);

    assertTrue(
      (await getStockQty(prisma, product.id, location.id)).equals(70),
      'Stock after debt sale = 70',
    );

    const custBalAfterSale = await prisma.customerBalanceView.findUnique({
      where: { customerId: customer.id },
    });
    if (!custBalAfterSale) fail('CustomerBalanceView exists after sale');
    assertTrue(
      new Prisma.Decimal(custBalAfterSale.balance).equals(540),
      'CustomerBalanceView = 540 after debt sale',
      custBalAfterSale.balance.toString(),
    );

    // --- Test 1: Cash refund return ---
    console.log('\nTest 1: Cash refund (qty=5, refundAmount=90)...');
    const r1 = await salesService.createReturn(
      saleId,
      {
        items: [{ ...saleItem, qty: 5 }],
        refundMethod: 'cash',
        refundAmount: 90,
        reason: `${TAG} cash return`,
      },
      admin.id,
    );
    console.log('Result:', JSON.stringify(r1, null, 2));
    assertTrue(r1.status === 'APPLIED', 'Test 1 dispatch APPLIED');
    if (r1.status !== 'APPLIED') fail('Test 1 not APPLIED');

    const t1Domain = r1.result as {
      domain?: { returnIds: string[] };
      eventId: string;
    };
    assertTrue(
      (t1Domain.domain?.returnIds?.length ?? 0) >= 1,
      'Test 1 Return row created',
      JSON.stringify(t1Domain.domain?.returnIds),
    );

    const t1Event = await prisma.eventLog.findUnique({
      where: { id: t1Domain.eventId },
    });
    if (!t1Event) fail('Test 1 EventLog exists');
    ids.eventClientUuids.push(t1Event.clientUuid);
    assertTrue(t1Event.status === 'APPLIED', 'Test 1 EventLog APPLIED');

    assertTrue(
      (await getStockQty(prisma, product.id, location.id)).equals(75),
      'Test 1 StockBalanceView = 75 (70 + 5)',
    );

    const t1Movement = await prisma.stockMovement.findFirst({
      where: { eventId: t1Event.id },
    });
    if (!t1Movement) fail('Test 1 StockMovement exists');
    assertTrue(t1Movement.direction === 'IN', 'Test 1 StockMovement direction IN');
    assertTrue(
      new Prisma.Decimal(t1Movement.quantity).equals(5),
      'Test 1 StockMovement qty=5',
      t1Movement.quantity.toString(),
    );
    assertTrue(
      t1Movement.sourceType === 'RETURN',
      'Test 1 StockMovement sourceType RETURN',
      t1Movement.sourceType,
    );

    const j1 = await sumReturnJournalForEvent(prisma, t1Event.id);
    assertTrue(j1.totalDebit.equals(j1.totalCredit), 'Test 1 Journal balanced');
    assertTrue(
      j1.salesReturnsDebit.equals(90),
      'Test 1 Dr SalesReturns = 90',
      j1.salesReturnsDebit.toString(),
    );
    assertTrue(
      j1.cashCredit.equals(90),
      'Test 1 Cr Cash = 90',
      j1.cashCredit.toString(),
    );
    assertTrue(
      j1.inventoryDebit.equals(50),
      'Test 1 Dr Inventory = 50',
      j1.inventoryDebit.toString(),
    );
    assertTrue(
      j1.cogsCredit.equals(50),
      'Test 1 Cr COGS = 50',
      j1.cogsCredit.toString(),
    );

    const test1ReturnClientUuid = t1Event.clientUuid;

    // --- Test 2: Credit refund return ---
    console.log('\nTest 2: Credit refund (qty=5, refundAmount=90)...');
    const r2 = await salesService.createReturn(
      saleId,
      {
        items: [{ ...saleItem, qty: 5 }],
        refundMethod: 'credit',
        refundAmount: 90,
        reason: `${TAG} credit return`,
      },
      admin.id,
    );
    console.log('Result:', JSON.stringify(r2, null, 2));
    assertTrue(r2.status === 'APPLIED', 'Test 2 dispatch APPLIED');
    if (r2.status !== 'APPLIED') fail('Test 2 not APPLIED');

    const t2Domain = r2.result as { eventId: string; domain?: { returnIds: string[] } };
    const t2Event = await prisma.eventLog.findUnique({
      where: { id: t2Domain.eventId },
    });
    if (!t2Event) fail('Test 2 EventLog exists');
    ids.eventClientUuids.push(t2Event.clientUuid);
    assertTrue(
      (t2Domain.domain?.returnIds?.length ?? 0) >= 1,
      'Test 2 Return row created',
    );

    assertTrue(
      (await getStockQty(prisma, product.id, location.id)).equals(80),
      'Test 2 StockBalanceView = 80 (75 + 5)',
    );

    const j2 = await sumReturnJournalForEvent(prisma, t2Event.id);
    assertTrue(j2.totalDebit.equals(j2.totalCredit), 'Test 2 Journal balanced');
    assertTrue(
      j2.salesReturnsDebit.equals(90),
      'Test 2 Dr SalesReturns = 90',
      j2.salesReturnsDebit.toString(),
    );
    assertTrue(
      j2.arCredit.equals(90),
      'Test 2 Cr AccountsReceivable = 90',
      j2.arCredit.toString(),
    );
    assertTrue(
      j2.inventoryDebit.equals(50),
      'Test 2 Dr Inventory = 50',
      j2.inventoryDebit.toString(),
    );
    assertTrue(
      j2.cogsCredit.equals(50),
      'Test 2 Cr COGS = 50',
      j2.cogsCredit.toString(),
    );

    const custBalAfterT2 = await prisma.customerBalanceView.findUnique({
      where: { customerId: customer.id },
    });
    if (!custBalAfterT2) fail('Test 2 CustomerBalanceView exists');
    assertTrue(
      new Prisma.Decimal(custBalAfterT2.balance).equals(450),
      'Test 2 CustomerBalanceView = 450 (540 - 90)',
      custBalAfterT2.balance.toString(),
    );

    // --- Test 3: Reject exceeds sold qty ---
    console.log('\nTest 3: Reject return qty=1000 (exceeds sold 30)...');
    const stockBeforeT3 = await getStockQty(prisma, product.id, location.id);
    const returnCountBeforeT3 = await prisma.return.count({
      where: { saleId },
    });
    const movementCountBeforeT3 = await prisma.stockMovement.count({
      where: { productId: product.id },
    });
    const journalCountBeforeT3 = await prisma.journalEntry.count();

    let t3Threw = false;
    let t3Message = '';
    try {
      await salesService.createReturn(
        saleId,
        {
          items: [{ ...saleItem, qty: 1000 }],
          refundMethod: 'cash',
          refundAmount: 18000,
          reason: `${TAG} invalid return`,
        },
        admin.id,
      );
    } catch (error) {
      t3Threw = true;
      if (error instanceof BadRequestException) {
        t3Message = error.message;
      } else if (error instanceof Error) {
        t3Message = error.message;
      }
    }

    assertTrue(t3Threw, 'Test 3 threw BadRequest');
    assertTrue(
      t3Message.toLowerCase().includes('exceeds') ||
        t3Message.toLowerCase().includes('sold quantity'),
      'Test 3 rejection mentions exceeds sold quantity',
      t3Message,
    );

    assertTrue(
      (await getStockQty(prisma, product.id, location.id)).equals(stockBeforeT3),
      'Test 3 StockBalanceView unchanged',
      stockBeforeT3.toString(),
    );

    const returnCountAfterT3 = await prisma.return.count({ where: { saleId } });
    assertTrue(
      returnCountAfterT3 === returnCountBeforeT3,
      'Test 3 no new Return row',
      `${returnCountBeforeT3} -> ${returnCountAfterT3}`,
    );

    const movementCountAfterT3 = await prisma.stockMovement.count({
      where: { productId: product.id },
    });
    assertTrue(
      movementCountAfterT3 === movementCountBeforeT3,
      'Test 3 no new StockMovement',
      `${movementCountBeforeT3} -> ${movementCountAfterT3}`,
    );

    const journalCountAfterT3 = await prisma.journalEntry.count();
    assertTrue(
      journalCountAfterT3 === journalCountBeforeT3,
      'Test 3 no new JournalEntry',
      `${journalCountBeforeT3} -> ${journalCountAfterT3}`,
    );

    // --- Test 4: Return succeeds with zero stock (STEP 14-FIX) ---
    console.log('\nTest 4: Return with low stock (drain to 0, then return qty=2)...');
    const drainResult = await salesService.create(
      {
        type: 'retail',
        paymentType: 'cash',
        items: [{ ...saleItem, qty: 80, unitPrice: 18 }],
      },
      admin.id,
    );
    assertTrue(drainResult.status === 'APPLIED', 'Test 4 drain sale APPLIED');
    if (drainResult.status !== 'APPLIED') fail('Test 4 drain sale not APPLIED');

    const drainDomain = drainResult.result as { domain?: { saleId: string } };
    ids.saleIds.push(drainDomain.domain!.saleId);
    const drainSale = await prisma.sale.findUnique({
      where: { id: drainDomain.domain!.saleId },
    });
    if (drainSale) ids.eventClientUuids.push(drainSale.clientUuid);

    assertTrue(
      (await getStockQty(prisma, product.id, location.id)).equals(0),
      'Test 4 stock drained to 0',
    );

    const r4 = await salesService.createReturn(
      saleId,
      {
        items: [{ ...saleItem, qty: 2 }],
        refundMethod: 'cash',
        refundAmount: 36,
        reason: `${TAG} low-stock return`,
      },
      admin.id,
    );
    console.log('Result:', JSON.stringify(r4, null, 2));
    assertTrue(r4.status === 'APPLIED', 'Test 4 return APPLIED despite zero stock');
    if (r4.status !== 'APPLIED') fail('Test 4 return not APPLIED');

    const t4Domain = r4.result as { eventId: string };
    const t4Event = await prisma.eventLog.findUnique({
      where: { id: t4Domain.eventId },
    });
    if (t4Event) ids.eventClientUuids.push(t4Event.clientUuid);
    assertTrue(
      (await getStockQty(prisma, product.id, location.id)).equals(2),
      'Test 4 StockBalanceView = 2 after return IN',
    );

    // --- Test 5: Idempotency (replay Test 1 clientUuid) ---
    console.log('\nTest 5: Idempotency (replay Test 1 return clientUuid)...');
    const movementCountBeforeT5 = await prisma.stockMovement.count({
      where: { eventId: t1Event.id },
    });
    const returnCountBeforeT5 = await prisma.return.count({ where: { saleId } });

    const r5 = await eventCore.dispatch({
      clientUuid: test1ReturnClientUuid,
      type: EventType.RETURN_PROCESSED,
      payload: {
        saleId,
        customerId: customer.id,
        refundMethod: 'cash',
        refundAmount: 90,
        reason: `${TAG} cash return`,
        items: [{ ...saleItem, qty: 5 }],
      },
      createdBy: admin.id,
      deviceId: 'test-script',
      occurredAt: new Date(),
    });
    console.log('Result:', JSON.stringify(r5, null, 2));

    assertTrue(r5.status === 'APPLIED', 'Test 5 idempotent replay APPLIED');

    const movementCountAfterT5 = await prisma.stockMovement.count({
      where: { eventId: t1Event.id },
    });
    assertTrue(
      movementCountAfterT5 === movementCountBeforeT5,
      'Test 5 no duplicate StockMovement',
      `${movementCountBeforeT5} -> ${movementCountAfterT5}`,
    );

    const returnCountAfterT5 = await prisma.return.count({ where: { saleId } });
    assertTrue(
      returnCountAfterT5 === returnCountBeforeT5,
      'Test 5 no duplicate Return row',
      `${returnCountBeforeT5} -> ${returnCountAfterT5}`,
    );

    console.log('\n=== ALL RETURNS E2E CHECKS PASSED ===\n');
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
    productId?: string;
    locationId?: string;
    saleIds: string[];
    eventClientUuids: string[];
  },
): Promise<void> {
  if (ids.saleIds.length > 0) {
    await prisma.return.deleteMany({ where: { saleId: { in: ids.saleIds } } });
  }

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

  if (ids.saleIds.length > 0) {
    await prisma.saleItem.deleteMany({ where: { saleId: { in: ids.saleIds } } });
    await prisma.sale.deleteMany({ where: { id: { in: ids.saleIds } } });
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
  if (ids.categoryId) {
    await prisma.category.delete({ where: { id: ids.categoryId } }).catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  console.error('\nTest failed with error:', error);
  process.exit(1);
});
