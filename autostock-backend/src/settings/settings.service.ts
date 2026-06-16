import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
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

  async updateSettings(dto: UpdateSettingsDto) {
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
}
