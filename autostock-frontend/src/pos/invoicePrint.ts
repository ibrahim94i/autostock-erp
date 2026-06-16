import type { PriceType } from './cartReducer';
import { COMPANY_FOOTER } from '../utils/companyInfo';
import {
  printBrandingHtml,
  printBrandingStyles,
  printDocumentBaseStyles,
  resolvePrintLogoUrl,
} from '../utils/printBranding';

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(value: number): string {
  return value.toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function paymentLabel(paymentType: InvoiceData['paymentType']): string {
  return paymentType === 'cash' ? 'نقد' : 'آجل';
}

function priceTypeLabel(priceType: PriceType): string {
  return priceType === 'wholesale' ? 'جملة' : 'تجزئة';
}

function sizeBodyClass(size: ReceiptSize): string {
  return `size-${size}`;
}

function buildStyles(size: ReceiptSize): string {
  const compact = size === '58mm' || size === '80mm';
  const hideUnit = size === '58mm';

  return (
    printDocumentBaseStyles() +
    printBrandingStyles({ compact }) +
    `
    body.size-58mm { width: 58mm; max-width: 58mm; padding: 3mm 2mm; font-size: 10px; }
    body.size-80mm { width: 80mm; max-width: 80mm; padding: 4mm 3mm; font-size: 11px; }
    body.size-a4 { width: 210mm; max-width: 210mm; min-height: 280mm; padding: 10mm 12mm; font-size: 13px; }
    .invoice-meta {
      margin-bottom: 10px;
      position: relative;
      z-index: 2;
    }
    .invoice-meta__row {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px;
      font-size: ${compact ? '9px' : '12px'};
      color: #334155;
      margin-bottom: 4px;
    }
    .invoice-no {
      font-family: 'Courier New', monospace;
      font-weight: 800;
      font-size: ${compact ? '11px' : '15px'};
      color: #1e3a5f;
      text-align: center;
      margin: 6px 0;
      letter-spacing: 0.04em;
    }
    .customer-box {
      margin: 8px 0;
      padding: ${compact ? '4px 6px' : '8px 10px'};
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      background: #f8fafc;
      font-size: ${compact ? '9px' : '12px'};
      position: relative;
      z-index: 2;
    }
    .payment-row {
      margin-top: 8px;
      font-size: ${compact ? '9px' : '12px'};
      position: relative;
      z-index: 2;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: ${compact ? '9px' : '12px'};
      margin-top: 4px;
      position: relative;
      z-index: 2;
    }
    ${hideUnit ? '.col-unit { display: none; }' : ''}
    .line-name { display: block; font-weight: 600; }
    .line-sku {
      display: block;
      margin-top: 2px;
      font-family: 'Courier New', monospace;
      font-size: ${compact ? '8px' : '10px'};
      color: #64748b;
      letter-spacing: 0.02em;
    }
    @page {
      size: ${size === 'a4' ? 'A4' : size === '80mm' ? '80mm auto' : '58mm auto'};
      margin: ${compact ? '2mm' : '12mm 14mm'};
    }
  `
  );
}

export function buildInvoiceHtml(data: InvoiceData, size: ReceiptSize): string {
  const currency = data.currency || 'د.ع';
  const logoUrl = resolvePrintLogoUrl(data.companyLogo);
  const compact = size === '58mm' || size === '80mm';
  const invoiceNo =
    data.invoiceNumber && data.invoiceNumber !== '—'
      ? data.invoiceNumber
      : `INV-${data.saleId.slice(0, 8).toUpperCase()}`;

  const branding = printBrandingHtml(logoUrl, {
    compact,
    documentTitle: compact ? undefined : 'فاتورة مبيعات',
  });

  const rows = data.lines
    .map(
      (line) => `
      <tr>
        <td>
          <span class="line-name">${escapeHtml(line.productName)}</span>
          ${line.sku?.trim() ? `<span class="line-sku">${escapeHtml(line.sku.trim())}</span>` : ''}
        </td>
        <td class="num">${line.qty}</td>
        <td class="col-unit">${escapeHtml(line.unit ?? 'قطعة')}</td>
        <td class="num">${formatMoney(line.unitPrice)}</td>
        <td class="num">${formatMoney(line.lineTotal)}</td>
      </tr>`,
    )
    .join('');

  const customerBlock = (() => {
    if (data.paymentType === 'debt' && data.customerName) {
      return `<div class="customer-box"><strong>العميل:</strong> ${escapeHtml(data.customerName)}</div>`;
    }
    if (data.paymentType === 'cash') {
      const name = data.cashCustomerName?.trim() || 'زبون نقدي';
      const phone = data.cashCustomerPhone?.trim()
        ? `<br/><strong>الهاتف:</strong> ${escapeHtml(data.cashCustomerPhone.trim())}`
        : '';
      return `<div class="customer-box"><strong>العميل:</strong> ${escapeHtml(name)}${phone}</div>`;
    }
    return '';
  })();

  const taxBlock =
    data.taxRate > 0
      ? `
    <div class="total-row">
      <span>المجموع الفرعي</span>
      <span class="num">${formatMoney(data.subtotal)} ${currency}</span>
    </div>
    <div class="total-row">
      <span>الضريبة (${data.taxRate}%)</span>
      <span class="num">${formatMoney(data.taxAmount)} ${currency}</span>
    </div>`
      : '';

  const footerText = data.receiptFooter?.trim() || COMPANY_FOOTER;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>فاتورة ${escapeHtml(invoiceNo)}</title>
  <style>${buildStyles(size)}</style>
</head>
<body class="${sizeBodyClass(size)}">
  ${branding}
  <div class="doc-sheet">
    <div class="invoice-meta">
      <div class="invoice-meta__row">
        <span><strong>التاريخ:</strong> ${escapeHtml(formatDateTime(data.appliedAt))}</span>
        <span><strong>نوع السعر:</strong> ${priceTypeLabel(data.priceType)}</span>
      </div>
      <p class="invoice-no">${escapeHtml(invoiceNo)}</p>
    </div>

    ${customerBlock}

    <table class="doc-table">
      <thead>
        <tr>
          <th>المنتج</th>
          <th class="num">الكمية</th>
          <th class="col-unit">الوحدة</th>
          <th class="num">السعر</th>
          <th class="num">الإجمالي</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    ${taxBlock}

    <div class="doc-total-box">
      <span>الإجمالي الكلي</span>
      <span class="num">${formatMoney(data.total)} ${currency}</span>
    </div>

    <div class="payment-row">
      <strong>طريقة الدفع:</strong> ${paymentLabel(data.paymentType)}
    </div>

    <footer class="doc-footer">${escapeHtml(footerText)}</footer>
  </div>
</body>
</html>`;
}

export function openInvoicePrintWindow(
  data: InvoiceData,
  size: ReceiptSize,
  triggerPrint = false,
): Window | null {
  const win = window.open('', '_blank');
  if (!win) return null;

  win.document.open();
  win.document.write(buildInvoiceHtml(data, size));
  win.document.close();

  if (triggerPrint) {
    const doPrint = () => {
      win.focus();
      win.print();
    };
    win.addEventListener('load', doPrint);
    setTimeout(doPrint, 300);
  }

  return win;
}

export function viewInvoice(data: InvoiceData, size: ReceiptSize): boolean {
  return openInvoicePrintWindow(data, size, false) !== null;
}

export function printInvoice(data: InvoiceData, size: ReceiptSize): boolean {
  return openInvoicePrintWindow(data, size, true) !== null;
}

export function saveInvoicePdf(data: InvoiceData, size: ReceiptSize): boolean {
  return openInvoicePrintWindow(data, size, true) !== null;
}

export function buildInvoiceNumber(saleId: string): string {
  return `INV-${saleId.slice(0, 8).toUpperCase()}`;
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
