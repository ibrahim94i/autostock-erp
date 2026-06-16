import type { Product } from '../types';
import { productPieceCost } from '../utils/productCost';
import { productUnitsPerCarton, toPieceQty, type QtyUnit } from '../utils/units';

export type SaleUnit = QtyUnit;

export interface CartLine {
  lineKey: string;
  product: Product;
  saleUnit: SaleUnit;
  /** User-facing quantity (pieces or cartons). */
  inputQty: number;
  /** Always in pieces — sent to API / stock checks. */
  qty: number;
  /** Automatic price per sold unit from priceType. */
  unitPrice: number;
  /** Manual override per sold unit; cleared when price type changes. */
  customPrice?: number;
  priceType: PriceType;
}

export type CartState = Record<string, CartLine>;

export type PriceType = 'retail' | 'wholesale';

export type CartAction =
  | { type: 'ADD'; product: Product; priceType: PriceType }
  | { type: 'INCREMENT'; lineKey: string }
  | { type: 'DECREMENT'; lineKey: string }
  | { type: 'SET_INPUT_QTY'; lineKey: string; inputQty: number }
  | { type: 'SET_CUSTOM_PRICE'; lineKey: string; customPrice: number | undefined }
  | { type: 'REMOVE'; lineKey: string }
  | { type: 'CLEAR' };

function parsePrice(raw: string | number): number {
  return typeof raw === 'string' ? parseFloat(raw) : raw;
}

export function cartLineKey(productId: string, priceType: PriceType): string {
  return `${productId}:${priceType}`;
}

export function autoUnitPrice(product: Product, priceType: PriceType): number {
  return priceType === 'wholesale'
    ? parsePrice(product.wholesalePrice)
    : parsePrice(product.retailPrice);
}

export function effectiveUnitPrice(line: CartLine): number {
  return line.customPrice ?? line.unitPrice;
}

export function saleUnitForPriceType(priceType: PriceType): SaleUnit {
  return priceType === 'wholesale' ? 'carton' : 'piece';
}

function buildLine(
  product: Product,
  inputQty: number,
  priceType: PriceType,
  customPrice?: number,
): CartLine {
  const saleUnit = saleUnitForPriceType(priceType);
  const upc = productUnitsPerCarton(product.unitsPerCarton);
  const resolvedUnit: SaleUnit =
    saleUnit === 'carton' && upc > 1 ? 'carton' : 'piece';

  return {
    lineKey: cartLineKey(product.id, priceType),
    product,
    saleUnit: resolvedUnit,
    inputQty,
    qty: toPieceQty(inputQty, resolvedUnit, upc),
    unitPrice: autoUnitPrice(product, priceType),
    customPrice,
    priceType,
  };
}

/** Per-piece unit price for API / stock accounting. */
export function lineApiUnitPrice(line: CartLine): number {
  const display = effectiveUnitPrice(line);
  const upc = productUnitsPerCarton(line.product.unitsPerCarton);
  if (line.saleUnit === 'carton' && upc > 1) {
    return display / upc;
  }
  return display;
}

/** Sale header type when cart may mix retail + wholesale lines. */
export function resolveSaleType(lines: CartLine[]): PriceType {
  if (lines.length === 0) return 'retail';
  if (lines.every((line) => line.priceType === 'wholesale')) return 'wholesale';
  return 'retail';
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const key = cartLineKey(action.product.id, action.priceType);
      const existing = state[key];
      if (existing) {
        return {
          ...state,
          [key]: buildLine(
            existing.product,
            existing.inputQty + 1,
            action.priceType,
            existing.customPrice,
          ),
        };
      }
      return {
        ...state,
        [key]: buildLine(action.product, 1, action.priceType),
      };
    }
    case 'INCREMENT': {
      const line = state[action.lineKey];
      if (!line) return state;
      return {
        ...state,
        [action.lineKey]: buildLine(
          line.product,
          line.inputQty + 1,
          line.priceType,
          line.customPrice,
        ),
      };
    }
    case 'DECREMENT': {
      const line = state[action.lineKey];
      if (!line) return state;
      if (line.inputQty <= 1) {
        const next = { ...state };
        delete next[action.lineKey];
        return next;
      }
      return {
        ...state,
        [action.lineKey]: buildLine(
          line.product,
          line.inputQty - 1,
          line.priceType,
          line.customPrice,
        ),
      };
    }
    case 'SET_INPUT_QTY': {
      const line = state[action.lineKey];
      if (!line) return state;
      if (action.inputQty <= 0) {
        const next = { ...state };
        delete next[action.lineKey];
        return next;
      }
      return {
        ...state,
        [action.lineKey]: buildLine(
          line.product,
          action.inputQty,
          line.priceType,
          line.customPrice,
        ),
      };
    }
    case 'SET_CUSTOM_PRICE': {
      const line = state[action.lineKey];
      if (!line) return state;
      return {
        ...state,
        [action.lineKey]: {
          ...line,
          customPrice: action.customPrice,
        },
      };
    }
    case 'REMOVE': {
      const next = { ...state };
      delete next[action.lineKey];
      return next;
    }
    case 'CLEAR':
      return {};
    default:
      return state;
  }
}

export function cartLines(state: CartState): CartLine[] {
  return Object.values(state);
}

export function cartLineTotal(line: CartLine): number {
  return line.inputQty * effectiveUnitPrice(line);
}

export function cartTotal(state: CartState): number {
  return cartLines(state).reduce((sum, line) => sum + cartLineTotal(line), 0);
}

export function productUnitCost(product: Product): number {
  return productPieceCost(product);
}

export function lineQtyLabel(line: CartLine): string {
  if (line.saleUnit === 'carton') {
    return line.inputQty === 1 ? 'كارتون' : 'كراتين';
  }
  return line.inputQty === 1 ? 'قطعة' : 'قطع';
}
