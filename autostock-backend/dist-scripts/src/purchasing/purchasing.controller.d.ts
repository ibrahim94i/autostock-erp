import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreatePoDto } from './dto/create-po.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { PurchasingService } from './purchasing.service';
import { SuppliersService } from './suppliers.service';
export declare class PurchasingController {
    private readonly suppliersService;
    private readonly purchasingService;
    constructor(suppliersService: SuppliersService, purchasingService: PurchasingService);
    findAllSuppliers(search?: string, page?: string, limit?: string): Promise<import("./suppliers.service").PaginatedSuppliers>;
    createSupplier(dto: CreateSupplierDto): Promise<{
        id: string;
        name: string;
        phone: string;
    }>;
    getSupplierBalance(id: string): Promise<import("./suppliers.service").SupplierBalanceResponse>;
    findOneSupplier(id: string): Promise<{
        id: string;
        name: string;
        phone: string;
    }>;
    createPurchaseOrder(dto: CreatePoDto, req: Request & {
        user: JwtPayload;
    }): Promise<{
        id: string;
        createdBy: string;
        supplierId: string;
        createdAt: Date;
        status: string;
        clientUuid: string;
    }>;
    findAllPurchaseOrders(status?: string, page?: string, limit?: string): Promise<import("./purchasing.service").PaginatedPurchaseOrders>;
    findOnePurchaseOrder(id: string): Promise<{
        id: string;
        createdBy: string;
        supplierId: string;
        createdAt: Date;
        status: string;
        clientUuid: string;
    }>;
}
