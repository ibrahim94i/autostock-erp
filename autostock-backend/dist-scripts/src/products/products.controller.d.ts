import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(search?: string, categoryId?: string, page?: string, limit?: string): Promise<import("./products.service").PaginatedProducts>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        sku: string;
        costPrice: import("@prisma/client-runtime-utils").Decimal;
        retailPrice: import("@prisma/client-runtime-utils").Decimal;
        wholesalePrice: import("@prisma/client-runtime-utils").Decimal;
        minStockAlert: number;
        unit: string;
        categoryId: string;
    }>;
    create(dto: CreateProductDto): Promise<{
        id: string;
        name: string;
        sku: string;
        costPrice: import("@prisma/client-runtime-utils").Decimal;
        retailPrice: import("@prisma/client-runtime-utils").Decimal;
        wholesalePrice: import("@prisma/client-runtime-utils").Decimal;
        minStockAlert: number;
        unit: string;
        categoryId: string;
    }>;
    update(id: string, dto: UpdateProductDto): Promise<{
        id: string;
        name: string;
        sku: string;
        costPrice: import("@prisma/client-runtime-utils").Decimal;
        retailPrice: import("@prisma/client-runtime-utils").Decimal;
        wholesalePrice: import("@prisma/client-runtime-utils").Decimal;
        minStockAlert: number;
        unit: string;
        categoryId: string;
    }>;
}
