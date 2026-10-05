# Takes a garment off the body base it was drawn on and puts it into the app.
#
#   python -X utf8 scripts/garment-assets.py <base.sprite.png> <worn.sprite.png> <garment id> [smallest share]
#
# <worn> is the body base wearing one new thing, ordered with the base as reference and
# cut by scripts/sprite-clean.py --like the base. Writes assets/garments/<id>.png on the
# girls' canvas (see scripts/girl-assets.py), <id>_shelf.png (the piece alone, for the
# shop), and next to <worn> a <worn>.tried.png
# with the garment on each of the three girls, which is the picture to look at.
#
# The garment is what the drawing has that the base has not: dots outside the base's
# outline, and dots of another colour than the base's there. The body under it was
# redrawn too and is never quite the base dot for dot, so three things are not garment:
# a shade of her skin or of her grey underclothes (the orders forbid both colours in a
# garment for this reason), her eyes, an outline dot where the base also has outline, and a patch
# too small to be anything but a redrawn dot. See docs/art-order.md.
import importlib.util
import sys
from collections import Counter
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
SMALLEST = 8  # dots; a patch smaller than this is a redrawn dot, not a garment
GIRLS = ('geumhwa', 'seora', 'dohwa')

if len(sys.argv) not in (4, 5):
    sys.exit('usage: garment-assets.py <base.sprite.png> <worn.sprite.png> <garment id> [smallest share]')
base_path, worn_path, name = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
# How small a separate patch may be, as a share of the largest, and still be kept. A
# quarter suits one garment; a whole outfit has shoes and wristbands a long way from the
# shirt and far smaller than it, and is cut with something like 0.01.
SHARE = float(sys.argv[4]) if len(sys.argv) == 5 else 0.25

base_small = np.array(Image.open(base_path).convert('RGBA'))
worn_small = np.array(Image.open(worn_path).convert('RGBA'))


def on_canvas(sprite: np.ndarray, left: int, top: int) -> np.ndarray:
    sheet = Image.new('RGBA', CANVAS)
    sheet.paste(Image.fromarray(sprite, 'RGBA'), (left, top))
    return np.array(sheet)


# The worn drawing may be wider or taller than the base (a ribbon, a skirt, a bouquet),
# or the same size, so each is padded before the base is found in it.
pad = 16
roomy = np.zeros((worn_small.shape[0] + pad * 2, worn_small.shape[1] + pad * 2, 4), dtype=np.uint8)
roomy[pad:-pad, pad:-pad] = worn_small
dy, dx = layers.place(base_small[..., 3] > 0, roomy[..., 3] > 0)
left, top = BASE_AT[0] - (dx - pad), BASE_AT[1] - (dy - pad)


def fits(left: int, top: int) -> bool:
    return left >= 0 and top >= 0 and left + worn_small.shape[1] <= CANVAS[0] and top + worn_small.shape[0] <= CANVAS[1]


if not fits(left, top):
    # A skirt to the ankles leaves no legs to find the base by, and the best match lands
    # somewhere absurd. The base is bald and so is she here, so her head will do instead.
    b_head, g_head = base_small[..., 3] > 0, roomy[..., 3] > 0
    third = b_head.shape[0] // 3
    best = -1
    for y in range(g_head.shape[0] - b_head.shape[0] + 1):
        for x in range(g_head.shape[1] - b_head.shape[1] + 1):
            same = (g_head[y:y + third, x:x + b_head.shape[1]] == b_head[:third]).sum()
            if same > best:
                best, dy, dx = same, y, x
    left, top = BASE_AT[0] - (dx - pad), BASE_AT[1] - (dy - pad)
if not fits(left, top):
    sys.exit(f'{worn_path}: does not fit the canvas with the base at {BASE_AT} (it would sit at {left},{top})')

base = on_canvas(base_small, *BASE_AT)
worn = on_canvas(worn_small, left, top)
g, b = worn[..., :3].astype(int), base[..., :3].astype(int)
g_there, b_there = worn[..., 3] > 0, base[..., 3] > 0
luma = layers.luma
g_dark = g_there & (luma(worn[..., :3]) < layers.OUTLINE_BELOW)
b_dark = b_there & (luma(base[..., :3]) < layers.OUTLINE_BELOW)

# How well the redrawn body sits on the base: the share of the base's outline it kept.
kept = (b_dark & g_dark).sum() / max(1, b_dark.sum())

# Her skin, a little widened: outside the base's outline a dot of it is an arm redrawn
# one dot wider, not a garment. (Only skin. The first version turned away anything near
# any of the body's colours, and a white blouse is near the white of her eyes.)
b_grey = b_there & layers.is_grey(base[..., :3])
b_skin = b_there & ~b_dark & ~b_grey
median_skin = np.median(b[b_skin], axis=0)
# Not everything bare on the base is skin: the whites and blues of her eyes are in
# there too, and with them in the set a white blouse was thrown out as "her own skin".
skin = np.array([c for c, n in Counter(map(tuple, b[b_skin].tolist())).items()
                 if n >= 3 and np.abs(np.array(c) - median_skin).sum() <= 60])
like_skin = np.abs(g[:, :, None, :] - skin[None, None, :, :]).sum(axis=-1).min(axis=-1) < 30

