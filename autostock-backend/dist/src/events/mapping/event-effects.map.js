"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_EFFECTS_MAP = void 0;
const event_types_enum_1 = require("../event-types.enum");
exports.EVENT_EFFECTS_MAP = {
    [event_types_enum_1.EventType.SALE_CREATED]: { stock: true, accounting: true, cash: true },
    [event_types_enum_1.EventType.PURCHASE_RECEIVED]: { stock: true, accounting: true, cash: false },
    [event_types_enum_1.EventType.STOCK_ADJUSTED]: { stock: true, accounting: true, cash: false },
    [event_types_enum_1.EventType.PAYMENT_MADE]: { stock: false, accounting: true, cash: true },
    [event_types_enum_1.EventType.RETURN_PROCESSED]: { stock: true, accounting: true, cash: false },
};
//# sourceMappingURL=event-effects.map.js.map