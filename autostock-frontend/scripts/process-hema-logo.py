"""Process HEMA app logo: remove white background, crop, optimize."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'public' / 'hema-logo.png'
OUT = ROOT / 'public' / 'hema-logo.png'


def remove_white_background(img: Image.Image) -> Image.Image:
    rgba = img.convert('RGBA')
    px = rgba.load()
    w, h = rgba.size

    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            mx = max(r, g, b)
            mn = min(r, g, b)
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b

            # Pure/near-white background
            if mn >= 245:
                alpha = 0
            elif mn >= 225 and (mx - mn) <= 18:
                alpha = int(255 * max(0.0, (245 - mn) / 20))
            # Light gray edge
            elif lum >= 220 and (mx - mn) <= 24:
                alpha = int(255 * max(0.0, (240 - lum) / 40))
            else:
                alpha = 255

            px[x, y] = (r, g, b, alpha)

    return rgba


def crop_to_content(img: Image.Image, padding: int = 20) -> Image.Image:
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
    cleaned = remove_white_background(img)
    cleaned = cleaned.filter(ImageFilter.SHARPEN)
    cropped = crop_to_content(cleaned, padding=16)

    # Upscale small logos for crisp watermark display
    target = 900
    if max(cropped.size) < target:
        scale = target / max(cropped.size)
        new_size = (int(cropped.width * scale), int(cropped.height * scale))
        cropped = cropped.resize(new_size, Image.Resampling.LANCZOS)

    cropped.save(OUT, 'PNG', optimize=True)
    print(
        f'Saved transparent HEMA logo {cropped.size[0]}x{cropped.size[1]} '
        f'({OUT.stat().st_size // 1024}KB) mode=RGBA'
    )


if __name__ == '__main__':
    main()
