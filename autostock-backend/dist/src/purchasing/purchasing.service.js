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
exports.PurchasingService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../common/prisma/prisma.service");
const product_cost_util_1 = require("../common/utils/product-cost.util");
const event_core_service_1 = require("../events/event-core.service");
const event_types_enum_1 = require("../events/event-types.enum");
const suppliers_service_1 = require("./suppliers.service");
let PurchasingService = class PurchasingService {
    prisma;
    suppliersService;
    eventCoreService;
    constructor(prisma, suppliersService, eventCoreService) {
        this.prisma = prisma;
        this.suppliersService = suppliersService;
        this.eventCoreService = eventCoreService;
    }
    async findAll(query) {
        const page = query.page && query.page > 0 ? query.page : 1;
        const limit = query.limit && query.limit > 0 ? query.limit : 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.status) {
            where.status = query.status;
        }
        const [items, total] = await this.prisma.$transaction([
            this.prisma.purchaseOrder.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    supplier: true,
                    items: true,
                },
            }),
            this.prisma.purchaseOrder.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }
    async findOne(id) {
        const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                supplier: true,
                items: {
                    include: { product: true },
                },
            },
        });
        if (!purchaseOrder) {
            throw new common_1.NotFoundException(`Purchase order ${id} not found`);
        }
        return purchaseOrder;
    }
    async create(dto, createdBy) {
        await this.suppliersService.findOne(dto.supplierId);
        return this.prisma.purchaseOrder.create({
            data: {
                clientUuid: (0, crypto_1.randomUUID)(),
                supplierId: dto.supplierId,
                status: 'draft',
                createdBy,
                items: {
                    create: dto.items.map((item) => ({
                        productId: item.productId,
                        qty: item.qty,
                        unitCost: item.unitCost,
                    })),
                },
            },
            include: {
                supplier: true,
                items: true,
            },
        });
    }
    async receive(id, dto, createdBy) {
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                items: {
                    include: { product: { select: { unitsPerCarton: true } } },
                },
            },
        });
        if (!po) {
            throw new common_1.NotFoundException(`Purchase order ${id} not found`);
        }
        if (po.status !== 'draft') {
            throw new common_1.BadRequestException('already received or invalid');
        }
        const result = await this.eventCoreService.dispatch({
            clientUuid: po.clientUuid,
            type: event_types_enum_1.EventType.PURCHASE_RECEIVED,
            payload: {
                supplierId: po.supplierId,
                poId: po.id,
                items: po.items.map((item) => ({
                    productId: item.productId,
                    locationId: dto.locationId,
                    qty: item.qty,
                    unitCost: (0, product_cost_util_1.pieceUnitCostFromCarton)(item.unitCost, item.product.unitsPerCarton),
                })),
            },
            createdBy,
            deviceId: 'purchasing-api',
            occurredAt: new Date(),
            onCommit: async (tx) => {
                await tx.purchaseOrder.update({
                    where: { id: po.id },
                    data: { status: 'received' },
                });
                return { poId: po.id, status: 'received' };
            },
        });
        return result;
    }
    async update(id, dto) {
        const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
        if (!po) {
            throw new common_1.NotFoundException(`Purchase order ${id} not found`);
        }
        if (po.status !== 'draft') {
            throw new common_1.BadRequestException('لا يمكن تعديل أمر مستلم');
        }
        await this.suppliersService.findOne(dto.supplierId);
        return this.prisma.$transaction(async (tx) => {
            await tx.purchaseItem.deleteMany({ where: { poId: id } });
            return tx.purchaseOrder.update({
                where: { id },
                data: {
                    supplierId: dto.supplierId,
                    items: {
                        create: dto.items.map((item) => ({
                            productId: item.productId,
                            qty: item.qty,
                            unitCost: item.unitCost,
                        })),
                    },
                },
                include: { supplier: true, items: true },
            });
        });
    }
    async remove(id) {
        const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
        if (!po) {
            throw new common_1.NotFoundException(`Purchase order ${id} not found`);
        }
        if (po.status !== 'draft') {
            throw new common_1.BadRequestException('لا يمكن حذف أمر مستلم');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.purchaseItem.deleteMany({ where: { poId: id } });
            await tx.purchaseOrder.delete({ where: { id } });
        });
        return { deleted: true };
    }
};
exports.PurchasingService = PurchasingService;
exports.PurchasingService = PurchasingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        suppliers_service_1.SuppliersService,
        event_core_service_1.EventCoreService])
], PurchasingService);
//# sourceMappingURL=purchasing.service.js.map