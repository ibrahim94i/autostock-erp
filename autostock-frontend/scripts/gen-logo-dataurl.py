import base64
from pathlib import Path

root = Path(__file__).resolve().parents[1]
png = root / 'src' / 'assets' / 'company-logo.png'
out = root / 'src' / 'utils' / 'companyLogoDataUrl.ts'
b64 = base64.b64encode(png.read_bytes()).decode('ascii')
out.write_text(
    '/** Company logo data URL for print windows */\n'
    f"export const COMPANY_LOGO_DATA_URL = 'data:image/png;base64,{b64}';\n",
    encoding='utf-8',
)
print(f'Wrote {out} ({len(b64)} chars)')
