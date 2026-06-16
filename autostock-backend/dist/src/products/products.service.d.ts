import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { BulkImportProductItemDto } from './dto/bulk-import-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export interface FindProductsQuery {
    search?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
}
export interface PaginatedProducts {
    items: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class ProductsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: FindProductsQuery): Promise<PaginatedProducts>;
    findOne(id: string): Promise<Product>;
    getAverageCost(id: string): Promise<{
        productId: string;
        averageCost: Prisma.Decimal;
        lastUpdated: Date | null;
    }>;
    create(dto: CreateProductDto): Promise<Product>;
    private resolveUniqueSku;
    update(id: string, dto: UpdateProductDto): Promise<Product>;
    remove(id: string): Promise<{
        deleted: true;
    }>;
    bulkImport(items: BulkImportProductItemDto[]): Promise<{
        imported: number;
        skipped: Array<{
            row: number;
            sku: string;
            reason: string;
        }>;
        createdCategories: string[];
    }>;
}
