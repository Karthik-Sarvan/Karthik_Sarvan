#!/usr/bin/env python3
"""Generate the branding bitmaps for karthik.qzz.io.

  assets/favicon-32x32.png    browser tab
  assets/apple-touch-icon.png iOS home screen (180x180)
  assets/og-image.png         Open Graph / X card (1200x630)

Typography is real Inter (the same family the site loads) so the share
card matches the page. Run:  python3 tools/make-assets.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets")

DARK = (17, 17, 17)
GRAY = (153, 153, 153)
LINE = (229, 229, 229)
WHITE = (255, 255, 255)


def _find(names, fallback):
    """Locate a font file. Override the search root with INTER_FONTS_DIR."""
    roots = [os.environ.get("INTER_FONTS_DIR", ""),
             os.path.join(ROOT, "node_modules", "@expo-google-fonts", "inter"),
             os.path.join(os.path.dirname(ROOT), ".build", "node_modules",
                          "@expo-google-fonts", "inter")]
    for r in roots:
        for n in names:
            p = os.path.join(r, n)
            if os.path.exists(p):
                return p
    print(f"  ! Inter not found, falling back to {fallback}")
    return fallback


EXTRA_BOLD = _find(["800ExtraBold/Inter_800ExtraBold.ttf", "Inter_800ExtraBold.ttf"],
                   "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
MEDIUM = _find(["500Medium/Inter_500Medium.ttf", "Inter_500Medium.ttf"],
               "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")


def font(path, size):
    return ImageFont.truetype(path, size)


def draw_tracked(draw, xy, text, fnt, fill, tracking):
    """Draw text with explicit letter-spacing (PIL has no tracking)."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking
    return x


def tracked_width(draw, text, fnt, tracking):
    return sum(draw.textlength(c, font=fnt) + tracking for c in text) - tracking


def monogram(size, bg, fg, corner):
    """Black rounded square with the K.S. mark."""
    ss = size * 4  # supersample for clean edges
    img = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, ss - 1, ss - 1], radius=int(corner * ss), fill=bg)
    fnt = font(EXTRA_BOLD, int(ss * 0.52))
    text = "KS"
    tracking = -ss * 0.03
    w = tracked_width(d, text, fnt, tracking)
    bbox = fnt.getbbox(text)
    h = bbox[3] - bbox[1]
    x = (ss - w) / 2
    y = (ss - h) / 2 - bbox[1]
    draw_tracked(d, (x, y), text, fnt, fg, tracking)
    return img.resize((size, size), Image.LANCZOS)


def og_image():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)

    pad = 88
    big = font(EXTRA_BOLD, 148)
    tracking_big = -7

    # Two-line name, second line indented exactly like the hero on the site.
    y = 96
    d.text((pad, y), "KARTHIK", font=big, fill=DARK)
    d.text((pad + 168, y + 138), "SARVAN", font=big, fill=DARK)

    # Hairline rule
    rule_y = 402
    d.rectangle([pad, rule_y, W - pad, rule_y + 2], fill=LINE)

    label = font(MEDIUM, 30)
    draw_tracked(d, (pad, rule_y + 44), "EMBEDDED SYSTEMS & FIRMWARE ENGINEER",
                 label, DARK, 6)

    sub = font(MEDIUM, 26)
    draw_tracked(d, (pad, rule_y + 104), "VISAKHAPALAM, INDIA", sub, GRAY, 4)

    domain = "karthik.qzz.io"
    dw = d.textlength(domain, font=sub)
    d.text((W - pad - dw, rule_y + 104), domain, font=sub, fill=GRAY)

    # Bare-metal / firmware flavour line
    stack = font(MEDIUM, 22)
    draw_tracked(d, (pad, H - 62), "C  /  RUST  /  STM32  /  PCB DESIGN  /  PID CONTROL",
                 stack, GRAY, 2.5)

    img.save(os.path.join(OUT, "og-image.png"), "PNG", optimize=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    monogram(32, DARK, WHITE, 0.18).save(os.path.join(OUT, "favicon-32x32.png"))
    monogram(180, DARK, WHITE, 0.16).save(os.path.join(OUT, "apple-touch-icon.png"))
    monogram(512, DARK, WHITE, 0.16).save(os.path.join(OUT, "icon-512.png"))
    og_image()
    print("wrote assets:")
    for n in sorted(os.listdir(OUT)):
        p = os.path.join(OUT, n)
        print(f"  {n}  {os.path.getsize(p)} bytes")


if __name__ == "__main__":
    main()
