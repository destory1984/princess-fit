# Takes a girl drawn over the body base apart into the three pictures the app stacks:
# her body (with her face, in the base's plain grey underclothes), her gym clothes, and
# her hair. A garment given as a present goes between the body and the hair.
#
#   python -X utf8 scripts/sprite-layers.py <base.sprite.png> <girl.sprite.png> [more ...]
#
# Both are sprites already cut by scripts/sprite-clean.py (the girl with --like the base).
# Writes <girl>.body.png, <girl>.clothes.png and <girl>.hair.png next to the girl, all on
# her canvas so they stack at 0,0, and <girl>.layers@5x.png to look at.
#
# The girl was ordered standing exactly where the base stands, so what she has that the
# base has not is hair, and what differs where the base wears grey is her clothes. Under
# her hair and her clothes the body is taken from the base: nobody drew that part of her.
#
# The check that matters is printed at the end: the three layers put back together must
# be the sprite that came in, dot for dot. See docs/art-order.md.
import sys
from collections import Counter, deque
from pathlib import Path

import numpy as np
from PIL import Image

OUTLINE_BELOW = 60  # the same line sprite-clean.py draws between outline and not


def luma(rgb: np.ndarray) -> np.ndarray:
    return rgb.astype(int) @ np.array([299, 587, 114]) // 1000


def is_grey(rgb: np.ndarray) -> np.ndarray:
    """The base's underclothes: no colour to speak of, neither outline nor eye white."""
    c = rgb.astype(int)
    spread = c.max(axis=-1) - c.min(axis=-1)
    light = luma(rgb)
    return (spread < 28) & (light > 110) & (light < 235)


def place(base_there: np.ndarray, girl_there: np.ndarray) -> tuple[int, int]:
    """Where the base's top-left dot falls on the girl's canvas, by the legs and hands.

    Hair changes the outline of the top half, so only the bottom half is compared.
    """
    bh, bw = base_there.shape
    gh, gw = girl_there.shape
    half = bh // 2
    best, at = -1, (0, 0)
    for dy in range(gh - bh + 1):
        for dx in range(gw - bw + 1):
            same = (girl_there[dy + half:dy + bh, dx:dx + bw] == base_there[half:]).sum()
            if same > best:
                best, at = same, (dy, dx)
    return at


def connected(mask: np.ndarray, seeds: np.ndarray) -> np.ndarray:
    """The part of mask that can be walked to from seeds, corners included."""
    h, w = mask.shape
    out = np.zeros_like(mask)
    queue = deque(zip(*np.nonzero(seeds & mask)))
    for y, x in queue:
        out[y, x] = True
    while queue:
        y, x = queue.popleft()
        for ny in (y - 1, y, y + 1):
            for nx in (x - 1, x, x + 1):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not out[ny, nx]:
                    out[ny, nx] = True
                    queue.append((ny, nx))
    return out


