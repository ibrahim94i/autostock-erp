"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/common/prisma/prisma.service");
const event_core_service_1 = require("../src/events/event-core.service");
const event_types_enum_1 = require("../src/events/event-types.enum");
const sales_service_1 = require("../src/sales/sales.service");
const TAG = `E2E-SALES-${Date.now()}`;
function pass(label, detail) {
    console.log(`✅ PASS: ${label}${detail ? ` — ${detail}` : ''}`);
}
function fail(label, detail) {
    console.error(`❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
    process.exitCode = 1;
    throw new Error(label);
}
function assertTrue(condition, label, detail) {
    if (condition)
        pass(label, detail);
    else
        fail(label, detail);
}
async function getStockQty(prisma, productId, locationId) {
    const row = await prisma.stockBalanceView.findUnique({
        where: { productId_locationId: { productId, locationId } },
    });
    return row ? new client_1.Prisma.Decimal(row.quantity) : new client_1.Prisma.Decimal(0);
}
async function sumJournalForEvent(prisma, eventId) {
    const entries = await prisma.journalEntry.findMany({
        where: { eventId },
        include: { lines: { include: { account: true } } },
    });
    let totalDebit = new client_1.Prisma.Decimal(0);
    let totalCredit = new client_1.Prisma.Decimal(0);
    let cashDebit = new client_1.Prisma.Decimal(0);
    let salesCredit = new client_1.Prisma.Decimal(0);
    let cogsDebit = new client_1.Prisma.Decimal(0);
    let inventoryCredit = new client_1.Prisma.Decimal(0);
    let arDebit = new client_1.Prisma.Decimal(0);
    for (const entry of entries) {
        for (const line of entry.lines) {
            totalDebit = totalDebit.plus(line.debit);
            totalCredit = totalCredit.plus(line.credit);
            if (line.account.code === '1000')
                cashDebit = cashDebit.plus(line.debit);
            if (line.account.code === '4000')
                salesCredit = salesCredit.plus(line.credit);
            if (line.account.code === '5000')
                cogsDebit = cogsDebit.plus(line.debit);
            if (line.account.code === '1100')
                inventoryCredit = inventoryCredit.plus(line.credit);
            if (line.account.code === '1200')
                arDebit = arDebit.plus(line.debit);
        }
    }
    return {
        totalDebit,
        totalCredit,
        cashDebit,
        salesCredit,
        cogsDebit,
        inventoryCredit,
        arDebit,
    };
}
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: false,
    });
    const prisma = app.get(prisma_service_1.PrismaService);
    const salesService = app.get(sales_service_1.SalesService);
    const eventCore = app.get(event_core_service_1.EventCoreService);
    const ids = { saleIds: [], eventClientUuids: [] };
    console.log(`\n=== Sales E2E Test [${TAG}] ===\n`);
    try {
        const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
        if (!admin)
            fail('Seed admin user exists');
        console.log('Setup: customer, product, location, initial stock...');
        const category = await prisma.category.create({
            data: { name: `${TAG}-category` },
        });
        ids.categoryId = category.id;
        const customer = await prisma.customer.create({
            data: { name: `${TAG}-customer`, phone: '111', type: 'retail' },
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
        const setupUuid = (0, crypto_1.randomUUID)();
        ids.eventClientUuids.push(setupUuid);
        const setupResult = await eventCore.dispatch({
            clientUuid: setupUuid,
            type: event_types_enum_1.EventType.STOCK_ADJUSTED,
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
        assertTrue((await getStockQty(prisma, product.id, location.id)).equals(100), 'Initial StockBalanceView = 100');
        const saleItem = {
            productId: product.id,
            locationId: location.id,
            unitCost: 10,
        };
        console.log('\nTest 1: Cash sale (qty=10)...');
        const r1 = await salesService.create({
            type: 'retail',
            paymentType: 'cash',
            items: [{ ...saleItem, qty: 10, unitPrice: 18 }],
        }, admin.id);
        console.log('Result:', JSON.stringify(r1, null, 2));
        assertTrue(r1.status === 'APPLIED', 'Test 1 dispatch APPLIED');
        if (r1.status !== 'APPLIED')
            fail('Test 1 not APPLIED');
        const result1 = r1.result;
        const sale1 = await prisma.sale.findUnique({
            where: { id: result1.domain.saleId },
        });
        if (!sale1)
            fail('Test 1 Sale row exists');
        ids.saleIds.push(sale1.id);
        ids.eventClientUuids.push(sale1.clientUuid);
        const event1 = await prisma.eventLog.findUnique({
            where: { clientUuid: sale1.clientUuid },
        });
        if (!event1)
            fail('Test 1 EventLog exists');
        assertTrue(event1.status === 'APPLIED', 'Test 1 EventLog APPLIED');
        assertTrue(sale1.status === 'completed', 'Test 1 Sale status completed');
        assertTrue((await getStockQty(prisma, product.id, location.id)).equals(90), 'Test 1 StockBalanceView = 90');
        const j1 = await sumJournalForEvent(prisma, event1.id);
        assertTrue(j1.totalDebit.equals(j1.totalCredit), 'Test 1 Journal balanced');
        assertTrue(j1.cashDebit.equals(180), 'Test 1 Dr Cash = 180', j1.cashDebit.toString());
        assertTrue(j1.salesCredit.equals(180), 'Test 1 Cr Sales = 180', j1.salesCredit.toString());
        assertTrue(j1.cogsDebit.equals(100), 'Test 1 Dr COGS = 100', j1.cogsDebit.toString());
        assertTrue(j1.inventoryCredit.equals(100), 'Test 1 Cr Inventory = 100', j1.inventoryCredit.toString());
        const test1ClientUuid = sale1.clientUuid;
        const movementsAfterT1 = await prisma.stockMovement.count({
            where: { eventId: event1.id },
        });
        assertTrue(movementsAfterT1 >= 1, 'Test 1 StockMovement created');
        console.log('\nTest 2: Debt sale (qty=20)...');
        const r2 = await salesService.create({
            customerId: customer.id,
            type: 'retail',
            paymentType: 'debt',
            items: [{ ...saleItem, qty: 20, unitPrice: 18 }],
        }, admin.id);
        console.log('Result:', JSON.stringify(r2, null, 2));
        assertTrue(r2.status === 'APPLIED', 'Test 2 dispatch APPLIED');
        if (r2.status !== 'APPLIED')
            fail('Test 2 dispatch APPLIED');
        const result2 = r2.result;
        const sale2 = await prisma.sale.findUnique({
            where: { id: result2.domain.saleId },
        });
        if (!sale2)
            fail('Test 2 Sale row exists');
        ids.saleIds.push(sale2.id);
        ids.eventClientUuids.push(sale2.clientUuid);
        const event2 = await prisma.eventLog.findUnique({
            where: { clientUuid: sale2.clientUuid },
        });
        if (!event2)
            fail('Test 2 EventLog exists');
        assertTrue((await getStockQty(prisma, product.id, location.id)).equals(70), 'Test 2 StockBalanceView = 70');
        const j2 = await sumJournalForEvent(prisma, event2.id);
        assertTrue(j2.totalDebit.equals(j2.totalCredit), 'Test 2 Journal balanced');
        assertTrue(j2.arDebit.equals(360), 'Test 2 Dr AR = 360', j2.arDebit.toString());
        assertTrue(j2.salesCredit.equals(360), 'Test 2 Cr Sales = 360', j2.salesCredit.toString());
        assertTrue(j2.cogsDebit.equals(200), 'Test 2 Dr COGS = 200', j2.cogsDebit.toString());
        const custBal = await prisma.customerBalanceView.findUnique({
            where: { customerId: customer.id },
        });
        if (!custBal)
            fail('Test 2 CustomerBalanceView exists');
        assertTrue(new client_1.Prisma.Decimal(custBal.balance).equals(360), 'Test 2 CustomerBalanceView = 360', custBal.balance.toString());
        console.log('\nTest 3: Rejected sale (qty=1000)...');
        const stockBeforeT3 = await getStockQty(prisma, product.id, location.id);
        const movementCountBeforeT3 = await prisma.stockMovement.count({
            where: { productId: product.id },
        });
        const saleCountBeforeT3 = await prisma.sale.count();
        const rejectUuid = (0, crypto_1.randomUUID)();
        ids.eventClientUuids.push(rejectUuid);
        const r3 = await eventCore.dispatch({
            clientUuid: rejectUuid,
            type: event_types_enum_1.EventType.SALE_CREATED,
            payload: {
                customerId: null,
                type: 'retail',
                paymentType: 'cash',
                items: [{ ...saleItem, qty: 1000, unitPrice: 18 }],
            },
            createdBy: admin.id,
            deviceId: 'test-script',
            occurredAt: new Date(),
        });
        console.log('Result:', JSON.stringify(r3, null, 2));
        assertTrue(r3.status === 'REJECTED', 'Test 3 status REJECTED');
        if (r3.status === 'REJECTED') {
            assertTrue(r3.reason.toLowerCase().includes('insufficient stock'), 'Test 3 rejection reason mentions insufficient stock', r3.reason);
        }
        assertTrue((await getStockQty(prisma, product.id, location.id)).equals(stockBeforeT3), 'Test 3 StockBalanceView unchanged', stockBeforeT3.toString());
        const movementCountAfterT3 = await prisma.stockMovement.count({
            where: { productId: product.id },
        });
        assertTrue(movementCountAfterT3 === movementCountBeforeT3, 'Test 3 no new StockMovement', `${movementCountBeforeT3} -> ${movementCountAfterT3}`);
        const rejectedEvent = await prisma.eventLog.findUnique({
            where: { clientUuid: rejectUuid },
        });
        if (rejectedEvent) {
            const jeCount = await prisma.journalEntry.count({
                where: { eventId: rejectedEvent.id },
            });
            assertTrue(jeCount === 0, 'Test 3 no JournalEntry on REJECTED event');
        }
        const saleAfterT3 = await prisma.sale.findUnique({
            where: { clientUuid: rejectUuid },
        });
        assertTrue(saleAfterT3 === null, 'Test 3 no Sale row created');
        console.log('\nTest 4: Atomicity (onCommit failure → full rollback)...');
        const stockBeforeT4 = await getStockQty(prisma, product.id, location.id);
        const movementCountBeforeT4 = await prisma.stockMovement.count({
            where: { productId: product.id },
        });
        const journalCountBeforeT4 = await prisma.journalEntry.count();
        const atomicUuid = (0, crypto_1.randomUUID)();
        let atomicThrew = false;
        try {
            await eventCore.dispatch({
                clientUuid: atomicUuid,
                type: event_types_enum_1.EventType.SALE_CREATED,
                payload: {
                    customerId: null,
                    type: 'retail',
                    paymentType: 'cash',
                    items: [{ ...saleItem, qty: 5, unitPrice: 18 }],
                },
                createdBy: admin.id,
                deviceId: 'test-script',
                occurredAt: new Date(),
                onCommit: async (tx) => {
                    await tx.sale.create({
                        data: {
                            clientUuid: test1ClientUuid,
                            type: 'retail',
                            paymentType: 'cash',
                            subtotal: 90,
                            status: 'completed',
                            createdBy: admin.id,
                        },
                    });
                    return { saleId: 'should-not-reach' };
                },
            });
        }
        catch {
            atomicThrew = true;
        }
        assertTrue(atomicThrew, 'Test 4 dispatch threw on onCommit failure');
        assertTrue((await getStockQty(prisma, product.id, location.id)).equals(stockBeforeT4), 'Test 4 StockBalanceView unchanged after rollback', stockBeforeT4.toString());
        const movementCountAfterT4 = await prisma.stockMovement.count({
            where: { productId: product.id },
        });
        assertTrue(movementCountAfterT4 === movementCountBeforeT4, 'Test 4 no new StockMovement after rollback', `${movementCountBeforeT4} -> ${movementCountAfterT4}`);
        const journalCountAfterT4 = await prisma.journalEntry.count();
        assertTrue(journalCountAfterT4 === journalCountBeforeT4, 'Test 4 no new JournalEntry after rollback', `${journalCountBeforeT4} -> ${journalCountAfterT4}`);
        const atomicEvent = await prisma.eventLog.findUnique({
            where: { clientUuid: atomicUuid },
        });
        assertTrue(atomicEvent === null, 'Test 4 no APPLIED EventLog persisted');
        const atomicSale = await prisma.sale.findUnique({
            where: { clientUuid: atomicUuid },
        });
        assertTrue(atomicSale === null, 'Test 4 no Sale row persisted');
        console.log('\nTest 5: Idempotency (replay Test 1 clientUuid)...');
        const movementCountBeforeT5 = await prisma.stockMovement.count({
            where: { eventId: event1.id },
        });
        const saleCountBeforeT5 = await prisma.sale.count();
        const r5 = await eventCore.dispatch({
            clientUuid: test1ClientUuid,
            type: event_types_enum_1.EventType.SALE_CREATED,
            payload: {
                customerId: null,
                type: 'retail',
                paymentType: 'cash',
                items: [{ ...saleItem, qty: 10, unitPrice: 18 }],
            },
            createdBy: admin.id,
            deviceId: 'test-script',
            occurredAt: new Date(),
        });
        console.log('Result:', JSON.stringify(r5, null, 2));
        assertTrue(r5.status === 'APPLIED', 'Test 5 idempotent replay APPLIED');
        const movementCountAfterT5 = await prisma.stockMovement.count({
            where: { eventId: event1.id },
        });
        assertTrue(movementCountAfterT5 === movementCountBeforeT5, 'Test 5 no duplicate StockMovement', `${movementCountBeforeT5} -> ${movementCountAfterT5}`);
        const saleCountAfterT5 = await prisma.sale.count();
        assertTrue(saleCountAfterT5 === saleCountBeforeT5, 'Test 5 no duplicate Sale row', `${saleCountBeforeT5} -> ${saleCountAfterT5}`);
        console.log('\n=== ALL SALES E2E CHECKS PASSED ===\n');
    }
    finally {
        console.log('Cleanup: removing test data...');
        await cleanup(prisma, ids);
        await app.close();
        console.log('Cleanup done.\n');
    }
}
async function cleanup(prisma, ids) {
    for (const clientUuid of ids.eventClientUuids) {
        const eventLog = await prisma.eventLog.findUnique({ where: { clientUuid } });
        if (!eventLog)
            continue;
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
main().catch((error) => {
    console.error('\nTest failed with error:', error);
    process.exit(1);
});
//# sourceMappingURL=test-sales.js.map