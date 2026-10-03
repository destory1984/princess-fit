# Gives a girl already drawn the legs of a new body base, keeping the rest of her.
#
#   python -X utf8 scripts/girl-legs.py <new base.png> <girl.png> <out.png>
#
# When the base's legs were redrawn slimmer (2026-10-03) the girls had been drawn over
# the old base. Ordering them again would have changed their faces, which were liked;
# the new base matched the old to a pixel or two above the legs. So below the hem of her
# shorts she is the new base, and above it she is herself. The cut runs just under the
# hem's outline, which is as wide as the old thigh, so the slimmer leg starts under a
# dark line rather than at a step. Both are full-size drawings, lined up by their hands.
import sys
from pathlib import Path

import numpy as np
from PIL import Image

base_path, girl_path, out_path = (Path(p) for p in sys.argv[1:4])
base = np.array(Image.open(base_path).convert('RGBA'))
girl = np.array(Image.open(girl_path).convert('RGBA'))
height = min(base.shape[0], girl.shape[0])
base, girl = base[:height], girl[:height]


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


# Shift the base so its hands and feet fall on hers.
bl, br = hands(base)
gl, gr = hands(girl)
dx = round(((gl + gr) - (bl + br)) / 2)
dy = feet(girl) - feet(base)
moved = np.zeros_like(base)
ys, xs = np.nonzero(solid(base))
keep = (ys + dy >= 0) & (ys + dy < height) & (xs + dx >= 0) & (xs + dx < base.shape[1])
moved[ys[keep] + dy, xs[keep] + dx] = base[ys[keep], xs[keep]]

# The hem is where the base's grey shorts end; hers end on the same row, having been
# drawn over the same body. Then down through the dark outline under it.
rgb = moved[..., :3].astype(int)
grey = solid(moved) & (rgb.max(-1) - rgb.min(-1) < 28) & (luma(moved) > 110) & (luma(moved) < 235)
grey[:height // 2] = False  # the whites of her eyes are grey too
hem = int(np.nonzero(grey.sum(axis=1) > 20)[0].max())
row = hem + 1
while row < height and (solid(girl)[row] & (luma(girl)[row] < 60)).sum() > (solid(girl)[row]).sum() * 0.5:
    row += 1

out = girl.copy()
out[row:] = moved[row:]
Image.fromarray(out, 'RGBA').save(out_path)
print(f'{out_path}: base moved {dx},{dy}; hem at row {hem}, cut at {row}')
