# Gives a girl already drawn the legs of a new body base, keeping the rest of her.
#
#   python -X utf8 scripts/girl-legs.py <new base.png> <girl.png> <out.png> [her legs.png]
#
# When the base's legs were redrawn slimmer (2026-10-03) the girls had been drawn over
# the old base. Ordering them again would have changed their faces, which were liked;
# the new base matched the old to a pixel or two above the legs. So below the hem of her
# shorts she is the new base, and above it she is herself. The cut runs just under the
# hem's outline, which is as wide as the old thigh, so the slimmer leg starts under a
# dark line rather than at a step. Both are full-size drawings, lined up by their hands.
#
# Once the girls wore socks and shoes of their own (the drafts of 2026-10-03) bare base
# legs would no longer do. [her legs.png] is the girl ordered again on the new legs: the
# base still says where the hem is, and what goes under it comes from that drawing.
import sys
from pathlib import Path

import numpy as np
from PIL import Image

base_path, girl_path, out_path = (Path(p) for p in sys.argv[1:4])
base = np.array(Image.open(base_path).convert('RGBA'))
girl = np.array(Image.open(girl_path).convert('RGBA'))
legs = np.array(Image.open(sys.argv[4]).convert('RGBA')) if len(sys.argv) > 4 else None
height = min(p.shape[0] for p in (base, girl, legs) if p is not None)
width = min(p.shape[1] for p in (base, girl, legs) if p is not None)
base, girl = base[:height, :width], girl[:height, :width]
legs = legs[:height, :width] if legs is not None else None


def solid(p):
    return p[..., 3] >= 128


def luma(p):
    return p[..., :3].astype(int) @ np.array([299, 587, 114]) // 1000


def hands(p):
    """Left and right ends of the widest row in the middle third: the fingertips."""
    s = solid(p)
    rows = range(height * 55 // 100, height * 75 // 100)
    spans = [(np.nonzero(s[y])[0][[0, -1]], y) for y in rows if s[y].any()]
    (left, right), _ = max(spans, key=lambda t: t[0][1] - t[0][0])
    return int(left), int(right)


def feet(p):
    return int(np.nonzero(solid(p).any(axis=1))[0].max())


def onto_her(p):
    """The drawing shifted so its hands and feet fall on hers."""
    pl, pr = hands(p)
    gl, gr = hands(girl)
    dx = round(((gl + gr) - (pl + pr)) / 2)
    dy = feet(girl) - feet(p)
    out = np.zeros_like(p)
    ys, xs = np.nonzero(solid(p))
    keep = (ys + dy >= 0) & (ys + dy < height) & (xs + dx >= 0) & (xs + dx < width)
    out[ys[keep] + dy, xs[keep] + dx] = p[ys[keep], xs[keep]]
    return out, dx, dy


# A girl in shoes stands two dots lower than the bare base and her hair may reach past
# her hands, so neither says where the base is. Every drawing is ordered onto the same
# place on the same canvas; with her own legs to hand, the base is left where it is.
moved, dx, dy = (base, 0, 0) if legs is not None else onto_her(base)

# The hem is where the base's grey shorts end; hers end on the same row, having been
# drawn over the same body. Then down through the dark outline under it.
rgb = moved[..., :3].astype(int)
grey = solid(moved) & (rgb.max(-1) - rgb.min(-1) < 28) & (luma(moved) > 110) & (luma(moved) < 235)
grey[:height // 2] = False  # the whites of her eyes are grey too
# The last row of the shorts, not of anything grey: a base's toes can shade to grey too.
rows = np.nonzero(grey.sum(axis=1) > 20)[0]
hem = int(rows[np.r_[np.diff(rows) > 10, True]][0])
row = hem + 1
while row < height and (solid(girl)[row] & (luma(girl)[row] < 60)).sum() > (solid(girl)[row]).sum() * 0.5:
    row += 1

below = onto_her(legs)[0] if legs is not None else moved
out = girl.copy()
out[row:] = below[row:]
Image.fromarray(out, 'RGBA').save(out_path)
print(f'{out_path}: base moved {dx},{dy}; hem at row {hem}, cut at {row}')
