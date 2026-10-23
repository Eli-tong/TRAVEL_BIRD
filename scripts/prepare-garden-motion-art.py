from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source" / "garden-motion"
OUTPUT = ROOT / "public" / "art" / "bird-routine"
CELL = 540
GROUND_Y = 525


def grid_cell(image: Image.Image, index: int, columns: int, rows: int) -> Image.Image:
    column = index % columns
    row = index // columns
    left = round(column * image.width / columns)
    right = round((column + 1) * image.width / columns)
    top = round(row * image.height / rows)
    bottom = round((row + 1) * image.height / rows)
    return image.crop((left, top, right, bottom))


def contact_sheet_to_strip(
    source_name: str,
    output_name: str,
    columns: int,
    rows: int,
    normalized_cell_size: int,
) -> None:
    source = Image.open(SOURCE / source_name).convert("RGBA")
    frame_count = columns * rows
    strip = Image.new("RGBA", (CELL * frame_count, CELL), (0, 0, 0, 0))

    for index in range(frame_count):
        frame = grid_cell(source, index, columns, rows).resize(
            (normalized_cell_size, normalized_cell_size),
            Image.Resampling.LANCZOS,
        )
        bounds = frame.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError(f"empty generated frame {index + 1} in {source_name}")
        paste_x = index * CELL + (CELL - normalized_cell_size) // 2
        paste_y = GROUND_Y - bounds[3]
        strip.alpha_composite(frame, (paste_x, paste_y))

    strip.save(OUTPUT / output_name, optimize=True)


def repair_forage_frame() -> None:
    target_path = OUTPUT / "garden-forage.png"
    strip = Image.open(target_path).convert("RGBA")
    if strip.size != (CELL * 16, CELL):
        raise ValueError(f"unexpected forage strip size: {strip.size}")
    repaired = Image.open(SOURCE / "garden-forage-frame-13-repaired-v1.png").convert("RGBA")
    if repaired.size != (CELL, CELL):
        raise ValueError(f"unexpected repaired frame size: {repaired.size}")
    target_box = (CELL * 12, 0, CELL * 13, CELL)
    strip.paste((0, 0, 0, 0), target_box)
    strip.alpha_composite(repaired, (CELL * 12, 0))
    strip.save(target_path, optimize=True)


repair_forage_frame()
contact_sheet_to_strip(
    "garden-door-hop-contact-v1.png",
    "garden-door-hop-right-v1.png",
    columns=4,
    rows=2,
    normalized_cell_size=410,
)
contact_sheet_to_strip(
    "garden-door-enter-back-contact-v1.png",
    "garden-door-enter-back-v1.png",
    columns=4,
    rows=3,
    normalized_cell_size=400,
)
