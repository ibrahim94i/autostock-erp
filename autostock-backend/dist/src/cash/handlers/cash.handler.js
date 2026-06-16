"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashHandler = void 0;
exports.startOfUtcDay = startOfUtcDay;
exports.isInflowTransaction = isInflowTransaction;
exports.isOutflowTransaction = isOutflowTransaction;
const client_1 = require("@prisma/client");
const event_types_enum_1 = require("../../events/event-types.enum");
const INFLOW_TYPES = new Set(['sale', 'payment_in']);
const OUTFLOW_TYPES = new Set(['payment_out']);
class CashHandler {
    async apply(tx, eventRow, payload) {
        const register = await this.findOpenRegisterForDate(tx, eventRow.occurredAt ?? new Date());
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
            case event_types_enum_1.EventType.SALE_CREATED:
                await this.handleSaleCreated(tx, eventRow, register.id, payload);
                break;
            case event_types_enum_1.EventType.PAYMENT_MADE:
                await this.handlePaymentMade(tx, eventRow, register.id, payload);
                break;
        }
    }
    async handleSaleCreated(tx, eventRow, registerId, payload) {
        if (payload.paymentType.toLowerCase() !== 'cash') {
            return;
        }
        const amount = payload.items.reduce((sum, item) => sum.plus(toDecimal(item.qty).mul(toDecimal(item.unitPrice))), zero());
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
    async handlePaymentMade(tx, eventRow, registerId, payload) {
        const amount = toDecimal(payload.amount);
        if (amount.isZero()) {
            return;
        }
        const direction = payload.direction.toUpperCase();
        const type = direction === 'IN' ? 'payment_in' : 'payment_out';
        const partyLabel = payload.partyType === 'CUSTOMER' ? 'عميل' : 'مورد';
        const description = payload.memo?.trim() ||
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
    async findOpenRegisterForDate(tx, date) {
        return tx.cashRegister.findFirst({
            where: {
                date: startOfUtcDay(date),
                status: 'open',
            },
        });
    }
}
exports.CashHandler = CashHandler;
function startOfUtcDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
function isInflowTransaction(type) {
    return INFLOW_TYPES.has(type);
}
function isOutflowTransaction(type) {
    return OUTFLOW_TYPES.has(type);
}
function toDecimal(value) {
    return new client_1.Prisma.Decimal(value);
}
function zero() {
    return new client_1.Prisma.Decimal(0);
}
//# sourceMappingURL=cash.handler.js.map