# Turns a drawing ordered from ChatGPT into a sprite the app can use.
#
#   python -X utf8 scripts/sprite-clean.py <drawing.png> [more.png ...] [--like base.png | --height N] [--colours 16]
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
# Without --height the figure keeps the drawing's own dots, however many that makes: the
# bare body comes back 88 tall (one dot is 15 or 16 px, measured by native_dot below) and
# was settled at that so nothing is shrunk; the same body with hair on stands a few dots
# taller and must not be squeezed back to 88. A figure drawn over the body base is cut
# with --like <the base drawing>: it takes the base's dot, not its own. Hair is full of
# fine strokes that pull the measure down (14.1 px for a pony tail on a 15.2 px body), and
# a dot a pixel too small makes the same body seven dots taller than the clothes cut for
# it. Asked for fewer dots, say 64, the drawing's dots are
# smaller than the dots asked for: an outline one dot thick is three quarters of a new dot, and
# where it falls across two of them it is the commonest colour in neither. The first
# version voted it away there and the limbs came out with gaps. Now a dark line takes any
# dot it covers half its own thickness of, which it always does in at least one of the two.
#
# Adapted from Space Oddity's build/sprite-clean.py, which did the first and third for
# sheets already at their final size.
import argparse
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image


# Anything darker than this is outline. The outlines ordered are near-black navy (about
# 25); the darkest thing that is not outline, the shadow in an eye, is about 90.
OUTLINE_BELOW = 60


def native_dot(pixels: np.ndarray, solid: np.ndarray) -> float:
    """How many real pixels one of the drawing's own dots is, from where its edges fall."""
    flat = np.where(solid[..., None], pixels[..., :3].astype(int), -255)
    gaps: list[int] = []
    for axis in (0, 1):
        step = np.abs(np.diff(flat, axis=axis)).sum(axis=2) > 60
        strength = step.sum(axis=1 - axis)
        floor = strength.max() * 0.08
        edges = [i for i in range(3, len(strength) - 3)
                 if strength[i] > floor and strength[i] == strength[i - 3:i + 4].max()]
        gaps += np.diff(edges).tolist()
    # Edges inside a dot (soft shading) give short gaps, flat stretches give long ones.
    # The dot is the commonest gap; its neighbours are averaged in because the blocks
    # are not all the same size.
    common = Counter(g for g in gaps if g >= 4).most_common(1)
    if not common:
        return 0.0
    near = [g for g in gaps if abs(g - common[0][0]) <= 2]
    return float(np.mean(near))


def measure(path: Path) -> float:
    pixels = np.array(Image.open(path).convert('RGBA'))
    return native_dot(pixels, pixels[..., 3] >= 128)


def clean(path: Path, height: int | None, colours: int, dot: float = 0.0) -> None:
    pixels = np.array(Image.open(path).convert('RGBA'))
    solid = pixels[..., 3] >= 128
    if not solid.any():
        print(f'{path}: nothing solid in it')
        return

    ys, xs = np.nonzero(solid)
    top, bottom, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    native = dot or native_dot(pixels, solid)
    if height is None:
        if not native:
            print(f'{path}: could not find its dots; say --height')
            return
        height = round((bottom - top) / native)
    cell = (bottom - top) / height
    width = max(1, round((right - left) / cell))

    # A line `native` px thick lying across two dots covers at least native / 2 of one of
    # them. Asking a shade less than that share is what guarantees it one dot, and almost
    # never gives it both. When the dots asked for are no bigger than the drawing's own,
    # the line fills its dot and the ordinary vote already keeps it.
    line_share = min(0.5, native / cell / 2 * 0.97) if native else 0.5
    luma = pixels[..., :3].astype(int) @ np.array([299, 587, 114]) // 1000
    outline = solid & (luma < OUTLINE_BELOW)

    dots = np.zeros((height, width, 3), dtype=np.uint8)
    there = np.zeros((height, width), dtype=bool)
    for y in range(height):
        y0, y1 = int(top + y * cell), max(int(top + (y + 1) * cell), int(top + y * cell) + 1)
        for x in range(width):
            x0, x1 = int(left + x * cell), max(int(left + (x + 1) * cell), int(left + x * cell) + 1)
            block = pixels[y0:y1, x0:x1]
            mask = solid[y0:y1, x0:x1]
            dark = outline[y0:y1, x0:x1]
            # The outline first, counted against the whole block: at the figure's edge
            # the rest of the block is empty, and the line must not go with it.
            if dark.mean() >= line_share:
                mask = dark
            # Otherwise a dot exists when most of its block does. Half is the honest
            # line: less thins the figure away, more fattens it by a dot all round.
            elif mask.mean() < 0.5:
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
    print(f'{target}: {width} x {height} dots, {used} colours, one dot is {cell:.1f} px; '
          f"{'the base' if dot else 'the drawing'}'s own dot is {native:.1f} px, "
          f'which makes it {(bottom - top) / native:.0f} tall'
          if native else f'{target}: {width} x {height} dots, {used} colours, one dot is {cell:.1f} px')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('drawings', nargs='+', type=Path)
    parser.add_argument('--height', type=int)
    parser.add_argument('--colours', type=int, default=16)
    parser.add_argument('--like', type=Path, help='the drawing whose dot size to use')
    args = parser.parse_args()
    dot = measure(args.like) if args.like else 0.0
    for drawing in args.drawings:
        clean(drawing, args.height, args.colours, dot)
