import { Prisma, Supplier } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
export interface FindSuppliersQuery {
    search?: string;
    page?: number;
    limit?: number;
}
export interface PaginatedSuppliers {
    items: Supplier[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface SupplierBalanceResponse {
    supplierId: string;
    balance: Prisma.Decimal | number;
}
export declare class SuppliersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: FindSuppliersQuery): Promise<PaginatedSuppliers>;
    findOne(id: string): Promise<Supplier>;
    create(dto: CreateSupplierDto): Promise<Supplier>;
    getBalance(id: string): Promise<SupplierBalanceResponse>;
}
