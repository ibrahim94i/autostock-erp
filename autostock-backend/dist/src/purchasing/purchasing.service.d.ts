import { PurchaseOrder } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { DispatchResult, EventCoreService } from '../events/event-core.service';
import { CreatePoDto } from './dto/create-po.dto';
import { ReceivePoDto } from './dto/receive-po.dto';
import { SuppliersService } from './suppliers.service';
export interface FindPurchaseOrdersQuery {
    status?: string;
    page?: number;
    limit?: number;
}
export interface PaginatedPurchaseOrders {
    items: PurchaseOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class PurchasingService {
    private readonly prisma;
    private readonly suppliersService;
    private readonly eventCoreService;
    constructor(prisma: PrismaService, suppliersService: SuppliersService, eventCoreService: EventCoreService);
    findAll(query: FindPurchaseOrdersQuery): Promise<PaginatedPurchaseOrders>;
    findOne(id: string): Promise<PurchaseOrder>;
    create(dto: CreatePoDto, createdBy: string): Promise<PurchaseOrder>;
    receive(id: string, dto: ReceivePoDto, createdBy: string): Promise<DispatchResult>;
    update(id: string, dto: CreatePoDto): Promise<PurchaseOrder>;
    remove(id: string): Promise<{
        deleted: true;
    }>;
}
