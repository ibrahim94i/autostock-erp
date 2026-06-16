"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const client_1 = require("@prisma/client");
const accounting_service_1 = require("../src/accounting/accounting.service");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/common/prisma/prisma.service");
const event_core_service_1 = require("../src/events/event-core.service");
const event_types_enum_1 = require("../src/events/event-types.enum");
const inventory_service_1 = require("../src/inventory/inventory.service");
const purchasing_service_1 = require("../src/purchasing/purchasing.service");
const sales_service_1 = require("../src/sales/sales.service");
const TAG = `E2E-FULL-${Date.now()}`;
const stepResults = [];
function record(step, check, expected, actual, ok) {
    stepResults.push({
        step,
        check,
        expected,
        actual,
        status: ok ? 'PASS' : 'FAIL',
    });
    if (!ok) {
        process.exitCode = 1;
        console.error(`❌ FAIL [${step}] ${check} — expected ${expected}, got ${actual}`);
    }
}
function assertStep(step, check, expected, actual, ok) {
    record(step, check, expected, actual, ok);
    if (ok)
        console.log(`✅ PASS [${step}] ${check} — ${actual}`);
}
async function getStockQty(prisma, productId, locationId) {
    const row = await prisma.stockBalanceView.findUnique({
        where: { productId_locationId: { productId, locationId } },
    });
    return row ? new client_1.Prisma.Decimal(row.quantity) : new client_1.Prisma.Decimal(0);
}
async function getCustomerBalance(prisma, customerId) {
    const row = await prisma.customerBalanceView.findUnique({
        where: { customerId },
    });
    return row ? new client_1.Prisma.Decimal(row.balance) : null;
}
async function getSupplierBalance(prisma, supplierId) {
    const row = await prisma.supplierBalanceView.findUnique({
        where: { supplierId },
    });
    return row ? new client_1.Prisma.Decimal(row.balance) : null;
}
async function sumJournalForEvent(prisma, eventId) {
    const entries = await prisma.journalEntry.findMany({
        where: { eventId },
        include: { lines: true },
    });
    let debit = new client_1.Prisma.Decimal(0);
    let credit = new client_1.Prisma.Decimal(0);
    for (const entry of entries) {
        for (const line of entry.lines) {
            debit = debit.plus(line.debit);
            credit = credit.plus(line.credit);
        }
    }
    return { debit, credit };
}
async function computeArBalanceFromLedger(prisma, customerId) {
    const ar = await prisma.account.findUnique({ where: { code: '1200' } });
    if (!ar)
        return new client_1.Prisma.Decimal(0);
    const lines = await prisma.journalLine.findMany({
        where: { accountId: ar.id, partyType: 'CUSTOMER', partyId: customerId },
    });
    return lines.reduce((sum, line) => sum.plus(line.debit).minus(line.credit), new client_1.Prisma.Decimal(0));
}
async function computeApBalanceFromLedger(prisma, supplierId) {
    const ap = await prisma.account.findUnique({ where: { code: '2000' } });
    if (!ap)
        return new client_1.Prisma.Decimal(0);
    const lines = await prisma.journalLine.findMany({
        where: { accountId: ap.id, partyType: 'SUPPLIER', partyId: supplierId },
    });
    return lines.reduce((sum, line) => sum.plus(line.credit).minus(line.debit), new client_1.Prisma.Decimal(0));
}
async function computeStockFromMovements(prisma, productId, locationId) {
    const movements = await prisma.stockMovement.findMany({
        where: { productId, locationId },
    });
    return movements.reduce((sum, m) => {
        const qty = new client_1.Prisma.Decimal(m.quantity);
        return m.direction === 'IN' ? sum.plus(qty) : sum.minus(qty);
    }, new client_1.Prisma.Decimal(0));
}
function printResultsTable() {
    console.log('\n=== STEP RESULTS ===\n');
    console.log('| Step | Check | Expected | Actual | Status |');
    console.log('|------|-------|----------|--------|--------|');
    for (const r of stepResults) {
        console.log(`| ${r.step} | ${r.check} | ${r.expected} | ${r.actual} | ${r.status} |`);
    }
}
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: false,
    });
    const prisma = app.get(prisma_service_1.PrismaService);
    const purchasingService = app.get(purchasing_service_1.PurchasingService);
    const salesService = app.get(sales_service_1.SalesService);
    const accountingService = app.get(accounting_service_1.AccountingService);
    const inventoryService = app.get(inventory_service_1.InventoryService);
    const eventCore = app.get(event_core_service_1.EventCoreService);
    const ids = { saleIds: [], eventClientUuids: [], eventLogIds: [] };
    console.log(`\n=== Full System E2E [${TAG}] ===\n`);
    try {
        const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
        if (!admin)
            throw new Error('Seed admin user missing');
        console.log('Setup: supplier, 2 customers, 2 products, location...');
        const category = await prisma.category.create({
            data: { name: `${TAG}-cat` },
        });
        ids.categoryId = category.id;
        const supplier = await prisma.supplier.create({
            data: { name: `${TAG}-supplier`, phone: '999' },
        });
        ids.supplierId = supplier.id;
        const customer1 = await prisma.customer.create({
            data: { name: `${TAG}-cust1`, phone: '111', type: 'retail' },
        });
        ids.customer1Id = customer1.id;
        const customer2 = await prisma.customer.create({
            data: { name: `${TAG}-cust2`, phone: '222', type: 'retail' },
        });
        ids.customer2Id = customer2.id;
        const product1 = await prisma.product.create({
            data: {
                sku: `${TAG}-p1`,
                name: `${TAG}-product1`,
                categoryId: category.id,
                costPrice: 10,
                retailPrice: 18,
                wholesalePrice: 15,
                minStockAlert: 5,
                unit: 'pcs',
            },
        });
        ids.product1Id = product1.id;
        const product2 = await prisma.product.create({
            data: {
                sku: `${TAG}-p2`,
                name: `${TAG}-product2`,
                categoryId: category.id,
                costPrice: 20,
                retailPrice: 35,
                wholesalePrice: 30,
                minStockAlert: 5,
                unit: 'pcs',
            },
        });
        ids.product2Id = product2.id;
        const location = await prisma.location.create({
            data: { zone: 'F', shelf: '1', code: `${TAG}-loc` },
        });
        ids.locationId = location.id;
        console.log('\n--- Step 1: Purchase (PO + receive) ---');
        const po = await purchasingService.create({
            supplierId: supplier.id,
            items: [
                { productId: product1.id, qty: 100, unitCost: 10 },
                { productId: product2.id, qty: 50, unitCost: 20 },
            ],
        }, admin.id);
        ids.poId = po.id;
        ids.eventClientUuids.push(po.clientUuid);
        const receiveResult = await purchasingService.receive(po.id, { locationId: location.id }, admin.id);
        if (receiveResult.status !== 'APPLIED') {
            throw new Error(`Receive failed: ${JSON.stringify(receiveResult)}`);
        }
        const receiveEvent = await prisma.eventLog.findUnique({
            where: { clientUuid: po.clientUuid },
        });
        if (receiveEvent)
            ids.eventLogIds.push(receiveEvent.id);
        const stock1AfterPurchase = await getStockQty(prisma, product1.id, location.id);
        const stock2AfterPurchase = await getStockQty(prisma, product2.id, location.id);
        const supBalAfterPurchase = await getSupplierBalance(prisma, supplier.id);
        assertStep('1', 'Product1 stock', '100', stock1AfterPurchase.toString(), stock1AfterPurchase.equals(100));
        assertStep('1', 'Product2 stock', '50', stock2AfterPurchase.toString(), stock2AfterPurchase.equals(50));
        assertStep('1', 'SupplierBalance', '2000', supBalAfterPurchase?.toString() ?? 'null', supBalAfterPurchase?.equals(2000) ?? false);
        console.log('\n--- Step 2: Cash sale (customer1, product1 qty=30) ---');
        const cashSaleResult = await salesService.create({
            customerId: customer1.id,
            type: 'retail',
            paymentType: 'cash',
            items: [
                {
                    productId: product1.id,
                    locationId: location.id,
                    qty: 30,
                    unitPrice: 18,
                    unitCost: 10,
                },
            ],
        }, admin.id);
        if (cashSaleResult.status !== 'APPLIED') {
            throw new Error(`Cash sale failed: ${JSON.stringify(cashSaleResult)}`);
        }
        const cashSaleDomain = cashSaleResult.result;
        ids.saleIds.push(cashSaleDomain.domain.saleId);
        const cashSale = await prisma.sale.findUnique({
            where: { id: cashSaleDomain.domain.saleId },
        });
        if (!cashSale)
            throw new Error('Cash sale row missing');
        ids.eventClientUuids.push(cashSale.clientUuid);
        ids.eventLogIds.push(cashSaleDomain.eventId);
        const cashJournal = await sumJournalForEvent(prisma, cashSaleDomain.eventId);
        const cashEntries = await prisma.journalEntry.findMany({
            where: { eventId: cashSaleDomain.eventId },
            include: { lines: { include: { account: true } } },
        });
        let cashDr = new client_1.Prisma.Decimal(0);
        let salesCr = new client_1.Prisma.Decimal(0);
        let cogsDr = new client_1.Prisma.Decimal(0);
        let invCr = new client_1.Prisma.Decimal(0);
        for (const entry of cashEntries) {
            for (const line of entry.lines) {
                if (line.account.code === '1000')
                    cashDr = cashDr.plus(line.debit);
                if (line.account.code === '4000')
                    salesCr = salesCr.plus(line.credit);
                if (line.account.code === '5000')
                    cogsDr = cogsDr.plus(line.debit);
                if (line.account.code === '1100')
                    invCr = invCr.plus(line.credit);
            }
        }
        const stock1AfterCash = await getStockQty(prisma, product1.id, location.id);
        assertStep('2', 'Product1 stock', '70', stock1AfterCash.toString(), stock1AfterCash.equals(70));
        assertStep('2', 'Journal balanced', 'debit=credit', `${cashJournal.debit.toString()}=${cashJournal.credit.toString()}`, cashJournal.debit.equals(cashJournal.credit));
        assertStep('2', 'Dr Cash', '540', cashDr.toString(), cashDr.equals(540));
        assertStep('2', 'Cr Sales', '540', salesCr.toString(), salesCr.equals(540));
        assertStep('2', 'Dr COGS', '300', cogsDr.toString(), cogsDr.equals(300));
        assertStep('2', 'Cr Inventory', '300', invCr.toString(), invCr.equals(300));
        const cashSaleClientUuid = cashSale.clientUuid;
        console.log('\n--- Step 3: Debt sale (customer2, product2 qty=20) ---');
        const debtSaleResult = await salesService.create({
            customerId: customer2.id,
            type: 'retail',
            paymentType: 'debt',
            items: [
                {
                    productId: product2.id,
                    locationId: location.id,
                    qty: 20,
                    unitPrice: 35,
                    unitCost: 20,
                },
            ],
        }, admin.id);
        if (debtSaleResult.status !== 'APPLIED') {
            throw new Error(`Debt sale failed: ${JSON.stringify(debtSaleResult)}`);
        }
        const debtSaleDomain = debtSaleResult.result;
        ids.saleIds.push(debtSaleDomain.domain.saleId);
        const debtSale = await prisma.sale.findUnique({
            where: { id: debtSaleDomain.domain.saleId },
        });
        if (debtSale)
            ids.eventClientUuids.push(debtSale.clientUuid);
        ids.eventLogIds.push(debtSaleDomain.eventId);
        const stock2AfterDebt = await getStockQty(prisma, product2.id, location.id);
        const cust2BalAfterDebt = await getCustomerBalance(prisma, customer2.id);
        assertStep('3', 'Product2 stock', '30', stock2AfterDebt.toString(), stock2AfterDebt.equals(30));
        assertStep('3', 'Customer2 balance', '700', cust2BalAfterDebt?.toString() ?? 'null', cust2BalAfterDebt?.equals(700) ?? false);
        console.log('\n--- Step 4: Return (customer2, product2 qty=5, credit) ---');
        const returnResult = await salesService.createReturn(debtSaleDomain.domain.saleId, {
            items: [
                {
                    productId: product2.id,
                    locationId: location.id,
                    qty: 5,
                    unitCost: 20,
                },
            ],
            refundMethod: 'credit',
            refundAmount: 175,
            reason: `${TAG} return`,
        }, admin.id);
        if (returnResult.status !== 'APPLIED') {
            throw new Error(`Return failed: ${JSON.stringify(returnResult)}`);
        }
        const returnDomain = returnResult.result;
        const returnEvent = await prisma.eventLog.findUnique({
            where: { id: returnDomain.eventId },
        });
        if (returnEvent) {
            ids.eventClientUuids.push(returnEvent.clientUuid);
            ids.eventLogIds.push(returnEvent.id);
        }
        const stock2AfterReturn = await getStockQty(prisma, product2.id, location.id);
        const cust2BalAfterReturn = await getCustomerBalance(prisma, customer2.id);
        assertStep('4', 'Product2 stock', '35', stock2AfterReturn.toString(), stock2AfterReturn.equals(35));
        assertStep('4', 'Customer2 balance', '525', cust2BalAfterReturn?.toString() ?? 'null', cust2BalAfterReturn?.equals(525) ?? false);
        console.log('\n--- Step 5: Customer payment IN (300) ---');
        const custPayResult = await accountingService.createPayment({
            partyType: 'CUSTOMER',
            partyId: customer2.id,
            amount: 300,
            direction: 'IN',
            method: 'cash',
        }, admin.id);
        if (custPayResult.status !== 'APPLIED') {
            throw new Error(`Customer payment failed: ${JSON.stringify(custPayResult)}`);
        }
        const custPayDomain = custPayResult.result;
        const custPayment = await prisma.payment.findUnique({
            where: { id: custPayDomain.domain.paymentId },
        });
        if (custPayment)
            ids.eventClientUuids.push(custPayment.clientUuid);
        ids.eventLogIds.push(custPayDomain.eventId);
        const cust2BalAfterPay = await getCustomerBalance(prisma, customer2.id);
        assertStep('5', 'Customer2 balance', '225', cust2BalAfterPay?.toString() ?? 'null', cust2BalAfterPay?.equals(225) ?? false);
        console.log('\n--- Step 6: Supplier payment OUT (1000) ---');
        const supPayResult = await accountingService.createPayment({
            partyType: 'SUPPLIER',
            partyId: supplier.id,
            amount: 1000,
            direction: 'OUT',
            method: 'cash',
        }, admin.id);
        if (supPayResult.status !== 'APPLIED') {
            throw new Error(`Supplier payment failed: ${JSON.stringify(supPayResult)}`);
        }
        const supPayDomain = supPayResult.result;
        const supPayment = await prisma.payment.findUnique({
            where: { id: supPayDomain.domain.paymentId },
        });
        if (supPayment)
            ids.eventClientUuids.push(supPayment.clientUuid);
        ids.eventLogIds.push(supPayDomain.eventId);
        const supBalAfterPay = await getSupplierBalance(prisma, supplier.id);
        assertStep('6', 'SupplierBalance', '1000', supBalAfterPay?.toString() ?? 'null', supBalAfterPay?.equals(1000) ?? false);
        console.log('\n--- Step 7: Stock reconcile (product1 actualQty=68) ---');
        const reconcileResult = await inventoryService.reconcile({
            items: [
                {
                    productId: product1.id,
                    locationId: location.id,
                    actualQty: 68,
                },
            ],
            reason: `${TAG} count adjustment`,
        }, admin.id);
        if (reconcileResult.status !== 'APPLIED') {
            throw new Error(`Reconcile failed: ${JSON.stringify(reconcileResult)}`);
        }
        const reconcileDomain = reconcileResult.result;
        const reconcileEvent = await prisma.eventLog.findUnique({
            where: { id: reconcileDomain.eventId },
        });
        if (reconcileEvent) {
            ids.eventClientUuids.push(reconcileEvent.clientUuid);
            ids.eventLogIds.push(reconcileEvent.id);
        }
        const stock1AfterReconcile = await getStockQty(prisma, product1.id, location.id);
        const reconcileJournal = await prisma.journalEntry.findMany({
            where: { eventId: reconcileDomain.eventId },
            include: { lines: { include: { account: true } } },
        });
        let shrinkageDebit = new client_1.Prisma.Decimal(0);
        for (const entry of reconcileJournal) {
            for (const line of entry.lines) {
                if (line.account.code === '5100') {
                    shrinkageDebit = shrinkageDebit.plus(line.debit);
                }
            }
        }
        assertStep('7', 'Product1 stock', '68', stock1AfterReconcile.toString(), stock1AfterReconcile.equals(68));
        assertStep('7', 'Dr InventoryShrinkage', '20', shrinkageDebit.toString(), shrinkageDebit.equals(20));
        console.log('\n--- Comprehensive integrity checks ---');
        let allJournalsBalanced = true;
        for (const eventId of ids.eventLogIds) {
            const sums = await sumJournalForEvent(prisma, eventId);
            if (!sums.debit.equals(sums.credit)) {
                allJournalsBalanced = false;
                console.error(`Unbalanced journal for event ${eventId}: D=${sums.debit} C=${sums.credit}`);
            }
        }
        assertStep('A', 'All journals balanced', 'true', String(allJournalsBalanced), allJournalsBalanced);
        const stock1View = await getStockQty(prisma, product1.id, location.id);
        const stock1Movements = await computeStockFromMovements(prisma, product1.id, location.id);
        assertStep('B', 'Product1 view=movements', stock1Movements.toString(), stock1View.toString(), stock1View.equals(stock1Movements));
        const stock2View = await getStockQty(prisma, product2.id, location.id);
        const stock2Movements = await computeStockFromMovements(prisma, product2.id, location.id);
        assertStep('B', 'Product2 view=movements', stock2Movements.toString(), stock2View.toString(), stock2View.equals(stock2Movements));
        for (const [label, customerId] of [
            ['Customer1', customer1.id],
            ['Customer2', customer2.id],
        ]) {
            const viewBal = await getCustomerBalance(prisma, customerId);
            const ledgerBal = await computeArBalanceFromLedger(prisma, customerId);
            const viewVal = viewBal ?? new client_1.Prisma.Decimal(0);
            assertStep('C', `${label} AR view=ledger`, ledgerBal.toString(), viewVal.toString(), viewVal.equals(ledgerBal));
        }
        const supView = await getSupplierBalance(prisma, supplier.id);
        const supLedger = await computeApBalanceFromLedger(prisma, supplier.id);
        assertStep('D', 'Supplier AP view=ledger', supLedger.toString(), supView?.toString() ?? 'null', supView?.equals(supLedger) ?? false);
        let allApplied = true;
        for (const clientUuid of ids.eventClientUuids) {
            const log = await prisma.eventLog.findUnique({ where: { clientUuid } });
            if (!log || log.status !== 'APPLIED') {
                allApplied = false;
                console.error(`EventLog ${clientUuid} status=${log?.status ?? 'missing'}`);
            }
        }
        assertStep('E', 'All EventLog APPLIED', 'true', String(allApplied), allApplied);
        console.log('\n--- Step F: Idempotency (replay cash sale) ---');
        const movementCountBefore = await prisma.stockMovement.count({
            where: { eventId: cashSaleDomain.eventId },
        });
        const journalCountBefore = await prisma.journalEntry.count({
            where: { eventId: cashSaleDomain.eventId },
        });
        const saleCountBefore = await prisma.sale.count();
        const replayResult = await eventCore.dispatch({
            clientUuid: cashSaleClientUuid,
            type: event_types_enum_1.EventType.SALE_CREATED,
            payload: {
                customerId: customer1.id,
                type: 'retail',
                paymentType: 'cash',
                items: [
                    {
                        productId: product1.id,
                        locationId: location.id,
                        qty: 30,
                        unitPrice: 18,
                        unitCost: 10,
                    },
                ],
            },
            createdBy: admin.id,
            deviceId: 'test-script',
            occurredAt: new Date(),
        });
        const movementCountAfter = await prisma.stockMovement.count({
            where: { eventId: cashSaleDomain.eventId },
        });
        const journalCountAfter = await prisma.journalEntry.count({
            where: { eventId: cashSaleDomain.eventId },
        });
        const saleCountAfter = await prisma.sale.count();
        const idempotentOk = replayResult.status === 'APPLIED' &&
            movementCountAfter === movementCountBefore &&
            journalCountAfter === journalCountBefore &&
            saleCountAfter === saleCountBefore;
        assertStep('F', 'Idempotent replay', 'no duplicates', `mov ${movementCountBefore}->${movementCountAfter}, je ${journalCountBefore}->${journalCountAfter}, sales ${saleCountBefore}->${saleCountAfter}`, idempotentOk);
        printResultsTable();
        const failed = stepResults.filter((r) => r.status === 'FAIL').length;
        if (failed === 0) {
            console.log('\n=== ALL FULL SYSTEM CHECKS PASSED ===\n');
        }
        else {
            console.log(`\n=== ${failed} CHECK(S) FAILED ===\n`);
            throw new Error(`${failed} checks failed`);
        }
    }
    finally {
        console.log('Cleanup: removing test data...');
        await cleanup(prisma, ids);
        await app.close();
        console.log('Cleanup done.\n');
    }
}
async function cleanup(prisma, ids) {
    const customerIds = [ids.customer1Id, ids.customer2Id].filter(Boolean);
    await prisma.payment.deleteMany({
        where: {
            OR: [
                customerIds.length ? { partyId: { in: customerIds } } : undefined,
                ids.supplierId ? { partyId: ids.supplierId } : undefined,
            ].filter(Boolean),
        },
    });
    if (ids.saleIds.length > 0) {
        await prisma.return.deleteMany({ where: { saleId: { in: ids.saleIds } } });
    }
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
    const productIds = [ids.product1Id, ids.product2Id].filter(Boolean);
    if (productIds.length > 0 && ids.locationId) {
        await prisma.stockBalanceView.deleteMany({
            where: { productId: { in: productIds }, locationId: ids.locationId },
        });
    }
    for (const customerId of customerIds) {
        await prisma.customerBalanceView.deleteMany({ where: { customerId } });
    }
    if (ids.supplierId) {
        await prisma.supplierBalanceView.deleteMany({ where: { supplierId: ids.supplierId } });
    }
    if (ids.saleIds.length > 0) {
        await prisma.saleItem.deleteMany({ where: { saleId: { in: ids.saleIds } } });
        await prisma.sale.deleteMany({ where: { id: { in: ids.saleIds } } });
    }
    if (ids.poId) {
        await prisma.purchaseItem.deleteMany({ where: { poId: ids.poId } });
        await prisma.purchaseOrder.deleteMany({ where: { id: ids.poId } });
    }
    for (const productId of productIds) {
        await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    }
    if (ids.locationId) {
        await prisma.location.delete({ where: { id: ids.locationId } }).catch(() => undefined);
    }
    for (const customerId of customerIds) {
        await prisma.customer.delete({ where: { id: customerId } }).catch(() => undefined);
    }
    if (ids.supplierId) {
        await prisma.supplier.delete({ where: { id: ids.supplierId } }).catch(() => undefined);
    }
    if (ids.categoryId) {
        await prisma.category.delete({ where: { id: ids.categoryId } }).catch(() => undefined);
    }
}
main().catch((error) => {
    console.error('\nTest failed with error:', error);
    process.exit(1);
});
//# sourceMappingURL=test-full-system.js.map