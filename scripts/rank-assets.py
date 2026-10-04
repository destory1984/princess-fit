# Puts the twelve rank badges into the app.
#
#   python -X utf8 scripts/rank-assets.py <dir with rank1..rank12/rankN.png> [size=168]
#
# Unlike scripts/shelf-assets.py the badges are not each cropped to their own edges:
# the last two carry a crown above the shield, and cropped alone their shields would
# come out smaller than the other ten. All twelve are cut by the one box that holds
# every one of them, so the shields keep the same size and the same place.
import sys
from pathlib import Path

import numpy as np
from PIL import Image

if len(sys.argv) < 2:
    sys.exit('usage: rank-assets.py <dir> [size=168]')
src = Path(sys.argv[1])
size = int(sys.argv[2]) if len(sys.argv) > 2 else 168
out = Path('assets/ranks')
out.mkdir(parents=True, exist_ok=True)

drawn = []
for n in range(1, 13):
    pixels = np.array(Image.open(src / f'rank{n}' / f'rank{n}.png').convert('RGBA'))
    solid = pixels[..., 3] >= 128
    if solid[0, 0] and solid[0, -1] and solid[-1, 0] and solid[-1, -1]:
        sys.exit(f'rank{n}: the background is not transparent')
    pixels[..., 3] = np.where(solid, 255, 0)
    pixels[~solid, :3] = 0
    drawn.append((pixels, solid))

sizes = {p.shape[:2] for p, _ in drawn}
if len(sizes) != 1:
    sys.exit(f'the drawings are not one size: {sizes}')
ys, xs = np.nonzero(np.any([s for _, s in drawn], axis=0))
# One square around all of them, centred on the box they share.
side = max(xs.max() - xs.min(), ys.max() - ys.min()) + 1
cx, cy = (xs.min() + xs.max() + 1) // 2, (ys.min() + ys.max() + 1) // 2
box = (cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)
for n, (pixels, _) in enumerate(drawn, 1):
    cut = Image.fromarray(pixels, 'RGBA').crop(box)
    # Premultiplied through the resize, or the transparent black bleeds into the rim.
    cut.convert('RGBa').resize((size, size), Image.LANCZOS).convert('RGBA').save(out / f'rank{n}.png', optimize=True)
print(f'{out}: 12 badges, {side} px square cut at {box[:2]}, {size} px')
