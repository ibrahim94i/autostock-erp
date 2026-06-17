import { formatPrice } from '../api';
import {
  printBrandingHtml,
  printBrandingStyles,
  printDocumentBaseStyles,
  resolvePrintLogoUrl,
} from '../utils/printBranding';
import { printFontsLinkHtml } from '../utils/typography';

export interface CashDepositVoucherData {
  voucherNumber: string;
  amount: number;
  source?: string;
  description?: string;
  receivedBy: string;
  createdAt: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(data: CashDepositVoucherData): string {
  const title = 'بوصل إيداع نقد للصندوق';
  const branding = printBrandingHtml(resolvePrintLogoUrl(), { documentTitle: title });
  const sourceRow = data.source?.trim()
    ? `<tr><th>المُودِع</th><td>${escapeHtml(data.source.trim())}</td></tr>`
    : '';
  const noteRow = data.description?.trim()
    ? `<tr><th>ملاحظات</th><td>${escapeHtml(data.description.trim())}</td></tr>`
    : '';

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
    .amount-box {
      margin: 16px 0;
      padding: 16px;
      text-align: center;
      border-radius: 10px;
      background: #ecfdf5;
      border: 2px solid #6ee7b7;
      color: #065f46;
      font-size: 22px;
      font-weight: 800;
    }
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
      color: #065f46;
      background: #ecfdf5;
      border: 1px solid #6ee7b7;
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
      <p>${new Date(data.createdAt).toLocaleString('ar-EG')}</p>
    </div>
    <div class="amount-box">المبلغ: ${escapeHtml(formatPrice(data.amount))}</div>
    <table>
      ${sourceRow}
      ${noteRow}
      <tr><th>استلم</th><td>${escapeHtml(data.receivedBy)}</td></tr>
    </table>
    <p class="stamp">تم إيداع المبلغ في الصندوق</p>
  </div>
</body>
</html>`;
}

export function printCashDepositVoucher(data: CashDepositVoucherData): boolean {
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

export function cashDepositVoucherNumber(transactionId: string): string {
  return `DEP-${transactionId.slice(0, 8).toUpperCase()}`;
}

export function parseCashDepositDescription(description: string | null | undefined): {
  source?: string;
  note?: string;
} {
  if (!description?.trim()) return {};
  const text = description.trim();
  const prefix = 'إيداع نقد — ';
  if (!text.startsWith(prefix)) {
    return { note: text };
  }
  const rest = text.slice(prefix.length);
  const parts = rest.split(' — ');
  if (parts.length >= 2) {
    return { source: parts[0], note: parts.slice(1).join(' — ') };
  }
  return { source: rest };
}
