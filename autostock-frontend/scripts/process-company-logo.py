"""Process company logo: clean background, tight crop, optimize size."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(
    r'C:\Users\hp\.cursor\projects\c-Users-hp-Desktop\assets'
    r'\c__Users_hp_AppData_Roaming_Cursor_User_workspaceStorage_27cca3ec5b27f21d3ab1f8fe891ff205_images_image-a99cefea-e09c-4239-8d52-d31999dd5ff6.png'
)
OUT_PNG = ROOT / 'src' / 'assets' / 'company-logo.png'
OUT_PUBLIC = ROOT / 'public' / 'company-logo.png'
OUT_DATAURL = ROOT / 'src' / 'utils' / 'companyLogoDataUrl.ts'


def dist(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> float:
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))


def sample_background(img: Image.Image) -> tuple[int, int, int]:
    rgb = img.convert('RGB')
    w, h = rgb.size
    points = []
    step = max(1, min(w, h) // 40)
    for x in range(0, w, step):
        points.append(rgb.getpixel((x, 0)))
        points.append(rgb.getpixel((x, h - 1)))
    for y in range(0, h, step):
        points.append(rgb.getpixel((0, y)))
        points.append(rgb.getpixel((w - 1, y)))
    avg = tuple(int(sum(p[i] for p in points) / len(points)) for i in range(3))
    return avg


def remove_background(img: Image.Image) -> Image.Image:
    bg = sample_background(img)
    rgba = img.convert('RGBA')
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = dist((r, g, b), bg)
            # soft edge for anti-aliased background
            if d < 28:
                alpha = 0
            elif d < 48:
                alpha = int(255 * (d - 28) / 20)
            else:
                alpha = 255
            # also drop near-white pixels
            if r > 240 and g > 235 and b > 225:
                alpha = 0
            px[x, y] = (r, g, b, min(a, alpha))
    return rgba


def crop_to_content(img: Image.Image, padding: int = 12) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - padding)
    y0 = max(0, y0 - padding)
    x1 = min(img.width, x1 + padding)
    y1 = min(img.height, y1 + padding)
    return img.crop((x0, y0, x1, y1))


def main() -> None:
    img = Image.open(SRC)
    cleaned = remove_background(img)
    cleaned = cleaned.filter(ImageFilter.SHARPEN)
    cropped = crop_to_content(cleaned, padding=8)

    # keep quality but limit max dimension for app bundle
    max_dim = 640
    if max(cropped.size) > max_dim:
        cropped.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    OUT_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(OUT_PNG, 'PNG', optimize=True)
    cropped.save(OUT_PUBLIC, 'PNG', optimize=True)

    OUT_DATAURL.write_text(
        '/** Default company logo — served from public/ to keep JS bundles small. */\n'
        "export const COMPANY_LOGO_URL = '/company-logo.png';\n\n"
        '/** Fallback when settings have no custom logo (img src accepts URL or data URL). */\n'
        'export const COMPANY_LOGO_DATA_URL = COMPANY_LOGO_URL;\n',
        encoding='utf-8',
    )
    print(f'Saved {OUT_PNG} ({cropped.size[0]}x{cropped.size[1]}, {OUT_PNG.stat().st_size // 1024}KB)')


if __name__ == '__main__':
    main()
