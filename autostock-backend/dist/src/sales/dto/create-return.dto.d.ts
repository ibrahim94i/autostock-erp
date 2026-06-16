export declare class CreateReturnItemDto {
    productId: string;
    locationId: string;
    qty: number;
    unitCost: number;
}
export declare class CreateReturnDto {
    items: CreateReturnItemDto[];
    refundMethod: 'cash' | 'credit';
    reason: string;
    refundAmount: number;
}
