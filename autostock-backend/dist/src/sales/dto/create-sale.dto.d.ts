export declare class CreateSaleItemDto {
    productId: string;
    locationId: string;
    qty: number;
    unitPrice: number;
    unitCost: number;
    qtyUnit?: 'piece' | 'carton';
    displayQty?: number;
}
export declare class CreateSaleDto {
    customerId?: string;
    type: 'retail' | 'wholesale';
    paymentType: 'cash' | 'debt';
    items: CreateSaleItemDto[];
}
