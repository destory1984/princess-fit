# Adds figures from a second drawing to the end of a movement drawing, so the two can be
# cut as one (scripts/move-assets.py).
#
#   python -X utf8 scripts/move-join.py <drawing.png> <extra.png> <out.png> [before last=0]
#
# A drawing asked to hold seven figures draws them small. So the extra poses are ordered
# as a drawing of their own whose first figure is the same standing pose the first
# drawing starts with. That figure is the ruler: the extra drawing is resized until its
# standing girl is as tall as the first drawing's, its floor is set on the same row, and
# every figure after the ruler is appended to the right. The ruler itself is dropped.
#
# `before last` is how many of the added figures go in front of the first drawing's last
# figure instead of after it, so the strip stays in the order the movement happens: a
# burpee's gathering belongs before its jump, its landing after.
import sys

import numpy as np
from PIL import Image

if len(sys.argv) not in (4, 5):
    sys.exit('usage: move-join.py <drawing.png> <extra.png> <out.png> [before last=0]')
before = int(sys.argv[4]) if len(sys.argv) == 5 else 0


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


def pieces(small):
    """Each connected piece numbered from 1, touching diagonally included."""
    labels = np.zeros(small.shape, dtype=int)
    count = 0
    for y0, x0 in zip(*np.nonzero(small)):
        if labels[y0, x0]:
            continue
        count += 1
        labels[y0, x0] = count
        stack = [(y0, x0)]
        while stack:
            y, x = stack.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    v, u = y + dy, x + dx
                    if 0 <= v < small.shape[0] and 0 <= u < small.shape[1] and small[v, u] and not labels[v, u]:
                        labels[v, u] = count
                        stack.append((v, u))
    return labels, count


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
width = base.width + sum(b - a + gap for a, b, _, _ in added) + 2 * gap
# Her floor in the extra drawing goes on the row of her floor in the first.
down = floor - ruler[3]
out = Image.new('RGBA', (width, base.height))
# The last figure is lifted out as a connected piece, not cut off down a column: lying
# figures reach under their neighbours (a push-up's head ends beneath the jump), so no
# column divides them.
rest, last = base, None
if before:
    solid = np.array(base)[..., 3] >= 128
    # At full size: a quarter-size mask left her outline behind as specks.
    labels, count = pieces(solid)
    sizes = np.bincount(labels.ravel(), minlength=count + 1)[1:]
    big = [k + 1 for k in range(count) if sizes[k] > sizes.max() / 8]
    where = {n: np.nonzero(labels == n)[1].mean() for n in range(1, count + 1)}
    k = max(big, key=lambda n: where[n])
    # Anything small goes with whichever big piece is nearest, as in move-assets.py.
    full = np.zeros(solid.shape, dtype=bool)
    for n in range(1, count + 1):
        owner = n if n in big else min(big, key=lambda m: abs(where[m] - where[n]))
        if owner == k:
            full |= labels == n
    pixels = np.array(base)
    kept, lifted = pixels.copy(), pixels.copy()
    kept[full] = 0
    lifted[~full] = 0
    xs = np.flatnonzero(full.any(axis=0))
    rest = Image.fromarray(kept, 'RGBA')
    last = Image.fromarray(lifted, 'RGBA').crop((int(xs.min()), 0, int(xs.max()) + 1, base.height))
out.alpha_composite(rest, (0, 0))
x = figures(rest)[-1][1]
for i, (a, b, _, _) in enumerate(added):
    if last is not None and i == before:
        out.alpha_composite(last, (x + gap, 0))
        x += last.width + gap
    piece = extra.crop((a, max(-down, 0), b, extra.height))
    out.alpha_composite(piece, (x + gap, max(down, 0)))
    x += b - a + gap
out.save(sys.argv[3])
print(f'{sys.argv[3]}: {len(added)} added at {scale:.3f}x, floor moved {down} px')
