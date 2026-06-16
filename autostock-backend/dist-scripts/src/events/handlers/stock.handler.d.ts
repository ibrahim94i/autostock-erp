import { PrismaClient } from '@prisma/client';
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;
export interface EventRow {
    id: string;
    eventType: string;
    createdBy: string;
    occurredAt?: Date;
}
export declare class StockHandler {
    apply(tx: TransactionClient, eventRow: EventRow, payload: unknown): Promise<void>;
    private handleSaleCreated;
    private handlePurchaseReceived;
    private handleReturnProcessed;
    private handleStockAdjusted;
    private getCurrentQuantity;
    private upsertBalance;
}
export {};
