#!/usr/bin/env python3
"""The fork's app icons and splash: upstream's, recoloured from openGym lime to the fork's accents.

    python3 hevier/tools/recolour-icons.py      # needs Pillow (pip install pillow)

Reads every PNG under frontend/android/app/src/main/res that carries upstream's lime and writes
the recoloured copy, same path, under frontend/android/app/src/hevier/res. hevier.gradle (seam S7)
adds that folder to the debug and release builds, whose resources override src/main/res, so no
upstream file changes. The PWA's icons in frontend/public go the same way into
frontend/public/hevier, which hevier/lib/pwa-icons.js points the page at. Rerun it when upstream
regenerates its icons (hevier/CONFLICTS.md).

Everything is drawn in the default accent, OpenBite's green (D123), under today's file names. The
launcher icon is also drawn in each other offered accent (frontend/src/hevier/lib/accents.js
HV_ACCENTS) as ic_launcher_hv_<id>, with its round and foreground files and an adaptive XML that
keeps the fork's monochrome layer, for the launcher aliases of the fork's manifest overlay
(HevierIcons.java). The monochrome PNGs are the fork's own and are never touched.

A pixel is moved only when it lies on the line between upstream's background and its lime (the
icon's fill and its anti-aliased edges); anything else is copied as it is. The geometry stays
upstream's, pixel for pixel.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RES = ROOT / 'frontend/android/app/src/main/res'
OUT = ROOT / 'frontend/android/app/src/hevier/res'
# (upstream's folder, the fork's copy, which files): drawn in the default accent only. Upstream's
# alternate icons (ic_launcher_sky, _christmas, ...) are left out: their aliases are removed (D100).
DIRS = [
    (RES, OUT, 'mipmap-*/ic_launcher.png'),
    (RES, OUT, 'mipmap-*/ic_launcher_round.png'),
    (RES, OUT, 'mipmap-*/ic_launcher_foreground.png'),
    (RES, OUT, 'drawable*/splash.png'),
    (ROOT / 'frontend/public', ROOT / 'frontend/public/hevier', 'icon-*.png'),
]

BG = (12, 14, 18)      # upstream's #0c0e12 (frontend/resources/icon.svg)
LIME = (163, 230, 53)  # upstream's #a3e635
TOLERANCE = 24         # how far off the bg-to-lime line a pixel may be and still count

GREEN = (52, 208, 138)  # D123's default accent #34d08a
# The other offered accents, as in HV_ACCENTS (accents.js); each id names an alias in HevierIcons.java.
VARIANTS = {
    'blue': (0, 140, 255),     # #008cff
    'teal': (64, 200, 224),    # #40c8e0
    'brand': (163, 230, 53),   # #a3e635, upstream's own lime: its files are copied as they are
    'pink': (255, 126, 182),   # #ff7eb6
}
# The launcher's files that get a copy per accent (upstream's names; the round and foreground ones
# take the accent before their suffix, as upstream names its own alternates).
LAUNCHER = {'ic_launcher': '', 'ic_launcher_round': '_round', 'ic_launcher_foreground': '_foreground'}

D = tuple(l - b for l, b in zip(LIME, BG))
DD = sum(d * d for d in D)

ADAPTIVE = '''<?xml version="1.0" encoding="utf-8"?>
<!-- [hevier] Written by hevier/tools/recolour-icons.py: the launcher icon in the {id} accent (D123),
     upstream's background and the fork's monochrome layer, so Android's themed icon works whichever
     alias is on. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background>
        <inset android:drawable="@mipmap/ic_launcher_background" android:inset="16.7%" />
    </background>
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_hv_{id}_foreground" android:inset="16.7%" />
    </foreground>
    <monochrome>
        <inset android:drawable="@mipmap/ic_launcher_monochrome" android:inset="16.7%" />
    </monochrome>
</adaptive-icon>
'''


def recolour(px, to):
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
    return tuple(round(bg + t * (n - bg)) for bg, n in zip(BG, to)) + (a,)


def main():
    for src_dir, out_dir, pattern in DIRS:
        recolour_dir(src_dir, out_dir, pattern)
    variants()


def write(src, dst, to):
    """Writes src recoloured to `to` at dst; False when src has no lime to move."""
    im = Image.open(src).convert('RGBA')
    data = list(im.getdata())
    out = [recolour(p, to) for p in data]
    if out == data:
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.putdata(out)
    im.save(dst, optimize=True)
    return True


def recolour_dir(src_dir, out_dir, pattern):
    n = sum(write(src, out_dir / src.relative_to(src_dir), GREEN) for src in sorted(src_dir.glob(pattern)))
    print(f'{n} files written under {out_dir.relative_to(ROOT)}')


def variants():
    n = 0
    for vid, to in VARIANTS.items():
        for stem, suffix in LAUNCHER.items():
            for src in sorted(RES.glob(f'mipmap-*/{stem}.png')):
                dst = OUT / src.parent.name / f'ic_launcher_hv_{vid}{suffix}.png'
                if to == LIME:  # nothing to move: the lime icon is upstream's file itself
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    dst.write_bytes(src.read_bytes())
                elif not write(src, dst, to):
                    raise SystemExit(f'{src.relative_to(ROOT)} has no lime left to recolour: check upstream\'s icon')
                n += 1
        for name in (f'ic_launcher_hv_{vid}.xml', f'ic_launcher_hv_{vid}_round.xml'):
            (OUT / 'mipmap-anydpi-v26' / name).write_text(ADAPTIVE.format(id=vid))
            n += 1
    print(f'{n} accent icon files written under {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
