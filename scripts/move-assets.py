# Puts a movement demonstration (the same girl drawn three times across one picture) into the app.
#
#   python -X utf8 scripts/move-assets.py <drawing.png> <move id> <advisor id> [frames=3]
#
# Writes assets/moves/<move id>_<advisor id>.png: the frames side by side in equal square
# cells, which components/MoveDemo.tsx shows one at a time. The drawing comes with the
# figures wherever the model put them, so each is found by the empty columns between
# them, cut to its own left and right edges and centred in its cell. Vertically nothing
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
if len(runs) != frames:
    sys.exit(f'{src}: found {len(runs)} figures, wanted {frames} (they may touch)')

rows = np.flatnonzero(solid.any(axis=1))
top, bottom = int(rows.min()), int(rows.max()) + 1
side = max(bottom - top, max(b - a for a, b in runs))
scale = CELL / side
strip = Image.new('RGBA', (CELL * frames, CELL))
whole = Image.fromarray(pixels, 'RGBA')
for i, (a, b) in enumerate(runs):
    cut = whole.crop((a, top, b, bottom))
    size = (max(1, round(cut.width * scale)), max(1, round(cut.height * scale)))
    # Premultiplied through the resize, or the transparent black bleeds into the rim.
    cut = cut.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')
    # Set on the cell's floor: what is left over goes above her head.
    strip.alpha_composite(cut, (i * CELL + (CELL - size[0]) // 2, CELL - size[1]))

out = Path(__file__).parent.parent / 'assets' / 'moves'
out.mkdir(parents=True, exist_ok=True)
# Dot art has few colours, and ninety strips at full colour are thirteen megabytes.
strip.quantize(96, method=Image.Quantize.FASTOCTREE).save(out / f'{move}_{girl}.png', optimize=True)
widths = ', '.join(str(b - a) for a, b in runs)
print(f'{out / move}_{girl}.png: {frames} frames, figures {widths} px wide, {bottom - top} px tall')
