# Turns a drawing ordered from ChatGPT into a sprite the app can use.
#
#   python -X utf8 scripts/sprite-clean.py <drawing.png> [more.png ...] [--height 64] [--colours 16]
#
# Writes <name>.sprite.png (one image pixel per dot) and <name>.sprite@6x.png (to look
# at) next to each drawing. See docs/art-order.md, "받은 뒤".
#
# What comes back looks like pixel art and is not: it is about 1024 x 1536, every "dot"
# is a block of some twenty-odd real pixels with soft edges, the blocks are not all the
# same size, and the figure wears a half-transparent fringe that shows as a glow on a
# dark screen. Three things are put right, in this order:
#
#   1. Transparency is made hard. A pixel is there or it is not. The fringe goes.
#   2. The figure is cut to its own outline and sampled down so that it stands exactly
#      --height dots tall. Each dot takes the commonest colour of its block rather than
#      the average, which is what keeps an outline black instead of brown.
#   3. The colours are cut to --colours. The palette is chosen from the solid dots only.
#
# Adapted from Space Oddity's build/sprite-clean.py, which did the first and third for
# sheets already at their final size.
import argparse
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image


def clean(path: Path, height: int, colours: int) -> None:
    pixels = np.array(Image.open(path).convert('RGBA'))
    solid = pixels[..., 3] >= 128
    if not solid.any():
        print(f'{path}: nothing solid in it')
        return

    ys, xs = np.nonzero(solid)
    top, bottom, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    cell = (bottom - top) / height
    width = max(1, round((right - left) / cell))

    dots = np.zeros((height, width, 3), dtype=np.uint8)
    there = np.zeros((height, width), dtype=bool)
    for y in range(height):
        y0, y1 = int(top + y * cell), max(int(top + (y + 1) * cell), int(top + y * cell) + 1)
        for x in range(width):
            x0, x1 = int(left + x * cell), max(int(left + (x + 1) * cell), int(left + x * cell) + 1)
            block = pixels[y0:y1, x0:x1]
            mask = solid[y0:y1, x0:x1]
            # A dot exists when most of its block does. Half is the honest line: less
            # thins the outline away, more fattens the figure by a dot all round.
            if mask.mean() < 0.5:
                continue
            there[y, x] = True
            # Coarsened before counting, so two near-identical shades are one vote.
            votes = Counter(map(tuple, (block[mask][:, :3] // 8 * 8).tolist()))
            dots[y, x] = votes.most_common(1)[0][0]

    sample = Image.fromarray(dots[there].reshape(-1, 1, 3))
    palette = sample.quantize(colours, method=Image.MEDIANCUT)
    indexed = np.array(Image.fromarray(dots).quantize(palette=palette, dither=Image.NONE))
    rgb = np.array(palette.getpalette()[: colours * 3], dtype=np.uint8).reshape(-1, 3)

    out = np.zeros((height, width, 4), dtype=np.uint8)
    out[..., :3] = rgb[indexed]
    out[..., 3] = np.where(there, 255, 0)

    sprite = Image.fromarray(out, 'RGBA')
    target = path.with_suffix('.sprite.png')
    sprite.save(target, optimize=True)
    sprite.resize((width * 6, height * 6), Image.NEAREST).save(path.with_suffix('.sprite@6x.png'))
    used = len({tuple(c) for c in out[there][:, :3].tolist()})
    print(f'{target}: {width} x {height} dots, {used} colours, one dot was {cell:.1f} px')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('drawings', nargs='+', type=Path)
    parser.add_argument('--height', type=int, default=64)
    parser.add_argument('--colours', type=int, default=16)
    args = parser.parse_args()
    for drawing in args.drawings:
        clean(drawing, args.height, args.colours)
