# Puts a girl's layers (from scripts/sprite-layers.py) into the app.
#
#   python -X utf8 scripts/girl-assets.py <base.sprite.png> <girl.sprite.png> <advisor id>
#
# Writes assets/girls/<id>_{whole,body,clothes,hair}.png. All girls share one canvas,
# 64 x 96 dots with the body base's top-left at 12,8, so that a garment drawn once on
# that canvas sits right on every one of them, and the margin holds Pia's pony tail and
# leaves room above the head for a hat. See docs/art-order.md.
#
# The files are the dots blown up 8 times with hard edges. React Native has no way to
# ask for nearest-neighbour scaling of an image, so a 64-dot-wide file would be smeared
# when drawn 200 px wide; a file already larger than it is drawn only ever shrinks.
import importlib.util
import sys
from pathlib import Path

import numpy as np
from PIL import Image

CANVAS = (64, 96)
BASE_AT = (12, 8)
SCALE = 8

spec = importlib.util.spec_from_file_location('layers', Path(__file__).with_name('sprite-layers.py'))
layers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(layers)

if len(sys.argv) != 4:
    sys.exit('usage: girl-assets.py <base.sprite.png> <girl.sprite.png> <advisor id>')
base_path, girl_path, name = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]

base = np.array(Image.open(base_path).convert('RGBA'))
girl = np.array(Image.open(girl_path).convert('RGBA'))
dy, dx = layers.place(base[..., 3] > 0, girl[..., 3] > 0)
left, top = BASE_AT[0] - dx, BASE_AT[1] - dy
if left < 0 or top < 0 or left + girl.shape[1] > CANVAS[0] or top + girl.shape[0] > CANVAS[1]:
    sys.exit(f'{girl_path}: does not fit the {CANVAS[0]} x {CANVAS[1]} canvas with the base at {BASE_AT}')

out = Path(__file__).parent.parent / 'assets' / 'girls'
out.mkdir(parents=True, exist_ok=True)
stem = girl_path.with_suffix('')
for part in ('whole', 'body', 'clothes', 'hair'):
    source = girl_path if part == 'whole' else Path(f'{stem}.{part}.png')
    sheet = Image.new('RGBA', CANVAS)
    sheet.paste(Image.open(source).convert('RGBA'), (left, top))
    sheet.resize((CANVAS[0] * SCALE, CANVAS[1] * SCALE), Image.NEAREST).save(out / f'{name}_{part}.png', optimize=True)
print(f'{out / name}_*.png: girl at {left},{top} on {CANVAS[0]} x {CANVAS[1]}, x{SCALE}')
