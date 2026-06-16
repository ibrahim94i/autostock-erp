import { PrismaService } from '../common/prisma/prisma.service';
import { ExpensesService } from '../expenses/expenses.service';
export declare class AdminService {
    private readonly prisma;
    private readonly expensesService;
    constructor(prisma: PrismaService, expensesService: ExpensesService);
    resetAllData(): Promise<{
        message: string;
    }>;
}
