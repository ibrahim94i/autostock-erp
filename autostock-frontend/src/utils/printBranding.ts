import { COMPANY_LOGO_DATA_URL } from './companyLogoDataUrl';
import {
  COMPANY_ADDRESS,
  COMPANY_BRAND,
  COMPANY_FOOTER,
  COMPANY_PHONES,
  COMPANY_RIGHTS,
  COMPANY_WAREHOUSE,
} from './companyInfo';
import { printFontFamilyCss } from './typography';

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
  const watermarkSize = compact ? 200 : 540;

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
      overflow: hidden;
      max-width: 100%;
    }
    .doc-watermark img {
      width: ${watermarkSize}px;
      max-width: 80vw;
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
      text-align: center;
    }
    .doc-letterhead__logo-center {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: ${compact ? '6px' : '12px'};
      margin-bottom: ${compact ? '4px' : '8px'};
    }
    .doc-letterhead__logo-center img {
      width: ${compact ? 48 : 72}px;
      max-width: 92%;
      height: auto;
      object-fit: contain;
      display: block;
      flex-shrink: 0;
    }
    .doc-letterhead__brand-name {
      font-family: 'Poppins', 'Cairo', sans-serif;
      font-size: ${compact ? '18px' : '28px'};
      font-weight: 800;
      color: #002147;
      letter-spacing: 0.06em;
    }
    .doc-letterhead__info {
      text-align: center;
      min-width: 0;
    }
    .doc-letterhead__warehouse,
    .doc-letterhead__address,
    .doc-letterhead__phones {
      margin: ${compact ? '1px 0 0' : '2px 0 0'};
      font-size: ${compact ? '9px' : '13px'};
      color: #475569;
      line-height: 1.45;
    }
    .doc-letterhead__phones {
      font-weight: 700;
      color: #334155;
      direction: ltr;
      unicode-bidi: embed;
    }
    .doc-letterhead__title {
      margin: ${compact ? '6px 0 0' : '10px 0 0'};
      text-align: center;
      font-size: ${compact ? '11px' : '16px'};
      font-weight: 800;
      color: #1e3a5f;
    }
    .doc-letterhead__period {
      margin: 4px 0 0;
      text-align: center;
      font-size: ${compact ? '10px' : '13px'};
      color: #64748b;
    }
    .doc-footer {
      margin-top: ${compact ? '12px' : '24px'};
      padding-top: ${compact ? '8px' : '12px'};
      border-top: 1px dashed #94a3b8;
      text-align: center;
      font-size: ${compact ? '10px' : '12px'};
      color: #64748b;
      position: relative;
      z-index: 2;
    }
    .doc-footer__management {
      margin: ${compact ? '4px 0 0' : '6px 0 0'};
      font-size: ${compact ? '10px' : '13px'};
      font-weight: 800;
      color: #1e3a5f;
    }
    .doc-footer__rights {
      margin: ${compact ? '4px 0 0' : '6px 0 0'};
      font-size: ${compact ? '9px' : '11px'};
      color: #64748b;
      direction: ltr;
      unicode-bidi: embed;
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
      font-size: ${compact ? '10px' : '13px'};
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
      font-size: 11px;
      color: #64748b;
      margin-bottom: 2px;
    }
    .doc-meta-item__value {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }
    .doc-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      position: relative;
      z-index: 2;
      font-size: ${compact ? '10px' : '13px'};
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
      font-size: ${compact ? '12px' : '18px'};
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
    ${printFontFamilyCss()}
    body {
      color: #111;
      background: #fff;
      line-height: 1.5;
      overflow-x: hidden;
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
      <div class="doc-letterhead__logo-center">
        <img src="${safeSrc}" alt="${escapeHtml(COMPANY_BRAND)}" />
        <span class="doc-letterhead__brand-name">${escapeHtml(COMPANY_BRAND)}</span>
      </div>
      <div class="doc-letterhead__info">
        ${compact ? '' : `<p class="doc-letterhead__warehouse">${escapeHtml(COMPANY_WAREHOUSE)}</p>`}
        <p class="doc-letterhead__address">${escapeHtml(COMPANY_ADDRESS)}</p>
        <p class="doc-letterhead__phones">${escapeHtml(COMPANY_PHONES)}</p>
      </div>
      ${titleBlock}
      ${periodBlock}
    </header>
  `;
}

export function printFooterHtml(): string {
  return `<footer class="doc-footer"><p>${escapeHtml(COMPANY_FOOTER)}</p><p class="doc-footer__rights">${escapeHtml(COMPANY_RIGHTS)}</p></footer>`;
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
