import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogReceiptDto } from './dto/log-receipt.dto';
import { ReceiptsQueryDto } from './dto/receipts-query.dto';
export declare class ReceiptsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private allocateReceiptNumber;
    getNextNumber(): Promise<{
        invoiceNumber: string;
    }>;
    log(dto: LogReceiptDto, userId: string): Promise<{
        id: string;
        createdBy: string;
        saleId: string;
        invoiceNumber: string;
        customerName: string | null;
        totalAmount: Prisma.Decimal;
        printedAt: Date;
        printCount: number;
    }>;
    findAll(query: ReceiptsQueryDto & {
        page: number;
        limit: number;
    }): Promise<{
        id: string;
        createdBy: string;
        saleId: string;
        invoiceNumber: string;
        customerName: string | null;
        totalAmount: Prisma.Decimal;
        printedAt: Date;
        printCount: number;
    }[]>;
    findBySaleId(saleId: string): Promise<{
        id: string;
        createdBy: string;
        saleId: string;
        invoiceNumber: string;
        customerName: string | null;
        totalAmount: Prisma.Decimal;
        printedAt: Date;
        printCount: number;
    }>;
}
