import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { DispatchResult, EventCoreService } from '../events/event-core.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
export declare class AccountingService {
    private readonly prisma;
    private readonly eventCoreService;
    constructor(prisma: PrismaService, eventCoreService: EventCoreService);
    createPayment(dto: CreatePaymentDto, createdBy: string): Promise<DispatchResult>;
    getProfitAndLoss(from: Date, to: Date): Promise<{
        from: string;
        to: string;
        revenue: number;
        returns: number;
        cogs: number;
        netProfit: number;
    }>;
    listAccounts(): Prisma.PrismaPromise<{
        id: string;
        code: string;
        name: string;
        type: string;
    }[]>;
}
