import { Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;

export function unitsPerCartonValue(unitsPerCarton: number | null | undefined): number {
  return unitsPerCarton && unitsPerCarton > 1 ? unitsPerCarton : 1;
}

/** Carton cost stored on Product (averageCost or costPrice). */
export function effectiveCartonCost(product: {
  averageCost: Decimal | number | string;
  costPrice: Decimal | number | string;
}): Decimal {
  const average = new Prisma.Decimal(product.averageCost);
  return average.gt(0) ? average : new Prisma.Decimal(product.costPrice);
}

/** Per-piece cost for COGS / inventory (carton cost ÷ units per carton). */
export function pieceUnitCostFromCarton(
  cartonCost: Decimal | number | string,
  unitsPerCarton: number | null | undefined,
): Decimal {
  const upc = unitsPerCartonValue(unitsPerCarton);
  return new Prisma.Decimal(cartonCost).div(upc);
}

export function pieceUnitCostFromProduct(product: {
  averageCost: Decimal | number | string;
  costPrice: Decimal | number | string;
  unitsPerCarton: number;
}): Decimal {
  return pieceUnitCostFromCarton(effectiveCartonCost(product), product.unitsPerCarton);
}
