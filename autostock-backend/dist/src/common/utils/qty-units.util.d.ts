export type QtyUnit = 'piece' | 'carton';
export declare function unitsPerCartonValue(unitsPerCarton: number | null | undefined): number;
export declare function toPieceQty(displayQty: number, qtyUnit: QtyUnit, unitsPerCarton: number): number;
export declare function normalizeSaleItemUnits(qty: number, qtyUnit: QtyUnit | undefined, displayQty: number | undefined, unitsPerCarton: number): {
    qtyUnit: QtyUnit;
    displayQty: number;
};
