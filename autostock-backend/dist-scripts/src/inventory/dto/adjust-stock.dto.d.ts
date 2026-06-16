export declare class AdjustStockItemDto {
    productId: string;
    locationId: string;
    actualQty: number;
}
export declare class AdjustStockDto {
    items: AdjustStockItemDto[];
    reason: string;
}
