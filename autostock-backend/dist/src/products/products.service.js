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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../common/prisma/prisma.service");
const product_cost_util_1 = require("../common/utils/product-cost.util");
let ProductsService = class ProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const page = query.page && query.page > 0 ? query.page : 1;
        const limit = query.limit && query.limit > 0 ? query.limit : 20;
        const skip = (page - 1) * limit;
        const where = { active: true };
        if (query.categoryId) {
            where.categoryId = query.categoryId;
        }
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { sku: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const [items, total] = await this.prisma.$transaction([
            this.prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            this.prisma.product.count({ where }),
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
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: { category: true },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product ${id} not found`);
        }
        return product;
    }
    async getAverageCost(id) {
        const product = await this.findOne(id);
        const latestBalance = await this.prisma.stockBalanceView.findFirst({
            where: { productId: id },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true },
        });
        const effective = (0, product_cost_util_1.effectiveCartonCost)(product);
        return {
            productId: id,
            averageCost: effective,
            lastUpdated: latestBalance?.updatedAt ?? null,
        };
    }
    async create(dto) {
        const sku = await this.resolveUniqueSku((dto.sku?.trim() || dto.name.trim()));
        return this.prisma.product.create({
            data: {
                sku,
                name: dto.name,
                categoryId: dto.categoryId,
                costPrice: dto.costPrice,
                averageCost: dto.costPrice,
                retailPrice: dto.retailPrice,
                wholesalePrice: dto.wholesalePrice,
                minStockAlert: dto.minStockAlert,
                unit: dto.unit,
                unitsPerCarton: dto.unitsPerCarton ?? 1,
            },
        });
    }
    async resolveUniqueSku(base) {
        const sanitized = base.replace(/\s+/g, '-').slice(0, 40) || `P-${(0, crypto_1.randomBytes)(3).toString('hex')}`;
        let candidate = sanitized;
        for (let i = 0; i < 100; i += 1) {
            const existing = await this.prisma.product.findFirst({
                where: { sku: { equals: candidate, mode: 'insensitive' } },
            });
            if (!existing) {
                return candidate;
            }
            candidate = `${sanitized}-${i + 2}`;
        }
        return `${sanitized}-${Date.now().toString(36)}`;
    }
    async update(id, dto) {
        await this.findOne(id);
        return this.prisma.product.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id) {
        const product = await this.findOne(id);
        await this.prisma.product.update({
            where: { id },
            data: {
                active: false,
                sku: `__deleted__${product.id.slice(0, 8)}__${Date.now()}`,
            },
        });
        return { deleted: true };
    }
    async bulkImport(items) {
        const skipped = [];
        const createdCategories = [];
        let imported = 0;
        const categories = await this.prisma.category.findMany();
        const categoryByName = new Map(categories.map((category) => [
            category.name.trim().toLowerCase(),
            category.id,
        ]));
        const existingProducts = await this.prisma.product.findMany({
            where: { active: true },
            select: { sku: true },
        });
        const existingSkus = new Set(existingProducts.map((product) => product.sku.toLowerCase()));
        const batchSkus = new Set();
        for (let index = 0; index < items.length; index += 1) {
            const row = index + 1;
            const item = items[index];
            const categoryKey = item.categoryName.trim().toLowerCase();
            let categoryId = categoryByName.get(categoryKey);
            if (!categoryId) {
                const created = await this.prisma.category.create({
                    data: { name: item.categoryName.trim() },
                });
                categoryId = created.id;
                categoryByName.set(categoryKey, categoryId);
                createdCategories.push(created.name);
            }
            const requestedSku = item.sku?.trim();
            let sku;
            if (requestedSku) {
                const skuKey = requestedSku.toLowerCase();
                if (existingSkus.has(skuKey) || batchSkus.has(skuKey)) {
                    skipped.push({
                        row,
                        sku: requestedSku,
                        reason: 'SKU مكرر',
                    });
                    continue;
                }
                sku = requestedSku;
            }
            else {
                sku = await this.resolveUniqueSku(item.name.trim());
                const skuKey = sku.toLowerCase();
                if (existingSkus.has(skuKey) || batchSkus.has(skuKey)) {
                    skipped.push({
                        row,
                        sku,
                        reason: 'SKU مكرر',
                    });
                    continue;
                }
            }
            await this.prisma.product.create({
                data: {
                    sku,
                    name: item.name.trim(),
                    categoryId,
                    costPrice: item.costPrice,
                    averageCost: item.costPrice,
                    retailPrice: item.retailPrice,
                    wholesalePrice: item.wholesalePrice,
                    minStockAlert: item.minStockAlert ?? 0,
                    unit: item.unit.trim(),
                    unitsPerCarton: item.unitsPerCarton ?? 1,
                },
            });
            batchSkus.add(sku.toLowerCase());
            existingSkus.add(sku.toLowerCase());
            imported += 1;
        }
        return { imported, skipped, createdCategories };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map