# Her eyes are redrawn a different blue every time and are never a garment.
rows = np.arange(CANVAS[1])[:, None]
counts = b_grey.sum(axis=1)
neck = next(y for y in range(CANVAS[1]) if counts[y:y + 3].min() >= 4)
eyes = b_there & ~b_dark & (rows < neck) & (np.abs(b - median_skin).sum(axis=-1) > 120)
wide = np.pad(eyes, 2)
eyes = sum(wide[oy:oy + CANVAS[1], ox:ox + CANVAS[0]] for oy in range(5) for ox in range(5)) > 0

# Inside the outline, a dot is new when it is far from what the base has there. 30 is
# as low as it can go: pale pink on skin is 40 apart, and two drawings of the same skin
# are under 20.
far = np.abs(g - b).sum(axis=-1) > 30
# And grey where the base is grey, or skin where it is skin, is the body redrawn a
# shade off, however far off: the orders keep both colours out of garments for this.
same_stuff = (b_grey & layers.is_grey(worn[..., :3])) | (b_skin & like_skin)
new = g_there & ~g_dark & ~eyes & ~same_stuff & ((b_there & far) | (~b_there & ~like_skin))
# Its outline: dark dots the base has none at, right beside the garment's own colours.
grown = layers.connected(new | (g_dark & ~b_dark), new)
garment = grown

# One garment is one piece, give or take. Keep the largest patch and any other at
# least a quarter its size; the rest is the body redrawn — a neckline's stroke that came
# out bluer, a shin's highlight — and so is a patch that is mostly her own skin.
patches = []
seen = np.zeros_like(garment)
for y, x in zip(*np.nonzero(garment)):
    if seen[y, x]:
        continue
    seed = np.zeros_like(garment)
    seed[y, x] = True
    patch = layers.connected(garment, seed)
    seen |= patch
    coloured = patch & new
    if (coloured & like_skin).sum() < coloured.sum() * 0.6:
        patches.append((int(coloured.sum()), patch))
garment = np.zeros_like(garment)
largest = max((size for size, _ in patches), default=0)
for size, patch in patches:
    if size >= max(SMALLEST, largest * SHARE):
        garment |= patch

# A long skirt is drawn over her legs, and where a fold's dark line falls on the outline
# the base has there it was taken for the base's own. What the garment shuts in on every
# side is the garment: close the slits (a dot with garment on both sides of it), then
# take whatever of the drawing can no longer be walked to from outside.
for _ in range(2):
    wide = np.pad(garment, 1)
    garment |= g_there & ((wide[1:-1, :-2] & wide[1:-1, 2:]) | (wide[:-2, 1:-1] & wide[2:, 1:-1]))
open_ = np.pad(~garment, 1, constant_values=True)
rim = np.zeros_like(open_)
rim[0], rim[-1], rim[:, 0], rim[:, -1] = True, True, True, True
garment |= g_there & ~layers.connected(open_, rim)[1:-1, 1:-1]

# The piece itself comes from the drawing, not the sprite (scripts/hires.py): the dots
# above only say which of its pixels are the garment.
GARMENT, REST = 1, 2
labels = np.where(garment, GARMENT, np.where(g_there, REST, 0))
labels = hires.spread(labels)
drawn = hires.on_canvas(hires.drawing_of(worn_path), (worn_small.shape[1], worn_small.shape[0]), (left, top))
piece = hires.cut(drawn, labels, GARMENT)

target = HERE.parent / 'assets' / 'garments'
target.mkdir(parents=True, exist_ok=True)
piece.save(target / f'{name}.png', optimize=True)

# The same piece alone for the shop's shelf: cut to its own box, centred on a square one
# dot larger all round, so a ribbon and a gown each fill their frame.
box = piece.getbbox()
if box:
    alone = piece.crop(box)
    side = max(alone.size) + 2 * hires.PER_DOT
    shelf = Image.new('RGBA', (side, side))
    shelf.paste(alone, ((side - alone.width) // 2, (side - alone.height) // 2))
    shelf.save(target / f'{name}_shelf.png', optimize=True)

# To look at: the drawing as it came, the piece alone, then on each girl. Above the hair
# for what is worn on the head or held, under it for everything else — as the app stacks.
over_hair = name in ('ribbon', 'bouquet', 'tiara')
gap = 16
shown = [drawn, piece]
for girl in GIRLS:
    part = lambda p: Image.open(HERE.parent / 'assets' / 'girls' / f'{girl}_{p}.png').convert('RGBA')  # noqa: E731
    doll = Image.new('RGBA', drawn.size)
    for layer in (part('body'), part('bottom'), part('feet'), part('top'), *((part('hair'), piece) if over_hair else (piece, part('hair')))):
        doll.alpha_composite(layer)
    shown.append(doll)
w, h = drawn.size[0] // 2, drawn.size[1] // 2
sheet = Image.new('RGBA', ((w + gap) * len(shown) + gap, h + gap * 2), (96, 104, 112, 255))
for i, picture in enumerate(shown):
    sheet.alpha_composite(picture.resize((w, h), Image.LANCZOS), (gap + i * (w + gap), gap))
sheet.save(worn_path.with_suffix('.tried.png'))

ys, xs = np.nonzero(garment)
box = f'{xs.min()},{ys.min()} to {xs.max()},{ys.max()}' if garment.any() else 'nothing'
print(f'{target / name}.png: {int(garment.sum())} dots at {box}; the body kept {kept:.0%} of the base\'s outline')
