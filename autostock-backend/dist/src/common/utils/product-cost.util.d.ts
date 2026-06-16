import { Prisma } from '@prisma/client';
type Decimal = Prisma.Decimal;
export declare function unitsPerCartonValue(unitsPerCarton: number | null | undefined): number;
export declare function effectiveCartonCost(product: {
    averageCost: Decimal | number | string;
    costPrice: Decimal | number | string;
}): Decimal;
export declare function pieceUnitCostFromCarton(cartonCost: Decimal | number | string, unitsPerCarton: number | null | undefined): Decimal;
export declare function pieceUnitCostFromProduct(product: {
    averageCost: Decimal | number | string;
    costPrice: Decimal | number | string;
    unitsPerCarton: number;
}): Decimal;
export {};
