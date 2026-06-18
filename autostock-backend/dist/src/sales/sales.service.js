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
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../common/prisma/prisma.service");
const product_cost_util_1 = require("../common/utils/product-cost.util");
const qty_units_util_1 = require("../common/utils/qty-units.util");
const event_core_service_1 = require("../events/event-core.service");
const event_types_enum_1 = require("../events/event-types.enum");
let SalesService = class SalesService {
    prisma;
    eventCoreService;
    constructor(prisma, eventCoreService) {
        this.prisma = prisma;
        this.eventCoreService = eventCoreService;
    }
    async create(dto, createdBy) {
        if (dto.paymentType === 'debt' && !dto.customerId) {
            throw new common_1.BadRequestException('customerId is required when paymentType is debt');
        }
        const clientUuid = (0, crypto_1.randomUUID)();
        const productIds = [...new Set(dto.items.map((item) => item.productId))];
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
        });
        const averageCostByProduct = new Map(products.map((product) => [
            product.id,
            (0, product_cost_util_1.pieceUnitCostFromProduct)(product),
        ]));
        const productById = new Map(products.map((p) => [p.id, p]));
        const saleItems = dto.items.map((item) => {
            const product = productById.get(item.productId);
            const upc = product?.unitsPerCarton ?? 1;
            const units = (0, qty_units_util_1.normalizeSaleItemUnits)(item.qty, item.qtyUnit, item.displayQty, upc);
            return {
                ...item,
                qtyUnit: units.qtyUnit,
                displayQty: units.displayQty,
                unitCost: averageCostByProduct.get(item.productId) ??
                    new client_1.Prisma.Decimal(item.unitCost),
            };
        });
        const subtotal = saleItems.reduce((sum, item) => sum.plus(new client_1.Prisma.Decimal(item.qty).mul(item.unitPrice)), new client_1.Prisma.Decimal(0));
        return this.eventCoreService.dispatch({
            clientUuid,
            type: event_types_enum_1.EventType.SALE_CREATED,
            payload: {
                customerId: dto.customerId ?? null,
                type: dto.type,
                paymentType: dto.paymentType,
                items: saleItems.map((item) => ({
                    productId: item.productId,
                    locationId: item.locationId,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                    unitCost: item.unitCost,
                })),
            },
            createdBy,
            deviceId: 'sales-api',
            occurredAt: new Date(),
            onCommit: async (tx) => {
                const sale = await tx.sale.create({
                    data: {
                        clientUuid,
                        customerId: dto.customerId,
                        type: dto.type,
                        paymentType: dto.paymentType,
                        subtotal,
                        status: 'completed',
                        createdBy,
                        items: {
                            create: saleItems.map((item) => ({
                                productId: item.productId,
                                qty: item.qty,
                                qtyUnit: item.qtyUnit,
                                displayQty: item.displayQty,
                                unitPrice: item.unitPrice,
                                unitCost: item.unitCost,
                            })),
                        },
                    },
                });
                return { saleId: sale.id };
            },
        });
    }
    async createReturn(saleId, dto, createdBy) {
        const sale = await this.prisma.sale.findUnique({
            where: { id: saleId },
            include: { items: true },
        });
        if (!sale) {
            throw new common_1.NotFoundException(`Sale ${saleId} not found`);
        }
        if (dto.refundMethod === 'credit' && !sale.customerId) {
            throw new common_1.BadRequestException('credit refund requires a customer on the original sale');
        }
        const soldByProduct = new Map();
        for (const item of sale.items) {
            const current = soldByProduct.get(item.productId) ?? new client_1.Prisma.Decimal(0);
            soldByProduct.set(item.productId, current.plus(item.qty));
        }
        const existingReturns = await this.prisma.return.findMany({
            where: { saleId: sale.id },
        });
        const returnedByProduct = new Map();
        for (const ret of existingReturns) {
            const current = returnedByProduct.get(ret.productId) ?? new client_1.Prisma.Decimal(0);
            returnedByProduct.set(ret.productId, current.plus(ret.qty));
        }
        const requestByProduct = new Map();
        for (const item of dto.items) {
            const current = requestByProduct.get(item.productId) ?? new client_1.Prisma.Decimal(0);
            requestByProduct.set(item.productId, current.plus(new client_1.Prisma.Decimal(item.qty)));
        }
        for (const [productId, requestQty] of requestByProduct) {
            const soldQty = soldByProduct.get(productId);
            if (!soldQty) {
                throw new common_1.BadRequestException(`Product ${productId} was not sold on this invoice`);
            }
            const alreadyReturned = returnedByProduct.get(productId) ?? new client_1.Prisma.Decimal(0);
            const totalReturned = alreadyReturned.plus(requestQty);
            if (totalReturned.gt(soldQty)) {
                throw new common_1.BadRequestException(`Return quantity for product ${productId} exceeds sold quantity: sold ${soldQty.toString()}, already returned ${alreadyReturned.toString()}, requested ${requestQty.toString()}`);
            }
        }
        const clientUuid = (0, crypto_1.randomUUID)();
        const totalReturnQty = dto.items.reduce((sum, item) => sum.plus(new client_1.Prisma.Decimal(item.qty)), new client_1.Prisma.Decimal(0));
        return this.eventCoreService.dispatch({
            clientUuid,
            type: event_types_enum_1.EventType.RETURN_PROCESSED,
            payload: {
                saleId: sale.id,
                customerId: sale.customerId ?? undefined,
                refundMethod: dto.refundMethod,
                refundAmount: dto.refundAmount,
                reason: dto.reason,
                items: dto.items.map((item) => ({
                    productId: item.productId,
                    locationId: item.locationId,
                    qty: item.qty,
                    qtyUnit: item.qtyUnit ?? 'piece',
                    displayQty: item.displayQty ?? item.qty,
                    unitCost: item.unitCost,
                })),
            },
            createdBy,
            deviceId: 'sales-api',
            occurredAt: new Date(),
            onCommit: async (tx) => {
                const returnIds = [];
                for (const item of dto.items) {
                    const itemRefund = new client_1.Prisma.Decimal(dto.refundAmount)
                        .mul(item.qty)
                        .div(totalReturnQty);
                    const ret = await tx.return.create({
                        data: {
                            clientUuid: (0, crypto_1.randomUUID)(),
                            saleId: sale.id,
                            productId: item.productId,
                            qty: item.qty,
                            qtyUnit: item.qtyUnit ?? 'piece',
                            displayQty: item.displayQty ?? item.qty,
                            reason: dto.reason,
                            refundAmount: itemRefund,
                        },
                    });
                    returnIds.push(ret.id);
                }
                return { returnIds };
            },
        });
    }
    async findOne(id) {
        const sale = await this.prisma.sale.findUnique({
            where: { id },
            include: {
                items: {
                    include: { product: true },
                },
                customer: true,
                returns: {
                    include: { product: true },
                },
            },
        });
        if (!sale) {
            throw new common_1.NotFoundException(`Sale ${id} not found`);
        }
        return sale;
    }
    async getInvoice(id) {
        const sale = await this.findOne(id);
        const eventLog = await this.prisma.eventLog.findUnique({
            where: { clientUuid: sale.clientUuid },
        });
        const journalEntries = eventLog
            ? await this.prisma.journalEntry.findMany({
                where: { eventId: eventLog.id },
                include: {
                    lines: {
                        include: { account: true },
                    },
                },
                orderBy: { entryDate: 'asc' },
            })
            : [];
        const returnedByProduct = new Map();
        for (const ret of sale.returns) {
            const current = returnedByProduct.get(ret.productId) ?? new client_1.Prisma.Decimal(0);
            returnedByProduct.set(ret.productId, current.plus(ret.qty));
        }
        return {
            sale,
            items: sale.items,
            returns: sale.returns,
            returnedByProduct: Object.fromEntries([...returnedByProduct.entries()].map(([productId, qty]) => [
                productId,
                qty.toString(),
            ])),
            event: eventLog,
            journalEntries,
        };
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_core_service_1.EventCoreService])
], SalesService);
//# sourceMappingURL=sales.service.js.map