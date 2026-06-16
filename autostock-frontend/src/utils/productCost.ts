import type { Product } from '../types';
import { productUnitsPerCarton } from './units';

function parseAmount(raw: string | number | undefined | null): number {
  if (raw === undefined || raw === null || raw === '') return 0;
  const num = typeof raw === 'string' ? parseFloat(raw) : raw;
  return Number.isNaN(num) ? 0 : num;
}

/** Carton cost as stored on the product. */
export function productCartonCost(product: Product): number {
  const average = parseAmount(product.averageCost);
  if (average > 0) return average;
  return parseAmount(product.costPrice);
}

/** Per-piece cost for sales / profit (carton cost ÷ units per carton). */
export function productPieceCost(product: Product): number {
  const upc = productUnitsPerCarton(product.unitsPerCarton);
  const carton = productCartonCost(product);
  return upc > 0 ? carton / upc : carton;
}
