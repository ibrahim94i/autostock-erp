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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../common/prisma/prisma.service");
const product_cost_util_1 = require("../common/utils/product-cost.util");
const event_core_service_1 = require("../events/event-core.service");
const event_types_enum_1 = require("../events/event-types.enum");
let InventoryService = class InventoryService {
    prisma;
    eventCoreService;
    constructor(prisma, eventCoreService) {
        this.prisma = prisma;
        this.eventCoreService = eventCoreService;
    }
    async reconcile(dto, createdBy) {
        const productIds = [...new Set(dto.items.map((item) => item.productId))];
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, costPrice: true, unitsPerCarton: true },
        });
        const costByProductId = new Map(products.map((product) => [
            product.id,
            (0, product_cost_util_1.pieceUnitCostFromCarton)(product.costPrice, product.unitsPerCarton),
        ]));
        for (const productId of productIds) {
            if (!costByProductId.has(productId)) {
                throw new common_1.NotFoundException(`Product ${productId} not found`);
            }
        }
        const items = dto.items.map((item) => ({
            productId: item.productId,
            locationId: item.locationId,
            actualQty: item.actualQty,
            unitCost: costByProductId.get(item.productId),
        }));
        return this.eventCoreService.dispatch({
            clientUuid: (0, crypto_1.randomUUID)(),
            type: event_types_enum_1.EventType.STOCK_ADJUSTED,
            payload: {
                items,
                reason: dto.reason,
            },
            createdBy,
            deviceId: 'inventory-api',
            occurredAt: new Date(),
        });
    }
    async getBalances(query) {
        const page = query.page && query.page > 0 ? query.page : 1;
        const limit = query.limit && query.limit > 0 ? query.limit : 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.productId) {
            where.productId = query.productId;
        }
        if (query.locationId) {
            where.locationId = query.locationId;
        }
        const [items, total] = await this.prisma.$transaction([
            this.prisma.stockBalanceView.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ productId: 'asc' }, { locationId: 'asc' }],
                include: {
                    product: {
                        select: { id: true, sku: true, name: true, minStockAlert: true },
                    },
                    location: {
                        select: { id: true, zone: true, shelf: true, code: true },
                    },
                },
            }),
            this.prisma.stockBalanceView.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }
    async getLowAlerts() {
        const rows = await this.prisma.$queryRaw `
      SELECT
        sb."productId",
        sb."locationId",
        sb.quantity,
        p."minStockAlert",
        p.id AS product_id,
        p.sku,
        p.name AS product_name,
        l.id AS location_id,
        l.zone,
        l.shelf,
        l.code
      FROM "StockBalanceView" sb
      INNER JOIN "Product" p ON p.id = sb."productId"
      INNER JOIN "Location" l ON l.id = sb."locationId"
      WHERE sb.quantity < p."minStockAlert"
      ORDER BY sb."productId", sb."locationId"
    `;
        return rows.map((row) => ({
            productId: row.productId,
            locationId: row.locationId,
            quantity: row.quantity,
            minStockAlert: row.minStockAlert,
            product: {
                id: row.product_id,
                sku: row.sku,
                name: row.product_name,
            },
            location: {
                id: row.location_id,
                zone: row.zone,
                shelf: row.shelf,
                code: row.code,
            },
        }));
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_core_service_1.EventCoreService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map