import {
  printBrandingHtml,
  printBrandingStyles,
  printDocumentBaseStyles,
  printFooterHtml,
  printSignatureHtml,
  resolvePrintLogoUrl,
} from '../utils/printBranding';

export interface CustomerStatementPrintLine {
  entryDate: string;
  description: string;
  debit: number;
  credit: number;
  running: number;
}

export interface CustomerStatementPrintData {
  currency: string;
  customerName: string;
  customerPhone: string;
  customerType: string;
  periodLabel?: string;
  currentBalance: number;
  lines: CustomerStatementPrintLine[];
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

function formatToday(): string {
  return new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function buildStyles(): string {
  return (
    printDocumentBaseStyles() +
    printBrandingStyles() +
    `
    body { padding: 16px; }
  `
  );
}

function buildHtml(data: CustomerStatementPrintData): string {
  const currency = data.currency || 'د.ع';
  const period = data.periodLabel ?? `حتى تاريخ ${formatToday()}`;
  const branding = printBrandingHtml(resolvePrintLogoUrl(), {
    documentTitle: 'كشف حساب عميل',
    periodLabel: period,
  });

  const rows = data.lines
    .map(
      (line) => `
    <tr>
      <td>${escapeHtml(formatDateTime(line.entryDate))}</td>
      <td>${escapeHtml(line.description)}</td>
      <td class="num">${line.debit > 0 ? `${formatMoney(line.debit)} ${currency}` : '—'}</td>
      <td class="num">${line.credit > 0 ? `${formatMoney(line.credit)} ${currency}` : '—'}</td>
      <td class="num">${formatMoney(line.running)} ${currency}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>كشف حساب — ${escapeHtml(data.customerName)}</title>
  <style>${buildStyles()}</style>
</head>
<body>
  ${branding}
  <div class="doc-sheet">
    <div class="doc-meta-grid">
      <div class="doc-meta-item">
        <div class="doc-meta-item__label">اسم العميل</div>
        <div class="doc-meta-item__value">${escapeHtml(data.customerName)}</div>
      </div>
      <div class="doc-meta-item">
        <div class="doc-meta-item__label">الهاتف</div>
        <div class="doc-meta-item__value">${escapeHtml(data.customerPhone || '—')}</div>
      </div>
      <div class="doc-meta-item">
        <div class="doc-meta-item__label">نوع العميل</div>
        <div class="doc-meta-item__value">${escapeHtml(data.customerType)}</div>
      </div>
      <div class="doc-meta-item">
        <div class="doc-meta-item__label">تاريخ الطباعة</div>
        <div class="doc-meta-item__value">${escapeHtml(formatToday())}</div>
      </div>
    </div>

    <table class="doc-table">
      <thead>
        <tr>
          <th>التاريخ</th>
          <th>البيان</th>
          <th>مدين</th>
          <th>دائن</th>
          <th>الرصيد</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="5" style="text-align:center;color:#888;">لا توجد حركات</td></tr>'}
      </tbody>
    </table>

    <div class="doc-total-box">
      <span>الرصيد الحالي</span>
      <span class="num">${formatMoney(data.currentBalance)} ${currency}</span>
    </div>

    ${printSignatureHtml('accountant')}
    ${printFooterHtml()}
  </div>
</body>
</html>`;
}

export function printCustomerStatement(data: CustomerStatementPrintData): boolean {
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

function statementDescription(debit: number, credit: number): string {
  if (debit > 0 && credit > 0) return 'حركة حساب';
  if (debit > 0) return 'فاتورة / مدين';
  if (credit > 0) return 'دفعة / دائن';
  return '—';
}

export { statementDescription };
