/**
 * E2E test — Offline sync (push + pull)
 * Run: npx ts-node --compiler-options {"module":"CommonJS"} scripts/test-sync.ts
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { EventType } from '../src/events/event-types.enum';
import { SyncService } from '../src/sync/sync.service';

const TAG = `E2E-SYNC-${Date.now()}`;

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

async function getMaxServerSeq(prisma: PrismaService): Promise<number> {
  const result = await prisma.eventLog.aggregate({ _max: { serverSeq: true } });
  return result._max.serverSeq ?? 0;
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

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const prisma = app.get(PrismaService);
  const syncService = app.get(SyncService);

  const ids: {
    categoryId?: string;
    customerId?: string;
    productId?: string;
    locationId?: string;
    eventClientUuids: string[];
  } = { eventClientUuids: [] };

  console.log(`\n=== Sync E2E Test [${TAG}] ===\n`);

  try {
    const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
    if (!admin) fail('Seed admin user exists');

    console.log('Setup: customer, product, location...');
    const category = await prisma.category.create({
      data: { name: `${TAG}-category` },
    });
    ids.categoryId = category.id;

    const customer = await prisma.customer.create({
      data: { name: `${TAG}-customer`, phone: '555', type: 'retail' },
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
      data: { zone: 'S', shelf: '1', code: `${TAG}-loc` },
    });
    ids.locationId = location.id;

    const baseline = await getMaxServerSeq(prisma);
    console.log(`Baseline serverSeq: ${baseline}`);
    pass('Baseline serverSeq recorded', String(baseline));

    const op1Uuid = randomUUID();
    const op2Uuid = randomUUID();
    ids.eventClientUuids.push(op1Uuid, op2Uuid);

    const now = new Date().toISOString();
    const batch1 = {
      deviceId: 'device-A',
      operations: [
        {
          clientUuid: op1Uuid,
          type: EventType.STOCK_ADJUSTED,
          localSeq: 1,
          occurredAt: now,
          payload: {
            items: [
              {
                productId: product.id,
                locationId: location.id,
                actualQty: 50,
                unitCost: 10,
              },
            ],
            reason: `${TAG} offline stock adjust`,
          },
        },
        {
          clientUuid: op2Uuid,
          type: EventType.SALE_CREATED,
          localSeq: 2,
          occurredAt: now,
          payload: {
            customerId: null,
            type: 'retail',
            paymentType: 'cash',
            items: [
              {
                productId: product.id,
                locationId: location.id,
                qty: 10,
                unitPrice: 18,
                unitCost: 10,
              },
            ],
          },
        },
      ],
    };

    // --- Test 1: Push batch ---
    console.log('\nTest 1: Push batch (STOCK_ADJUSTED + SALE_CREATED)...');
    const push1 = await syncService.push(batch1, admin.id);
    console.log('Result:', JSON.stringify(push1, null, 2));

    assertTrue(
      push1.applied.includes(op1Uuid) && push1.applied.includes(op2Uuid),
      'Test 1 both clientUuids in applied',
      JSON.stringify(push1.applied),
    );
    assertTrue(push1.rejected.length === 0, 'Test 1 rejected is empty');
    assertTrue(
      (await getStockQty(prisma, product.id, location.id)).equals(40),
      'Test 1 StockBalanceView = 40 (50 - 10)',
    );
    assertTrue(
      push1.serverSeq > baseline,
      'Test 1 serverSeq > baseline',
      `${baseline} -> ${push1.serverSeq}`,
    );

    const movementCountAfterT1 = await prisma.stockMovement.count({
      where: { productId: product.id },
    });
    const journalCountAfterT1 = await prisma.journalEntry.count();
    const eventLogCountAfterT1 = await prisma.eventLog.count({
      where: { clientUuid: { in: [op1Uuid, op2Uuid] } },
    });

    // --- Test 2: localSeq order (implicit) ---
    console.log('\nTest 2: localSeq order (adjust before sale)...');
    pass(
      'Test 2 operations applied in localSeq order',
      'stock 40 proves adjust(50) ran before sale(10)',
    );

    // --- Test 3: Idempotency replay ---
    console.log('\nTest 3: Idempotency (replay same batch)...');
    const push3 = await syncService.push(batch1, admin.id);
    console.log('Result:', JSON.stringify(push3, null, 2));

    assertTrue(
      push3.applied.includes(op1Uuid) && push3.applied.includes(op2Uuid),
      'Test 3 replay returns same clientUuids in applied',
    );
    assertTrue(push3.rejected.length === 0, 'Test 3 rejected is empty on replay');

    const movementCountAfterT3 = await prisma.stockMovement.count({
      where: { productId: product.id },
    });
    assertTrue(
      movementCountAfterT3 === movementCountAfterT1,
      'Test 3 no duplicate StockMovement',
      `${movementCountAfterT1} -> ${movementCountAfterT3}`,
    );

    const journalCountAfterT3 = await prisma.journalEntry.count();
    assertTrue(
      journalCountAfterT3 === journalCountAfterT1,
      'Test 3 no duplicate JournalEntry',
      `${journalCountAfterT1} -> ${journalCountAfterT3}`,
    );

    const eventLogCountAfterT3 = await prisma.eventLog.count({
      where: { clientUuid: { in: [op1Uuid, op2Uuid] } },
    });
    assertTrue(
      eventLogCountAfterT3 === eventLogCountAfterT1,
      'Test 3 no duplicate EventLog rows',
      `${eventLogCountAfterT1} -> ${eventLogCountAfterT3}`,
    );

    assertTrue(
      (await getStockQty(prisma, product.id, location.id)).equals(40),
      'Test 3 StockBalanceView unchanged at 40',
    );

    // --- Test 4: Rejected operation ---
    console.log('\nTest 4: Push rejected sale (qty=1000)...');
    const rejectUuid = randomUUID();
    ids.eventClientUuids.push(rejectUuid);

    const stockBeforeT4 = await getStockQty(prisma, product.id, location.id);
    const movementCountBeforeT4 = await prisma.stockMovement.count({
      where: { productId: product.id },
    });
    const journalCountBeforeT4 = await prisma.journalEntry.count();

    const push4 = await syncService.push(
      {
        deviceId: 'device-A',
        operations: [
          {
            clientUuid: rejectUuid,
            type: EventType.SALE_CREATED,
            localSeq: 1,
            occurredAt: new Date().toISOString(),
            payload: {
              customerId: null,
              type: 'retail',
              paymentType: 'cash',
              items: [
                {
                  productId: product.id,
                  locationId: location.id,
                  qty: 1000,
                  unitPrice: 18,
                  unitCost: 10,
                },
              ],
            },
          },
        ],
      },
      admin.id,
    );
    console.log('Result:', JSON.stringify(push4, null, 2));

    assertTrue(push4.rejected.length === 1, 'Test 4 one rejected operation');
    assertTrue(
      push4.rejected[0]?.clientUuid === rejectUuid,
      'Test 4 rejected clientUuid matches',
    );
    assertTrue(
      push4.rejected[0]?.reason.toLowerCase().includes('insufficient stock'),
      'Test 4 rejection reason mentions insufficient stock',
      push4.rejected[0]?.reason,
    );
    assertTrue(
      !push4.applied.includes(rejectUuid),
      'Test 4 rejected uuid not in applied',
    );

    assertTrue(
      (await getStockQty(prisma, product.id, location.id)).equals(stockBeforeT4),
      'Test 4 StockBalanceView unchanged',
      stockBeforeT4.toString(),
    );

    const movementCountAfterT4 = await prisma.stockMovement.count({
      where: { productId: product.id },
    });
    assertTrue(
      movementCountAfterT4 === movementCountBeforeT4,
      'Test 4 no new StockMovement',
      `${movementCountBeforeT4} -> ${movementCountAfterT4}`,
    );

    const journalCountAfterT4 = await prisma.journalEntry.count();
    assertTrue(
      journalCountAfterT4 === journalCountBeforeT4,
      'Test 4 no new JournalEntry',
      `${journalCountBeforeT4} -> ${journalCountAfterT4}`,
    );

    // --- Test 5: Pull delta ---
    console.log('\nTest 5: Pull delta (since=baseline)...');
    const pull1 = await syncService.pull(baseline);
    console.log(
      'Pull result:',
      JSON.stringify(
        {
          serverSeq: pull1.serverSeq,
          changeCount: pull1.changes.length,
          changes: pull1.changes.map((c) => ({
            serverSeq: c.serverSeq,
            eventType: c.eventType,
            clientUuid: c.clientUuid,
          })),
        },
        null,
        2,
      ),
    );

    assertTrue(pull1.changes.length >= 2, 'Test 5 changes has at least 2 events');

    const pulledUuids = pull1.changes.map((c) => c.clientUuid);
    assertTrue(
      pulledUuids.includes(op1Uuid) && pulledUuids.includes(op2Uuid),
      'Test 5 changes include STOCK_ADJUSTED and SALE_CREATED clientUuids',
    );

    for (let i = 1; i < pull1.changes.length; i++) {
      assertTrue(
        pull1.changes[i]!.serverSeq > pull1.changes[i - 1]!.serverSeq,
        'Test 5 changes sorted ascending by serverSeq',
      );
    }

    for (const change of pull1.changes) {
      if (change.clientUuid === op1Uuid || change.clientUuid === op2Uuid) {
        assertTrue(
          change.serverSeq > 0 &&
            !!change.eventType &&
            change.payload !== undefined &&
            !!change.clientUuid,
          'Test 5 change has required fields',
          change.clientUuid,
        );
      }
    }

    const stockChange = pull1.changes.find((c) => c.clientUuid === op1Uuid);
    const saleChange = pull1.changes.find((c) => c.clientUuid === op2Uuid);
    assertTrue(stockChange?.eventType === 'STOCK_ADJUSTED', 'Test 5 STOCK_ADJUSTED in pull');
    assertTrue(saleChange?.eventType === 'SALE_CREATED', 'Test 5 SALE_CREATED in pull');

    assertTrue(
      stockChange!.serverSeq < saleChange!.serverSeq,
      'Test 5 STOCK_ADJUSTED serverSeq before SALE_CREATED',
      `${stockChange!.serverSeq} < ${saleChange!.serverSeq}`,
    );

    const pull2 = await syncService.pull(pull1.serverSeq);
    console.log(
      'Pull (no new changes):',
      JSON.stringify({ serverSeq: pull2.serverSeq, changeCount: pull2.changes.length }, null, 2),
    );

    assertTrue(pull2.changes.length === 0, 'Test 5 pull after last serverSeq has empty changes');
    assertTrue(
      pull2.serverSeq === pull1.serverSeq,
      'Test 5 serverSeq unchanged when no delta',
      `${pull1.serverSeq} -> ${pull2.serverSeq}`,
    );

    console.log('\n=== ALL SYNC E2E CHECKS PASSED ===\n');
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
    eventClientUuids: string[];
  },
): Promise<void> {
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
