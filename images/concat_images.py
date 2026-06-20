import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

try:
    import tomllib
except ModuleNotFoundError:
    try:
        import tomli as tomllib
    except ModuleNotFoundError:
        print("error: need tomllib (Python 3.11+) or tomli. pip install tomli", file=sys.stderr)
        sys.exit(1)


FONT_CANDIDATES = [
    "Helvetica-Bold", "Helvetica",
    "Arial-Bold", "Arial",
    "DejaVuSans-Bold", "DejaVuSans",
    "FreeSansBold", "FreeSans",
    "LiberationSans-Bold", "LiberationSans",
]


def resolve_font(font_path=None, size=28):
    if font_path:
        path = Path(font_path)
        if path.is_file():
            return ImageFont.truetype(str(path), size)
        print(f"warning: specified font '{font_path}' not found, trying fallbacks", file=sys.stderr)

    for name in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(name, size)
        except (OSError, IOError):
            continue

    print("warning: no bold font found, using Pillow default", file=sys.stderr)
    return ImageFont.load_default()


def hex_to_rgb(hex_str):
    h = hex_str.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def load_images(images_conf, base_dir):
    images = []
    for entry in images_conf:
        path = Path(base_dir) / entry["file"]
        if not path.is_file():
            print(f"error: image not found: {path}", file=sys.stderr)
            sys.exit(1)
        images.append(Image.open(str(path)).convert("RGBA"))
    return images


def build_canvas(images, gap, bg_color):
    if not images:
        print("error: no images to concatenate", file=sys.stderr)
        sys.exit(1)

    total_w = sum(im.width for im in images) + gap * (len(images) - 1)
    max_h = max(im.height for im in images)
    canvas = Image.new("RGBA", (total_w, max_h), bg_color)
    return canvas, total_w, max_h


def paste_images(canvas, images, gap, bg_color):
    x_offset = 0
    offsets = []
    for im in images:
        y_offset = 0
        canvas.paste(im, (x_offset, y_offset), im)
        offsets.append(x_offset)
        x_offset += im.width + gap
    return offsets


def draw_ovals(draw, ovals_conf, x_base, y_base, oval_outline_width):
    for oval in ovals_conf:
        x0 = x_base + oval["x"]
        y0 = y_base + oval["y"]
        x1 = x0 + oval["width"]
        y1 = y0 + oval["height"]
        draw.ellipse([x0, y0, x1, y1], outline="red", width=oval_outline_width)


def draw_texts(draw, texts_conf, x_base, y_base, image_width, font, outline_width):
    for entry in texts_conf:
        content = entry["content"]
        bbox = draw.textbbox((0, 0), content, font=font)
        text_w = bbox[2] - bbox[0]
        x = x_base + (image_width - text_w) // 2
        y = y_base + int(font.size * 0.3)
        draw.text((x, y), content, font=font, fill="white",
                  stroke_width=outline_width, stroke_fill="black")


def parse_config(path):
    with open(path, "rb") as f:
        return tomllib.load(f)


def main():
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} config.toml", file=sys.stderr)
        sys.exit(1)

    cfg_path = Path(sys.argv[1])
    if not cfg_path.is_file():
        print(f"error: config not found: {cfg_path}", file=sys.stderr)
        sys.exit(1)

    cfg = parse_config(cfg_path)
    base_dir = cfg_path.parent

    output = cfg.get("output", "output.png")
    gap = cfg.get("gap", 0)
    bg_color = hex_to_rgb(cfg.get("background", "#ffffff"))
    font_size = cfg.get("font_size", 28)
    text_outline_width = cfg.get("text_outline_width", 2)
    oval_outline_width = cfg.get("oval_outline_width", 3)
    font_path = cfg.get("font_path")
    font = resolve_font(font_path, font_size)

    images_conf = cfg.get("images", [])
    if not images_conf:
        print("error: no images defined in config", file=sys.stderr)
        sys.exit(1)

    images = load_images(images_conf, base_dir)
    canvas, _, _ = build_canvas(images, gap, bg_color)
    offsets = paste_images(canvas, images, gap, bg_color)

    draw = ImageDraw.Draw(canvas)

    for i, im in enumerate(images):
        x_base = offsets[i]
        y_base = 0

        entry = images_conf[i]
        draw_ovals(draw, entry.get("ovals", []), x_base, y_base, oval_outline_width)
        draw_texts(draw, entry.get("texts", []), x_base, y_base, im.width, font, text_outline_width)

    canvas.save(output)
    print(f"saved {output}")


if __name__ == "__main__":
    main()
