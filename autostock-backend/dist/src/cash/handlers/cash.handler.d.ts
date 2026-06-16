import { PrismaClient } from '@prisma/client';
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;
export interface EventRow {
    id: string;
    eventType: string;
    createdBy: string;
    occurredAt?: Date;
}
export declare class CashHandler {
    apply(tx: TransactionClient, eventRow: EventRow, payload: unknown): Promise<void>;
    private handleSaleCreated;
    private handlePaymentMade;
    private findOpenRegisterForDate;
}
export declare function startOfUtcDay(date: Date): Date;
export declare function isInflowTransaction(type: string): boolean;
export declare function isOutflowTransaction(type: string): boolean;
export {};
