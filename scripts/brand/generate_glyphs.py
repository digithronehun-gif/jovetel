"""
A JóVétel szóvédjegy és a J monogram körvonalainak generálása a Bodoni Moda (OFL) fontból.

Futtatás (egyszeri, a kimenet commitolva van):
  pip install fonttools brotli uharfbuzz
  python3 scripts/brand/generate_glyphs.py <bodoni-moda-variable-latin.woff2>

Kimenet: src/components/brand/glyphs.generated.ts
A szóvédjegy: opsz=28, wght=500 („Bodoni Moda 500”, DESIGN_SYSTEM 5.4). A monogram: opsz=11, wght=600
(kis méretben, faviconként is olvasható). Az „ó” ékezete nem glif, hanem a RayIcon egyetlen,
dőlt sugara (a komponens rajzolja --amber színnel).
"""
import json
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/components/brand/glyphs.generated.ts"


def instance(src: str, opsz: float, wght: float, out: Path) -> Path:
    f = TTFont(src)
    instantiateVariableFont(f, {"opsz": opsz, "wght": wght}, inplace=True)
    f.flavor = None
    f.save(out)
    return out


def shaped_path(font_path: Path, text: str, cap: int):
    data = font_path.read_bytes()
    face = hb.Face(data)
    font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True})
    tt = TTFont(font_path)
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    x = 0
    pen = SVGPathPen(gs, ntos=lambda v: ("%.1f" % v).rstrip("0").rstrip("."))
    glyphs = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        bp = BoundsPen(gs)
        gs[name].draw(bp)
        # y tükrözése: a nagybetű-magasság teteje lesz az y=0
        tpen = TransformPen(pen, (1, 0, 0, -1, x + pos.x_offset, cap))
        gs[name].draw(tpen)
        glyphs.append({"name": name, "x": x + pos.x_offset, "bounds": bp.bounds, "adv": pos.x_advance})
        x += pos.x_advance
    return pen.getCommands(), glyphs, x


def main(src: str) -> None:
    tmp = Path("/tmp")
    wm_font = instance(src, 28, 500, tmp / "bodoni-wordmark.ttf")
    mono_font = instance(src, 11, 600, tmp / "bodoni-mono.ttf")
    cap = 1500
    wm_d, wm_glyphs, wm_width = shaped_path(wm_font, "JoVétel", cap)
    o = next(g for g in wm_glyphs if g["name"] == "o")
    ox0, _, ox1, otop = o["bounds"]
    o_center = o["x"] + (ox0 + ox1) / 2
    # A sugár: dőlt vonal az „o” fölött, mint egy éles ékezet (koordináták: y lefelé nő)
    ray = {
        "x1": round(o_center - 60),
        "y1": round(cap - otop - 150),
        "x2": round(o_center + 150),
        "y2": round(cap - otop - 470),
        "width": 84,
    }
    mono_d, mono_glyphs, mono_width = shaped_path(mono_font, "J", cap)
    jx0, jy0, jx1, jy1 = mono_glyphs[0]["bounds"]
    mono_ray = {
        "x1": round(jx1 - 40),
        "y1": round(-60),
        "x2": round(jx1 + 190),
        "y2": round(-400),
        "width": 110,
    }
    content = f"""// GENERÁLT FÁJL — ne szerkeszd kézzel. Forrás: scripts/brand/generate_glyphs.py
// Betűtípus: Bodoni Moda (SIL Open Font License 1.1). Egység: font-egység (UPM 2000), y lefelé.

export const WORDMARK = {{
  width: {wm_width},
  capHeight: {cap},
  descent: 70,
  path: {json.dumps(wm_d)},
  ray: {json.dumps(ray)},
}} as const

export const MONOGRAM = {{
  bounds: {json.dumps([jx0, cap - jy1, jx1, cap - jy0])},
  path: {json.dumps(mono_d)},
  ray: {json.dumps(mono_ray)},
}} as const
"""
    OUT.write_text(content, encoding="utf-8")
    print(f"OK: {OUT} (szóvédjegy {wm_width} egység széles, {len(wm_d)} karakter)")


if __name__ == "__main__":
    main(sys.argv[1])
