import companyLogo from '../assets/company-logo.png';
import {
  COMPANY_ADDRESS,
  COMPANY_FULL_NAME,
  COMPANY_PHONES,
  COMPANY_TAGLINE,
  COMPANY_WAREHOUSE,
} from '../utils/companyInfo';

interface PrintBrandingProps {
  documentTitle?: string;
  periodLabel?: string;
}

export function PrintBranding({ documentTitle, periodLabel }: PrintBrandingProps) {
  return (
    <>
      <div className="doc-watermark" aria-hidden="true">
        <img src={companyLogo} alt="" />
      </div>
      <header className="doc-letterhead">
        <div className="doc-letterhead__row">
          <div className="doc-letterhead__logo">
            <img src={companyLogo} alt={COMPANY_FULL_NAME} />
          </div>
          <div className="doc-letterhead__info">
            <h1 className="doc-letterhead__name">{COMPANY_FULL_NAME}</h1>
            <p className="doc-letterhead__tagline">{COMPANY_TAGLINE}</p>
            <p className="doc-letterhead__warehouse">{COMPANY_WAREHOUSE}</p>
            <p className="doc-letterhead__address">{COMPANY_ADDRESS}</p>
            <p className="doc-letterhead__phones">{COMPANY_PHONES}</p>
          </div>
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
        شكراً لتعاملكم معنا — شركة حرير البصرة
      </footer>
    </>
  );
}
