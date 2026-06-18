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
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
let SuppliersService = class SuppliersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const page = query.page && query.page > 0 ? query.page : 1;
        const limit = query.limit && query.limit > 0 ? query.limit : 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const [items, total] = await this.prisma.$transaction([
            this.prisma.supplier.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            this.prisma.supplier.count({ where }),
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
        const supplier = await this.prisma.supplier.findUnique({
            where: { id },
        });
        if (!supplier) {
            throw new common_1.NotFoundException(`Supplier ${id} not found`);
        }
        return supplier;
    }
    async create(dto) {
        return this.prisma.supplier.create({
            data: {
                name: dto.name,
                phone: dto.phone ?? '',
            },
        });
    }
    async update(id, dto) {
        await this.findOne(id);
        return this.prisma.supplier.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.phone !== undefined ? { phone: dto.phone ?? '' } : {}),
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
        const balanceView = await this.prisma.supplierBalanceView.findUnique({
            where: { supplierId: id },
        });
        const balance = balanceView ? Number(balanceView.balance) : 0;
        if (Math.abs(balance) > 0.0001) {
            throw new common_1.UnprocessableEntityException('لا يمكن حذف مورد له رصيد');
        }
        const poCount = await this.prisma.purchaseOrder.count({ where: { supplierId: id } });
        if (poCount > 0) {
            throw new common_1.UnprocessableEntityException('لا يمكن حذف مورد له أوامر شراء');
        }
        await this.prisma.supplier.delete({ where: { id } });
        return { deleted: true };
    }
    async getBalance(id) {
        await this.findOne(id);
        const balanceView = await this.prisma.supplierBalanceView.findUnique({
            where: { supplierId: id },
        });
        return {
            supplierId: id,
            balance: balanceView?.balance ?? 0,
        };
    }
    async getBalancesBulk(ids) {
        const where = ids && ids.length > 0 ? { supplierId: { in: ids } } : undefined;
        const rows = await this.prisma.supplierBalanceView.findMany({ where });
        const balanceById = new Map(rows.map((row) => [row.supplierId, row.balance]));
        if (ids && ids.length > 0) {
            return ids.map((supplierId) => ({
                supplierId,
                balance: balanceById.get(supplierId) ?? 0,
            }));
        }
        return rows.map((row) => ({
            supplierId: row.supplierId,
            balance: row.balance,
        }));
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map