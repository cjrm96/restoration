#!/usr/bin/env python3
"""export-art.py -- turn a full-res master into a shipped web-size asset.

The full-res PNG masters live in art/<key>.png. The game ships the web-size
copies in assets/art/<key>.webp (1920px wide, WebP q92). This replaces the old
"base64-splice into the HTML" step: convert, then add the key to ART_KEYS in
Car_Guy_Sim.html.

    python3 dev/export-art.py scene-gas-station     # one key
    python3 dev/export-art.py                        # every art/*.png master

After adding a NEW cutscene, also add its key to the ART_KEYS array in
Car_Guy_Sim.html so the game loads it.
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_MASTERS = os.path.join(ROOT, "art")
ASSETS = os.path.join(ROOT, "assets", "art")
MAX_W = 1920


def export(key):
    src = os.path.join(ART_MASTERS, f"{key}.png")
    if not os.path.exists(src):
        print(f"  ! no master: art/{key}.png")
        return False
    im = Image.open(src).convert("RGB")
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    os.makedirs(ASSETS, exist_ok=True)
    out = os.path.join(ASSETS, f"{key}.webp")
    im.save(out, "WEBP", quality=92, method=6)
    kb = os.path.getsize(out) // 1024
    print(f"  {key}.webp  {im.size[0]}x{im.size[1]}  {kb}KB")
    return True


def main():
    args = sys.argv[1:]
    if args:
        keys = [a.replace(".png", "") for a in args]
    else:
        keys = sorted(
            f[:-4] for f in os.listdir(ART_MASTERS) if f.endswith(".png")
        )
    ok = sum(export(k) for k in keys)
    print(f"exported {ok}/{len(keys)} -> assets/art/")
    print("reminder: a NEW cutscene also needs its key added to ART_KEYS in Car_Guy_Sim.html")


if __name__ == "__main__":
    main()
