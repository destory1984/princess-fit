# Adds figures from a second drawing to the end of a movement drawing, so the two can be
# cut as one (scripts/move-assets.py).
#
#   python -X utf8 scripts/move-join.py <drawing.png> <extra.png> <out.png>
#
# A drawing asked to hold seven figures draws them small. So the extra poses are ordered
# as a drawing of their own whose first figure is the same standing pose the first
# drawing starts with. That figure is the ruler: the extra drawing is resized until its
# standing girl is as tall as the first drawing's, its floor is set on the same row, and
# every figure after the ruler is appended to the right. The ruler itself is dropped.
import sys

import numpy as np
from PIL import Image

if len(sys.argv) != 4:
    sys.exit('usage: move-join.py <drawing.png> <extra.png> <out.png>')


def figures(image):
    """The column runs with something in them, and the rows each one covers."""
    solid = np.array(image)[..., 3] >= 128
    cols = solid.any(axis=0)
    edges = np.flatnonzero(np.diff(np.r_[0, cols.astype(int), 0]))
    found = []
    for a, b in zip(edges[::2], edges[1::2]):
        if b - a <= 12:
            continue
        rows = np.flatnonzero(solid[:, a:b].any(axis=1))
        found.append((int(a), int(b), int(rows.min()), int(rows.max()) + 1))
    return found


base = Image.open(sys.argv[1]).convert('RGBA')
extra = Image.open(sys.argv[2]).convert('RGBA')
_, _, top, floor = figures(base)[0]
ruler = figures(extra)[0]
scale = (floor - top) / (ruler[3] - ruler[2])
extra = extra.convert('RGBa').resize(
    (round(extra.width * scale), round(extra.height * scale)), Image.LANCZOS
).convert('RGBA')
found = figures(extra)
if len(found) < 2:
    sys.exit(f'{sys.argv[2]}: nothing after the standing figure')
ruler, added = found[0], found[1:]

gap = base.width // 40
width = base.width + sum(b - a + gap for a, b, _, _ in added)
# Her floor in the extra drawing goes on the row of her floor in the first.
down = floor - ruler[3]
out = Image.new('RGBA', (width, base.height))
out.alpha_composite(base, (0, 0))
x = base.width
for a, b, _, _ in added:
    piece = extra.crop((a, 0, b, extra.height))
    lifted = Image.new('RGBA', (b - a, base.height))
    lifted.alpha_composite(piece, (0, down)) if down >= 0 else lifted.alpha_composite(
        piece.crop((0, -down, b - a, extra.height)), (0, 0)
    )
    out.alpha_composite(lifted, (x, 0))
    x += b - a + gap
out.save(sys.argv[3])
print(f'{sys.argv[3]}: {len(added)} added at {scale:.3f}x, floor moved {down} px')
