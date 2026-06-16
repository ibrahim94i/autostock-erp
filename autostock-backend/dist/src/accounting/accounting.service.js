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
exports.AccountingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../common/prisma/prisma.service");
const event_core_service_1 = require("../events/event-core.service");
const event_types_enum_1 = require("../events/event-types.enum");
const PL_ACCOUNT_CODES = {
    sales: '4000',
    salesReturns: '4100',
    cogs: '5000',
};
let AccountingService = class AccountingService {
    prisma;
    eventCoreService;
    constructor(prisma, eventCoreService) {
        this.prisma = prisma;
        this.eventCoreService = eventCoreService;
    }
    async createPayment(dto, createdBy) {
        const clientUuid = (0, crypto_1.randomUUID)();
        const method = dto.method ?? 'cash';
        return this.eventCoreService.dispatch({
            clientUuid,
            type: event_types_enum_1.EventType.PAYMENT_MADE,
            payload: {
                partyType: dto.partyType,
                partyId: dto.partyId,
                amount: dto.amount,
                direction: dto.direction,
                method,
            },
            createdBy,
            deviceId: 'accounting-api',
            occurredAt: new Date(),
            onCommit: async (tx) => {
                const payment = await tx.payment.create({
                    data: {
                        clientUuid,
                        partyType: dto.partyType,
                        partyId: dto.partyId,
                        amount: dto.amount,
                        method,
                        direction: dto.direction,
                    },
                });
                return { paymentId: payment.id };
            },
        });
    }
    async getProfitAndLoss(from, to) {
        const accounts = await this.prisma.account.findMany({
            where: {
                code: {
                    in: [
                        PL_ACCOUNT_CODES.sales,
                        PL_ACCOUNT_CODES.salesReturns,
                        PL_ACCOUNT_CODES.cogs,
                    ],
                },
            },
        });
        const accountIds = accounts.map((a) => a.id);
        const lines = await this.prisma.journalLine.findMany({
            where: {
                accountId: { in: accountIds },
                entry: {
                    entryDate: { gte: from, lte: to },
                },
            },
            include: { account: true },
        });
        let revenue = new client_1.Prisma.Decimal(0);
        let returns = new client_1.Prisma.Decimal(0);
        let cogsDebit = new client_1.Prisma.Decimal(0);
        let cogsCredit = new client_1.Prisma.Decimal(0);
        for (const line of lines) {
            switch (line.account.code) {
                case PL_ACCOUNT_CODES.sales:
                    revenue = revenue.plus(line.credit);
                    break;
                case PL_ACCOUNT_CODES.salesReturns:
                    returns = returns.plus(line.debit);
                    break;
                case PL_ACCOUNT_CODES.cogs:
                    cogsDebit = cogsDebit.plus(line.debit);
                    cogsCredit = cogsCredit.plus(line.credit);
                    break;
            }
        }
        const cogs = cogsDebit.minus(cogsCredit);
        const netProfit = revenue.minus(returns).minus(cogs);
        return {
            from: from.toISOString(),
            to: to.toISOString(),
            revenue: revenue.toNumber(),
            returns: returns.toNumber(),
            cogs: cogs.toNumber(),
            netProfit: netProfit.toNumber(),
        };
    }
    listAccounts() {
        return this.prisma.account.findMany({ orderBy: { code: 'asc' } });
    }
};
exports.AccountingService = AccountingService;
exports.AccountingService = AccountingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_core_service_1.EventCoreService])
], AccountingService);
//# sourceMappingURL=accounting.service.js.map