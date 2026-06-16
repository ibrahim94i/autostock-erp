import { Product } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
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
    create(dto: CreateProductDto): Promise<Product>;
    update(id: string, dto: UpdateProductDto): Promise<Product>;
}
