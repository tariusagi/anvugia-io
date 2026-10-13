"""Build the Open Graph / social share card for anvugia.io.

Writes assets/img/og-cover.png (1200x630).

Run with the bundled Python:
    python tools/make-og.py

Fonts are fetched from Google Fonts at build time into a temp directory and are
never committed to the repository. The card is regenerated from scratch, so it
always matches the site's palette.
"""

import io
import os
import tempfile
import urllib.request

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
PAPER = (239, 237, 231)
INK = (28, 43, 54)
INK_SOFT = (92, 110, 123)
INK_FAINT = (138, 151, 159)
ACCENT = (63, 123, 168)

LEGACY_UA = "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)"

# Static files from the upstream Google Fonts repository (both OFL licensed).
FONTS = {
    "serif": (
        "InstrumentSerif-Regular.ttf",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/"
        "instrumentserif/InstrumentSerif-Regular.ttf",
    ),
    # Variable font: the weight axis is set per size below.
    "mono": (
        "JetBrainsMono-var.ttf",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/"
        "jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf",
    ),
}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "img", "og-cover.png")


def fetch(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def download_font(filename, url, cache_dir):
    path = os.path.join(cache_dir, filename)
    if not os.path.exists(path) or os.path.getsize(path) < 1024:
        with open(path, "wb") as fh:
            fh.write(fetch(url, {"User-Agent": LEGACY_UA}))
    return path


def mono_font(path, size, weight):
    """JetBrains Mono ships as a variable font; pin the weight axis."""
    font = ImageFont.truetype(path, size)
    try:
        font.set_variation_by_axes([weight])
    except Exception:
        pass  # static fallback: whatever weight the file already is
    return font


def tracked(draw, xy, text, font, fill, tracking=0.0, anchor_right=None):
    """Draw text with letter-spacing; returns the advance width."""
    x, y = xy
    if anchor_right is not None:
        total = sum(font.getlength(c) + tracking for c in text) - tracking
        x = anchor_right - total
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += font.getlength(ch) + tracking
    return x - xy[0]


def main():
    cache = os.path.join(tempfile.gettempdir(), "anvugia-og-fonts")
    os.makedirs(cache, exist_ok=True)
    serif_p = download_font(*FONTS["serif"], cache)
    mono_p = download_font(*FONTS["mono"], cache)

    serif = ImageFont.truetype(serif_p, 76)
    mono = mono_font(mono_p, 17, 400)
    mono_sm = mono_font(mono_p, 15, 400)
    mono_md = mono_font(mono_p, 19, 500)
    mono_lg = mono_font(mono_p, 21, 500)

    img = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(img)

    # --- faint orbital motif, echoing the process section ------------------
    ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    cx, cy, r = 880, 318, 150
    rd.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(28, 43, 54, 26), width=2)
    rd.ellipse([cx - r - 4, cy - r, cx + r + 4, cy + r], outline=(28, 43, 54, 10), width=1)
    ex, ey = 232, 70
    rd.ellipse([cx - ex, cy - ey, cx + ex, cy + ey], outline=(28, 43, 54, 70), width=2)
    for ang in (-152, -104, -46, 18, 96):
        rad = np.deg2rad(ang)
        px, py = cx + ex * np.cos(rad), cy + ey * np.sin(rad)
        rd.rectangle([px - 5, py - 5, px + 5, py + 5], fill=(233, 238, 241, 235),
                     outline=(28, 43, 54, 120), width=1)
    ring = ring.rotate(-7, resample=Image.BICUBIC, center=(cx, cy))
    img = Image.alpha_composite(img.convert("RGBA"), ring).convert("RGB")
    draw = ImageDraw.Draw(img)

    # --- hairline frame ----------------------------------------------------
    draw.rectangle([27, 27, W - 28, H - 28], outline=(28, 43, 54, 40), width=1)

    M = 68

    def asterisk(d, x, y, rad=10, color=INK, width=2):
        d.line([x, y - rad, x, y + rad], fill=color, width=width)
        d.line([x - rad, y, x + rad, y], fill=color, width=width)
        k = rad * 0.7
        d.line([x - k, y - k, x + k, y + k], fill=color, width=width)
        d.line([x + k, y - k, x - k, y + k], fill=color, width=width)

    # --- top row -----------------------------------------------------------
    asterisk(draw, M + 9, 74)
    tracked(draw, (M + 34, 65), "AN VU GIA LTD", mono_md, INK, tracking=2.6)
    tracked(draw, (0, 68), "( anvugia.io )", mono_sm, INK_FAINT, tracking=1.4,
            anchor_right=W - M)

    # --- headline ----------------------------------------------------------
    y = 214
    for line in ("we build the systems", "your business runs on"):
        draw.text((M, y), line, font=serif, fill=INK)
        y += 88

    # --- practice line -----------------------------------------------------
    y += 22
    tracked(draw, (M, y), "IT SERVICES", mono, INK_SOFT, tracking=2.4)
    x = M + sum(mono.getlength(c) + 2.4 for c in "IT SERVICES")
    draw.text((x + 14, y - 1), "/", font=mono, fill=INK_FAINT)
    tracked(draw, (x + 34, y), "AI CONSULTING", mono, INK_SOFT, tracking=2.4)
    x = x + 34 + sum(mono.getlength(c) + 2.4 for c in "AI CONSULTING")
    draw.text((x + 14, y - 1), "/", font=mono, fill=INK_FAINT)
    tracked(draw, (x + 34, y), "INVESTMENT TOOLS", mono, INK_SOFT, tracking=2.4)

    # --- footer rule + contact --------------------------------------------
    draw.line([M, 508, W - M, 508], fill=(28, 43, 54, 38), width=1)
    tracked(draw, (M, 534), "admin@anvugia.io", mono_sm, INK, tracking=1.2)
    tracked(draw, (0, 534), "scope \u2192 production \u2192 operate", mono_sm,
            INK_FAINT, tracking=1.2, anchor_right=W - M)

    # --- film grain, matching the site ------------------------------------
    rng = np.random.default_rng(20260113)
    noise = rng.integers(0, 256, (H, W), dtype=np.uint8)
    noise_img = Image.fromarray(noise, mode="L").convert("RGB")
    img = Image.blend(img, noise_img, 0.035)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print("wrote %s (%dx%d, %d bytes)" % (OUT, img.width, img.height,
                                          os.path.getsize(OUT)))


if __name__ == "__main__":
    main()
