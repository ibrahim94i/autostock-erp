export declare class CreatePoItemDto {
    productId: string;
    qty: number;
    unitCost: number;
}
export declare class CreatePoDto {
    supplierId: string;
    items: CreatePoItemDto[];
}
