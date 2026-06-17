import type { PriceType } from './cartReducer';
import { COMPANY_FOOTER, COMPANY_RECEIPT_MANAGEMENT } from '../utils/companyInfo';
import {
  printBrandingHtml,
  printBrandingStyles,
  printDocumentBaseStyles,
  resolvePrintLogoUrl,
} from '../utils/printBranding';
import { printFontsLinkHtml } from '../utils/typography';
import {
  type InvoiceData,
  type ReceiptSize,
} from './invoiceUtils';

export {
  computeInvoiceTotals,
  type InvoiceData,
  type InvoiceLine,
  type ReceiptSize,
  RECEIPT_SIZE_LABELS,
  VISIBLE_RECEIPT_SIZES,
} from './invoiceUtils';

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
    body.size-58mm { width: 58mm; max-width: 58mm; padding: 3mm 2mm; font-size: 11px; }
    body.size-80mm { width: 80mm; max-width: 80mm; padding: 4mm 3mm; font-size: 12px; }
    body.size-a4 {
      width: 100%;
      max-width: 210mm;
      min-height: auto;
      margin: 0 auto;
      padding: 8mm 10mm;
      font-size: 14px;
      overflow-x: hidden;
    }
    .invoice-meta {
      margin-bottom: 10px;
      position: relative;
      z-index: 2;
    }
    .invoice-meta__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: ${compact ? '10px' : '14px'};
      color: #334155;
      margin-bottom: 4px;
    }
    .invoice-meta__row > span {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .invoice-no {
      font-family: 'Poppins', 'Cairo', sans-serif;
      font-weight: 800;
      font-size: ${compact ? '12px' : '17px'};
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
      font-size: ${compact ? '10px' : '14px'};
      position: relative;
      z-index: 2;
    }
    .payment-row {
      margin-top: 8px;
      font-size: ${compact ? '10px' : '14px'};
      position: relative;
      z-index: 2;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: ${compact ? '10px' : '14px'};
      margin-top: 4px;
      position: relative;
      z-index: 2;
    }
    ${hideUnit ? '.col-unit { display: none; }' : ''}
    .doc-table {
      table-layout: fixed;
      width: 100%;
    }
    .doc-table .col-product { width: 36%; word-break: break-word; }
    .doc-table .col-qty { width: 10%; }
    .doc-table .col-unit { width: 12%; }
    .doc-table .col-price { width: 18%; }
    .doc-table .col-total { width: 18%; }
    .doc-total-box .num {
      flex-shrink: 0;
      white-space: nowrap;
      direction: ltr;
      unicode-bidi: embed;
    }
    .line-name { display: block; font-weight: 600; }
    .line-sku {
      display: block;
      margin-top: 2px;
      font-family: 'Poppins', 'Cairo', sans-serif;
      font-size: ${compact ? '9px' : '12px'};
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
        <td class="col-product">
          <span class="line-name">${escapeHtml(line.productName)}</span>
          ${line.sku?.trim() ? `<span class="line-sku">${escapeHtml(line.sku.trim())}</span>` : ''}
        </td>
        <td class="num col-qty">${line.qty}</td>
        <td class="col-unit">${escapeHtml(line.unit ?? 'قطعة')}</td>
        <td class="num col-price">${formatMoney(line.unitPrice)}</td>
        <td class="num col-total">${formatMoney(line.lineTotal)}</td>
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
  ${printFontsLinkHtml()}
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
          <th class="col-product">المنتج</th>
          <th class="num col-qty">الكمية</th>
          <th class="col-unit">الوحدة</th>
          <th class="num col-price">السعر</th>
          <th class="num col-total">الإجمالي</th>
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

    <footer class="doc-footer">
      <p>${escapeHtml(footerText)}</p>
      <p class="doc-footer__management">${escapeHtml(COMPANY_RECEIPT_MANAGEMENT)}</p>
    </footer>
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
