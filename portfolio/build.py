# -*- coding: utf-8 -*-
"""Builds the self-contained portfolio HTML from content.py + the extracted assets."""

import json, os, re, sys, html

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from content import SLIDES, PROJECTS, FOOTER            # noqa: E402

ASSETS = os.environ.get("PORTFOLIO_ASSETS", os.path.join(HERE, "assets"))
B64 = json.load(open(os.path.join(ASSETS, "b64.json")))
FONTCSS = open(os.path.join(ASSETS, "fonts.css")).read()

IMG, DECO = B64["img"], B64["deco"]


def src(key):
    if key in IMG:
        return "data:image/jpeg;base64," + IMG[key]
    return "data:image/png;base64," + DECO[key]


def rich(text):
    """**bold** -> <b>, everything else escaped."""
    parts = re.split(r"\*\*(.+?)\*\*", text)
    out = []
    for i, p in enumerate(parts):
        p = html.escape(p)
        out.append(f"<b>{p}</b>" if i % 2 else p)
    return "".join(out)


PLACE = B64["place"]


def motif(key, cls="rail"):
    """The deck's own line-art overlay, at the exact bleed it had on the sheet."""
    x, y, w, h = PLACE[key]
    return (f'<img class="motif {cls}" alt="" aria-hidden="true" src="{src(key)}" '
            f'style="left:{x}px;top:{y}px;width:{w}px;height:{h}px">')


def frame(keys, inset=None, geo=None):
    """One framed plate; `keys` longer than 1 = panels that shared a frame."""
    inner = "".join(f'<img src="{src(k)}" alt="">' for k in keys)
    ins = ""
    if inset:
        h, top, right = geo or (57, -33, -12)
        ins = (f'<img class="inset" alt="" src="{src(inset)}" '
               f'style="height:{h}%;top:{top}%;right:{right}%">')
    return f'<figure class="plate"><div class="plate-in">{inner}{ins}</div></figure>'


def fig_block(f):
    """A figure column on a working sheet: plate(s) + caption."""
    body = frame(f["img"], f.get("inset"), f.get("ins_geo"))
    if f.get("stack"):
        body += frame(f["stack"])
    cap = f'<figcaption>{html.escape(f["cap"])}</figcaption>' if f.get("cap") else ""
    stacked = " is-stacked" if f.get("stack") else ""
    return f'<div class="fig{stacked}" style="grid-column:span {f["w"]}">{body}{cap}</div>'


def head(s):
    p = PROJECTS[s["proj"]]
    title = p[1] + (f' <span class="sep">/</span> {p[2]}' if p[2] else "")
    return (f'<header class="sheet-head">'
            f'<div class="head-l">'
            f'<div class="eyebrow"><span class="num">{p[0]}</span>'
            f'<span class="rule"></span>{title}</div>'
            f'<h2 class="stage-title">{html.escape(s["stage"])}</h2>'
            f'</div></header>')


def body_col(s):
    if not s.get("body"):
        return ""
    ps = "".join(f"<p>{rich(t)}</p>" for t in s["body"])
    return f'<div class="prose">{ps}</div>'


# ------------------------------------------------------------------ renderers
def r_cover(s, i):
    return (f'<div class="cover">'
            f'<div class="cover-grid" aria-hidden="true"></div>'
            f'<h1>{html.escape(s["title"])}</h1>'
            f'<div class="cover-rule"></div>'
            f'<p class="cover-sub">{html.escape(s["sub"])}</p>'
            f'</div>')


def r_divider(s, i):
    n, t, sub = PROJECTS[s["proj"]]
    subhtml = f'<p class="div-sub">{html.escape(sub)}</p>' if sub else ""
    return (f'<div class="divider">{motif(s["deco"], "big")}'
            f'<div class="div-text"><span class="div-num">{n}<i></i></span>'
            f'<h2 class="div-title">{html.escape(t)}</h2>{subhtml}</div></div>')


