export type QtyUnit = 'piece' | 'carton';

export function productUnitsPerCarton(unitsPerCarton: number | undefined): number {
  return unitsPerCarton && unitsPerCarton > 1 ? unitsPerCarton : 1;
}

export function supportsCarton(unitsPerCarton: number | undefined): boolean {
  return productUnitsPerCarton(unitsPerCarton) > 1;
}

/** Convert user input to piece quantity for API. */
export function toPieceQty(inputQty: number, unit: QtyUnit, unitsPerCarton: number): number {
  if (unit === 'carton') {
    return inputQty * productUnitsPerCarton(unitsPerCarton);
  }
  return inputQty;
}

/** Format stock balance: "75 قطعة (12 كارتون + 3 قطع)" */
export function formatStockWithCartons(totalPieces: number, unitsPerCarton: number): string {
  const upc = productUnitsPerCarton(unitsPerCarton);
  if (upc <= 1) {
    return `${formatQty(totalPieces)} قطعة`;
  }

  const wholeCartons = Math.floor(totalPieces / upc);
  const remainder = totalPieces % upc;

  if (remainder === 0) {
    return `${formatQty(totalPieces)} قطعة (${formatQty(wholeCartons)} كارتون)`;
  }

  return `${formatQty(totalPieces)} قطعة (${formatQty(wholeCartons)} كارتون + ${formatQty(remainder)} قطع)`;
}

/** e.g. "1000 كارتون = 6000 قطعة" */
export function formatCartonConversion(
  inputQty: number,
  unit: QtyUnit,
  unitsPerCarton: number,
): string | null {
  const upc = productUnitsPerCarton(unitsPerCarton);
  if (unit !== 'carton' || upc <= 1 || inputQty <= 0) {
    return null;
  }

  const pieces = toPieceQty(inputQty, 'carton', upc);
  return `${formatQty(inputQty)} كارتون = ${formatQty(pieces)} قطعة`;
}

function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString('ar-EG', { maximumFractionDigits: 4 });
}
