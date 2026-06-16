import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { DispatchResult, EventCoreService } from '../events/event-core.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';
export interface PaginatedStockBalances {
    items: Array<{
        productId: string;
        locationId: string;
        quantity: Prisma.Decimal;
        lastMovementId: string;
        updatedAt: Date;
        product?: {
            id: string;
            sku: string;
            name: string;
            minStockAlert: number;
        };
        location?: {
            id: string;
            zone: string;
            shelf: string;
            code: string;
        };
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface LowStockAlert {
    productId: string;
    locationId: string;
    quantity: Prisma.Decimal;
    minStockAlert: number;
    product: {
        id: string;
        sku: string;
        name: string;
    };
    location: {
        id: string;
        zone: string;
        shelf: string;
        code: string;
    };
}
export declare class InventoryService {
    private readonly prisma;
    private readonly eventCoreService;
    constructor(prisma: PrismaService, eventCoreService: EventCoreService);
    reconcile(dto: AdjustStockDto, createdBy: string): Promise<DispatchResult>;
    getBalances(query: StockQueryDto): Promise<PaginatedStockBalances>;
    getLowAlerts(): Promise<LowStockAlert[]>;
}
