from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from pathlib import Path
from statistics import median

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "output" / "imagegen" / "garden-motion"
OUTPUT_DIR = ROOT / "public" / "art" / "bird-routine"
FRAME_SIZE = (540, 540)
SUPPORT = (270, 509)


@dataclass(frozen=True)
class Sheet:
    source: str
    output: str
    columns: int
    rows: int
    clear_top_ratio: float = 0
    clear_top_rows: tuple[int, ...] = ()
    frame_indices: tuple[int, ...] | None = None
    main_subject_only: bool = False


SHEETS = (
    Sheet("walk-left-contact.png", "garden-walk-left-v2.png", 4, 4),
    # The source contact sheet's outermost first pose touches the canvas edge.
    # Start on the next complete pose and close the gait loop with it again.
    Sheet("walk-right-contact.png", "garden-walk-right-v2.png", 4, 4, frame_indices=tuple(range(1, 16)) + (1,)),
    Sheet("preen-contact.png", "garden-preen.png", 4, 4),
    Sheet("forage-contact.png", "garden-forage.png", 4, 4, main_subject_only=True),
    Sheet("water-pickup-contact.png", "garden-water-pickup-v2.png", 4, 3, clear_top_ratio=0.16, clear_top_rows=(1,)),
    Sheet("water-pour-contact.png", "garden-water-pour-v2.png", 4, 4, clear_top_ratio=0.08, clear_top_rows=(2, 3)),
    Sheet("water-putdown-contact.png", "garden-water-putdown-v2.png", 4, 3, clear_top_ratio=0.16, clear_top_rows=(1,)),
)


def grid_cells(image: Image.Image, columns: int, rows: int) -> list[Image.Image]:
    cells: list[Image.Image] = []
    for row in range(rows):
        for column in range(columns):
            left = round(column * image.width / columns)
            top = round(row * image.height / rows)
            right = round((column + 1) * image.width / columns)
            bottom = round((row + 1) * image.height / rows)
            cells.append(image.crop((left, top, right, bottom)).convert("RGBA"))
    return cells


def clear_row_bleed(image: Image.Image, ratio: float) -> Image.Image:
    if ratio <= 0:
        return image
    cleaned = image.copy()
    cleaned.paste((0, 0, 0, 0), (0, 0, cleaned.width, round(cleaned.height * ratio)))
    return cleaned


