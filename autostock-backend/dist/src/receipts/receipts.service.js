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
exports.ReceiptsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
function startOfCalendarDay(isoDate) {
    return new Date(`${isoDate}T00:00:00+03:00`);
}
function endOfCalendarDayExclusive(isoDate) {
    const [y, m, d] = isoDate.split('-').map(Number);
    const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
    const nextIso = nextDay.toISOString().slice(0, 10);
    return new Date(`${nextIso}T00:00:00+03:00`);
}
let ReceiptsService = class ReceiptsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async allocateReceiptNumber(tx) {
        const settings = await tx.settings.findFirst();
        if (!settings) {
            throw new common_1.NotFoundException('Settings not found');
        }
        const next = settings.nextReceiptNumber ?? 1;
        await tx.settings.update({
            where: { id: settings.id },
            data: { nextReceiptNumber: next + 1 },
        });
        return String(next);
    }
    async getNextNumber() {
        const settings = await this.prisma.settings.findFirst();
        const next = settings?.nextReceiptNumber ?? 1;
        return { invoiceNumber: String(next) };
    }
    async log(dto, userId) {
        const existing = await this.prisma.receipt.findUnique({
            where: { saleId: dto.saleId },
        });
        if (existing) {
            return this.prisma.receipt.update({
                where: { saleId: dto.saleId },
                data: {
                    printCount: { increment: 1 },
                    printedAt: new Date(),
                    ...(dto.invoiceNumber ? { invoiceNumber: dto.invoiceNumber } : {}),
                    customerName: dto.customerName?.trim() || null,
                    totalAmount: dto.totalAmount,
                },
            });
        }
        return this.prisma.runInTransaction(async (tx) => {
            const invoiceNumber = dto.invoiceNumber?.trim() || (await this.allocateReceiptNumber(tx));
            return tx.receipt.create({
                data: {
                    saleId: dto.saleId,
                    invoiceNumber,
                    customerName: dto.customerName?.trim() || null,
                    totalAmount: dto.totalAmount,
                    createdBy: userId,
                },
            });
        });
    }
    async findAll(query) {
        const where = {};
        if (query.from || query.to) {
            where.printedAt = {};
            if (query.from) {
                where.printedAt.gte = startOfCalendarDay(query.from);
            }
            if (query.to) {
                where.printedAt.lt = endOfCalendarDayExclusive(query.to);
            }
        }
        if (query.search?.trim()) {
            const term = query.search.trim();
            where.OR = [
                { invoiceNumber: { contains: term, mode: 'insensitive' } },
                { customerName: { contains: term, mode: 'insensitive' } },
            ];
        }
        return this.prisma.receipt.findMany({
            where,
            orderBy: [{ printedAt: 'desc' }],
        });
    }
    async findBySaleId(saleId) {
        const receipt = await this.prisma.receipt.findUnique({
            where: { saleId },
        });
        if (!receipt) {
            throw new common_1.NotFoundException(`Receipt for sale ${saleId} not found`);
        }
        return receipt;
    }
};
exports.ReceiptsService = ReceiptsService;
exports.ReceiptsService = ReceiptsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReceiptsService);
//# sourceMappingURL=receipts.service.js.map