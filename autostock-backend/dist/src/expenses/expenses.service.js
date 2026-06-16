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
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../common/prisma/prisma.service");
const cash_handler_1 = require("../cash/handlers/cash.handler");
const DEFAULT_CATEGORIES = [
    'إيجار',
    'كهرباء',
    'ماء',
    'رواتب',
    'وقود',
    'صيانة',
    'أخرى',
];
let ExpensesService = class ExpensesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
        await this.seedDefaultCategories();
    }
    async seedDefaultCategories() {
        for (const name of DEFAULT_CATEGORIES) {
            await this.prisma.expenseCategory.upsert({
                where: { name },
                update: {},
                create: { name },
            });
        }
    }
    async findAll(query) {
        const where = {};
        if (query.categoryId) {
            where.categoryId = query.categoryId;
        }
        if (query.from || query.to) {
            where.date = {};
            if (query.from) {
                where.date.gte = (0, cash_handler_1.startOfUtcDay)(new Date(query.from));
            }
            if (query.to) {
                const toEnd = (0, cash_handler_1.startOfUtcDay)(new Date(query.to));
                toEnd.setUTCDate(toEnd.getUTCDate() + 1);
                where.date.lt = toEnd;
            }
        }
        const items = await this.prisma.expense.findMany({
            where,
            include: { category: true },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        });
        const total = items.reduce((sum, item) => sum.plus(item.amount), new client_1.Prisma.Decimal(0));
        return { items, total: total.toString() };
    }
    async create(dto, userId) {
        const existing = await this.prisma.expense.findUnique({
            where: { clientUuid: dto.clientUuid },
        });
        if (existing) {
            return this.prisma.expense.findUniqueOrThrow({
                where: { id: existing.id },
                include: { category: true },
            });
        }
        const category = await this.prisma.expenseCategory.findUnique({
            where: { id: dto.categoryId },
        });
        if (!category) {
            throw new common_1.NotFoundException('فئة المصروف غير موجودة');
        }
        const expenseDate = (0, cash_handler_1.startOfUtcDay)(new Date(dto.date));
        return this.prisma.runInTransaction(async (tx) => {
            const expense = await tx.expense.create({
                data: {
                    clientUuid: dto.clientUuid,
                    date: expenseDate,
                    amount: dto.amount,
                    categoryId: dto.categoryId,
                    description: dto.description?.trim() || null,
                    createdBy: userId,
                },
                include: { category: true },
            });
            const register = await tx.cashRegister.findFirst({
                where: {
                    date: expenseDate,
                    status: 'open',
                },
            });
            if (register) {
                const description = dto.description?.trim() ||
                    `مصروف — ${category.name}`;
                await tx.cashTransaction.create({
                    data: {
                        registerId: register.id,
                        type: 'expense',
                        amount: dto.amount,
                        description,
                        reference: expense.id,
                        createdBy: userId,
                    },
                });
            }
            return expense;
        });
    }
    async update(id, dto) {
        const existing = await this.prisma.expense.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('المصروف غير موجود');
        }
        if (dto.categoryId) {
            const category = await this.prisma.expenseCategory.findUnique({
                where: { id: dto.categoryId },
            });
            if (!category) {
                throw new common_1.NotFoundException('فئة المصروف غير موجودة');
            }
        }
        return this.prisma.expense.update({
            where: { id },
            data: {
                ...(dto.date !== undefined ? { date: (0, cash_handler_1.startOfUtcDay)(new Date(dto.date)) } : {}),
                ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
                ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
                ...(dto.description !== undefined
                    ? { description: dto.description?.trim() || null }
                    : {}),
            },
            include: { category: true },
        });
    }
    async findCategories() {
        return this.prisma.expenseCategory.findMany({
            orderBy: { name: 'asc' },
        });
    }
    async createCategory(dto) {
        const name = dto.name.trim();
        try {
            return await this.prisma.expenseCategory.create({
                data: { name },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                throw new common_1.ConflictException('اسم الفئة موجود مسبقاً');
            }
            throw error;
        }
    }
    async updateCategory(id, dto) {
        const name = dto.name.trim();
        try {
            return await this.prisma.expenseCategory.update({
                where: { id },
                data: { name },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                throw new common_1.ConflictException('اسم الفئة موجود مسبقاً');
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2025') {
                throw new common_1.NotFoundException('فئة المصروف غير موجودة');
            }
            throw error;
        }
    }
    async remove(id) {
        const existing = await this.prisma.expense.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('المصروف غير موجود');
        }
        await this.prisma.expense.delete({ where: { id } });
        return { deleted: true };
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map