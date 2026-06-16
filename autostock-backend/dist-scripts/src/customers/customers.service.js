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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
let CustomersService = class CustomersService {
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
            this.prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            this.prisma.customer.count({ where }),
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
        const customer = await this.prisma.customer.findUnique({
            where: { id },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer ${id} not found`);
        }
        return customer;
    }
    async create(dto) {
        return this.prisma.customer.create({
            data: {
                name: dto.name,
                phone: dto.phone ?? '',
                type: dto.type,
            },
        });
    }
    async getBalance(id) {
        await this.findOne(id);
        const balanceView = await this.prisma.customerBalanceView.findUnique({
            where: { customerId: id },
        });
        return {
            customerId: id,
            balance: balanceView?.balance ?? 0,
        };
    }
    async getStatement(id) {
        await this.findOne(id);
        const lines = await this.prisma.journalLine.findMany({
            where: {
                partyType: 'CUSTOMER',
                partyId: id,
            },
            include: {
                entry: {
                    select: {
                        id: true,
                        entryDate: true,
                    },
                },
            },
            orderBy: {
                entry: {
                    entryDate: 'asc',
                },
            },
        });
        return lines.map((line) => ({
            debit: line.debit,
            credit: line.credit,
            accountId: line.accountId,
            entryId: line.entryId,
            entryDate: line.entry.entryDate,
        }));
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
