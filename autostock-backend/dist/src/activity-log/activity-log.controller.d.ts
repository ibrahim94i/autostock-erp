import { ActivityLogService } from './activity-log.service';
export declare class ActivityLogController {
    private readonly activityLogService;
    constructor(activityLogService: ActivityLogService);
    findAll(userId?: string, from?: string, to?: string, eventType?: string, page?: string, limit?: string): Promise<{
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
            payload: import("@prisma/client/runtime/client").JsonValue;
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
}
