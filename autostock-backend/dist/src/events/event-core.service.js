"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCoreService = exports.ValidationError = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../common/prisma/prisma.service");
const event_types_enum_1 = require("./event-types.enum");
const cash_handler_1 = require("../cash/handlers/cash.handler");
const accounting_handler_1 = require("./handlers/accounting.handler");
const stock_handler_1 = require("./handlers/stock.handler");
const event_effects_map_1 = require("./mapping/event-effects.map");
class ValidationError extends Error {
    reason;
    constructor(reason) {
        super(reason);
        this.reason = reason;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
const MAX_DISPATCH_ATTEMPTS = 3;
let EventCoreService = class EventCoreService {
    prisma;
    stockHandler = new stock_handler_1.StockHandler();
    accountingHandler = new accounting_handler_1.AccountingHandler();
    cashHandler = new cash_handler_1.CashHandler();
    constructor(prisma) {
        this.prisma = prisma;
    }
    async dispatch(event) {
        for (let attempt = 1; attempt <= MAX_DISPATCH_ATTEMPTS; attempt++) {
            try {
                return await this.dispatchOnce(event);
            }
            catch (error) {
                if (error instanceof ValidationError) {
                    await this.persistRejectedEvent(event, error.reason);
                    return { status: 'REJECTED', reason: error.reason };
                }
                if (attempt < MAX_DISPATCH_ATTEMPTS && isTransientError(error)) {
                    await sleep(attempt * 100);
                    continue;
                }
                throw error;
            }
        }
        throw new Error('Dispatch failed after retries');
    }
    async dispatchOnce(event) {
        const existing = await this.prisma.eventLog.findUnique({
            where: { clientUuid: event.clientUuid },
        });
        if (existing) {
            return this.mapStoredResult(existing);
        }
        try {
            const result = await this.prisma.runInTransaction(async (tx) => {
                const eventLog = await tx.eventLog.create({
                    data: {
                        clientUuid: event.clientUuid,
                        eventType: event.type,
                        payload: event.payload,
                        status: 'PENDING',
                        occurredAt: event.occurredAt,
                        createdBy: event.createdBy,
                        deviceId: event.deviceId,
                        localSeq: event.localSeq ?? 0,
                        branchId: event.branchId,
                    },
                });
                const eventRow = {
                    id: eventLog.id,
                    eventType: event.type,
                    createdBy: event.createdBy,
                    occurredAt: event.occurredAt,
                };
                if (event.type === event_types_enum_1.EventType.SALE_CREATED) {
                    await this.validateStockAvailability(tx, event.payload);
                }
                let handlerPayload = event.payload;
                if (event.type === event_types_enum_1.EventType.STOCK_ADJUSTED) {
                    handlerPayload = await this.enrichStockAdjustedPayload(tx, event.payload);
                }
                const effects = event_effects_map_1.EVENT_EFFECTS_MAP[event.type];
                if (effects.stock) {
                    await this.stockHandler.apply(tx, eventRow, handlerPayload);
                }
                if (effects.accounting) {
                    await this.accountingHandler.apply(tx, eventRow, handlerPayload);
                }
                if (effects.cash) {
                    await this.cashHandler.apply(tx, eventRow, handlerPayload);
                }
                let domain;
                if (event.onCommit) {
                    domain = await event.onCommit(tx, eventRow);
                }
                const summary = {
                    eventId: eventLog.id,
                    serverSeq: eventLog.serverSeq,
                    eventType: event.type,
                    ...(domain !== undefined ? { domain } : {}),
                };
                await tx.eventLog.update({
                    where: { id: eventLog.id },
                    data: {
                        status: 'APPLIED',
                        appliedAt: new Date(),
                        result: summary,
                    },
                });
                return summary;
            });
            return { status: 'APPLIED', result };
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                const replay = await this.prisma.eventLog.findUnique({
                    where: { clientUuid: event.clientUuid },
                });
                if (replay) {
                    return this.mapStoredResult(replay);
                }
            }
            if (error instanceof ValidationError) {
                throw error;
            }
            throw error;
        }
    }
    mapStoredResult(eventLog) {
        if (eventLog.status === 'REJECTED') {
            const stored = eventLog.result;
            return {
                status: 'REJECTED',
                reason: stored?.reason ?? 'Validation failed',
            };
        }
        return { status: 'APPLIED', result: eventLog.result };
    }
    async persistRejectedEvent(event, reason) {
        try {
            await this.prisma.eventLog.create({
                data: {
                    clientUuid: event.clientUuid,
                    eventType: event.type,
                    payload: event.payload,
                    status: 'REJECTED',
                    occurredAt: event.occurredAt,
                    createdBy: event.createdBy,
                    deviceId: event.deviceId,
                    localSeq: event.localSeq ?? 0,
                    branchId: event.branchId,
                    appliedAt: new Date(),
                    result: { reason },
                },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                return;
            }
            throw error;
        }
    }
    async validateStockAvailability(tx, payload) {
        const items = this.extractValidatableItems(payload);
        for (const item of items) {
            const balance = await tx.stockBalanceView.findUnique({
                where: {
                    productId_locationId: {
                        productId: item.productId,
                        locationId: item.locationId,
                    },
                },
            });
            const available = balance
                ? toDecimal(balance.quantity)
                : new client_1.Prisma.Decimal(0);
            const required = toDecimal(item.qty);
            if (available.lt(required)) {
                throw new ValidationError(`Insufficient stock for product ${item.productId} at location ${item.locationId}: available ${available.toString()}, required ${required.toString()}`);
            }
        }
    }
    async enrichStockAdjustedPayload(tx, payload) {
        const data = payload;
        const items = await Promise.all(data.items.map(async (item) => {
            const balance = await tx.stockBalanceView.findUnique({
                where: {
                    productId_locationId: {
                        productId: item.productId,
                        locationId: item.locationId,
                    },
                },
            });
            const currentQty = balance
                ? toDecimal(balance.quantity)
                : new client_1.Prisma.Decimal(0);
            const actualQty = toDecimal(item.actualQty);
            const diff = actualQty.minus(currentQty);
            return { ...item, diff };
        }));
        return { ...data, items };
    }
    extractValidatableItems(payload) {
        const data = payload;
        if (!Array.isArray(data?.items)) {
            throw new ValidationError('Event payload must include items array');
        }
        return data.items;
    }
};
exports.EventCoreService = EventCoreService;
exports.EventCoreService = EventCoreService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EventCoreService);
function toDecimal(value) {
    return new client_1.Prisma.Decimal(value);
}
function isTransientError(error) {
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        return ['P2034', 'P2028', 'P1001', 'P1002', 'P1017'].includes(error.code);
    }
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return message.includes('deadlock') || message.includes('timeout');
    }
    return false;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=event-core.service.js.map