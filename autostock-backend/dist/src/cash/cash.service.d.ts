import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { CashHistoryQueryDto } from './dto/cash-history-query.dto';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
export interface CashRegisterSummary {
    totalIn: Prisma.Decimal;
    totalOut: Prisma.Decimal;
    expectedBalance: Prisma.Decimal;
}
export declare class CashService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    open(dto: OpenCashRegisterDto, userId: string): Promise<{
        transactions: {
            id: string;
            type: string;
            createdBy: string;
            createdAt: Date;
            reference: string | null;
            registerId: string;
            amount: Prisma.Decimal;
            description: string | null;
        }[];
    } & {
        id: string;
        date: Date;
        openingBalance: Prisma.Decimal;
        closingBalance: Prisma.Decimal | null;
        actualBalance: Prisma.Decimal | null;
        difference: Prisma.Decimal | null;
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
                amount: Prisma.Decimal;
                description: string | null;
            }[];
        } & {
            id: string;
            date: Date;
            openingBalance: Prisma.Decimal;
            closingBalance: Prisma.Decimal | null;
            actualBalance: Prisma.Decimal | null;
            difference: Prisma.Decimal | null;
            status: string;
            notes: string | null;
            createdBy: string;
            createdAt: Date;
        };
        summary: CashRegisterSummary;
    } | {
        register: null;
        summary: null;
    }>;
    close(dto: CloseCashRegisterDto, userId: string): Promise<{
        transactions: {
            id: string;
            type: string;
            createdBy: string;
            createdAt: Date;
            reference: string | null;
            registerId: string;
            amount: Prisma.Decimal;
            description: string | null;
        }[];
    } & {
        id: string;
        date: Date;
        openingBalance: Prisma.Decimal;
        closingBalance: Prisma.Decimal | null;
        actualBalance: Prisma.Decimal | null;
        difference: Prisma.Decimal | null;
        status: string;
        notes: string | null;
        createdBy: string;
        createdAt: Date;
    }>;
    getHistory(query: CashHistoryQueryDto): Promise<{
        summary: CashRegisterSummary;
        transactions: {
            id: string;
            type: string;
            createdBy: string;
            createdAt: Date;
            reference: string | null;
            registerId: string;
            amount: Prisma.Decimal;
            description: string | null;
        }[];
        id: string;
        date: Date;
        openingBalance: Prisma.Decimal;
        closingBalance: Prisma.Decimal | null;
        actualBalance: Prisma.Decimal | null;
        difference: Prisma.Decimal | null;
        status: string;
        notes: string | null;
        createdBy: string;
        createdAt: Date;
    }[]>;
    private computeSummary;
}
