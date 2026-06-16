"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingHandler = void 0;
const client_1 = require("@prisma/client");
const event_types_enum_1 = require("../event-types.enum");
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
};
class AccountingHandler {
    async apply(tx, eventRow, payload) {
        const accounts = await this.resolveAccounts(tx);
        switch (eventRow.eventType) {
            case event_types_enum_1.EventType.SALE_CREATED:
                await this.handleSaleCreated(tx, eventRow, payload, accounts);
                break;
            case event_types_enum_1.EventType.PURCHASE_RECEIVED:
                await this.handlePurchaseReceived(tx, eventRow, payload, accounts);
                break;
            case event_types_enum_1.EventType.PAYMENT_MADE:
                await this.handlePaymentMade(tx, eventRow, payload, accounts);
                break;
            case event_types_enum_1.EventType.RETURN_PROCESSED:
                await this.handleReturnProcessed(tx, eventRow, payload, accounts);
                break;
            case event_types_enum_1.EventType.STOCK_ADJUSTED:
                await this.handleStockAdjusted(tx, eventRow, payload, accounts);
                break;
        }
    }
    async handleSaleCreated(tx, eventRow, payload, accounts) {
        const total = payload.items.reduce((sum, item) => sum.plus(toDecimal(item.qty).mul(toDecimal(item.unitPrice))), zero());
        const cogs = payload.items.reduce((sum, item) => sum.plus(toDecimal(item.qty).mul(toDecimal(item.unitCost))), zero());
        const lines = [];
        const isCashSale = payload.paymentType.toUpperCase() === 'CASH';
        if (isCashSale) {
            lines.push({ accountKey: 'Cash', debit: total, credit: zero() }, { accountKey: 'Sales', debit: zero(), credit: total });
        }
        else {
            lines.push({
                accountKey: 'AccountsReceivable',
                debit: total,
                credit: zero(),
                partyType: 'CUSTOMER',
                partyId: payload.customerId,
            }, { accountKey: 'Sales', debit: zero(), credit: total });
        }
        if (!cogs.isZero()) {
            lines.push({ accountKey: 'COGS', debit: cogs, credit: zero() }, { accountKey: 'Inventory', debit: zero(), credit: cogs });
        }
        await this.createBalancedEntry(tx, eventRow, {
            sourceType: 'SALE',
            sourceId: payload.saleId,
            memo: payload.memo,
            lines,
            accounts,
        });
    }
    async handlePurchaseReceived(tx, eventRow, payload, accounts) {
        const total = payload.items.reduce((sum, item) => sum.plus(toDecimal(item.qty).mul(toDecimal(item.unitCost))), zero());
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
    async handlePaymentMade(tx, eventRow, payload, accounts) {
        const amount = toDecimal(payload.amount);
        const direction = payload.direction.toUpperCase();
        const lines = direction === 'IN'
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
    async handleReturnProcessed(tx, eventRow, payload, accounts) {
        const refund = toDecimal(payload.refundAmount);
        const cogs = payload.items.reduce((sum, item) => sum.plus(toDecimal(item.qty).mul(toDecimal(item.unitCost))), zero());
        const isCashRefund = payload.refundMethod.toUpperCase() === 'CASH';
        const lines = [
            { accountKey: 'SalesReturns', debit: refund, credit: zero() },
        ];
        if (isCashRefund) {
            lines.push({ accountKey: 'Cash', debit: zero(), credit: refund });
        }
        else {
            lines.push({
                accountKey: 'AccountsReceivable',
                debit: zero(),
                credit: refund,
                partyType: 'CUSTOMER',
                partyId: payload.customerId,
            });
        }
        if (!cogs.isZero()) {
            lines.push({ accountKey: 'Inventory', debit: cogs, credit: zero() }, { accountKey: 'COGS', debit: zero(), credit: cogs });
        }
        await this.createBalancedEntry(tx, eventRow, {
            sourceType: 'RETURN',
            sourceId: payload.returnId,
            memo: payload.memo,
            lines,
            accounts,
        });
    }
    async handleStockAdjusted(tx, eventRow, payload, accounts) {
        const value = payload.items.reduce((sum, item) => sum.plus(toDecimal(item.diff).mul(toDecimal(item.unitCost))), zero());
        if (value.isZero()) {
            return;
        }
        const lines = value.greaterThan(0)
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
    async resolveAccounts(tx) {
        const codes = Object.values(ACCOUNT_CODES);
        const rows = await tx.account.findMany({
            where: { code: { in: codes } },
        });
        const byCode = new Map(rows.map((row) => [row.code, row.id]));
        const accounts = {};
        for (const [key, code] of Object.entries(ACCOUNT_CODES)) {
            const accountId = byCode.get(code);
            if (!accountId) {
                throw new Error(`Account not found for code ${code} (${key})`);
            }
            accounts[key] = accountId;
        }
        return accounts;
    }
    async createBalancedEntry(tx, eventRow, options) {
        const normalizedLines = options.lines.filter((line) => !line.debit.isZero() || !line.credit.isZero());
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
    assertBalanced(lines) {
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
            throw new Error(`Unbalanced journal entry: debit=${totalDebit.toString()} credit=${totalCredit.toString()}`);
        }
    }
    async applyPartyBalanceChange(tx, entryId, line) {
        if (!line.partyType || !line.partyId) {
            return;
        }
        const updatedAt = new Date();
        if (line.partyType === 'CUSTOMER' &&
            line.accountKey === 'AccountsReceivable') {
            const delta = line.debit.minus(line.credit);
            await this.upsertCustomerBalance(tx, line.partyId, delta, entryId, updatedAt);
            return;
        }
        if (line.partyType === 'SUPPLIER' &&
            line.accountKey === 'AccountsPayable') {
            const delta = line.credit.minus(line.debit);
            await this.upsertSupplierBalance(tx, line.partyId, delta, entryId, updatedAt);
        }
    }
    async upsertCustomerBalance(tx, customerId, delta, lastEntryId, updatedAt) {
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
    async upsertSupplierBalance(tx, supplierId, delta, lastEntryId, updatedAt) {
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
exports.AccountingHandler = AccountingHandler;
function zero() {
    return new client_1.Prisma.Decimal(0);
}
function toDecimal(value) {
    return new client_1.Prisma.Decimal(value);
}
function resolveEntryDate(eventRow) {
    return eventRow.occurredAt ?? new Date();
}
//# sourceMappingURL=accounting.handler.js.map