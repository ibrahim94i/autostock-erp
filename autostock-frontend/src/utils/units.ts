export type QtyUnit = 'piece' | 'carton';

export function productUnitsPerCarton(unitsPerCarton: number | undefined): number {
  return unitsPerCarton && unitsPerCarton > 1 ? unitsPerCarton : 1;
}

export function supportsCarton(unitsPerCarton: number | undefined): boolean {
  return productUnitsPerCarton(unitsPerCarton) > 1;
}

export interface DualQtyParts {
  cartons: number;
  loosePieces: number;
  totalPieces: number;
}

/** Split piece total into whole cartons + loose pieces. */
export function splitDualQty(totalPieces: number, unitsPerCarton: number): DualQtyParts {
  const upc = productUnitsPerCarton(unitsPerCarton);
  const total = Math.max(0, totalPieces);
  if (upc <= 1) {
    return { cartons: 0, loosePieces: total, totalPieces: total };
  }
  const cartons = Math.floor(total / upc);
  const loosePieces = total % upc;
  return { cartons, loosePieces, totalPieces: total };
}

/** Combine carton + loose piece inputs into total pieces. */
export function dualQtyToPieces(
  cartons: number,
  loosePieces: number,
  unitsPerCarton: number,
): number {
  const upc = productUnitsPerCarton(unitsPerCarton);
  return Math.max(0, cartons) * upc + Math.max(0, loosePieces);
}

/** Convert user input to piece quantity for API. */
export function toPieceQty(inputQty: number, unit: QtyUnit, unitsPerCarton: number): number {
  if (unit === 'carton') {
    return inputQty * productUnitsPerCarton(unitsPerCarton);
  }
  return inputQty;
}

/**
 * Purchase orders store qty in pieces and unitCost as carton cost (when upc > 1).
 * Convert user-entered cost to the stored carton cost.
 */
export function inputCostToStoredCartonCost(
  inputCost: number,
  qtyUnit: QtyUnit,
  unitsPerCarton: number,
): number {
  const upc = productUnitsPerCarton(unitsPerCarton);
  if (upc <= 1 || qtyUnit === 'carton') {
    return inputCost;
  }
  return inputCost * upc;
}

/** Display stored carton cost as piece cost for piece-mode inputs. */
export function storedCartonCostToPieceCost(
  cartonCost: number,
  unitsPerCarton: number,
): number {
  const upc = productUnitsPerCarton(unitsPerCarton);
  if (upc <= 1) {
    return cartonCost;
  }
  return cartonCost / upc;
}

/** Line total from stored PO item (piece qty + carton cost when upc > 1). */
export function poLineTotalFromStored(
  qtyPieces: number,
  storedUnitCost: number,
  unitsPerCarton: number,
): number {
  const upc = productUnitsPerCarton(unitsPerCarton);
  if (upc <= 1) {
    return qtyPieces * storedUnitCost;
  }
  return (qtyPieces / upc) * storedUnitCost;
}

export function buildPurchaseOrderItemPayload(
  productId: string,
  inputQty: number,
  inputUnitCost: number,
  qtyUnit: QtyUnit,
  unitsPerCarton: number,
): { productId: string; qty: number; unitCost: number } {
  return {
    productId,
    qty: toPieceQty(inputQty, qtyUnit, unitsPerCarton),
    unitCost: inputCostToStoredCartonCost(inputUnitCost, qtyUnit, unitsPerCarton),
  };
}

/** Carton-first display: "6 كارتون + 3 قطع" or piece-only. */
export function formatDualQty(totalPieces: number, unitsPerCarton: number): string {
  const { cartons, loosePieces } = splitDualQty(totalPieces, unitsPerCarton);
  const upc = productUnitsPerCarton(unitsPerCarton);

  if (upc <= 1) {
    return `${formatQty(totalPieces)} قطعة`;
  }

  if (loosePieces === 0) {
    return `${formatQty(cartons)} ${cartons === 1 ? 'كارتون' : 'كارتون'}`;
  }

  if (cartons === 0) {
    return `${formatQty(loosePieces)} ${loosePieces === 1 ? 'قطعة' : 'قطع'}`;
  }

  return `${formatQty(cartons)} كارتون + ${formatQty(loosePieces)} ${loosePieces === 1 ? 'قطعة' : 'قطع'}`;
}

/** Stock / inventory with total in parentheses. */
export function formatStockWithCartons(totalPieces: number, unitsPerCarton: number): string {
  const dual = formatDualQty(totalPieces, unitsPerCarton);
  const upc = productUnitsPerCarton(unitsPerCarton);
  if (upc <= 1) return dual;
  return `${dual} (${formatQty(totalPieces)} قطعة)`;
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

/** Dual-field input helper label. */
export function formatDualInputPreview(
  cartons: number,
  loosePieces: number,
  unitsPerCarton: number,
): string {
  const total = dualQtyToPieces(cartons, loosePieces, unitsPerCarton);
  return `المجموع: ${formatStockWithCartons(total, unitsPerCarton)}`;
}

export function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString('ar-EG', { maximumFractionDigits: 4 });
}

/** Receipt / invoice unit column label (singular). */
export function receiptUnitLabel(unit: QtyUnit): string {
  return unit === 'carton' ? 'كارتونة' : 'قطعة';
}

/** Plural unit label for qty display. */
export function qtyUnitLabel(unit: QtyUnit, qty: number): string {
  if (unit === 'carton') {
    return qty === 1 ? 'كارتون' : 'كارتون';
  }
  return qty === 1 ? 'قطعة' : 'قطع';
}

/** Convert stored piece qty to display qty in the chosen unit. */
export function piecesToDisplayQty(pieces: number, unit: QtyUnit, unitsPerCarton: number): number {
  const upc = productUnitsPerCarton(unitsPerCarton);
  if (unit === 'carton' && upc > 1) {
    return pieces / upc;
  }
  return pieces;
}

/** Max returnable qty in the chosen unit (carton mode = full cartons only). */
export function maxReturnableInUnit(
  soldPieces: number,
  returnedPieces: number,
  unit: QtyUnit,
  unitsPerCarton: number,
): number {
  const remaining = Math.max(0, soldPieces - returnedPieces);
  const upc = productUnitsPerCarton(unitsPerCarton);
  if (unit === 'carton' && upc > 1) {
    return Math.floor(remaining / upc);
  }
  return remaining;
}

/** Format sold/returned qty using stored unit when available. */
export function formatStoredQty(
  qtyPieces: number,
  qtyUnit: QtyUnit | string | undefined,
  displayQty: number | undefined,
  unitsPerCarton: number,
): string {
  const unit: QtyUnit = qtyUnit === 'carton' ? 'carton' : 'piece';
  if (displayQty !== undefined && displayQty > 0 && unit === 'carton') {
    const label = qtyUnitLabel('carton', displayQty);
    return `${formatQty(displayQty)} ${label}`;
  }
  if (unit === 'carton' && supportsCarton(unitsPerCarton)) {
    return formatDualQty(qtyPieces, unitsPerCarton);
  }
  return `${formatQty(qtyPieces)} ${qtyUnitLabel('piece', qtyPieces)}`;
}
