# Makes the link preview picture (public/og.jpg) from a drawing.
#
#   python -X utf8 scripts/og-image.py <drawing.png>
#
# 1200 x 630, which is what messengers ask for. The name is written here rather than
# drawn by the image model, which cannot be trusted with letters (docs/art-order.md).
# It sits on a dark band along the bottom quarter, the part the order left empty.
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

SIZE = (1200, 630)
NAME, WORDS = '프린세스 핏', '운동하면 아이가 자라요'

if len(sys.argv) != 2:
    sys.exit('usage: og-image.py <drawing.png>')
picture = ImageOps.fit(Image.open(sys.argv[1]).convert('RGB'), SIZE, Image.LANCZOS).convert('RGBA')

band = Image.new('RGBA', SIZE, (0, 0, 0, 0))
draw = ImageDraw.Draw(band)
top = SIZE[1] - 150
draw.rectangle((0, top, SIZE[0], SIZE[1]), fill=(46, 31, 24, 215))  # the app's chrome brown
# Malgun Gothic: on every Windows machine, and the picture is made on one.
big = ImageFont.truetype('malgunbd.ttf', 72)
small = ImageFont.truetype('malgunbd.ttf', 34)
draw.text((60, top + 22), NAME, font=big, fill=(255, 246, 228, 255))
width = draw.textlength(NAME, font=big)
draw.text((60 + width + 36, top + 56), WORDS, font=small, fill=(196, 248, 126, 255))

out = Path(__file__).parent.parent / 'public' / 'og.jpg'
Image.alpha_composite(picture, band).convert('RGB').save(out, quality=88, optimize=True)
print(f'{out}: {SIZE[0]} x {SIZE[1]}')
