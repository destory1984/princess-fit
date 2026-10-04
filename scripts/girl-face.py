# Gives a girl already drawn the face of the same girl drawn again with another expression.
#
#   python -X utf8 scripts/girl-face.py <girl.png> <her other face.png> <out.png>
#
# An expression is ordered as the whole girl again, "only the face changed", and comes
# back within a pixel or two of the first drawing. Within is not on: hair strands and
# the ribbon shift a little each time, and a portrait that swapped whole drawings would
# make her hair twitch when her mood changed. So everything is the first drawing except
# the box her face is in, the same way her legs were changed (scripts/girl-legs.py).
#
# The box is where her skin shows in the upper half of the drawing: forehead under the
# fringe to chin, ear to ear. The new drawing is slid a few pixels to where the box's
# surroundings match best before the box is taken from it.
import sys
from pathlib import Path

import numpy as np
from PIL import Image

if len(sys.argv) != 4:
    sys.exit('usage: girl-face.py <girl.png> <her other face.png> <out.png>')
girl_path, face_path, out_path = (Path(p) for p in sys.argv[1:4])
girl = np.array(Image.open(girl_path).convert('RGBA')).astype(int)
face = np.array(Image.open(face_path).convert('RGBA')).astype(int)
# A row or two more or fewer comes back now and then; a different drawing size does not.
if max(abs(a - b) for a, b in zip(girl.shape[:2], face.shape[:2])) > 2:
    sys.exit(f'{face_path}: {face.shape[1]} x {face.shape[0]}, but she is {girl.shape[1]} x {girl.shape[0]}')
height, width = girl.shape[:2]
same = np.zeros_like(girl)
same[:min(height, face.shape[0]), :min(width, face.shape[1])] = face[:height, :width]
face = same

# Skin: light, warm, and not white. Read off her in the upper half only (her knees are skin too).
r, g, b, a = (girl[..., i] for i in range(4))
# Pale enough in blue that the shine on orange hair is not taken for it (Pia's is, at b 120).
skin = (a >= 128) & (r > 235) & (g > 195) & (g < 232) & (b > 160) & (b < 205) & (r - b > 35)
skin[height // 2:] = False
# A row of her face is mostly skin; a row of her hair has a few stray pixels of it at
# most. A quarter of the fullest row tells the two apart, and the padding takes in the
# fringe's edge and her chin's outline.
per_row = skin.sum(axis=1)
rows = np.nonzero(per_row > per_row.max() / 4)[0]
per_col = skin[rows.min():rows.max() + 1].sum(axis=0)
cols = np.nonzero(per_col > per_col.max() / 4)[0]
pad = 30
top, bottom = rows.min() - pad, rows.max() + pad
left, right = cols.min() - pad, cols.max() + pad

# Slide the new drawing to where a frame around the box matches the first drawing best.
frame = 40
window = np.zeros((height, width), dtype=bool)
window[top - frame:bottom + frame, left - frame:right + frame] = True
window[top:bottom, left:right] = False


def shifted(p, dx, dy):
    return np.roll(np.roll(p, dy, axis=0), dx, axis=1)


reach = range(-4, 5)
dx, dy = min(
    ((x, y) for x in reach for y in reach),
    key=lambda d: np.abs(shifted(face, *d)[window] - girl[window]).sum(),
)
out = girl.copy()
out[top:bottom, left:right] = shifted(face, dx, dy)[top:bottom, left:right]
Image.fromarray(out.astype(np.uint8), 'RGBA').save(out_path)
changed = (np.abs(out - girl).sum(axis=-1) > 60).sum()
print(f'{out_path}: face box {left},{top} to {right},{bottom}; slid {dx},{dy}; {changed} pixels differ')
