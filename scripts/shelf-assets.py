# Puts a small drawing of one thing (a dish, a lesson, a rival's face, a trophy) into the app.
#
#   python -X utf8 scripts/shelf-assets.py <drawing.png> <out.png> [size=120] [top]
#
# The drawing comes back around 1024 px with a half-transparent rim and its own margins.
# The rim is cut at alpha 128 (as scripts/room-assets.py does), the thing is cropped to
# its own edges and set in the middle of a square. With `top` it is set against the top
# and sides instead, for a bust that should end at the frame's lower edge.
import sys
from pathlib import Path

import numpy as np
from PIL import Image

if len(sys.argv) < 3:
    sys.exit('usage: shelf-assets.py <drawing.png> <out.png> [size=120] [top]')
src, out = Path(sys.argv[1]), Path(sys.argv[2])
size = int(sys.argv[3]) if len(sys.argv) > 3 else 120
top = len(sys.argv) > 4 and sys.argv[4] == 'top'

pixels = np.array(Image.open(src).convert('RGBA'))
solid = pixels[..., 3] >= 128
corners = [solid[0, 0], solid[0, -1], solid[-1, 0], solid[-1, -1]]
if all(corners):
    sys.exit(f'{src}: the background is not transparent')
pixels[..., 3] = np.where(solid, 255, 0)
pixels[~solid, :3] = 0
ys, xs = np.nonzero(solid)
cut = Image.fromarray(pixels, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

side = max(cut.size)
square = Image.new('RGBA', (side, side))
square.paste(cut, ((side - cut.width) // 2, 0 if top else (side - cut.height) // 2))
# Premultiplied through the resize, or the transparent black bleeds into the rim.
square.convert('RGBa').resize((size, size), Image.LANCZOS).convert('RGBA').save(out, optimize=True)
print(f'{out}: {cut.width} x {cut.height} cut from {src.name}, {size} px')
