# תיק עבודות — ניב פלג

A desktop redesign of the portfolio deck. Same 30 sheets, same words, same
pictures — only the presentation is new.

`tik-avodot.html` (repo root) is the deliverable: one self-contained file with
the fonts and every picture inlined. Open it in a browser.

| key | does |
| --- | --- |
| `←` / `Space` / `PageDown` | next sheet |
| `→` / `PageUp` | previous sheet |
| `i` | project index |
| `Esc` | close the index |
| `Home` / `End` | first / last sheet |

## Design

The deck already had an identity, so the redesign keeps it and sharpens it:
paper `#FFFCF5`, walnut `#4B221C`, drafting blue `#C2D4E0`, and the same
line-art overlays bleeding off the left edge. Added on top of that: a deep blue
`#3C5C78` so small labels have an accent that stays legible, Frank Ruhl Libre
for display against Assistant for running text, and a fixed 16:9 sheet that
scales to the viewport with a plate mark, a running head, and a sheet number.

In dark mode the sheet stays paper — the surface it lies on goes dark.

## Rebuilding

```
python extract.py path/to/deck.pdf   # pictures  -> assets/b64.json
python build.py                      # + content -> tik-avodot.html, artifact.html
```

`extract.py` needs `pymupdf`, `pillow`, and `pdfimages` (poppler-utils). It
captures each picture at the crop rectangle it was displayed at in the source,
takes the bleed overlays from the embedded originals so they keep their
transparency, and paints out the deck's own vector step-arrows so they don't get
baked into a plate.

- `content.py` — every sheet's text and picture order, transcribed from the PDF
- `template.html` — the design: tokens, layout, and the viewer
- `build.py` — renders content through the template and inlines the assets

`assets/b64.json` and `artifact.html` are generated and not tracked.
