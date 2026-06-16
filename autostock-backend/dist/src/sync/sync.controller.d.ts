import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PullDto } from './dto/pull.dto';
import { PushDto } from './dto/push.dto';
import { SyncService } from './sync.service';
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    push(dto: PushDto, req: Request & {
        user: JwtPayload;
    }): Promise<{
        applied: string[];
        rejected: {
            clientUuid: string;
            reason: string;
        }[];
        serverSeq: number;
    }>;
    pull(query: PullDto): Promise<{
        changes: {
            serverSeq: number;
            eventType: string;
            payload: import("@prisma/client/runtime/client").JsonValue;
            clientUuid: string;
            appliedAt: Date | null;
        }[];
        serverSeq: number;
    }>;
}
