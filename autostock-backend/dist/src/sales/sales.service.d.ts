import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { DispatchResult, EventCoreService } from '../events/event-core.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
export declare class SalesService {
    private readonly prisma;
    private readonly eventCoreService;
    constructor(prisma: PrismaService, eventCoreService: EventCoreService);
    create(dto: CreateSaleDto, createdBy: string): Promise<DispatchResult>;
    createReturn(saleId: string, dto: CreateReturnDto, createdBy: string): Promise<DispatchResult>;
    findOne(id: string): Promise<{
        returns: ({
            product: {
                id: string;
                name: string;
                active: boolean;
                sku: string;
                categoryId: string;
                costPrice: Prisma.Decimal;
                averageCost: Prisma.Decimal;
                retailPrice: Prisma.Decimal;
                wholesalePrice: Prisma.Decimal;
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
            qty: Prisma.Decimal;
            qtyUnit: string;
            displayQty: Prisma.Decimal;
            refundAmount: Prisma.Decimal;
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
                costPrice: Prisma.Decimal;
                averageCost: Prisma.Decimal;
                retailPrice: Prisma.Decimal;
                wholesalePrice: Prisma.Decimal;
                minStockAlert: number;
                unit: string;
                unitsPerCarton: number;
            };
        } & {
            id: string;
            unitCost: Prisma.Decimal;
            productId: string;
            saleId: string;
            qty: Prisma.Decimal;
            qtyUnit: string;
            displayQty: Prisma.Decimal;
            unitPrice: Prisma.Decimal;
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
        subtotal: Prisma.Decimal;
    }>;
    getInvoice(id: string): Promise<{
        sale: {
            returns: ({
                product: {
                    id: string;
                    name: string;
                    active: boolean;
                    sku: string;
                    categoryId: string;
                    costPrice: Prisma.Decimal;
                    averageCost: Prisma.Decimal;
                    retailPrice: Prisma.Decimal;
                    wholesalePrice: Prisma.Decimal;
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
                qty: Prisma.Decimal;
                qtyUnit: string;
                displayQty: Prisma.Decimal;
                refundAmount: Prisma.Decimal;
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
                    costPrice: Prisma.Decimal;
                    averageCost: Prisma.Decimal;
                    retailPrice: Prisma.Decimal;
                    wholesalePrice: Prisma.Decimal;
                    minStockAlert: number;
                    unit: string;
                    unitsPerCarton: number;
                };
            } & {
                id: string;
                unitCost: Prisma.Decimal;
                productId: string;
                saleId: string;
                qty: Prisma.Decimal;
                qtyUnit: string;
                displayQty: Prisma.Decimal;
                unitPrice: Prisma.Decimal;
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
            subtotal: Prisma.Decimal;
        };
        items: ({
            product: {
                id: string;
                name: string;
                active: boolean;
                sku: string;
                categoryId: string;
                costPrice: Prisma.Decimal;
                averageCost: Prisma.Decimal;
                retailPrice: Prisma.Decimal;
                wholesalePrice: Prisma.Decimal;
                minStockAlert: number;
                unit: string;
                unitsPerCarton: number;
            };
        } & {
            id: string;
            unitCost: Prisma.Decimal;
            productId: string;
            saleId: string;
            qty: Prisma.Decimal;
            qtyUnit: string;
            displayQty: Prisma.Decimal;
            unitPrice: Prisma.Decimal;
        })[];
        returns: ({
            product: {
                id: string;
                name: string;
                active: boolean;
                sku: string;
                categoryId: string;
                costPrice: Prisma.Decimal;
                averageCost: Prisma.Decimal;
                retailPrice: Prisma.Decimal;
                wholesalePrice: Prisma.Decimal;
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
            qty: Prisma.Decimal;
            qtyUnit: string;
            displayQty: Prisma.Decimal;
            refundAmount: Prisma.Decimal;
        })[];
        returnedByProduct: {
            [k: string]: string;
        };
        event: {
            id: string;
            result: Prisma.JsonValue | null;
            status: string;
            createdBy: string;
            clientUuid: string;
            serverSeq: number;
            eventType: string;
            payload: Prisma.JsonValue;
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
                debit: Prisma.Decimal;
                credit: Prisma.Decimal;
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
}