def r_sheet(s, i):
    figs = "".join(fig_block(f) for f in s["figs"])
    note = f'<p class="note">{html.escape(s["note"])}</p>' if s.get("note") else ""
    deco = motif(s["deco"]) if s.get("deco") else ""
    if s.get("layout") == "split":
        return (f'<div class="sheet split">{deco}{head(s)}'
                f'<div class="split-body">{body_col(s)}'
                f'<div class="figs one">{figs}</div></div></div>')
    return (f'<div class="sheet">{deco}{head(s)}{body_col(s)}'
            f'<div class="figs">{figs}</div>{note}</div>')


def r_steps(s, i):
    parts = []
    for k, f in enumerate(s["figs"]):
        if k:
            parts.append('<span class="chev" aria-hidden="true"></span>')
        parts.append(frame(f["img"]))
    return (f'<div class="sheet steps">{head(s)}'
            f'<div class="step-row eqrow">{"".join(parts)}</div></div>')


def r_result(s, i):
    cols = []
    for grow, rows in s["cols"]:
        rr = "".join(
            f'<div class="rrow eqrow">{"".join(frame([k]) for k in row)}</div>' for row in rows)
        cols.append(f'<div class="rcol" style="flex:{grow}">{rr}</div>')
    return (f'<div class="sheet result">{head(s)}'
            f'<div class="rgrid">{"".join(cols)}</div></div>')


def r_gallery(s, i):
    top = "".join(frame([k]) for k in s["top"])
    bot = "".join(frame([k]) for k in s["bottom"])
    return (f'<div class="sheet gallery">{head(s)}'
            f'<p class="lead">{html.escape(s["lead"])}</p>'
            f'<div class="grow"><div class="grow-1 eqrow">{top}</div>'
            f'<div class="grow-2 eqrow">{bot}</div></div></div>')


RENDER = dict(cover=r_cover, divider=r_divider, sheet=r_sheet,
              steps=r_steps, result=r_result, gallery=r_gallery)


def build():
    slides = []
    for i, s in enumerate(SLIDES):
        inner = RENDER[s["kind"]](s, i)
        pnum = "" if s["kind"] == "cover" else f'{i + 1:02d}<i>/</i>{len(SLIDES):02d}'
        slides.append(
            f'<section class="slide" data-i="{i}" data-proj="{s.get("proj", -1)}">'
            f'{inner}'
            f'<footer class="sheet-foot"><span class="sig">{html.escape(FOOTER)}</span>'
            f'<span class="pno">{pnum}</span></footer>'
            f'</section>')

    # index overlay ---------------------------------------------------------
    first = {}
    for i, s in enumerate(SLIDES):
        p = s.get("proj", -1)
        if p >= 0 and p not in first:
            first[p] = i
    cards = []
    for pi, (n, t, sub) in enumerate(PROJECTS):
        deco = SLIDES[first[pi]]["deco"]
        cards.append(
            f'<button class="idx-card" data-go="{first[pi]}">'
            f'<span class="idx-art"><img src="{src(deco)}" alt=""></span>'
            f'<span class="idx-n">{n}</span>'
            f'<span class="idx-t">{html.escape(t)}</span>'
            f'<span class="idx-s">{html.escape(sub)}</span></button>')

    tpl = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
    out = (tpl.replace("/*__FONTS__*/", FONTCSS)
              .replace("<!--__SLIDES__-->", "".join(slides))
              .replace("<!--__INDEX__-->", "".join(cards))
              .replace("__COUNT__", str(len(SLIDES))))
    # artifact build: no doctype/html/head/body — the host wraps it
    art = os.path.join(HERE, "artifact.html")
    open(art, "w", encoding="utf-8").write(out)

    # standalone build: a complete document, for opening the file directly
    doc = ('<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n'
           '<meta charset="utf-8">\n' + out.replace(
               '<meta name="viewport" content="width=device-width, initial-scale=1">\n', "")
           .replace("</style>", "</style>\n</head>\n<body>", 1) + "\n</body>\n</html>\n")
    doc = doc.replace('<title>', '<meta name="viewport" content="width=device-width, '
                      'initial-scale=1">\n<title>', 1)
    dest = os.path.join(HERE, "..", "tik-avodot.html")
    open(dest, "w", encoding="utf-8").write(doc)
    for f in (dest, art):
        print("wrote", os.path.abspath(f), round(os.path.getsize(f) / 1e6, 2), "MB")


if __name__ == "__main__":
    build()
