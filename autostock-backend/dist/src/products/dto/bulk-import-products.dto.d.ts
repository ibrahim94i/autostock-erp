export declare class BulkImportProductItemDto {
    sku?: string;
    name: string;
    categoryName: string;
    costPrice: number;
    retailPrice: number;
    wholesalePrice: number;
    minStockAlert?: number;
    unit: string;
    unitsPerCarton?: number;
}
export declare class BulkImportProductsDto {
    items: BulkImportProductItemDto[];
}