def layers(base_path: Path, girl_path: Path) -> None:
    base_small = np.array(Image.open(base_path).convert('RGBA'))
    girl = np.array(Image.open(girl_path).convert('RGBA'))
    gh, gw = girl.shape[:2]
    if base_small.shape[0] > gh or base_small.shape[1] > gw:
        print(f'{girl_path}: smaller than the base; was it cut with --like?')
        return

    dy, dx = place(base_small[..., 3] > 0, girl[..., 3] > 0)
    base = np.zeros_like(girl)
    base[dy:dy + base_small.shape[0], dx:dx + base_small.shape[1]] = base_small

    g, b = girl[..., :3], base[..., :3]
    g_there, b_there = girl[..., 3] > 0, base[..., 3] > 0
    g_dark = g_there & (luma(g) < OUTLINE_BELOW)
    key = lambda rgb: tuple(int(v) for v in rgb)  # noqa: E731

    # Where the base wears its underclothes, and the row they start at. Nothing above
    # that row is clothes, which is what keeps Pia's orange hair out of her orange top.
    worn = b_there & is_grey(b)
    worn_rows = np.nonzero(worn.any(axis=1))[0]
    # Eye whites are grey too; the clothes are the big grey mass, which starts lower.
    counts = worn.sum(axis=1)
    top = next(y for y in worn_rows if counts[y:y + 3].min() >= 4)
    worn[:top] = False

    b_dark = b_there & (luma(b) < OUTLINE_BELOW)
    b_skin = b_there & ~b_dark & ~is_grey(b)
    rows = np.arange(gh)[:, None]

    def colours(mask: np.ndarray, share: float) -> set:
        votes = Counter(key(c) for c in g[mask & g_there])
        return {c for c, n in votes.items() if n >= max(2, sum(votes.values()) * share)}

    def has(found: set) -> np.ndarray:
        return np.array([[key(g[y, x]) in found for x in range(gw)] for y in range(gh)]) & g_there

    # Her skin: what she has on the base's bare legs. Taken out of the other two sets,
    # or a shadow on a knee is read as a scrap of cloth.
    skin = colours(b_skin & (rows > top + (gh - top) // 2), 0.02)
    # Her clothes' colours: what she has, undarkened, where the base is grey.
    cloth = colours(worn & ~g_dark, 0.03) - skin

    in_cloth, in_skin = has(cloth), has(skin)
    # What she has that the base has not: a dot outside its outline, or one of another
    # colour than the base's there. Her skin is a shade off the base's and is not news,
    # and an outline dot the base also has is the body's outline.
    far = np.abs(g.astype(int) - b.astype(int)).sum(axis=-1) > 60
    new = g_there & (~b_there | (far & ~in_skin)) & ~(b_dark & g_dark)

    # On the crown, the head above the brow, everything new is hair. Its colours are
    # read there. (Not from what lies outside the base's outline: Yuki's bob sits inside
    # the bald head's outline almost entirely.)
    eyes = b_there & ~b_dark & (rows < top) & (
        ~b_skin | (np.abs(b.astype(int) - np.median(b[b_skin], axis=0)).sum(axis=-1) > 120))
    eye_rows, eye_cols = np.nonzero(eyes)
    brow = eye_rows.min() - 4
    crown = new & (rows < brow)
    # The outline's own colour is not a hair colour, though Yuki's hair is nearly as dark.
    line = colours(b_dark & g_dark, 0.1)
    hair_colours = colours(crown, 0.005) - skin - line

    # The face is the one place where something new is not hair: her eyes, her mouth,
    # her glasses. There only her hair's own colours count, and the dark dots right
    # beside them, which are the edge of her fringe.
    cols = np.arange(gw)[None, :]
    face = (rows >= brow) & (rows < top) & (cols >= eye_cols.min() - 3) & (cols <= eye_cols.max() + 3)
    def around(mask: np.ndarray) -> np.ndarray:
        """How many of a dot's eight neighbours are in mask."""
        pad = np.pad(mask.astype(int), 1)
        return sum(pad[oy:oy + gh, ox:ox + gw] for oy in (0, 1, 2) for ox in (0, 1, 2)) - mask

    in_hair = has(hair_colours)
    coloured = new & in_hair
    may = np.where(face, coloured | (new & has(line) & (around(coloured) > 0)), new)
    # Below the neck a colour her clothes use is clothes. Where her hair uses it too
    # (the brown of Rina's plait is the brown of her waistband) the dots around decide,
    # and where they cannot (Pia's hair and top are one orange) it is clothes.
    only_hair, only_cloth = in_hair & ~in_cloth, in_cloth & ~in_hair
    is_cloth = in_cloth & ~(in_hair & (around(only_hair) > around(only_cloth)))
    may &= ~((rows >= top) & is_cloth)
    # Only what hangs together with the crown. A stray outline dot where her arm is one
    # dot wider than the base's is her arm, not her hair.
    hair = connected(may, crown)

    # Everything she has where the base wears grey goes with her clothes, even the few
    # dots of skin where her neckline sits lower: the body keeps its underclothes whole.
    clothes = g_there & ~hair & (rows >= top) & (is_cloth | worn)

    def picture(mask: np.ndarray, source: np.ndarray) -> np.ndarray:
        out = np.zeros_like(girl)
        out[mask] = source[mask]
        out[mask, 3] = 255
        return out

    # Her body: her own dots where they show, the base's where hair or clothes hide them.
    hidden = hair | clothes
    body = picture(g_there & ~hidden, girl)
    under = hidden & b_there
    body[under] = base[under]

    stem = girl_path.with_suffix('')
    parts = {'body': body, 'clothes': picture(clothes, girl), 'hair': picture(hair, girl)}
    for name, part in parts.items():
        Image.fromarray(part, 'RGBA').save(f'{stem}.{name}.png', optimize=True)

    again = Image.new('RGBA', (gw, gh))
    for part in parts.values():
        again.alpha_composite(Image.fromarray(part, 'RGBA'))
    back = np.array(again)
    wrong = int(((back[..., 3] > 0) != g_there).sum() + (back[..., :3] != g)[g_there].any(axis=-1).sum())

    # To look at: the whole, the three parts, and the body in a present's place (bare).
    k, gap = 5, 20
    shown = [girl, body, parts['clothes'], parts['hair']]
    sheet = Image.new('RGBA', ((gw * k + gap) * len(shown) + gap, gh * k + gap * 2), (96, 104, 112, 255))
    for i, part in enumerate(shown):
        big = Image.fromarray(part, 'RGBA').resize((gw * k, gh * k), Image.NEAREST)
        sheet.alpha_composite(big, (gap + i * (gw * k + gap), gap))
    sheet.save(f'{stem}.layers@5x.png')

    print(f'{girl_path}: base at {dx},{dy}; hair {int(hair.sum())} dots, clothes {int(clothes.sum())}, '
          f'body {int((body[..., 3] > 0).sum())}; put back together, {wrong} dots differ')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit('usage: sprite-layers.py <base.sprite.png> <girl.sprite.png> [more ...]')
    for girl in sys.argv[2:]:
        layers(Path(sys.argv[1]), Path(girl))
