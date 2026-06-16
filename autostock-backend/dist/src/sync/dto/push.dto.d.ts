import { EventType } from '../../events/event-types.enum';
export declare class PushOperationDto {
    clientUuid: string;
    type: EventType;
    payload: Record<string, unknown>;
    localSeq: number;
    occurredAt: string;
}
export declare class PushDto {
    deviceId: string;
    operations: PushOperationDto[];
}
