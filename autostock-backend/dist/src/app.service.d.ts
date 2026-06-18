import { PrismaService } from './common/prisma/prisma.service';
export declare class AppService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getHello(): string;
    getHealth(): Promise<{
        status: string;
        db: string;
        uptime: number;
    }>;
}
