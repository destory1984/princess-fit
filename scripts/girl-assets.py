# Puts a girl's layers (from scripts/sprite-layers.py) into the app.
#
#   python -X utf8 scripts/girl-assets.py <base.sprite.png> <girl.sprite.png> <advisor id>
#
# Writes assets/girls/<id>_{whole,body,bottom,feet,top,hair}.png. All girls share one canvas,
# 64 x 96 dots with the body base's top-left at 12,6, so that a garment drawn once on
# that canvas sits right on every one of them, and the margin holds Pia's pony tail and
# leaves room above the head for a hat. See docs/art-order.md.
#
# What is written is the drawing as it came, not the dot sprite: the sprite's layers
# only say which dots are hair, which clothes and which body (see scripts/hires.py for
# why). Under her hair and clothes the body is the base's drawing.
import importlib.util
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent


def load(name: str):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), HERE / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


layers, hires = load('sprite-layers'), load('hires')
CANVAS, BASE_AT = hires.CANVAS, hires.BASE_AT
BODY, TOP, HAIR, BOTTOM, FEET = 1, 2, 3, 4, 5
WORN = (TOP, BOTTOM, FEET)

if len(sys.argv) != 4:
    sys.exit('usage: girl-assets.py <base.sprite.png> <girl.sprite.png> <advisor id>')
base_path, girl_path, name = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]

base = np.array(Image.open(base_path).convert('RGBA'))
girl = np.array(Image.open(girl_path).convert('RGBA'))
gh, gw = girl.shape[:2]
# The base may be a dot wider than she is; see sprite-layers.py.
dy, dx = layers.place(base[:gh, :gw, 3] > 0, girl[..., 3] > 0)
left, top = BASE_AT[0] - dx, BASE_AT[1] - dy
if left < 0 or top < 0 or left + gw > CANVAS[0] or top + gh > CANVAS[1]:
    sys.exit(f'{girl_path}: does not fit the {CANVAS[0]} x {CANVAS[1]} canvas with the base at {BASE_AT}')

# Which layer each dot of the canvas belongs to, from the sprite's layers.
stem = girl_path.with_suffix('')
alpha = lambda part: np.array(Image.open(f'{stem}.{part}.png').convert('RGBA'))[..., 3] > 0  # noqa: E731
labels = np.zeros((CANVAS[1], CANVAS[0]), dtype=int)
area = labels[top:top + gh, left:left + gw]
area[girl[..., 3] > 0] = BODY
area[alpha('clothes')] = TOP
area[alpha('hair')] = HAIR

# Her clothes in three pieces, so that a blouse given to her can replace her own top
# without taking her shorts and shoes with it. Told apart by where they are on the base:
# the feet are everything below the hem of its shorts by a hand's breadth, the bottom is
# what lies from its waist down between its hips, and the top is the rest — sleeves
# included, which hang lower than the waist but outside the hips.
canvas_base = np.zeros((CANVAS[1], CANVAS[0], 4), dtype=np.uint8)
canvas_base[BASE_AT[1]:BASE_AT[1] + base.shape[0], BASE_AT[0]:BASE_AT[0] + base.shape[1]] = base
grey = (canvas_base[..., 3] > 0) & layers.is_grey(canvas_base[..., :3])
counts = grey.sum(axis=1)
neck = next(y for y in range(CANVAS[1]) if counts[y:y + 3].min() >= 4)
hem = max(y for y in range(CANVAS[1]) if counts[y] >= 4)
waist = round(neck + (hem - neck) * 0.68)
hips = np.nonzero(grey[waist:hem + 1].any(axis=0))[0]
rows, cols = np.arange(CANVAS[1])[:, None], np.arange(CANVAS[0])[None, :]
worn = labels == TOP
labels[worn & (rows >= waist) & (cols >= hips.min() - 1) & (cols <= hips.max() + 1)] = BOTTOM
labels[worn & (rows >= hem + 5)] = FEET
labels = hires.spread(labels)

whole = hires.on_canvas(hires.drawing_of(girl_path), (gw, gh), (left, top))
bare = hires.on_canvas(hires.drawing_of(base_path), (base.shape[1], base.shape[0]), BASE_AT)

# Her body: her own drawing where it shows, the base's where hair or clothes hide it.
body = Image.new('RGBA', whole.size)
for hidden in (*WORN, HAIR):
    body.alpha_composite(hires.cut(bare, labels, hidden))
body.alpha_composite(hires.cut(whole, labels, BODY))

out = HERE.parent / 'assets' / 'girls'
out.mkdir(parents=True, exist_ok=True)
parts = {'whole': whole, 'body': body, 'bottom': hires.cut(whole, labels, BOTTOM), 'feet': hires.cut(whole, labels, FEET),
         'top': hires.cut(whole, labels, TOP), 'hair': hires.cut(whole, labels, HAIR)}
(out / f'{name}_clothes.png').unlink(missing_ok=True)  # one layer before it was three
for part, picture in parts.items():
    picture.save(out / f'{name}_{part}.png', optimize=True)

again = Image.new('RGBA', whole.size)
for part in ('body', 'bottom', 'feet', 'top', 'hair'):
    again.alpha_composite(parts[part])
off = np.abs(np.array(again).astype(int) - np.array(whole).astype(int)).max(axis=-1)
print(f'{out / name}_*.png: girl at {left},{top} on {CANVAS[0]} x {CANVAS[1]} dots, {whole.size[0]} x {whole.size[1]} px; '
      f'put back together, {int((off > 24).sum())} of {int((np.array(whole)[..., 3] > 0).sum())} pixels differ')
