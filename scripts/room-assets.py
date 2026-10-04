"""Cuts an ordered piece of furniture to its own edges and puts it in assets/room/.

    python -X utf8 scripts/room-assets.py art-orders/2026-10-04/furniture/bed/bed.png bed

The drawing comes back on a large canvas with a soft, half-transparent rim. The rim is
cut hard (a glow around a bookcase reads as light on a dark wall), stray specks are
dropped, and the canvas is trimmed to the piece — so its place in lib/room.ts is the
piece itself, not a canvas with a piece somewhere in it. Prints the aspect to put in
lib/furnitureArt.ts.
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

LONG_SIDE = 768  # plenty: the widest piece is under half of a phone-wide scene


def without_specks(solid: np.ndarray) -> np.ndarray:
    """Drops islands far smaller than the piece: leftovers of the generator's background."""
    labels = np.zeros(solid.shape, dtype=np.int32)
    sizes = [0]
    height, width = solid.shape
    for y, x in zip(*np.nonzero(solid)):
        if labels[y, x]:
            continue
        label = len(sizes)
        labels[y, x] = label
        size, queue = 0, deque([(y, x)])
        while queue:
            cy, cx = queue.popleft()
            size += 1
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < height and 0 <= nx < width and solid[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = label
                    queue.append((ny, nx))
        sizes.append(size)
    keep = [label for label, size in enumerate(sizes) if label and size >= max(sizes) * 0.002]
    return np.isin(labels, keep)


def main() -> None:
    src, piece = Path(sys.argv[1]), sys.argv[2]
    art = Image.open(src).convert('RGBA')
    px = np.array(art)
    solid = px[..., 3] >= 128

    solid = without_specks(solid)

    corners = [solid[0, 0], solid[0, -1], solid[-1, 0], solid[-1, -1]]
    if all(corners):
        sys.exit(f'{src}: the background is not transparent')

    px[..., 3] = np.where(solid, 255, 0)
    px[~solid, :3] = 0
    ys, xs = np.nonzero(solid)
    cut = Image.fromarray(px).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    scale = LONG_SIDE / max(cut.size)
    if scale < 1:
        cut = cut.resize((round(cut.width * scale), round(cut.height * scale)), Image.LANCZOS)
    out = Path('assets/room') / f'{piece}.png'
    cut.save(out, optimize=True)
    print(f'{out}: {cut.width} x {cut.height}, aspect {cut.width} / {cut.height}')


if __name__ == '__main__':
    main()
