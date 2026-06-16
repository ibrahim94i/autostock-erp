import { CreateProductDto } from './dto/create-product.dto';
import { BulkImportProductsDto } from './dto/bulk-import-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(search?: string, categoryId?: string, page?: string, limit?: string): Promise<import("./products.service").PaginatedProducts>;
    bulkImport(dto: BulkImportProductsDto): Promise<{
        imported: number;
        skipped: Array<{
            row: number;
            sku: string;
            reason: string;
        }>;
        createdCategories: string[];
    }>;
    getAverageCost(id: string): Promise<{
        productId: string;
        averageCost: import("@prisma/client-runtime-utils").Decimal;
        lastUpdated: Date | null;
    }>;
    findOne(id: string): Promise<{
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
    }>;
    create(dto: CreateProductDto): Promise<{
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
    }>;
    update(id: string, dto: UpdateProductDto): Promise<{
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
    }>;
    remove(id: string): Promise<{
        deleted: true;
    }>;
}
