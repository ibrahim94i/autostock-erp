import shutil
from pathlib import Path

root = Path(__file__).resolve().parents[1]
png = root / 'src' / 'assets' / 'company-logo.png'
public_logo = root / 'public' / 'company-logo.png'
out = root / 'src' / 'utils' / 'companyLogoDataUrl.ts'

shutil.copy2(png, public_logo)
out.write_text(
    '/** Default company logo — served from public/ to keep JS bundles small. */\n'
    "export const COMPANY_LOGO_URL = '/company-logo.png';\n\n"
    '/** Fallback when settings have no custom logo (img src accepts URL or data URL). */\n'
    'export const COMPANY_LOGO_DATA_URL = COMPANY_LOGO_URL;\n',
    encoding='utf-8',
)
print(f'Copied logo to {public_logo}')
print(f'Wrote {out}')
