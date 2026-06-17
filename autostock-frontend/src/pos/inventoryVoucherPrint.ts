import {
  printBrandingHtml,
  printBrandingStyles,
  printDocumentBaseStyles,
  resolvePrintLogoUrl,
} from '../utils/printBranding';
import { printFontsLinkHtml } from '../utils/typography';



export type InventoryVoucherType = 'edit' | 'delete';



export interface InventoryVoucherData {

  type: InventoryVoucherType;

  voucherNumber: string;

  companyName: string;

  productName: string;

  sku: string;

  locationLabel: string;

  previousQty: number;

  newQty: number;

  reason: string;

  appliedAt: string;

}



function escapeHtml(value: string): string {

  return value

    .replace(/&/g, '&amp;')

    .replace(/</g, '&lt;')

    .replace(/>/g, '&gt;')

    .replace(/"/g, '&quot;');

}



function titleForType(type: InventoryVoucherType): string {

  return type === 'edit' ? 'بوصل تعديل مخزون' : 'بوصل حذف مخزون';

}



function buildHtml(data: InventoryVoucherData): string {

  const title = titleForType(data.type);

  const branding = printBrandingHtml(resolvePrintLogoUrl(), { documentTitle: title });

  return `<!DOCTYPE html>

<html lang="ar" dir="rtl">

<head>

  <meta charset="utf-8" />

  <title>${escapeHtml(title)}</title>
  ${printFontsLinkHtml()}
  <style>
    ${printDocumentBaseStyles()}
    body { margin: 24px; }
    .voucher-meta { text-align: center; margin-bottom: 16px; color: #64748b; font-size: 14px; line-height: 1.6; }
    .voucher-no { font-family: 'Poppins', 'Cairo', sans-serif; font-weight: 800; color: #1e3a5f; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    td, th { border: 1px solid #cbd5e1; padding: 10px; text-align: right; font-size: 15px; }
    th { background: #f1f5f9; color: #1e3a5f; width: 35%; font-weight: 800; }
    .stamp {
      margin-top: 24px;
      padding: 12px;
      text-align: center;
      font-weight: 800;
      font-size: 15px;
      border-radius: 8px;
      color: ${data.type === 'delete' ? '#b91c1c' : '#1d4ed8'};
      background: ${data.type === 'delete' ? '#fef2f2' : '#eff6ff'};
      border: 1px solid ${data.type === 'delete' ? '#fecaca' : '#bfdbfe'};
    }
    ${printBrandingStyles()}
    @media print { @page { margin: 15mm; } }
  </style>

</head>

<body>

  ${branding}

  <div class="doc-sheet">

  <div class="voucher-meta">

    <p class="voucher-no">${escapeHtml(data.voucherNumber)}</p>

    <p>${new Date(data.appliedAt).toLocaleString('ar-EG')}</p>

  </div>

  <table>

    <tr><th>المنتج</th><td>${escapeHtml(data.productName)}</td></tr>

    <tr><th>SKU</th><td>${escapeHtml(data.sku)}</td></tr>

    <tr><th>الموقع</th><td>${escapeHtml(data.locationLabel)}</td></tr>

    <tr><th>الكمية السابقة</th><td>${data.previousQty}</td></tr>

    <tr><th>الكمية الجديدة</th><td>${data.newQty}</td></tr>

    <tr><th>السبب</th><td>${escapeHtml(data.reason)}</td></tr>

  </table>

  <p class="stamp">${data.type === 'delete' ? 'تم حذف رصيد المخزون' : 'تم تعديل رصيد المخزون'}</p>

  </div>

</body>

</html>`;

}



export function printInventoryVoucher(data: InventoryVoucherData): boolean {

  const win = window.open('', '_blank');

  if (!win) return false;

  win.document.open();

  win.document.write(buildHtml(data));

  win.document.close();

  const doPrint = () => {

    win.focus();

    win.print();

  };

  win.addEventListener('load', doPrint);

  setTimeout(doPrint, 300);

  return true;

}


