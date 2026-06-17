import type { PriceType } from './cartReducer';

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
