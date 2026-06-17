export type QtyUnit = 'piece' | 'carton';

export function unitsPerCartonValue(unitsPerCarton: number | null | undefined): number {
  return unitsPerCarton && unitsPerCarton > 1 ? unitsPerCarton : 1;
}

export function toPieceQty(
  displayQty: number,
  qtyUnit: QtyUnit,
  unitsPerCarton: number,
): number {
  if (qtyUnit === 'carton') {
    return displayQty * unitsPerCartonValue(unitsPerCarton);
  }
  return displayQty;
}

export function normalizeSaleItemUnits(
  qty: number,
  qtyUnit: QtyUnit | undefined,
  displayQty: number | undefined,
  unitsPerCarton: number,
): { qtyUnit: QtyUnit; displayQty: number } {
  const unit: QtyUnit = qtyUnit === 'carton' ? 'carton' : 'piece';
  const upc = unitsPerCartonValue(unitsPerCarton);

  if (displayQty !== undefined && displayQty > 0) {
    return { qtyUnit: unit, displayQty };
  }

  if (unit === 'carton' && upc > 1) {
    return { qtyUnit: 'carton', displayQty: qty / upc };
  }

  return { qtyUnit: 'piece', displayQty: qty };
}
