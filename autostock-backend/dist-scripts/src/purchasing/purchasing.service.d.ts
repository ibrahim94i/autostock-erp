import { PurchaseOrder } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePoDto } from './dto/create-po.dto';
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
    constructor(prisma: PrismaService, suppliersService: SuppliersService);
    findAll(query: FindPurchaseOrdersQuery): Promise<PaginatedPurchaseOrders>;
    findOne(id: string): Promise<PurchaseOrder>;
    create(dto: CreatePoDto, createdBy: string): Promise<PurchaseOrder>;
}
