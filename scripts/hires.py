# Shared by girl-assets.py and garment-assets.py: puts a drawing on the app's canvas at
# the drawing's own fineness, and cuts it by a map made on the dot grid.
#
# The dot sprites (sprite-clean.py) are good for deciding which dot is hair and which is
# cloth, and bad to look at: resampling a drawing whose dots are not all one size thickens
# every outline it straddles, and the girl on screen had legs half again as thick as the
# girl that was ordered. So the sprite decides and the drawing is shown. Each drawing is
# laid on the canvas at PER_DOT pixels a dot, and a dot-level map blown up by the same
# factor says which layer each pixel goes to. The layers still partition the drawing, so
# put back together they are the drawing as it came.
from pathlib import Path

import numpy as np
from PIL import Image

CANVAS = (64, 96)   # dots, shared by every girl and every garment
# Where the body base's top-left dot sits on it. Six dots above the head for hair and a
# hat, two below the feet for the soles of shoes, which stand lower than bare feet do.
BASE_AT = (12, 6)
PER_DOT = 10        # pixels a dot in the files the app loads: 640 x 960


def drawing_of(sprite: Path) -> Path:
    """The drawing a sprite was cut from: name.sprite.png -> name.png."""
    return sprite.with_name(sprite.name.replace('.sprite.png', '.png'))


def on_canvas(drawing: Path, dots: tuple[int, int], at: tuple[int, int]) -> Image.Image:
    """The drawing on the canvas, its outline box stretched over `dots` (w, h) at `at`.

    `dots` is the size its sprite came out, which is what ties the two together: the
    sprite's dot (x, y) is this picture's pixels from (at + x) * PER_DOT on.
    """
    pixels = np.array(Image.open(drawing).convert('RGBA'))
    solid = pixels[..., 3] >= 128
    # The half-transparent fringe goes, as in the sprite; edges are smoothed again by
    # the resize below, but from a hard edge rather than from a glow.
    pixels[..., 3] = np.where(solid, 255, 0)
    pixels[~solid, :3] = 0
    ys, xs = np.nonzero(solid)
    cut = Image.fromarray(pixels, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    # Premultiplied through the resize, or the transparent black bleeds into the rim.
    cut = cut.convert('RGBa').resize((dots[0] * PER_DOT, dots[1] * PER_DOT), Image.LANCZOS).convert('RGBA')
    sheet = Image.new('RGBA', (CANVAS[0] * PER_DOT, CANVAS[1] * PER_DOT))
    sheet.paste(cut, (at[0] * PER_DOT, at[1] * PER_DOT))
    return sheet


def spread(labels: np.ndarray, rounds: int = 3) -> np.ndarray:
    """Gives each unlabelled dot (0) the label of a neighbour, a few dots outward.

    The sprite leaves a dot empty when under half of it is drawn, but the drawing has
    pixels there, and they belong with whatever they are the edge of.
    """
    out = labels.copy()
    h, w = out.shape
    for _ in range(rounds):
        pad = np.pad(out, 1)
        grown = out.copy()
        for oy in (0, 1, 2):
            for ox in (0, 1, 2):
                near = pad[oy:oy + h, ox:ox + w]
                grown = np.where((grown == 0) & (near > 0), near, grown)
        out = grown
    return out


def cut(picture: Image.Image, labels: np.ndarray, label: int) -> Image.Image:
    """The pixels of `picture` whose dot carries `label`."""
    mask = np.kron(labels == label, np.ones((PER_DOT, PER_DOT), dtype=bool))
    pixels = np.array(picture)
    pixels[~mask] = 0
    return Image.fromarray(pixels, 'RGBA')
