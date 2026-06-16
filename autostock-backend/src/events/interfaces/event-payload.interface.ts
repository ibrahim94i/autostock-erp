import { EventType } from '../event-types.enum';

export interface EventPayload {
  clientUuid: string;
  type: EventType;
  payload: unknown;
  createdBy: string;
  deviceId: string;
  localSeq?: number;
  occurredAt: Date;
}
