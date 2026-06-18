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
exports.CashService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../common/prisma/prisma.service");
const cash_handler_1 = require("./handlers/cash.handler");
let CashService = class CashService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async open(dto, userId) {
        const today = (0, cash_handler_1.startOfUtcDay)(new Date());
        const openRegister = await this.prisma.cashRegister.findFirst({
            where: { date: today, status: 'open' },
        });
        if (openRegister) {
            throw new common_1.ConflictException('الصندوق مفتوح بالفعل لهذا اليوم');
        }
        return this.prisma.cashRegister.create({
            data: {
                date: today,
                openingBalance: dto.openingBalance,
                status: 'open',
                createdBy: userId,
            },
            include: { transactions: { orderBy: { createdAt: 'asc' } } },
        });
    }
    async getToday() {
        const today = (0, cash_handler_1.startOfUtcDay)(new Date());
        const openRegister = await this.prisma.cashRegister.findFirst({
            where: { date: today, status: 'open' },
            include: {
                transactions: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (openRegister) {
            return {
                register: openRegister,
                summary: this.computeSummary(openRegister.openingBalance, openRegister.transactions),
                suggestedOpeningBalance: null,
            };
        }
        const lastClosedToday = await this.prisma.cashRegister.findFirst({
            where: { date: today, status: 'closed' },
            include: {
                transactions: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (lastClosedToday) {
            return {
                register: lastClosedToday,
                summary: this.computeSummary(lastClosedToday.openingBalance, lastClosedToday.transactions),
                suggestedOpeningBalance: this.suggestedOpeningBalance(lastClosedToday),
            };
        }
        const lastClosed = await this.findLastClosedRegister();
        const suggested = lastClosed ? this.suggestedOpeningBalance(lastClosed) : null;
        return {
            register: null,
            summary: null,
            suggestedOpeningBalance: suggested,
        };
    }
    async findLastClosedRegister() {
        return this.prisma.cashRegister.findFirst({
            where: { status: 'closed' },
            include: {
                transactions: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        });
    }
    suggestedOpeningBalance(register) {
        if (register.actualBalance !== null) {
            return new client_1.Prisma.Decimal(register.actualBalance);
        }
        if (register.closingBalance !== null) {
            return new client_1.Prisma.Decimal(register.closingBalance);
        }
        return null;
    }
    async close(dto, userId) {
        const today = (0, cash_handler_1.startOfUtcDay)(new Date());
        const register = await this.prisma.cashRegister.findFirst({
            where: { date: today, status: 'open' },
            include: { transactions: true },
            orderBy: { createdAt: 'desc' },
        });
        if (!register) {
            throw new common_1.NotFoundException('لا يوجد صندوق مفتوح لهذا اليوم');
        }
        if (register.status !== 'open') {
            throw new common_1.BadRequestException('الصندوق مغلق بالفعل');
        }
        const summary = this.computeSummary(register.openingBalance, register.transactions);
        const actualBalance = new client_1.Prisma.Decimal(dto.actualBalance);
        const difference = actualBalance.minus(summary.expectedBalance);
        return this.prisma.cashRegister.update({
            where: { id: register.id },
            data: {
                status: 'closed',
                closingBalance: summary.expectedBalance,
                actualBalance,
                difference,
                notes: dto.notes?.trim() || null,
                createdBy: register.createdBy || userId,
            },
            include: {
                transactions: { orderBy: { createdAt: 'asc' } },
            },
        });
    }
    async getHistory(query) {
        const where = {};
        if (query.from || query.to) {
            where.date = {};
            if (query.from) {
                where.date.gte = (0, cash_handler_1.startOfUtcDay)(new Date(query.from));
            }
            if (query.to) {
                const toDate = (0, cash_handler_1.startOfUtcDay)(new Date(query.to));
                toDate.setUTCDate(toDate.getUTCDate() + 1);
                where.date.lt = toDate;
            }
        }
        const registers = await this.prisma.cashRegister.findMany({
            where,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            include: {
                transactions: { orderBy: { createdAt: 'asc' } },
            },
        });
        return registers.map((register) => ({
            ...register,
            summary: this.computeSummary(register.openingBalance, register.transactions),
        }));
    }
    computeSummary(openingBalance, transactions) {
        let totalIn = new client_1.Prisma.Decimal(0);
        let totalOut = new client_1.Prisma.Decimal(0);
        for (const tx of transactions) {
            if ((0, cash_handler_1.isInflowTransaction)(tx.type)) {
                totalIn = totalIn.plus(tx.amount);
            }
            else if ((0, cash_handler_1.isOutflowTransaction)(tx.type)) {
                totalOut = totalOut.plus(tx.amount);
            }
        }
        const expectedBalance = openingBalance.plus(totalIn).minus(totalOut);
        return { totalIn, totalOut, expectedBalance };
    }
    async createDeposit(dto, userId) {
        const existing = await this.prisma.cashTransaction.findUnique({
            where: { reference: dto.clientUuid },
        });
        if (existing) {
            return existing;
        }
        const today = (0, cash_handler_1.startOfUtcDay)(new Date());
        const register = await this.prisma.cashRegister.findFirst({
            where: { date: today, status: 'open' },
            orderBy: { createdAt: 'desc' },
        });
        if (!register) {
            throw new common_1.BadRequestException('الصندوق غير مفتوح — افتح الصندوق أولاً');
        }
        const source = dto.source?.trim();
        const note = dto.description?.trim();
        let description = 'إيداع نقد للصندوق';
        if (source && note) {
            description = `إيداع نقد — ${source} — ${note}`;
        }
        else if (source) {
            description = `إيداع نقد — ${source}`;
        }
        else if (note) {
            description = `إيداع نقد — ${note}`;
        }
        return this.prisma.cashTransaction.create({
            data: {
                registerId: register.id,
                type: 'cash_deposit',
                amount: dto.amount,
                description,
                reference: dto.clientUuid,
                createdBy: userId,
            },
        });
    }
};
exports.CashService = CashService;
exports.CashService = CashService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CashService);
//# sourceMappingURL=cash.service.js.map