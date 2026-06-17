import { COMPANY_LOGO_URL } from '../utils/companyLogoDataUrl';
import {
  COMPANY_ADDRESS,
  COMPANY_BRAND,
  COMPANY_FOOTER,
  COMPANY_PHONES,
  COMPANY_RIGHTS,
  COMPANY_WAREHOUSE,
} from '../utils/companyInfo';

interface PrintBrandingProps {
  documentTitle?: string;
  periodLabel?: string;
}

export function PrintBranding({ documentTitle, periodLabel }: PrintBrandingProps) {
  return (
    <>
      <div
        className="doc-watermark pointer-events-none hidden print:flex fixed inset-0 z-0 items-center justify-center [&_*]:pointer-events-none"
        aria-hidden="true"
      >
        <img src={COMPANY_LOGO_URL} alt="" className="pointer-events-none" />
      </div>
      <header className="doc-letterhead doc-letterhead--centered pointer-events-none hidden print:block">
        <div className="doc-letterhead__logo-center doc-letterhead__logo-center--brand">
          <img src={COMPANY_LOGO_URL} alt={COMPANY_BRAND} />
          <span className="doc-letterhead__brand-name">{COMPANY_BRAND}</span>
        </div>
        <div className="doc-letterhead__info doc-letterhead__info--center">
          <p className="doc-letterhead__warehouse">{COMPANY_WAREHOUSE}</p>
          <p className="doc-letterhead__address">{COMPANY_ADDRESS}</p>
          <p className="doc-letterhead__phones">{COMPANY_PHONES}</p>
        </div>
        {documentTitle ? (
          <p className="doc-letterhead__title">{documentTitle}</p>
        ) : null}
        {periodLabel ? (
          <p className="doc-letterhead__period">{periodLabel}</p>
        ) : null}
      </header>
    </>
  );
}

export function ReportPrintFooter() {
  return (
    <>
      <div className="doc-signature print-only-signature">
        <div className="doc-signature__line">توقيع المدير</div>
      </div>
      <footer className="doc-footer print-only-footer">
        {COMPANY_FOOTER}
        <p className="doc-footer__rights">{COMPANY_RIGHTS}</p>
      </footer>
    </>
  );
}
