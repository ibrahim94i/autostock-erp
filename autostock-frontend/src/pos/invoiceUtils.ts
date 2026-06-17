import type { PriceType } from './cartReducer';
import { cartLineTotal, effectiveUnitPrice, type CartLine } from './cartReducer';
import { productUnitsPerCarton, receiptUnitLabel } from '../utils/units';

export type ReceiptSize = '58mm' | '80mm' | 'a4';

export interface InvoiceLine {
  productName: string;
  sku: string;
  qty: number;
  unit?: string;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  saleId: string;
  appliedAt: string;
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogo?: string;
  taxNumber?: string;
  currency: string;
  receiptFooter: string;
  paymentType: 'cash' | 'debt';
  priceType: PriceType;
  customerId?: string;
  customerName?: string;
  cashCustomerName?: string;
  cashCustomerPhone?: string;
  lines: InvoiceLine[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export const VISIBLE_RECEIPT_SIZES: ReceiptSize[] = ['58mm', '80mm', 'a4'];

export const RECEIPT_SIZE_LABELS: Record<ReceiptSize, string> = {
  '58mm': '58mm (حراري)',
  '80mm': '80mm (حراري)',
  a4: 'A4',
};

export function computeInvoiceTotals(subtotal: number, taxRate: number) {
  const taxAmount = taxRate > 0 ? (subtotal * taxRate) / 100 : 0;
  return {
    subtotal,
    taxRate,
    taxAmount,
    total: subtotal + taxAmount,
  };
}

export function invoiceLineFromCart(line: CartLine): InvoiceLine {
  return {
    productName: line.product.name,
    sku: line.product.sku,
    qty: line.inputQty,
    unit: receiptUnitLabel(line.saleUnit),
    unitPrice: effectiveUnitPrice(line),
    lineTotal: cartLineTotal(line),
  };
}

export interface SaleInvoiceItemSource {
  qty: string | number;
  qtyUnit?: string | null;
  displayQty?: string | number | null;
  unitPrice: string | number;
  product: {
    name: string;
    sku: string;
    unitsPerCarton?: number | null;
  };
}

function parseInvoiceNumber(value: string | number): number {
  return typeof value === 'string' ? parseFloat(value) : value;
}

/** Reconstruct receipt line from stored sale (piece qty in DB). */
export function invoiceLineFromSaleItem(
  item: SaleInvoiceItemSource,
  saleType: string,
): InvoiceLine {
  const qtyPieces = parseInvoiceNumber(item.qty);
  const unitPricePiece = parseInvoiceNumber(item.unitPrice);
  const upc = productUnitsPerCarton(item.product.unitsPerCarton ?? undefined);
  const storedUnit = item.qtyUnit === 'carton' ? 'carton' : 'piece';
  const storedDisplay =
    item.displayQty !== undefined && item.displayQty !== null
      ? parseInvoiceNumber(item.displayQty)
      : null;

  const soldAsCarton =
    storedUnit === 'carton' ||
    (storedDisplay === null && saleType === 'wholesale' && upc > 1);

  if (soldAsCarton && upc > 1) {
    const cartonQty = storedDisplay ?? qtyPieces / upc;
    const unitPriceCarton = unitPricePiece * upc;
    return {
      productName: item.product.name,
      sku: item.product.sku,
      qty: cartonQty,
      unit: receiptUnitLabel('carton'),
      unitPrice: unitPriceCarton,
      lineTotal: cartonQty * unitPriceCarton,
    };
  }

  const pieceQty = storedDisplay ?? qtyPieces;
  return {
    productName: item.product.name,
    sku: item.product.sku,
    qty: pieceQty,
    unit: receiptUnitLabel('piece'),
    unitPrice: unitPricePiece,
    lineTotal: pieceQty * unitPricePiece,
  };
}
