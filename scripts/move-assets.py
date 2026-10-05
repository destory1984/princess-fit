# Puts a movement demonstration (the same girl drawn three times across one picture) into the app.
#
#   python -X utf8 scripts/move-assets.py <drawing.png> <move id> <advisor id> [frames=3]
#
# Writes assets/moves/<move id>_<advisor id>.png: the frames side by side in equal square
# cells, which components/MoveDemo.tsx shows one at a time. The drawing comes with the
# figures wherever the model put them, so each is found by the empty columns between
# them and cut to its own left and right edges. Across, each frame is set where it
# coincides most with the one before, so what stays still stays still. Vertically nothing
# is moved: all the frames share the rows of the whole drawing, so a floor that was one
# line in the drawing is one line in the strip, and she does not hop between frames.
import sys
from pathlib import Path

import numpy as np
from PIL import Image

CELL = 256

if len(sys.argv) < 4:
    sys.exit('usage: move-assets.py <drawing.png> <move id> <advisor id> [frames=3]')
src, move, girl = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
frames = int(sys.argv[4]) if len(sys.argv) > 4 else 3

pixels = np.array(Image.open(src).convert('RGBA'))
solid = pixels[..., 3] >= 128
if solid[0, 0] and solid[-1, -1]:
    sys.exit(f'{src}: the background is not transparent')
pixels[..., 3] = np.where(solid, 255, 0)
pixels[~solid, :3] = 0

# Runs of columns with something in them. Specks and thin strays are not figures; and
# when a figure comes in two pieces (a bar held away from her), the nearest are joined
# until there are as many as were asked for.
cols = solid.sum(axis=0) > 0
edges = np.flatnonzero(np.diff(np.r_[0, cols.astype(int), 0]))
runs = [(int(a), int(b)) for a, b in zip(edges[::2], edges[1::2]) if b - a > 12]
while len(runs) > frames:
    gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
    i = int(np.argmin(gaps))
    runs[i:i + 2] = [(runs[i][0], runs[i + 1][1])]
masks = None
if len(runs) != frames:
    # Figures lying down reach into each other's columns (her feet in a push-up end
    # under the next figure's hands) and leave no empty column, so they are told apart
    # as connected pieces instead: the largest ones are the figures, and every smaller
    # piece (a dumbbell held away from her) goes to the figure it is nearest.
    small = solid[::4, ::4]
    label = np.zeros(small.shape, dtype=int)
    pieces = []
    for y0, x0 in zip(*np.nonzero(small)):
        if label[y0, x0]:
            continue
        n = len(pieces) + 1
        stack, cells = [(y0, x0)], []
        label[y0, x0] = n
        while stack:
            y, x = stack.pop()
            cells.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    v, u = y + dy, x + dx
                    if 0 <= v < small.shape[0] and 0 <= u < small.shape[1] and small[v, u] and not label[v, u]:
                        label[v, u] = n
                        stack.append((v, u))
        pieces.append(np.array(cells))
    if len(pieces) < frames:
        # They touch — a ponytail against the next machine's plate. Then the cut goes
        # down the column where the least is drawn, near each equal division. A sliver
        # of the neighbour comes along; look at what comes out.
        filled = solid.sum(axis=0)
        left, right = np.flatnonzero(cols)[[0, -1]]
        step = (right - left) / frames
        cuts = [int(left)]
        for i in range(1, frames):
            near, reach = int(left + step * i), int(step * 0.2)
            cuts.append(near - reach + int(np.argmin(filled[near - reach:near + reach])))
        cuts.append(int(right) + 1)
        runs = list(zip(cuts, cuts[1:]))
        print(f'{src.name}: the figures touch; cut down the thinnest columns at {cuts[1:-1]}')
    else:
        order = sorted(range(len(pieces)), key=lambda i: -len(pieces[i]))
        figures = sorted(order[:frames], key=lambda i: pieces[i][:, 1].mean())
        centre = [pieces[i][:, 1].mean() for i in figures]
        owner = {i: k for k, i in enumerate(figures)}
        for i in order[frames:]:
            owner[i] = int(np.argmin([abs(pieces[i][:, 1].mean() - c) for c in centre]))
        which = np.zeros(small.shape, dtype=int)
        for i, k in owner.items():
            which[pieces[i][:, 0], pieces[i][:, 1]] = k + 1
        big = np.kron(which, np.ones((4, 4), dtype=int))[:solid.shape[0], :solid.shape[1]]
        full = np.zeros(solid.shape, dtype=int)
        full[:big.shape[0], :big.shape[1]] = big
        masks = [solid & (full == k + 1) for k in range(frames)]
        runs = []
        for m in masks:
            xs = np.flatnonzero(m.any(axis=0))
            runs.append((int(xs.min()), int(xs.max()) + 1))
        print(f'{src.name}: no empty columns between the figures; told apart as pieces')

