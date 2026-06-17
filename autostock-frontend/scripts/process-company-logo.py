"""Process company logo: remove black background, tight crop, optimize size."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'public' / 'company-logo.png'
OUT_PNG = ROOT / 'src' / 'assets' / 'company-logo.png'
OUT_PUBLIC = ROOT / 'public' / 'company-logo.png'


def saturation(r: int, g: int, b: int) -> float:
    mx = max(r, g, b)
    mn = min(r, g, b)
    return 0.0 if mx == 0 else (mx - mn) / mx


def remove_black_background(img: Image.Image) -> Image.Image:
    rgba = img.convert('RGBA')
    px = rgba.load()
    w, h = rgba.size

    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            mx = max(r, g, b)
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            sat = saturation(r, g, b)

            # Pure/near-black background
            if mx <= 18:
                alpha = 0
            # Dark desaturated pixels = background bleed
            elif mx <= 55 and sat < 0.22 and lum < 40:
                alpha = 0
            # Soft edge between black bg and gold/bronze logo
            elif mx <= 55 and sat < 0.22:
                alpha = int(255 * max(0.0, (mx - 18) / 37))
            # Keep gold tones including bronze shadows (warm hue)
            elif r >= b and r >= g * 0.55:
                alpha = 255
            elif lum >= 35:
                alpha = 255
            else:
                alpha = int(255 * min(1.0, lum / 35))

            px[x, y] = (r, g, b, alpha)

    return rgba


def crop_to_content(img: Image.Image, padding: int = 16) -> Image.Image:
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
    cleaned = remove_black_background(img)
    cleaned = cleaned.filter(ImageFilter.SHARPEN)
    cropped = crop_to_content(cleaned, padding=12)

    max_dim = 900
    if max(cropped.size) > max_dim:
        cropped.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(OUT_PNG, 'PNG', optimize=True)
    cropped.save(OUT_PUBLIC, 'PNG', optimize=True)
    print(
        f'Saved transparent logo {cropped.size[0]}x{cropped.size[1]} '
        f'({OUT_PUBLIC.stat().st_size // 1024}KB) mode=RGBA'
    )


if __name__ == '__main__':
    main()
