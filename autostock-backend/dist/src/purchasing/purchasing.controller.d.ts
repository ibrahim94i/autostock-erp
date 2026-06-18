import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreatePoDto } from './dto/create-po.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ReceivePoDto } from './dto/receive-po.dto';
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
    updateSupplier(id: string, dto: UpdateSupplierDto): Promise<{
        id: string;
        name: string;
        phone: string;
    }>;
    removeSupplier(id: string): Promise<{
        deleted: true;
    }>;
    getSupplierBalancesBulk(ids?: string): Promise<import("./suppliers.service").SupplierBalanceResponse[]>;
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
        status: string;
        createdBy: string;
        createdAt: Date;
        supplierId: string;
        clientUuid: string;
    }>;
    findAllPurchaseOrders(status?: string, page?: string, limit?: string): Promise<import("./purchasing.service").PaginatedPurchaseOrders>;
    findOnePurchaseOrder(id: string): Promise<{
        id: string;
        status: string;
        createdBy: string;
        createdAt: Date;
        supplierId: string;
        clientUuid: string;
    }>;
    receivePurchaseOrder(id: string, dto: ReceivePoDto, req: Request & {
        user: JwtPayload;
    }): Promise<import("../events/event-core.service").DispatchResult>;
    updatePurchaseOrder(id: string, dto: CreatePoDto): Promise<{
        id: string;
        status: string;
        createdBy: string;
        createdAt: Date;
        supplierId: string;
        clientUuid: string;
    }>;
    removePurchaseOrder(id: string): Promise<{
        deleted: true;
    }>;
}
