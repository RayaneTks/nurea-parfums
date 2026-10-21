# Ajoute une barre d'état iOS (47 pt) au-dessus d'une capture 1170 × 2532 (3x) ; la capture descend d'autant.
import sys
from PIL import Image, ImageDraw, ImageFont
src, out, theme = sys.argv[1:4]
im = Image.open(src).convert("RGB"); W, H = im.size; s = 3; bh = 47 * s
fond = im.getpixel((W // 2, 4)); encre = (245, 237, 227) if theme == "sombre" else (37, 22, 22)
o = Image.new("RGB", (W, H), fond); o.paste(im.crop((0, 0, W, H - bh)), (0, bh))
d = ImageDraw.Draw(o)
f = ImageFont.truetype("C:/Windows/Fonts/seguisb.ttf", 17 * s)
d.text((54 * s, 25 * s), "9:41", font=f, fill=encre, anchor="mm")
x = W - 28 * s  # batterie
d.rounded_rectangle((x - 25 * s, 19 * s, x, 31 * s), radius=4 * s, outline=encre, width=int(1.2 * s))
d.rounded_rectangle((x - 23 * s, 21 * s, x - 6 * s, 29 * s), radius=2 * s, fill=encre)
d.rounded_rectangle((x + 1 * s, 23 * s, x + 3 * s, 27 * s), radius=1 * s, fill=encre)
x -= 33 * s  # wifi : trois arcs
for r in (10, 6.5, 3):
    d.pieslice((x - r * s, 30 * s - r * s * 1.6, x + r * s, 30 * s + r * s * 0.4), 225, 315, fill=encre)
    d.pieslice((x - (r - 1.6) * s, 30 * s - (r - 1.6) * s * 1.6, x + (r - 1.6) * s, 30 * s + (r - 1.6) * s * 0.4), 225, 315, fill=fond) if r > 3 else None
x -= 30 * s  # réseau : quatre barres
for i in range(4):
    hgt = (4 + i * 2.6) * s; d.rounded_rectangle((x + i * 5 * s, 31 * s - hgt, x + i * 5 * s + 3 * s, 31 * s), radius=s, fill=encre)
o.save(out)
