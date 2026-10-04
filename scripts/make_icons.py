from pathlib import Path  # Render the original grid-based app mark; no third-party artwork.
from PIL import Image, ImageDraw  # Nearest-neighbour rasterization preserves exact square pixels.
root = Path(__file__).resolve().parent.parent  # Resolve output paths independently of shell location.
canvas = Image.new('RGB', (64, 64), '#102f4d')  # PWA maskable icon background.
draw = ImageDraw.Draw(canvas)  # Original sprout geometry matches the SVG favicon.
for box in [(30, 27, 35, 48), (18, 17, 29, 28), (23, 23, 34, 32), (35, 12, 48, 25), (33, 22, 41, 30)]:
    draw.rectangle(box, fill='#73ded7')  # Keep the symbol inside the mask-safe region.
draw.rectangle((16, 48, 48, 52), fill='#ff947c')  # A warm soil baseline completes the mark.
for size in (192, 512):
    canvas.resize((size, size), Image.Resampling.NEAREST).save(root / 'public' / f'icon-{size}.png')  # Installable PWA sizes.
