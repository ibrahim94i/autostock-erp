import { COMPANY_LOGO_DATA_URL } from './companyLogoDataUrl';
import {
  COMPANY_ADDRESS,
  COMPANY_FOOTER,
  COMPANY_FULL_NAME,
  COMPANY_PHONES,
  COMPANY_TAGLINE,
  COMPANY_WAREHOUSE,
} from './companyInfo';

export { COMPANY_LOGO_DATA_URL };

export function resolvePrintLogoUrl(settingsLogo?: string | null): string {
  const trimmed = settingsLogo?.trim();
  return trimmed || COMPANY_LOGO_DATA_URL;
}

export interface PrintBrandingOptions {
  compact?: boolean;
  documentTitle?: string;
  periodLabel?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printBrandingStyles(options?: PrintBrandingOptions): string {
  const compact = options?.compact ?? false;
  const logoSize = compact ? 48 : 72;
  const watermarkSize = compact ? 160 : 440;

  return `
    .doc-sheet { position: relative; z-index: 1; }
    .doc-watermark {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 0;
      pointer-events: none;
    }
    .doc-watermark img {
      width: ${watermarkSize}px;
      height: auto;
      opacity: 0.10;
      object-fit: contain;
    }
    .doc-letterhead {
      position: relative;
      z-index: 2;
      margin-bottom: ${compact ? '8px' : '16px'};
      padding-bottom: ${compact ? '6px' : '12px'};
      border-bottom: ${compact ? '1px solid #1e3a5f' : '2px solid #1e3a5f'};
    }
    .doc-letterhead__row {
      display: flex;
      align-items: center;
      gap: ${compact ? '8px' : '16px'};
      direction: rtl;
    }
    .doc-letterhead__logo {
      flex-shrink: 0;
    }
    .doc-letterhead__logo img {
      width: ${logoSize}px;
      height: ${logoSize}px;
      object-fit: contain;
      display: block;
    }
    .doc-letterhead__info {
      flex: 1;
      text-align: right;
      min-width: 0;
    }
    .doc-letterhead__name {
      margin: 0;
      font-size: ${compact ? '11px' : '16px'};
      font-weight: 800;
      color: #1e3a5f;
      line-height: 1.35;
    }
    .doc-letterhead__tagline,
    .doc-letterhead__warehouse,
    .doc-letterhead__address,
    .doc-letterhead__phones {
      margin: ${compact ? '1px 0 0' : '2px 0 0'};
      font-size: ${compact ? '8px' : '11px'};
      color: #475569;
      line-height: 1.45;
    }
    .doc-letterhead__phones {
      font-weight: 600;
      color: #334155;
      direction: ltr;
      unicode-bidi: embed;
      text-align: right;
    }
    .doc-letterhead__title {
      margin: ${compact ? '6px 0 0' : '10px 0 0'};
      text-align: center;
      font-size: ${compact ? '10px' : '14px'};
      font-weight: 700;
      color: #1e3a5f;
    }
    .doc-letterhead__period {
      margin: 4px 0 0;
      text-align: center;
      font-size: ${compact ? '9px' : '12px'};
      color: #64748b;
    }
    .doc-footer {
      margin-top: ${compact ? '12px' : '24px'};
      padding-top: ${compact ? '8px' : '12px'};
      border-top: 1px dashed #94a3b8;
      text-align: center;
      font-size: ${compact ? '9px' : '11px'};
      color: #64748b;
      position: relative;
      z-index: 2;
    }
    .doc-signature {
      margin-top: ${compact ? '16px' : '32px'};
      display: flex;
      justify-content: space-between;
      gap: 24px;
      position: relative;
      z-index: 2;
    }
    .doc-signature__line {
      flex: 1;
      text-align: center;
      font-size: ${compact ? '9px' : '12px'};
      color: #334155;
      padding-top: 28px;
      border-top: 1px solid #cbd5e1;
    }
    .doc-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 8px;
      margin-bottom: 16px;
      position: relative;
      z-index: 2;
    }
    .doc-meta-item {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
    }
    .doc-meta-item__label {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 2px;
    }
    .doc-meta-item__value {
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
    }
    .doc-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      position: relative;
      z-index: 2;
      font-size: ${compact ? '9px' : '12px'};
    }
    .doc-table th,
    .doc-table td {
      border: 1px solid #cbd5e1;
      padding: ${compact ? '3px 4px' : '7px 8px'};
      text-align: right;
      vertical-align: top;
    }
    .doc-table th {
      background: #f1f5f9;
      color: #1e3a5f;
      font-weight: 700;
    }
    .doc-table .num {
      text-align: left;
      direction: ltr;
      unicode-bidi: embed;
      white-space: nowrap;
    }
    .doc-total-box {
      margin-top: 12px;
      padding: ${compact ? '8px' : '12px 16px'};
      background: #eff6ff;
      border: 2px solid #1e3a5f;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: ${compact ? '11px' : '16px'};
      font-weight: 800;
      color: #1e3a5f;
      position: relative;
      z-index: 2;
    }
    @media print {
      .doc-watermark img,
      .doc-letterhead__logo img {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `;
}

export function printDocumentBaseStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { direction: rtl; }
    body {
      font-family: 'Segoe UI', Tahoma, 'Arial Unicode MS', Arial, sans-serif;
      color: #111;
      background: #fff;
      line-height: 1.5;
    }
    @page { size: A4; margin: 12mm 14mm; }
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
  `;
}

export function printBrandingHtml(
  logoUrl: string,
  options?: PrintBrandingOptions,
): string {
  const compact = options?.compact ?? false;
  const safeSrc = logoUrl.replace(/"/g, '&quot;');
  const titleBlock = options?.documentTitle
    ? `<p class="doc-letterhead__title">${escapeHtml(options.documentTitle)}</p>`
    : '';
  const periodBlock = options?.periodLabel
    ? `<p class="doc-letterhead__period">${escapeHtml(options.periodLabel)}</p>`
    : '';

  return `
    <div class="doc-watermark" aria-hidden="true">
      <img src="${safeSrc}" alt="" />
    </div>
    <header class="doc-letterhead">
      <div class="doc-letterhead__row">
        <div class="doc-letterhead__logo">
          <img src="${safeSrc}" alt="${escapeHtml(COMPANY_FULL_NAME)}" />
        </div>
        <div class="doc-letterhead__info">
          <h1 class="doc-letterhead__name">${escapeHtml(COMPANY_FULL_NAME)}</h1>
          <p class="doc-letterhead__tagline">${escapeHtml(COMPANY_TAGLINE)}</p>
          ${compact ? '' : `<p class="doc-letterhead__warehouse">${escapeHtml(COMPANY_WAREHOUSE)}</p>`}
          <p class="doc-letterhead__address">${escapeHtml(COMPANY_ADDRESS)}</p>
          <p class="doc-letterhead__phones">${escapeHtml(COMPANY_PHONES)}</p>
        </div>
      </div>
      ${titleBlock}
      ${periodBlock}
    </header>
  `;
}

export function printFooterHtml(): string {
  return `<footer class="doc-footer">${escapeHtml(COMPANY_FOOTER)}</footer>`;
}

export function printSignatureHtml(
  label: 'accountant' | 'manager' = 'accountant',
): string {
  const text = label === 'manager' ? 'توقيع المدير' : 'توقيع المحاسب';
  return `<div class="doc-signature"><div class="doc-signature__line">${text}</div></div>`;
}

export function printBrandingWrapper(contentHtml: string): string {
  return `<div class="doc-sheet">${contentHtml}</div>`;
}
