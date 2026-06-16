import { PrismaClient } from '@prisma/client';
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;
export interface EventRow {
    id: string;
    eventType: string;
    createdBy: string;
    occurredAt?: Date;
}
export declare class AccountingHandler {
    apply(tx: TransactionClient, eventRow: EventRow, payload: unknown): Promise<void>;
    private handleSaleCreated;
    private handlePurchaseReceived;
    private handlePaymentMade;
    private handleReturnProcessed;
    private handleStockAdjusted;
    private resolveAccounts;
    private createBalancedEntry;
    private assertBalanced;
    private applyPartyBalanceChange;
    private upsertCustomerBalance;
    private upsertSupplierBalance;
}
export {};
