import { EventType } from '../event-types.enum';

export interface EventEffects {
  stock: boolean;
  accounting: boolean;
  cash: boolean;
}

export const EVENT_EFFECTS_MAP: Record<EventType, EventEffects> = {
  [EventType.SALE_CREATED]: { stock: true, accounting: true, cash: true },
  [EventType.PURCHASE_RECEIVED]: { stock: true, accounting: true, cash: false },
  [EventType.STOCK_ADJUSTED]: { stock: true, accounting: true, cash: false },
  [EventType.PAYMENT_MADE]: { stock: false, accounting: true, cash: true },
  [EventType.RETURN_PROCESSED]: { stock: true, accounting: true, cash: false },
};
