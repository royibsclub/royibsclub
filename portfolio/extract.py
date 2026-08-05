# -*- coding: utf-8 -*-
"""
Pulls the pictures out of the source deck and writes portfolio/assets/b64.json.

Every picture is captured at the crop rectangle it was actually displayed at in
the PDF, so nothing is re-framed. Two kinds come out:

  img   — the framed plates (photos, sketches, renders), cropped from a 2x page
          render at the clipped bbox reported for the image block.
  deco  — the line-art overlays that bleed off the sheet edge. These are taken
          from the embedded originals (with their soft mask applied, so they
          keep transparency) and stored together with the placement rect they
          had on the sheet, scaled to the 1600x900 stage.

The deck also draws its assembly arrows as vector chevrons that sit on top of
some pictures; those are painted out before cropping so they don't get baked
into a plate.

    python extract.py path/to/deck.pdf

Requires: pymupdf, pillow, and poppler-utils (pdfimages) for the originals.
"""

import base64, glob, io, json, os, re, subprocess, sys, tempfile

import fitz
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets", "b64.json")

ZOOM = 2.0
PAPER = (255, 252, 245)
STAGE_SCALE = 1600 / 1920          # source sheet is 1920x1080; the stage is 1600x900

# the overlay each decorative image belongs to, keyed by "page-index of the
# edge-touching image" -> stable name used by content.py
DECO_NAMES = {
    2: "p02_000", 3: "p03_008", 7: "p07_028", 8: "p08_036", 12: "p12_064",
    13: "p13_066", 17: "p17_098", 18: "p18_100", 23: "p23_142", 24: "p24_144",
    28: "p28_174",
}


def embedded_originals(pdf, workdir):
    """Extract every embedded image with its soft mask composited back in."""
    subprocess.run(["pdfimages", "-all", "-p", pdf, os.path.join(workdir, "i")],
                   check=True, stderr=subprocess.DEVNULL)
    found, used = {}, set()
    files = {}
    for f in sorted(glob.glob(os.path.join(workdir, "i-*"))):
        m = re.search(r"i-(\d+)-(\d+)\.(\w+)$", f)
        if m:
            files[int(m.group(2))] = (int(m.group(1)), f)
    for idx in sorted(files):
        if idx in used:
            continue
        page, f = files[idx]
        if not f.endswith(".jpg"):
            continue
        im = Image.open(f).convert("RGB")
        nxt = files.get(idx + 1)
        if nxt and nxt[0] == page and nxt[1].endswith(".png"):
            used.add(idx + 1)
            mask = Image.open(nxt[1]).convert("L")
            if mask.size != im.size:
                mask = mask.resize(im.size)
            if mask.getextrema()[0] < 250:
                im = im.convert("RGBA")
                im.putalpha(mask)
        found.setdefault(page, []).append(im)
    return found


def b64(im, fmt, **kw):
    buf = io.BytesIO()
    im.save(buf, fmt, **kw)
    return base64.b64encode(buf.getvalue()).decode()


def main(pdf):
    doc = fitz.open(pdf)
    with tempfile.TemporaryDirectory() as tmp:
        originals = embedded_originals(pdf, tmp)

        img, deco, place = {}, {}, {}
        for pno in range(doc.page_count):
            page = doc[pno]
            pix = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM))
            sheet = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

            paint = ImageDraw.Draw(sheet)
            for d in page.get_drawings():           # the deck's own step chevrons
                r = d["rect"]
                if 44 < r.width < 60 and 74 < r.height < 92:
                    paint.rectangle([(r.x0 - 3) * ZOOM, (r.y0 - 3) * ZOOM,
                                     (r.x1 + 3) * ZOOM, (r.y1 + 3) * ZOOM], fill=PAPER)

            blocks = [b for b in page.get_text("rawdict")["blocks"] if b["type"] == 1]
            rects = [r for xr in page.get_images(full=True)
                     for r in page.get_image_rects(xr[0])]
            k = 0
            for b in blocks:
                x0, y0, x1, y1 = b["bbox"]
                edge = x0 < 2 or y0 < 2 or x1 > 1918 or y1 > 1078
                key = f"s{pno + 1:02d}_{k}"
                k += 1
                if edge:
                    name = DECO_NAMES.get(pno + 1)
                    if not name or name in deco:
                        continue
                    src = next((o for o in originals.get(pno + 1, [])
                                if o.mode == "RGBA"), None)
                    # the placement rect is the one this visible bbox was clipped out of
                    fits = [r for r in rects
                            if r.x0 <= x0 + 1 and r.y0 <= y0 + 1
                            and r.x1 >= x1 - 1 and r.y1 >= y1 - 1]
                    rect = max(fits, key=lambda r: r.width * r.height) if fits else None
                    if src is None or rect is None:
                        continue
                    src = src.copy()
                    src.thumbnail((1300, 1300), Image.LANCZOS)
                    deco[name] = b64(src.quantize(colors=96, method=Image.FASTOCTREE),
                                     "PNG", optimize=True)
                    place[name] = [round(rect.x0 * STAGE_SCALE, 1),
                                   round(rect.y0 * STAGE_SCALE, 1),
                                   round(rect.width * STAGE_SCALE, 1),
                                   round(rect.height * STAGE_SCALE, 1)]
                    continue
                box = (int((x0 + 3) * ZOOM), int((y0 + 3) * ZOOM),
                       int((x1 - 3) * ZOOM), int((y1 - 3) * ZOOM))
                if box[2] - box[0] < 40 or box[3] - box[1] < 40:
                    continue
                crop = sheet.crop(box)
                crop.thumbnail((1150, 1150), Image.LANCZOS)
                img[key] = b64(crop, "JPEG", quality=80, optimize=True, progressive=True)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({"img": img, "deco": deco, "place": place}, open(OUT, "w"))
    print(f"{len(img)} plates, {len(deco)} overlays -> {OUT} "
          f"({os.path.getsize(OUT) / 1e6:.1f} MB)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
