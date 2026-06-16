import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CashService } from './cash.service';
import { CashHistoryQueryDto } from './dto/cash-history-query.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
export declare class CashController {
    private readonly cashService;
    constructor(cashService: CashService);
    open(dto: OpenCashRegisterDto, req: Request & {
        user: JwtPayload;
    }): Promise<{
        transactions: {
            id: string;
            type: string;
            createdBy: string;
            createdAt: Date;
            reference: string | null;
            registerId: string;
            amount: import("@prisma/client-runtime-utils").Decimal;
            description: string | null;
        }[];
    } & {
        id: string;
        date: Date;
        openingBalance: import("@prisma/client-runtime-utils").Decimal;
        closingBalance: import("@prisma/client-runtime-utils").Decimal | null;
        actualBalance: import("@prisma/client-runtime-utils").Decimal | null;
        difference: import("@prisma/client-runtime-utils").Decimal | null;
        status: string;
        notes: string | null;
        createdBy: string;
        createdAt: Date;
    }>;
    getToday(): Promise<{
        register: {
            transactions: {
                id: string;
                type: string;
                createdBy: string;
                createdAt: Date;
                reference: string | null;
                registerId: string;
                amount: import("@prisma/client-runtime-utils").Decimal;
                description: string | null;
            }[];
        } & {
            id: string;
            date: Date;
            openingBalance: import("@prisma/client-runtime-utils").Decimal;
            closingBalance: import("@prisma/client-runtime-utils").Decimal | null;
            actualBalance: import("@prisma/client-runtime-utils").Decimal | null;
            difference: import("@prisma/client-runtime-utils").Decimal | null;
            status: string;
            notes: string | null;
            createdBy: string;
            createdAt: Date;
        };
        summary: import("./cash.service").CashRegisterSummary;
    } | {
        register: null;
        summary: null;
    }>;
    close(dto: CloseCashRegisterDto, req: Request & {
        user: JwtPayload;
    }): Promise<{
        transactions: {
            id: string;
            type: string;
            createdBy: string;
            createdAt: Date;
            reference: string | null;
            registerId: string;
            amount: import("@prisma/client-runtime-utils").Decimal;
            description: string | null;
        }[];
    } & {
        id: string;
        date: Date;
        openingBalance: import("@prisma/client-runtime-utils").Decimal;
        closingBalance: import("@prisma/client-runtime-utils").Decimal | null;
        actualBalance: import("@prisma/client-runtime-utils").Decimal | null;
        difference: import("@prisma/client-runtime-utils").Decimal | null;
        status: string;
        notes: string | null;
        createdBy: string;
        createdAt: Date;
    }>;
    getHistory(query: CashHistoryQueryDto): Promise<{
        summary: import("./cash.service").CashRegisterSummary;
        transactions: {
            id: string;
            type: string;
            createdBy: string;
            createdAt: Date;
            reference: string | null;
            registerId: string;
            amount: import("@prisma/client-runtime-utils").Decimal;
            description: string | null;
        }[];
        id: string;
        date: Date;
        openingBalance: import("@prisma/client-runtime-utils").Decimal;
        closingBalance: import("@prisma/client-runtime-utils").Decimal | null;
        actualBalance: import("@prisma/client-runtime-utils").Decimal | null;
        difference: import("@prisma/client-runtime-utils").Decimal | null;
        status: string;
        notes: string | null;
        createdBy: string;
        createdAt: Date;
    }[]>;
}
