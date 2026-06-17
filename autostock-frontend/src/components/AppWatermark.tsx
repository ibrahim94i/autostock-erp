import { APP_LOGO_URL } from '../utils/companyLogoDataUrl';

/** HEMA watermark — application UI only, never on printed receipts/reports. */
export function AppWatermark() {
  return (
    <div className="app-watermark" aria-hidden="true">
      <img src={APP_LOGO_URL} alt="" draggable={false} />
    </div>
  );
}
