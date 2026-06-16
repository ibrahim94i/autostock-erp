/**
 * E2E smoke test — EventCoreService.dispatch(STOCK_ADJUSTED)
 * Run: npx ts-node scripts/test-event-core.ts
 */
import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { EventCoreService } from '../src/events/event-core.service';
import { EventType } from '../src/events/event-types.enum';
import { PrismaService } from '../src/common/prisma/prisma.service';

const ACCOUNTS = [
  { code: '1000', name: 'Cash', type: 'ASSET' },
  { code: '1100', name: 'Inventory', type: 'ASSET' },
  { code: '1200', name: 'AccountsReceivable', type: 'ASSET' },
  { code: '2000', name: 'AccountsPayable', type: 'LIABILITY' },
  { code: '4000', name: 'Sales', type: 'REVENUE' },
  { code: '5000', name: 'COGS', type: 'EXPENSE' },
  { code: '4100', name: 'SalesReturns', type: 'REVENUE' },
  { code: '4200', name: 'InventoryGain', type: 'REVENUE' },
  { code: '5100', name: 'InventoryShrinkage', type: 'EXPENSE' },
];

function pass(label: string, detail?: string) {
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, detail?: string): never {
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  process.exit(1);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function ensureAccounts(prisma: PrismaClient) {
  for (const account of ACCOUNTS) {
    await prisma.account.upsert({
      where: { code: account.code },
      update: {},
      create: account,
    });
  }
}

async function main() {
  section('Setup');
  const prisma = new PrismaService();
  await prisma.$connect();
  await ensureAccounts(prisma);

  const runTag = `e2e-${Date.now()}`;
  const clientUuid = randomUUID();
  const createdBy = 'e2e-test-runner';
  const deviceId = 'e2e-device';

  const category = await prisma.category.create({
    data: { name: `Test Category ${runTag}` },
  });
  pass('Category created', category.id);

  const product = await prisma.product.create({
    data: {
      sku: `SKU-${runTag}`,
      name: `Test Product ${runTag}`,
      categoryId: category.id,
      costPrice: new Prisma.Decimal(10),
      retailPrice: new Prisma.Decimal(15),
      wholesalePrice: new Prisma.Decimal(12),
      minStockAlert: 5,
      unit: 'pcs',
    },
  });
  pass('Product created', `id=${product.id}, costPrice=10`);

  const location = await prisma.location.create({
    data: {
      zone: 'E2E',
      shelf: 'A1',
      code: `LOC-${runTag}`,
    },
  });
  pass('Location created', location.id);

  const eventCore = new EventCoreService(prisma);

  section('Dispatch #1 — STOCK_ADJUSTED actualQty=50');
  const dispatchInput = {
    clientUuid,
    type: EventType.STOCK_ADJUSTED,
    payload: {
      items: [
        {
          productId: product.id,
          locationId: location.id,
          actualQty: 50,
          unitCost: 10,
        },
      ],
      reason: 'e2e stock adjustment',
    },
    createdBy,
    deviceId,
    occurredAt: new Date(),
  };

  const result1 = await eventCore.dispatch(dispatchInput);
  console.log('  dispatch result:', JSON.stringify(result1, null, 2));

  if (result1.status !== 'APPLIED') {
    fail('First dispatch status', `expected APPLIED, got ${result1.status}`);
  }
  pass('Dispatch #1 status', 'APPLIED');

  const eventId = (result1.result as { eventId: string }).eventId;

  const eventLog = await prisma.eventLog.findUnique({ where: { clientUuid } });
  if (!eventLog) fail('EventLog exists');
  if (eventLog.status !== 'APPLIED') {
    fail('EventLog status', `expected APPLIED, got ${eventLog.status}`);
  }
  pass('EventLog status', 'APPLIED');

  const movements = await prisma.stockMovement.findMany({
    where: { eventId, productId: product.id, locationId: location.id },
  });
  if (movements.length !== 1) {
    fail('StockMovement count', `expected 1, got ${movements.length}`);
  }
  const movement = movements[0];
  if (movement.direction !== 'IN') {
    fail('StockMovement direction', `expected IN, got ${movement.direction}`);
  }
  if (!new Prisma.Decimal(movement.quantity).equals(50)) {
    fail('StockMovement quantity', `expected 50, got ${movement.quantity}`);
  }
  pass('StockMovement', `IN × ${movement.quantity}`);

  const balance = await prisma.stockBalanceView.findUnique({
    where: {
      productId_locationId: {
        productId: product.id,
        locationId: location.id,
      },
    },
  });
  if (!balance) fail('StockBalanceView exists');
  if (!new Prisma.Decimal(balance.quantity).equals(50)) {
    fail('StockBalanceView quantity', `expected 50, got ${balance.quantity}`);
  }
  pass('StockBalanceView', `quantity=${balance.quantity}`);

  const journalEntries = await prisma.journalEntry.findMany({ where: { eventId } });
  if (journalEntries.length !== 1) {
    fail('JournalEntry count', `expected 1, got ${journalEntries.length}`);
  }
  const entry = journalEntries[0];
  const lines = await prisma.journalLine.findMany({ where: { entryId: entry.id } });
  const totalDebit = lines.reduce(
    (s, l) => s.plus(l.debit),
    new Prisma.Decimal(0),
  );
  const totalCredit = lines.reduce(
    (s, l) => s.plus(l.credit),
    new Prisma.Decimal(0),
  );
  if (!totalDebit.equals(totalCredit)) {
    fail('Journal balance', `debit=${totalDebit} credit=${totalCredit}`);
  }
  pass('JournalEntry balanced', `debit=${totalDebit} credit=${totalCredit} (${lines.length} lines)`);

  section('Dispatch #2 — idempotency (same clientUuid)');
  const movementCountBefore = await prisma.stockMovement.count({ where: { eventId } });
  const journalCountBefore = await prisma.journalEntry.count({ where: { eventId } });
  const eventLogCountBefore = await prisma.eventLog.count({ where: { clientUuid } });

  const result2 = await eventCore.dispatch(dispatchInput);
  console.log('  idempotent result:', JSON.stringify(result2, null, 2));

  if (result2.status !== 'APPLIED') {
    fail('Second dispatch status', `expected APPLIED, got ${result2.status}`);
  }

  const movementCountAfter = await prisma.stockMovement.count({ where: { eventId } });
  const journalCountAfter = await prisma.journalEntry.count({ where: { eventId } });
  const eventLogCountAfter = await prisma.eventLog.count({ where: { clientUuid } });

  if (movementCountAfter !== movementCountBefore) {
    fail('Idempotency movements', `before=${movementCountBefore} after=${movementCountAfter}`);
  }
  if (journalCountAfter !== journalCountBefore) {
    fail('Idempotency journal entries', `before=${journalCountBefore} after=${journalCountAfter}`);
  }
  if (eventLogCountAfter !== eventLogCountBefore || eventLogCountAfter !== 1) {
    fail('Idempotency event logs', `count=${eventLogCountAfter}`);
  }

  const r1 = result1.result as { eventId: string; serverSeq: number };
  const r2 = result2.result as { eventId: string; serverSeq: number };
  if (r1.eventId !== r2.eventId || r1.serverSeq !== r2.serverSeq) {
    fail('Idempotency result payload', `r1=${JSON.stringify(r1)} r2=${JSON.stringify(r2)}`);
  }
  pass('Idempotency', 'same stored result, no duplicate movement/journal/event');

  section('Cleanup');
  await prisma.journalLine.deleteMany({ where: { entryId: entry.id } });
  await prisma.journalEntry.deleteMany({ where: { eventId } });
  await prisma.stockMovement.deleteMany({ where: { eventId } });
  await prisma.stockBalanceView.deleteMany({
    where: { productId: product.id, locationId: location.id },
  });
  await prisma.eventLog.delete({ where: { clientUuid } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.location.delete({ where: { id: location.id } });
  await prisma.category.delete({ where: { id: category.id } });
  pass('Test data removed');

  await prisma.$disconnect();

  section('SUMMARY');
  console.log('  🎉 ALL CHECKS PASSED — Event Core STOCK_ADJUSTED E2E OK');
}

main().catch((err) => {
  console.error('\n💥 Test failed with error:', err);
  process.exit(1);
});
