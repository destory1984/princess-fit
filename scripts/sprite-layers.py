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
    # Two cuts of the same body can come out a dot apart in width (40 and 41): the last
    # column is a fingertip's outline, half in one dot and half in the next. More than
    # that and she was not cut with --like.
    if base_small.shape[0] > gh + 2 or base_small.shape[1] > gw + 2:
        print(f'{girl_path}: smaller than the base; was it cut with --like?')
        return
    base_small = base_small[:gh, :gw]

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
    cols = np.arange(gw)[None, :]
    gi, bi = g.astype(int), b.astype(int)

    def colours(mask: np.ndarray, share: float) -> set:
        votes = Counter(key(c) for c in g[mask & g_there])
        return {c for c, n in votes.items() if n >= max(2, sum(votes.values()) * share)}

    def has(found: set) -> np.ndarray:
        return np.array([[key(g[y, x]) in found for x in range(gw)] for y in range(gh)]) & g_there

    def around(mask: np.ndarray) -> np.ndarray:
        """How many of a dot's eight neighbours are in mask."""
        pad = np.pad(mask.astype(int), 1)
        return sum(pad[oy:oy + gh, ox:ox + gw] for oy in (0, 1, 2) for ox in (0, 1, 2)) - mask

    # Skin is the base's skin, a little widened. (It used to be read off her own legs,
    # which stopped working the day she was drawn in socks: the socks became "skin".)
    median_skin = np.median(bi[b_skin], axis=0)
    skin = np.array([c for c, n in Counter(map(tuple, bi[b_skin].tolist())).items()
                     if n >= 3 and np.abs(np.array(c) - median_skin).sum() <= 60])
    like_skin = (np.abs(gi[:, :, None, :] - skin[None, None, :, :]).sum(axis=-1).min(axis=-1) < 30) & g_there

    # What she has that the base has not: a dot outside its outline, or one far from the
    # base's colour there. Skin over skin is not news whatever its shade, nor is an
    # outline dot the base also has, nor a sliver of arm one dot wider than the base's.
    far = np.abs(gi - bi).sum(axis=-1) > 30
    new = g_there & ~(b_dark & g_dark) & np.where(b_there, far & ~(b_skin & like_skin), ~like_skin)

    # The crown is the head above the brow, where everything new is hair; her hair's
    # colours are read there. (Not from what lies outside the base's outline: Yuki's bob
    # sits inside the bald head's outline almost entirely.)
    eyes = b_there & ~b_dark & (rows < top) & (~b_skin | (np.abs(bi - median_skin).sum(axis=-1) > 120))
    eye_rows, eye_cols = np.nonzero(eyes)
    brow = eye_rows.min() - 4
    crown = new & (rows < brow)
    line = colours(b_dark & g_dark, 0.1)  # the outline's own colour is nobody's
    hair_colours = colours(crown, 0.005) - line
    # Her clothes' colours: what is new where the base wears grey.
    # Counted generously, outlines and trim included: a ribbon in her hair makes its
    # green a "hair colour", and the jacket's green edge must not follow it up there.
    cloth = colours(new & worn, 0.002) - line
    in_hair, in_cloth = has(hair_colours), has(cloth)

    # From the chin down a colour her clothes use is clothes. Where her hair uses it too
    # the dots around decide, and where they cannot (Pia's hair and hood are one orange)
    # it is clothes.
    below = rows >= top - 3
    only_hair, only_cloth = in_hair & ~in_cloth, in_cloth & ~in_hair
    is_cloth = below & in_cloth & ~(in_hair & (around(only_hair) > around(only_cloth)))

    # In the face only her hair's own colours count as hair, with the dark dots right
    # beside them (the edge of her fringe): her eyes, mouth and glasses are new too.
    # Below the chin the same, or a shoe would be hair for being new.
    face = (rows >= brow) & (rows < top) & (cols >= eye_cols.min() - 3) & (cols <= eye_cols.max() + 3)
    coloured = new & in_hair
    strict = coloured | (new & has(line) & (around(coloured) > 0))
    may = np.where(face | below, strict, new) & ~is_cloth
    # Never her eyes, though they may be the very colour of her hair and touch her fringe.
    wide = np.pad(eyes, 1)
    may &= ~(sum(wide[oy:oy + gh, ox:ox + gw] for oy in (0, 1, 2) for ox in (0, 1, 2)) > 0)
    # Hair hangs together with the crown — or is a tail that comes out from behind her
    # shoulder, joined to nothing that shows: hair-coloured, and outside the body.
    hair = connected(may, crown | (below & coloured & ~b_there & ~is_cloth))
    # Highlights the colour of skin, ringed by hair, are hair.
    for _ in range(2):
        hair |= g_there & ~face & (rows < top) & (around(hair) >= 5)

    # Everything else new from the chin down is what she wears: shoes and wristbands as
    # much as the shirt. And all she has where the base wears grey goes with it, even a
    # dot of skin where her neckline sits lower, so the body keeps its underclothes whole.
    clothes = g_there & ~hair & ((below & new) | ((rows >= top) & worn))
    # But not the crumbs: a few dark dots where her arm's outline fell one dot from the
    # base's are new and are not clothing. A patch with no cloth colour in it, and small,
    # stays with the body.
    seen = np.zeros_like(clothes)
    for y, x in zip(*np.nonzero(clothes)):
        if seen[y, x]:
            continue
        seed = np.zeros_like(clothes)
        seed[y, x] = True
        patch = connected(clothes, seed)
        seen |= patch
        if patch.sum() < 12 and not (patch & in_cloth & ~g_dark).any():
            clothes &= ~patch
        # Nor a scrap that hangs in the air beside her and has her hair's colour in it:
        # that is the end of a tail, with the tie that holds it.
        elif (patch & b_there).sum() <= patch.sum() * 0.1 and (patch & in_hair).any():
            clothes &= ~patch
            hair |= patch

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
