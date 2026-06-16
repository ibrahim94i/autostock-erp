import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { LogReceiptDto } from './dto/log-receipt.dto';
import { ReceiptsQueryDto } from './dto/receipts-query.dto';
import { ReceiptsService } from './receipts.service';
export declare class ReceiptsController {
    private readonly receiptsService;
    constructor(receiptsService: ReceiptsService);
    log(dto: LogReceiptDto, req: Request & {
        user: JwtPayload;
    }): Promise<{
        id: string;
        createdBy: string;
        saleId: string;
        invoiceNumber: string;
        customerName: string | null;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        printedAt: Date;
        printCount: number;
    }>;
    findAll(query: ReceiptsQueryDto): Promise<{
        id: string;
        createdBy: string;
        saleId: string;
        invoiceNumber: string;
        customerName: string | null;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        printedAt: Date;
        printCount: number;
    }[]>;
    getNextNumber(): Promise<{
        invoiceNumber: string;
    }>;
    findBySaleId(saleId: string): Promise<{
        id: string;
        createdBy: string;
        saleId: string;
        invoiceNumber: string;
        customerName: string | null;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        printedAt: Date;
        printCount: number;
    }>;
}
