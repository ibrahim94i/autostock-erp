import { EventType } from '../event-types.enum';
export interface EventEffects {
    stock: boolean;
    accounting: boolean;
}
export declare const EVENT_EFFECTS_MAP: Record<EventType, EventEffects>;
