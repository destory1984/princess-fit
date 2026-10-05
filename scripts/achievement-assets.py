# Puts the seventeen achievement badges into the app.
#
#   python -X utf8 scripts/achievement-assets.py <dir with <id>/<id>.png> [size=168]
#
# Each medal is cut to its own edges and set on a square, the way scripts/shelf-assets.py
# does and scripts/rank-assets.py does not: the seventeen are one shape (a ribbon over a
# round medal), so cropped alone they come out the same size. Rows and columns holding
# only a stray dot are not the medal's edge — two drawings came with a speck at the rim.
import sys
from pathlib import Path

import numpy as np
from PIL import Image

IDS = ['first', 'ten', 'fifty', 'hundred', 'streak3', 'streak7', 'streak30', 'heavy', 'ton10', 'ton100',
       'balance', 'marathon', 'tenhours', 'dawn', 'night', 'weeks4', 'weeks12']

if len(sys.argv) < 2:
    sys.exit('usage: achievement-assets.py <dir> [size=168]')
src = Path(sys.argv[1])
size = int(sys.argv[2]) if len(sys.argv) > 2 else 168
out = Path('assets/achievements')
out.mkdir(parents=True, exist_ok=True)

for name in IDS:
    # The draft the kind was chosen from is the 3-day badge as it stands.
    path = src / 'draft1' / 'draft1.png' if name == 'streak3' else src / name / f'{name}.png'
    pixels = np.array(Image.open(path).convert('RGBA'))
    solid = pixels[..., 3] >= 128
    if solid[0, 0] and solid[0, -1] and solid[-1, 0] and solid[-1, -1]:
        sys.exit(f'{name}: the background is not transparent')
    pixels[..., 3] = np.where(solid, 255, 0)
    pixels[~solid, :3] = 0
    xs = np.flatnonzero(solid.sum(axis=0) > 12)
    ys = np.flatnonzero(solid.sum(axis=1) > 12)
    cut = Image.fromarray(pixels, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    side = max(cut.size)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    square.paste(cut, ((side - cut.width) // 2, (side - cut.height) // 2))
    # Premultiplied through the resize, or the transparent black bleeds into the rim.
    square.convert('RGBa').resize((size, size), Image.LANCZOS).convert('RGBA').save(out / f'{name}.png', optimize=True)
    print(f'{out / name}.png  from {cut.size}')