def keep_main_subject(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    width, height = alpha.size
    pixels = alpha.load()
    visited = bytearray(width * height)
    largest: list[int] = []
    for y in range(height):
        for x in range(width):
            offset = y * width + x
            if visited[offset] or pixels[x, y] <= 8:
                continue
            visited[offset] = 1
            stack = [offset]
            component: list[int] = []
            while stack:
                current = stack.pop()
                component.append(current)
                current_y, current_x = divmod(current, width)
                neighbors = []
                if current_x > 0:
                    neighbors.append(current - 1)
                if current_x + 1 < width:
                    neighbors.append(current + 1)
                if current_y > 0:
                    neighbors.append(current - width)
                if current_y + 1 < height:
                    neighbors.append(current + width)
                for neighbor in neighbors:
                    if visited[neighbor]:
                        continue
                    neighbor_y, neighbor_x = divmod(neighbor, width)
                    if pixels[neighbor_x, neighbor_y] > 8:
                        visited[neighbor] = 1
                        stack.append(neighbor)
            if len(component) > len(largest):
                largest = component
    cleaned = image.copy()
    clean_alpha = Image.new("L", image.size, 0)
    target = clean_alpha.load()
    for offset in largest:
        y, x = divmod(offset, width)
        target[x, y] = pixels[x, y]
    cleaned.putalpha(clean_alpha)
    return cleaned


def is_bird_pixel(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    if alpha <= 16:
        return False
    pale_feather = red > 135 and green > 140 and blue > 145
    blue_feather = blue > 115 and blue > red * 1.04 and blue > green * 1.01 and red > 58
    pink = red > 125 and red > green * 1.08 and red > blue * 1.03
    brown_outline = red > 28 and red > green * 1.22 and green > blue * 1.04
    black_detail = max(red, green, blue) < 58
    return pale_feather or blue_feather or pink or brown_outline or black_detail


def bird_measurements(image: Image.Image) -> tuple[int, tuple[int, int, int, int]]:
    points = [
        (index % image.width, index // image.width)
        for index, pixel in enumerate(image.get_flattened_data())
        if is_bird_pixel(pixel)
    ]
    if not points:
        raise ValueError("frame has no detectable bird pixels")
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return len(points), (min(xs), min(ys), max(xs) + 1, max(ys) + 1)


def foot_anchor(image: Image.Image) -> tuple[int, int]:
    _, bird_box = bird_measurements(image)
    left, top, right, bottom = bird_box
    lower = top + round((bottom - top) * 0.58)
    central_right = left + round((right - left) * 0.78)
    pink: list[tuple[int, int]] = []
    for y in range(lower, image.height):
        for x in range(left, min(right, central_right)):
            red, green, blue, alpha = image.getpixel((x, y))
            if alpha > 24 and red > 135 and red > green * 1.08 and red > blue * 1.03:
                pink.append((x, y))
    if not pink:
        return ((left + right) // 2, bottom - 1)
    support_y = max(y for _, y in pink)
    support_xs = [x for x, y in pink if y >= support_y - 12]
    return (round(median(support_xs)), support_y)


def target_bird_area() -> int:
    reference = Image.open(OUTPUT_DIR / "garden-walk.png").convert("RGBA")
    areas = [bird_measurements(reference.crop((index * 420, 0, (index + 1) * 420, 540)))[0] for index in range(8)]
    return round(median(areas))


def normalize_sheet(spec: Sheet, target_area: int) -> None:
    source = Image.open(SOURCE_DIR / spec.source).convert("RGBA")
    cells = [
        clear_row_bleed(cell, spec.clear_top_ratio) if index // spec.columns in spec.clear_top_rows else cell
        for index, cell in enumerate(grid_cells(source, spec.columns, spec.rows))
    ]
    if spec.main_subject_only:
        cells = [keep_main_subject(cell) for cell in cells]
    if spec.frame_indices is not None:
        cells = [cells[index] for index in spec.frame_indices]
    source_area = median(bird_measurements(cell)[0] for cell in cells)
    boxes = [cell.getchannel("A").getbbox() for cell in cells]
    if any(box is None for box in boxes):
        raise ValueError(f"{spec.source} contains an empty frame")
    opaque_boxes = [box for box in boxes if box is not None]
    width_limit = 524 / max(box[2] - box[0] for box in opaque_boxes)
    top_limit = 501 / max(foot_anchor(cell)[1] - box[1] for cell, box in zip(cells, opaque_boxes))
    scale = max(0.72, min(1.55, sqrt(target_area / source_area), width_limit, top_limit))
    frames: list[Image.Image] = []
    for cell in cells:
        resized = cell.resize(
            (max(1, round(cell.width * scale)), max(1, round(cell.height * scale))),
            Image.Resampling.LANCZOS,
        )
        foot_x, foot_y = foot_anchor(resized)
        alpha_box = resized.getchannel("A").getbbox()
        if alpha_box is None:
            raise ValueError(f"{spec.source} contains an empty frame")
        desired_x = SUPPORT[0] - foot_x
        # Preserve the foot anchor whenever possible, but nudge the complete
        # silhouette into the viewport instead of trimming a tail or watering can.
        min_x = 8 - alpha_box[0]
        max_x = FRAME_SIZE[0] - 8 - alpha_box[2]
        paste_x = min(max(desired_x, min_x), max_x) if min_x <= max_x else desired_x
        frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
        frame.alpha_composite(resized, (paste_x, SUPPORT[1] - foot_y))
        frames.append(frame)

    strip = Image.new("RGBA", (FRAME_SIZE[0] * len(frames), FRAME_SIZE[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        strip.alpha_composite(frame, (index * FRAME_SIZE[0], 0))
    strip.save(OUTPUT_DIR / spec.output, optimize=True)
    print(f"WROTE {spec.output}: {len(frames)} frames, scale={scale:.3f}")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    target_area = target_bird_area()
    for sheet in SHEETS:
        normalize_sheet(sheet, target_area)


if __name__ == "__main__":
    main()
