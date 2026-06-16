"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockHandler = void 0;
const client_1 = require("@prisma/client");
const event_types_enum_1 = require("../event-types.enum");
class StockHandler {
    async apply(tx, eventRow, payload) {
        switch (eventRow.eventType) {
            case event_types_enum_1.EventType.SALE_CREATED:
                await this.handleSaleCreated(tx, eventRow, payload);
                break;
            case event_types_enum_1.EventType.PURCHASE_RECEIVED:
                await this.handlePurchaseReceived(tx, eventRow, payload);
                break;
            case event_types_enum_1.EventType.RETURN_PROCESSED:
                await this.handleReturnProcessed(tx, eventRow, payload);
                break;
            case event_types_enum_1.EventType.STOCK_ADJUSTED:
                await this.handleStockAdjusted(tx, eventRow, payload);
                break;
        }
    }
    async handleSaleCreated(tx, eventRow, payload) {
        for (const item of payload.items) {
            const qty = toDecimal(item.qty);
            const movement = await tx.stockMovement.create({
                data: {
                    eventId: eventRow.id,
                    productId: item.productId,
                    locationId: item.locationId,
                    direction: 'OUT',
                    quantity: positiveQty(qty),
                    sourceType: 'SALE',
                    sourceId: payload.saleId,
                    unitCost: toDecimal(item.unitCost),
                    createdBy: eventRow.createdBy,
                    createdAt: resolveCreatedAt(eventRow),
                },
            });
            const currentQty = await this.getCurrentQuantity(tx, item.productId, item.locationId);
            await this.upsertBalance(tx, item.productId, item.locationId, currentQty.minus(qty), movement.id);
        }
    }
    async handlePurchaseReceived(tx, eventRow, payload) {
        for (const item of payload.items) {
            const qty = toDecimal(item.qty);
            const movement = await tx.stockMovement.create({
                data: {
                    eventId: eventRow.id,
                    productId: item.productId,
                    locationId: item.locationId,
                    direction: 'IN',
                    quantity: positiveQty(qty),
                    sourceType: 'PURCHASE',
                    unitCost: toDecimal(item.unitCost),
                    createdBy: eventRow.createdBy,
                    createdAt: resolveCreatedAt(eventRow),
                },
            });
            const currentQty = await this.getCurrentQuantity(tx, item.productId, item.locationId);
            await this.upsertBalance(tx, item.productId, item.locationId, currentQty.plus(qty), movement.id);
        }
    }
    async handleReturnProcessed(tx, eventRow, payload) {
        for (const item of payload.items) {
            const qty = toDecimal(item.qty);
            const movement = await tx.stockMovement.create({
                data: {
                    eventId: eventRow.id,
                    productId: item.productId,
                    locationId: item.locationId,
                    direction: 'IN',
                    quantity: positiveQty(qty),
                    sourceType: 'RETURN',
                    unitCost: toDecimal(item.unitCost),
                    createdBy: eventRow.createdBy,
                    createdAt: resolveCreatedAt(eventRow),
                },
            });
            const currentQty = await this.getCurrentQuantity(tx, item.productId, item.locationId);
            await this.upsertBalance(tx, item.productId, item.locationId, currentQty.plus(qty), movement.id);
        }
    }
    async handleStockAdjusted(tx, eventRow, payload) {
        for (const item of payload.items) {
            const currentQty = await this.getCurrentQuantity(tx, item.productId, item.locationId);
            const actualQty = toDecimal(item.actualQty);
            const diff = actualQty.minus(currentQty);
            if (diff.isZero()) {
                continue;
            }
            const direction = diff.greaterThan(0) ? 'IN' : 'OUT';
            const movementQty = positiveQty(diff);
            const movement = await tx.stockMovement.create({
                data: {
                    eventId: eventRow.id,
                    productId: item.productId,
                    locationId: item.locationId,
                    direction,
                    quantity: movementQty,
                    sourceType: 'ADJUSTMENT',
                    unitCost: toDecimal(item.unitCost),
                    createdBy: eventRow.createdBy,
                    createdAt: resolveCreatedAt(eventRow),
                },
            });
            const newQty = diff.greaterThan(0)
                ? currentQty.plus(diff)
                : currentQty.minus(movementQty);
            await this.upsertBalance(tx, item.productId, item.locationId, newQty, movement.id);
        }
    }
    async getCurrentQuantity(tx, productId, locationId) {
        const balance = await tx.stockBalanceView.findUnique({
            where: {
                productId_locationId: { productId, locationId },
            },
        });
        return balance ? toDecimal(balance.quantity) : new client_1.Prisma.Decimal(0);
    }
    async upsertBalance(tx, productId, locationId, quantity, lastMovementId) {
        const updatedAt = new Date();
        await tx.stockBalanceView.upsert({
            where: {
                productId_locationId: { productId, locationId },
            },
            create: {
                productId,
                locationId,
                quantity,
                lastMovementId,
                updatedAt,
            },
            update: {
                quantity,
                lastMovementId,
                updatedAt,
            },
        });
    }
}
exports.StockHandler = StockHandler;
function toDecimal(value) {
    return new client_1.Prisma.Decimal(value);
}
function positiveQty(qty) {
    return qty.abs();
}
function resolveCreatedAt(eventRow) {
    return eventRow.occurredAt ?? new Date();
}
