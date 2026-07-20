#!/usr/bin/env python3
"""
Crop the PanelUI logo to its mark and emit the sized assets.

The source PNGs are 1024x1024 with a glow whose alpha reaches every edge, so a
naive alpha bounding box returns the whole canvas. Thresholding at alpha > 200
finds the mark itself; everything softer is glow.

Run from the repo root:  python3 scripts/prepare-logo.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCES = {
    # (source, name). "light" is the dark mark, drawn for light backgrounds.
    "light": Path.home() / "Downloads" / "for light mode.png",
    "dark": Path.home() / "Downloads" / "for dark mode.png",
}
TARGETS = [
    ROOT / "apps" / "example" / "assets",
    ROOT / "apps" / "docs" / "public",
]
# Padding around the mark, as a fraction of its longest side.
PADDING = 0.08
SIZE = 256

def trim(image: Image.Image) -> Image.Image:
    """Crop to the opaque mark, pad, and square it off."""
    alpha = image.split()[3]
    mark = alpha.point(lambda v: 255 if v > 200 else 0).getbbox()
    if mark is None:
        raise SystemExit("no opaque pixels found - is the source transparent?")

    left, top, right, bottom = mark
    pad = int(max(right - left, bottom - top) * PADDING)
    box = (
        max(left - pad, 0),
        max(top - pad, 0),
        min(right + pad, image.width),
        min(bottom + pad, image.height),
    )
    cropped = image.crop(box)

    # Square canvas, so the mark keeps its proportions at any render size.
    side = max(cropped.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(
        cropped,
        ((side - cropped.width) // 2, (side - cropped.height) // 2),
    )
    return square

def main() -> None:
    for name, source in SOURCES.items():
        if not source.exists():
            raise SystemExit(f"missing source: {source}")

        image = Image.open(source).convert("RGBA")
        trimmed = trim(image).resize((SIZE, SIZE), Image.LANCZOS)

        for target in TARGETS:
            target.mkdir(parents=True, exist_ok=True)
            out = target / f"logo-{name}.png"
            trimmed.save(out)
            print(f"  {out.relative_to(ROOT)}  {trimmed.size[0]}x{trimmed.size[1]}")

        # Keep one full-glow copy for the OG image and app icon.
        glow = ROOT / "apps" / "docs" / "public" / f"logo-glow-{name}.png"
        image.resize((512, 512), Image.LANCZOS).save(glow)
        print(f"  {glow.relative_to(ROOT)}  512x512 (glow kept)")

if __name__ == "__main__":
    main()
