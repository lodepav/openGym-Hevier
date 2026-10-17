#!/usr/bin/env python3
"""The fork's app icon and splash: upstream's, recoloured from openGym lime to Hevy blue.

    python3 hevier/tools/recolour-icons.py      # needs Pillow (pip install pillow)

Reads every PNG under frontend/android/app/src/main/res that carries upstream's lime and writes
the recoloured copy, same path, under frontend/android/app/src/hevier/res. hevier.gradle (seam S7)
adds that folder to the debug and release builds, whose resources override src/main/res, so no
upstream file changes. The PWA's icons in frontend/public go the same way into
frontend/public/hevier, which hevier/lib/pwa-icons.js points the page at. Rerun it when upstream
regenerates its icons (hevier/CONFLICTS.md).

A pixel is moved only when it lies on the line between upstream's background and its lime (the
icon's fill and its anti-aliased edges); anything else is copied as it is. The geometry stays
upstream's, pixel for pixel.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
# (upstream's folder, the fork's copy, which files)
DIRS = [
    (ROOT / 'frontend/android/app/src/main/res', ROOT / 'frontend/android/app/src/hevier/res', '**/*.png'),
    (ROOT / 'frontend/public', ROOT / 'frontend/public/hevier', 'icon-*.png'),
]

BG = (12, 14, 18)      # upstream's #0c0e12 (frontend/resources/icon.svg)
LIME = (163, 230, 53)  # upstream's #a3e635
BLUE = (0, 140, 255)   # Hevy blue, the fork's --acc (frontend/src/hevier/theme.css)
TOLERANCE = 24         # how far off the bg-to-lime line a pixel may be and still count

D = tuple(l - b for l, b in zip(LIME, BG))
DD = sum(d * d for d in D)


def recolour(px):
    r, g, b, a = px
    if a == 0:
        return px
    v = (r - BG[0], g - BG[1], b - BG[2])
    t = sum(x * d for x, d in zip(v, D)) / DD
    if t <= 0.02:
        return px
    off = sum((x - t * d) ** 2 for x, d in zip(v, D)) ** 0.5
    if off > TOLERANCE:
        return px
    t = min(t, 1.0)  # resampling overshoots a little past the lime at the edges
    return tuple(round(bg + t * (n - bg)) for bg, n in zip(BG, BLUE)) + (a,)


def main():
    for src_dir, out_dir, pattern in DIRS:
        recolour_dir(src_dir, out_dir, pattern)


def recolour_dir(src_dir, out_dir, pattern):
    n = 0
    for src in sorted(src_dir.glob(pattern)):
        im = Image.open(src).convert('RGBA')
        data = list(im.getdata())
        out = [recolour(p) for p in data]
        if out == data:
            continue
        dst = out_dir / src.relative_to(src_dir)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.putdata(out)
        im.save(dst, optimize=True)
        n += 1
    print(f'{n} files written under {out_dir.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
