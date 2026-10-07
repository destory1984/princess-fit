# Puts the festival's scenes into the app: the three contest halls and the twelve months.
#
#   python -X utf8 scripts/festival-scenes.py <folder of the order>
#
# Each drawing is <name>/<name>.png in that folder, 2:1 (art-orders/2026-10-07/festival-scenes).
# The orders leave the lower third as bare ground for the girls to stand on; nobody stands
# there yet, so the banner keeps the top four fifths, 5:2, and the ground is cut short.
import sys
from pathlib import Path

from PIL import Image

NAMES = ['hall_tournament', 'hall_ball', 'hall_debate'] + [f'm{i:02d}' for i in range(1, 13)]
SIZE = (900, 360)

src = Path(sys.argv[1])
out = Path(__file__).parent.parent / 'assets' / 'festival'
out.mkdir(parents=True, exist_ok=True)
for name in NAMES:
    art = Image.open(src / name / f'{name}.png').convert('RGB')
    kept = art.crop((0, 0, art.width, round(art.width * SIZE[1] / SIZE[0])))
    small = kept.resize(SIZE, Image.LANCZOS).quantize(colors=128, method=Image.MEDIANCUT, dither=Image.NONE)
    small.save(out / f'{name}.png', optimize=True)
    print(name, (out / f'{name}.png').stat().st_size // 1024, 'KB')
