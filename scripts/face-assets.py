# Puts a girl's other face (from scripts/girl-face.py) into the app.
#
#   python -X utf8 scripts/face-assets.py <girl.png> <girl with the other face.png> <advisor id> <face>
#
# Writes assets/girls/<id>_face_<face>.png on the same canvas as <id>_whole.png, so the
# round portrait (components/Portrait.tsx) can take either. Where she stands on that
# canvas is read off <id>_whole.png: the grafted drawing differs from the first one only
# inside her face, so its outline box is the same and lands in the same place.
# Only her head and shoulders are kept, at half the canvas's size. The portrait shows
# nothing below them and is never wider than 64 points, and fifteen whole girls at full
# size would be five megabytes.
import sys
from pathlib import Path

import numpy as np
from PIL import Image

KEEP = 0.58  # of the canvas height; the portrait's frame ends at 0.53

if len(sys.argv) != 5:
    sys.exit('usage: face-assets.py <girl.png> <girl with the other face.png> <advisor id> <face>')
girl_path, face_path, name, face = sys.argv[1:5]
out_dir = Path(__file__).parent.parent / 'assets' / 'girls'


def box(pixels):
    ys, xs = np.nonzero(pixels[..., 3] >= 128)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


girl = np.array(Image.open(girl_path).convert('RGBA'))
whole = Image.open(out_dir / f'{name}_whole.png').convert('RGBA')
left, top, right, bottom = box(np.array(whole))

pixels = np.array(Image.open(face_path).convert('RGBA'))
solid = pixels[..., 3] >= 128
pixels[..., 3] = np.where(solid, 255, 0)
pixels[~solid, :3] = 0
cut = Image.fromarray(pixels, 'RGBA').crop(box(girl))
# Premultiplied through the resize, or the transparent black bleeds into the rim.
cut = cut.convert('RGBa').resize((right - left, bottom - top), Image.LANCZOS).convert('RGBA')

sheet = Image.new('RGBA', whole.size)
sheet.paste(cut, (left, top))
keep = round(whole.height * KEEP)
sheet.paste((0, 0, 0, 0), (0, keep, whole.width, whole.height))

# Outside her face nothing should have moved: compare with the first drawing above the cut.
a, b = np.array(sheet).astype(int)[:keep], np.array(whole).astype(int)[:keep]
moved = np.abs(a - b).max(axis=-1) > 40
ys, xs = np.nonzero(moved)
out = out_dir / f'{name}_face_{face}.png'
sheet.convert('RGBa').resize((whole.width // 2, whole.height // 2), Image.LANCZOS).convert('RGBA').save(out, optimize=True)
print(f'{out}: {int(moved.sum())} pixels differ from {name}_whole.png, all within {xs.min()},{ys.min()} to {xs.max()},{ys.max()}')
