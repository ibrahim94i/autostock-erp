import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
export interface ActivityLogQuery {
    userId?: string;
    from?: string;
    to?: string;
    eventType?: string;
    page?: number;
    limit?: number;
}
export declare class ActivityLogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: ActivityLogQuery): Promise<{
        items: {
            id: string;
            eventType: string;
            status: string;
            occurredAt: Date;
            appliedAt: Date | null;
            createdBy: string;
            user: {
                id: string;
                name: string;
                username: string;
            } | null;
            payload: Prisma.JsonValue;
            entity: {
                type: string;
                id: string | null;
                label: string | null;
            };
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    listUsers(): Promise<{
        id: string;
        name: string;
        username: string;
    }[]>;
    listEventTypes(): string[];
    private extractEntity;
}
