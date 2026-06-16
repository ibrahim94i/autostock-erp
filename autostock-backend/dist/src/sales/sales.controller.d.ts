import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';
export declare class SalesController {
    private readonly salesService;
    constructor(salesService: SalesService);
    create(dto: CreateSaleDto, req: Request & {
        user: JwtPayload;
    }): Promise<import("../events/event-core.service").DispatchResult>;
    createReturn(id: string, dto: CreateReturnDto, req: Request & {
        user: JwtPayload;
    }): Promise<import("../events/event-core.service").DispatchResult>;
    getInvoice(id: string): Promise<{
        sale: {
            returns: ({
                product: {
                    id: string;
                    name: string;
                    active: boolean;
                    sku: string;
                    categoryId: string;
                    costPrice: import("@prisma/client-runtime-utils").Decimal;
                    averageCost: import("@prisma/client-runtime-utils").Decimal;
                    retailPrice: import("@prisma/client-runtime-utils").Decimal;
                    wholesalePrice: import("@prisma/client-runtime-utils").Decimal;
                    minStockAlert: number;
                    unit: string;
                    unitsPerCarton: number;
                };
            } & {
                id: string;
                productId: string;
                reason: string;
                clientUuid: string;
                saleId: string;
                qty: import("@prisma/client-runtime-utils").Decimal;
                refundAmount: import("@prisma/client-runtime-utils").Decimal;
            })[];
            customer: {
                id: string;
                name: string;
                type: string;
                phone: string;
            } | null;
            items: ({
                product: {
                    id: string;
                    name: string;
                    active: boolean;
                    sku: string;
                    categoryId: string;
                    costPrice: import("@prisma/client-runtime-utils").Decimal;
                    averageCost: import("@prisma/client-runtime-utils").Decimal;
                    retailPrice: import("@prisma/client-runtime-utils").Decimal;
                    wholesalePrice: import("@prisma/client-runtime-utils").Decimal;
                    minStockAlert: number;
                    unit: string;
                    unitsPerCarton: number;
                };
            } & {
                id: string;
                unitCost: import("@prisma/client-runtime-utils").Decimal;
                productId: string;
                saleId: string;
                qty: import("@prisma/client-runtime-utils").Decimal;
                unitPrice: import("@prisma/client-runtime-utils").Decimal;
            })[];
        } & {
            id: string;
            type: string;
            status: string;
            createdBy: string;
            createdAt: Date;
            customerId: string | null;
            clientUuid: string;
            paymentType: string;
            subtotal: import("@prisma/client-runtime-utils").Decimal;
        };
        items: ({
            product: {
                id: string;
                name: string;
                active: boolean;
                sku: string;
                categoryId: string;
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                averageCost: import("@prisma/client-runtime-utils").Decimal;
                retailPrice: import("@prisma/client-runtime-utils").Decimal;
                wholesalePrice: import("@prisma/client-runtime-utils").Decimal;
                minStockAlert: number;
                unit: string;
                unitsPerCarton: number;
            };
        } & {
            id: string;
            unitCost: import("@prisma/client-runtime-utils").Decimal;
            productId: string;
            saleId: string;
            qty: import("@prisma/client-runtime-utils").Decimal;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
        })[];
        returns: ({
            product: {
                id: string;
                name: string;
                active: boolean;
                sku: string;
                categoryId: string;
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                averageCost: import("@prisma/client-runtime-utils").Decimal;
                retailPrice: import("@prisma/client-runtime-utils").Decimal;
                wholesalePrice: import("@prisma/client-runtime-utils").Decimal;
                minStockAlert: number;
                unit: string;
                unitsPerCarton: number;
            };
        } & {
            id: string;
            productId: string;
            reason: string;
            clientUuid: string;
            saleId: string;
            qty: import("@prisma/client-runtime-utils").Decimal;
            refundAmount: import("@prisma/client-runtime-utils").Decimal;
        })[];
        returnedByProduct: {
            [k: string]: string;
        };
        event: {
            id: string;
            result: import("@prisma/client/runtime/client").JsonValue | null;
            status: string;
            createdBy: string;
            clientUuid: string;
            serverSeq: number;
            eventType: string;
            payload: import("@prisma/client/runtime/client").JsonValue;
            occurredAt: Date;
            appliedAt: Date | null;
            deviceId: string;
            localSeq: number;
            branchId: string | null;
        } | null;
        journalEntries: ({
            lines: ({
                account: {
                    id: string;
                    code: string;
                    name: string;
                    type: string;
                };
            } & {
                id: string;
                partyType: string | null;
                partyId: string | null;
                debit: import("@prisma/client-runtime-utils").Decimal;
                credit: import("@prisma/client-runtime-utils").Decimal;
                entryId: string;
                accountId: string;
            })[];
        } & {
            id: string;
            createdBy: string;
            entryDate: Date;
            sourceType: string;
            sourceId: string | null;
            memo: string | null;
            eventId: string;
        })[];
    }>;
    findOne(id: string): Promise<{
        returns: ({
            product: {
                id: string;
                name: string;
                active: boolean;
                sku: string;
                categoryId: string;
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                averageCost: import("@prisma/client-runtime-utils").Decimal;
                retailPrice: import("@prisma/client-runtime-utils").Decimal;
                wholesalePrice: import("@prisma/client-runtime-utils").Decimal;
                minStockAlert: number;
                unit: string;
                unitsPerCarton: number;
            };
        } & {
            id: string;
            productId: string;
            reason: string;
            clientUuid: string;
            saleId: string;
            qty: import("@prisma/client-runtime-utils").Decimal;
            refundAmount: import("@prisma/client-runtime-utils").Decimal;
        })[];
        customer: {
            id: string;
            name: string;
            type: string;
            phone: string;
        } | null;
        items: ({
            product: {
                id: string;
                name: string;
                active: boolean;
                sku: string;
                categoryId: string;
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                averageCost: import("@prisma/client-runtime-utils").Decimal;
                retailPrice: import("@prisma/client-runtime-utils").Decimal;
                wholesalePrice: import("@prisma/client-runtime-utils").Decimal;
                minStockAlert: number;
                unit: string;
                unitsPerCarton: number;
            };
        } & {
            id: string;
            unitCost: import("@prisma/client-runtime-utils").Decimal;
            productId: string;
            saleId: string;
            qty: import("@prisma/client-runtime-utils").Decimal;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
        })[];
    } & {
        id: string;
        type: string;
        status: string;
        createdBy: string;
        createdAt: Date;
        customerId: string | null;
        clientUuid: string;
        paymentType: string;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
    }>;
}
