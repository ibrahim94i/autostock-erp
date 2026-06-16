"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/common/prisma/prisma.service");
const purchasing_service_1 = require("../src/purchasing/purchasing.service");
const TAG = `E2E-PURCHASE-${Date.now()}`;
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
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: false,
    });
    const prisma = app.get(prisma_service_1.PrismaService);
    const purchasingService = app.get(purchasing_service_1.PurchasingService);
    const ids = {};
    console.log(`\n=== Purchase E2E Test [${TAG}] ===\n`);
    try {
        const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
        if (!admin)
            fail('Seed admin user exists');
        console.log('Step 1: Create supplier, product, location...');
        const category = await prisma.category.create({
            data: { name: `${TAG}-category` },
        });
        ids.categoryId = category.id;
        const supplier = await prisma.supplier.create({
            data: { name: `${TAG}-supplier`, phone: '0000000000' },
        });
        ids.supplierId = supplier.id;
        const product = await prisma.product.create({
            data: {
                sku: `${TAG}-sku`,
                name: `${TAG}-product`,
                categoryId: category.id,
                costPrice: 15,
                retailPrice: 25,
                wholesalePrice: 20,
                minStockAlert: 5,
                unit: 'pcs',
            },
        });
        ids.productId = product.id;
        const location = await prisma.location.create({
            data: { zone: 'A', shelf: '1', code: `${TAG}-loc` },
        });
        ids.locationId = location.id;
        pass('Test entities created', `supplier=${supplier.id}`);
        console.log('\nStep 2: Create draft PurchaseOrder...');
        ids.clientUuid = (0, crypto_1.randomUUID)();
        const po = await prisma.purchaseOrder.create({
            data: {
                clientUuid: ids.clientUuid,
                supplierId: supplier.id,
                status: 'draft',
                createdBy: admin.id,
                items: {
                    create: {
                        productId: product.id,
                        qty: 20,
                        unitCost: 15,
                    },
                },
            },
            include: { items: true },
        });
        ids.poId = po.id;
        assertTrue(po.status === 'draft', 'PO status is draft');
        assertTrue(po.items.length === 1 &&
            new client_1.Prisma.Decimal(po.items[0].qty).equals(20) &&
            new client_1.Prisma.Decimal(po.items[0].unitCost).equals(15), 'PO item qty=20 unitCost=15');
        console.log('\nStep 3: Receive PO (PURCHASE_RECEIVED)...');
        const dispatchResult = await purchasingService.receive(po.id, { locationId: location.id }, admin.id);
        console.log('Dispatch result:', JSON.stringify(dispatchResult, null, 2));
        assertTrue(dispatchResult.status === 'APPLIED', 'Dispatch status APPLIED', dispatchResult.status === 'REJECTED'
            ? dispatchResult.reason
            : undefined);
        console.log('\nStep 4: Verify ledger & balances...');
        const eventLog = await prisma.eventLog.findUnique({
            where: { clientUuid: ids.clientUuid },
        });
        if (!eventLog)
            fail('EventLog exists for clientUuid');
        ids.eventLogId = eventLog.id;
        assertTrue(eventLog.status === 'APPLIED', 'EventLog status APPLIED', eventLog.status);
        const movement = await prisma.stockMovement.findFirst({
            where: { eventId: eventLog.id },
        });
        if (!movement)
            fail('StockMovement created');
        assertTrue(movement.direction === 'IN', 'StockMovement direction IN', movement.direction);
        assertTrue(new client_1.Prisma.Decimal(movement.quantity).equals(20), 'StockMovement quantity = 20', movement.quantity.toString());
        const stockBalance = await prisma.stockBalanceView.findUnique({
            where: {
                productId_locationId: {
                    productId: product.id,
                    locationId: location.id,
                },
            },
        });
        if (!stockBalance)
            fail('StockBalanceView exists');
        assertTrue(new client_1.Prisma.Decimal(stockBalance.quantity).equals(20), 'StockBalanceView quantity = 20', stockBalance.quantity.toString());
        const journalEntries = await prisma.journalEntry.findMany({
            where: { eventId: eventLog.id },
            include: { lines: { include: { account: true } } },
        });
        assertTrue(journalEntries.length === 1, 'One JournalEntry created');
        const entry = journalEntries[0];
        let totalDebit = new client_1.Prisma.Decimal(0);
        let totalCredit = new client_1.Prisma.Decimal(0);
        let inventoryDebit = new client_1.Prisma.Decimal(0);
        let apCredit = new client_1.Prisma.Decimal(0);
        for (const line of entry.lines) {
            totalDebit = totalDebit.plus(line.debit);
            totalCredit = totalCredit.plus(line.credit);
            if (line.account.code === '1100')
                inventoryDebit = inventoryDebit.plus(line.debit);
            if (line.account.code === '2000')
                apCredit = apCredit.plus(line.credit);
        }
        assertTrue(totalDebit.equals(totalCredit), 'JournalEntry balanced', `debit=${totalDebit} credit=${totalCredit}`);
        assertTrue(inventoryDebit.equals(300), 'Dr Inventory = 300', inventoryDebit.toString());
        assertTrue(apCredit.equals(300), 'Cr AccountsPayable = 300', apCredit.toString());
        const supplierBalance = await prisma.supplierBalanceView.findUnique({
            where: { supplierId: supplier.id },
        });
        if (!supplierBalance)
            fail('SupplierBalanceView exists');
        assertTrue(new client_1.Prisma.Decimal(supplierBalance.balance).equals(300), 'SupplierBalanceView balance = 300', supplierBalance.balance.toString());
        const poAfter = await prisma.purchaseOrder.findUnique({ where: { id: po.id } });
        if (!poAfter)
            fail('PO still exists');
        assertTrue(poAfter.status === 'received', 'PO status received', poAfter.status);
        console.log('\nStep 5: Idempotency — second receive must reject...');
        const movementCountBefore = await prisma.stockMovement.count({
            where: { eventId: eventLog.id },
        });
        const entryCountBefore = await prisma.journalEntry.count({
            where: { eventId: eventLog.id },
        });
        let rejected = false;
        try {
            await purchasingService.receive(po.id, { locationId: location.id }, admin.id);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                rejected = true;
                pass('Second receive rejected', error.message ?? 'already received or invalid');
            }
            else {
                throw error;
            }
        }
        assertTrue(rejected, 'Second receive throws BadRequestException');
        const movementCountAfter = await prisma.stockMovement.count({
            where: { eventId: eventLog.id },
        });
        const entryCountAfter = await prisma.journalEntry.count({
            where: { eventId: eventLog.id },
        });
        assertTrue(movementCountAfter === movementCountBefore, 'No duplicate StockMovement', `${movementCountBefore} -> ${movementCountAfter}`);
        assertTrue(entryCountAfter === entryCountBefore, 'No duplicate JournalEntry', `${entryCountBefore} -> ${entryCountAfter}`);
        console.log('\n=== ALL CHECKS PASSED ===\n');
    }
    finally {
        console.log('Cleanup: removing test data...');
        await cleanup(prisma, ids);
        await app.close();
        console.log('Cleanup done.\n');
    }
}
async function cleanup(prisma, ids) {
    if (ids.eventLogId) {
        const entries = await prisma.journalEntry.findMany({
            where: { eventId: ids.eventLogId },
            select: { id: true },
        });
        const entryIds = entries.map((e) => e.id);
        if (entryIds.length > 0) {
            await prisma.journalLine.deleteMany({
                where: { entryId: { in: entryIds } },
            });
            await prisma.journalEntry.deleteMany({
                where: { id: { in: entryIds } },
            });
        }
        await prisma.stockMovement.deleteMany({
            where: { eventId: ids.eventLogId },
        });
        await prisma.eventLog.delete({ where: { id: ids.eventLogId } });
    }
    if (ids.productId && ids.locationId) {
        await prisma.stockBalanceView.deleteMany({
            where: {
                productId: ids.productId,
                locationId: ids.locationId,
            },
        });
    }
    if (ids.supplierId) {
        await prisma.supplierBalanceView.deleteMany({
            where: { supplierId: ids.supplierId },
        });
    }
    if (ids.poId) {
        await prisma.purchaseItem.deleteMany({ where: { poId: ids.poId } });
        await prisma.purchaseOrder.delete({ where: { id: ids.poId } });
    }
    if (ids.productId) {
        await prisma.product.delete({ where: { id: ids.productId } });
    }
    if (ids.locationId) {
        await prisma.location.delete({ where: { id: ids.locationId } });
    }
    if (ids.supplierId) {
        await prisma.supplier.delete({ where: { id: ids.supplierId } });
    }
    if (ids.categoryId) {
        await prisma.category.delete({ where: { id: ids.categoryId } });
    }
}
main().catch((error) => {
    console.error('\nTest failed with error:', error);
    process.exit(1);
});
//# sourceMappingURL=test-purchase.js.map