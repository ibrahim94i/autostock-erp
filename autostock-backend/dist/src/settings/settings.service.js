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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
let SettingsService = class SettingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
        await this.ensureSettings();
    }
    async ensureSettings() {
        const existing = await this.prisma.settings.findFirst();
        if (existing) {
            return existing;
        }
        return this.prisma.settings.create({ data: {} });
    }
    async getSettings() {
        return this.ensureSettings();
    }
    async updateSettings(dto) {
        const current = await this.ensureSettings();
        return this.prisma.settings.update({
            where: { id: current.id },
            data: {
                companyName: dto.companyName,
                companyPhone: dto.companyPhone ?? null,
                companyAddress: dto.companyAddress ?? null,
                companyLogo: dto.companyLogo ?? null,
                taxNumber: dto.taxNumber ?? null,
                currency: dto.currency,
                receiptSize: dto.receiptSize,
                defaultTaxRate: dto.defaultTaxRate,
                defaultReceiptFooter: dto.defaultReceiptFooter,
                ...(dto.telegramBotToken !== undefined && {
                    telegramBotToken: dto.telegramBotToken.trim() || null,
                }),
                ...(dto.telegramChatId !== undefined && {
                    telegramChatId: dto.telegramChatId.trim() || null,
                }),
                ...(dto.telegramDailyTime !== undefined && {
                    telegramDailyTime: dto.telegramDailyTime,
                }),
                ...(dto.telegramEnabled !== undefined && {
                    telegramEnabled: dto.telegramEnabled,
                }),
            },
        });
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map