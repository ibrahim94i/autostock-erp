/** Cairo (Arabic) + Poppins (numbers/Latin) — Google Fonts */
export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800&family=Poppins:wght@600;700&display=swap';

export const FONT_FAMILY_AR = "'Cairo', Tahoma, sans-serif";
export const FONT_FAMILY_NUM = "'Poppins', 'Cairo', sans-serif";

export function printFontsLinkHtml(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${GOOGLE_FONTS_URL}" rel="stylesheet" />`;
}

export function printFontFamilyCss(): string {
  return `
    body {
      font-family: ${FONT_FAMILY_AR};
      font-weight: 500;
    }
    .num,
    .invoice-no,
    .doc-table .num,
    .doc-letterhead__phones,
    .doc-meta-item__value {
      font-family: ${FONT_FAMILY_NUM};
    }
  `;
}
