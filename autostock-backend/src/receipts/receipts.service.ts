import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogReceiptDto } from './dto/log-receipt.dto';
import { ReceiptsQueryDto } from './dto/receipts-query.dto';

/** Start of calendar day in Baghdad (UTC+3) for YYYY-MM-DD. */
function startOfCalendarDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00+03:00`);
}

/** Exclusive end of calendar day in Baghdad (UTC+3) for YYYY-MM-DD. */
function endOfCalendarDayExclusive(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
  const nextIso = nextDay.toISOString().slice(0, 10);
  return new Date(`${nextIso}T00:00:00+03:00`);
}

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  private async allocateReceiptNumber(
    tx: Parameters<Parameters<PrismaService['runInTransaction']>[0]>[0],
  ): Promise<string> {
    const settings = await tx.settings.findFirst();
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    const next = settings.nextReceiptNumber ?? 1;
    await tx.settings.update({
      where: { id: settings.id },
      data: { nextReceiptNumber: next + 1 },
    });

    return String(next);
  }

  async getNextNumber(): Promise<{ invoiceNumber: string }> {
    const settings = await this.prisma.settings.findFirst();
    const next = settings?.nextReceiptNumber ?? 1;
    return { invoiceNumber: String(next) };
  }

  async log(dto: LogReceiptDto, userId: string) {
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
      const invoiceNumber =
        dto.invoiceNumber?.trim() || (await this.allocateReceiptNumber(tx));

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

  async findAll(query: ReceiptsQueryDto) {
    const where: Prisma.ReceiptWhereInput = {};

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

  async findBySaleId(saleId: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { saleId },
    });

    if (!receipt) {
      throw new NotFoundException(`Receipt for sale ${saleId} not found`);
    }

    return receipt;
  }
}
