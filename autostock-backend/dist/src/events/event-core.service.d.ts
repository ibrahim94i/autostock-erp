import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventType } from './event-types.enum';
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;
export type { TransactionClient };
export interface EventRow {
    id: string;
    eventType: string;
    createdBy: string;
    occurredAt?: Date;
}
export interface DispatchEventInput {
    clientUuid: string;
    type: EventType;
    payload: unknown;
    createdBy: string;
    deviceId: string;
    localSeq?: number;
    occurredAt: Date;
    branchId?: string;
    onCommit?: (tx: TransactionClient, eventRow: EventRow) => Promise<unknown>;
}
export type DispatchResult = {
    status: 'APPLIED';
    result: unknown;
} | {
    status: 'REJECTED';
    reason: string;
};
export declare class ValidationError extends Error {
    readonly reason: string;
    constructor(reason: string);
}
export declare class EventCoreService {
    private readonly prisma;
    private readonly stockHandler;
    private readonly accountingHandler;
    private readonly cashHandler;
    constructor(prisma: PrismaService);
    dispatch(event: DispatchEventInput): Promise<DispatchResult>;
    private dispatchOnce;
    private mapStoredResult;
    private persistRejectedEvent;
    private validateStockAvailability;
    private enrichStockAdjustedPayload;
    private extractValidatableItems;
}
