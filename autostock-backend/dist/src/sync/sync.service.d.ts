import { PrismaService } from '../common/prisma/prisma.service';
import { EventCoreService } from '../events/event-core.service';
import { PushDto } from './dto/push.dto';
export declare class SyncService {
    private readonly prisma;
    private readonly eventCoreService;
    constructor(prisma: PrismaService, eventCoreService: EventCoreService);
    push(dto: PushDto, createdBy: string): Promise<{
        applied: string[];
        rejected: {
            clientUuid: string;
            reason: string;
        }[];
        serverSeq: number;
    }>;
    pull(since: number): Promise<{
        changes: {
            serverSeq: number;
            eventType: string;
            payload: import("@prisma/client/runtime/client").JsonValue;
            clientUuid: string;
            appliedAt: Date | null;
        }[];
        serverSeq: number;
    }>;
    private getMaxServerSeq;
}
