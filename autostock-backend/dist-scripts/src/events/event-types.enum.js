"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = void 0;
var EventType;
(function (EventType) {
    EventType["SALE_CREATED"] = "SALE_CREATED";
    EventType["PURCHASE_RECEIVED"] = "PURCHASE_RECEIVED";
    EventType["STOCK_ADJUSTED"] = "STOCK_ADJUSTED";
    EventType["PAYMENT_MADE"] = "PAYMENT_MADE";
    EventType["RETURN_PROCESSED"] = "RETURN_PROCESSED";
})(EventType || (exports.EventType = EventType = {}));