rows = np.flatnonzero(solid.any(axis=1))
top, bottom = int(rows.min()), int(rows.max()) + 1

cuts = []
for i, (a, b) in enumerate(runs):
    only = pixels
    if masks is not None:
        only = pixels.copy()
        only[~masks[i]] = 0
    cuts.append(only[top:bottom, a:b])


def best_shift(prev, cur):
    """Where `cur` sits over `prev` (its left edge, in prev's columns) for the most to coincide.

    What coincides is what did not move: the bench, the machine, the trunk of someone lying
    still. Counted on pixels of nearly the same colour, a quarter size, so a leg swinging
    across the bench does not pull the answer.
    """
    p, c = prev[::4, ::4].astype(int), cur[::4, ::4].astype(int)
    best, at = -1, 0
    floor = int(p.shape[0] * 0.7)
    for dx in range(-c.shape[1] + 1, p.shape[1]):
        lo, hi = max(dx, 0), min(dx + c.shape[1], p.shape[1])
        if hi - lo < 8:
            continue
        pa, ca = p[:, lo:hi], c[:, lo - dx:hi - dx]
        same = (pa[..., 3] > 0) & (ca[..., 3] > 0) & (np.abs(pa[..., :3] - ca[..., :3]).sum(axis=2) < 48)
        # What touches the floor counts three times over: feet, hips and the legs of a
        # bench are what a repetition leaves in place. Without it a sit-up lined up on
        # her hair, which is most of her, and her feet slid along the floor.
        score = int(same.sum()) + 2 * int(same[floor:].sum())
        if score > best:
            best, at = score, dx
    smaller = min(int((p[..., 3] > 0).sum()), int((c[..., 3] > 0).sum()))
    return at * 4, best / max(smaller, 1)


# Each frame is placed against the one before it, not centred on its own width. Centred,
# a girl lying on a leg-curl bench slid sideways as her feet came up, and the bench with
# her: her width changed, so her middle did. Frames that share too little to line up
# (standing, then flat on the floor) fall back to sharing a centre.
offsets = [0]
for prev, cur in zip(cuts, cuts[1:]):
    dx, share = best_shift(prev, cur)
    if share < 0.25:
        dx = (prev.shape[1] - cur.shape[1]) // 2
    offsets.append(offsets[-1] + dx)
left = min(offsets)
offsets = [o - left for o in offsets]
width = max(o + c.shape[1] for o, c in zip(offsets, cuts))

side = max(bottom - top, width)
scale = CELL / side
strip = Image.new('RGBA', (CELL * frames, CELL))
pad = (CELL - round(width * scale)) // 2
for i, (cut, off) in enumerate(zip(cuts, offsets)):
    cut = Image.fromarray(cut, 'RGBA')
    size = (max(1, round(cut.width * scale)), max(1, round(cut.height * scale)))
    # Premultiplied through the resize, or the transparent black bleeds into the rim.
    cut = cut.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')
    # Set on the cell's floor: what is left over goes above her head.
    strip.alpha_composite(cut, (i * CELL + pad + round(off * scale), CELL - size[1]))

out = Path(__file__).parent.parent / 'assets' / 'moves'
out.mkdir(parents=True, exist_ok=True)
# Dot art has few colours, and ninety strips at full colour are thirteen megabytes.
strip.quantize(96, method=Image.Quantize.FASTOCTREE).save(out / f'{move}_{girl}.png', optimize=True)
widths = ', '.join(str(b - a) for a, b in runs)
print(f'{out / move}_{girl}.png: {frames} frames, figures {widths} px wide, {bottom - top} px tall')
