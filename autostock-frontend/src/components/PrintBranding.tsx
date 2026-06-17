import { COMPANY_LOGO_URL } from '../utils/companyLogoDataUrl';
import {
  COMPANY_ADDRESS,
  COMPANY_FOOTER,
  COMPANY_FULL_NAME,
  COMPANY_PHONES,
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
        <img src={COMPANY_LOGO_URL} alt="" />
      </div>
      <header className="doc-letterhead doc-letterhead--centered">
        <div className="doc-letterhead__logo-center">
          <img src={COMPANY_LOGO_URL} alt={COMPANY_FULL_NAME} />
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
      <footer className="doc-footer print-only-footer">{COMPANY_FOOTER}</footer>
    </>
  );
}
