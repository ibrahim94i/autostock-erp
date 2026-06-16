import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AccountingService } from './accounting.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PlQueryDto } from './dto/pl-query.dto';
export declare class AccountingController {
    private readonly accountingService;
    constructor(accountingService: AccountingService);
    createPayment(dto: CreatePaymentDto, req: Request & {
        user: JwtPayload;
    }): Promise<import("../events/event-core.service").DispatchResult>;
    getProfitReport(query: PlQueryDto): Promise<{
        from: string;
        to: string;
        revenue: number;
        returns: number;
        cogs: number;
        netProfit: number;
    }>;
    listAccounts(): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        code: string;
        name: string;
        type: string;
    }[]>;
}
