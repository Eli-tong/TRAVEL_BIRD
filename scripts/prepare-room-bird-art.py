from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "output" / "imagegen" / "room-motion"
TRACKED_SOURCE_DIR = ROOT / "assets" / "source" / "room-motion"
OUTPUT_DIR = ROOT / "public" / "art" / "bird-routine"
FRAME_SIZE = (600, 540)


@dataclass(frozen=True)
class Sheet:
    source: str
    output: str
    columns: int
    rows: int
    align: str = "center"
    component_extract: bool = True
    source_dir: Path = SOURCE_DIR


SHEETS = (
    Sheet("flight-left-contact.png", "room-flight-left.png", 4, 4),
    Sheet("flight-right-contact.png", "room-flight-right.png", 4, 4),
    Sheet("sleep-contact.png", "room-sleep.png", 4, 4, "bed"),
    # Two broad waking poses touch across a cell boundary, so retain the grid split there.
    Sheet("wake-contact.png", "room-wake.png", 4, 3, "bed", False),
    Sheet("sleep-contact-bed-v2.png", "room-sleep-bed-v2.png", 4, 4, "bed", False, TRACKED_SOURCE_DIR),
    Sheet("wake-contact-bed-v2.png", "room-wake-bed-v2.png", 4, 3, "bed", False, TRACKED_SOURCE_DIR),
)


def grid_cells(image: Image.Image, columns: int, rows: int) -> list[Image.Image]:
    cells: list[Image.Image] = []
    for row in range(rows):
        for column in range(columns):
            left = round(column * image.width / columns)
            top = round(row * image.height / rows)
            right = round((column + 1) * image.width / columns)
            bottom = round((row + 1) * image.height / rows)
            cells.append(keep_main_subject(image.crop((left, top, right, bottom)).convert("RGBA")))
    return cells


def alpha_box(image: Image.Image) -> tuple[int, int, int, int]:
    box = image.getchannel("A").getbbox()
    if box is None:
        raise ValueError("contact sheet contains an empty frame")
    return box


def keep_main_subject(image: Image.Image) -> Image.Image:
    """Remove neighboring-cell fragments while keeping the generated pose untouched."""
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

    if not largest:
        raise ValueError("contact sheet contains an empty frame")
    clean_alpha = Image.new("L", (width, height), 0)
    clean_pixels = clean_alpha.load()
    for offset in largest:
        y, x = divmod(offset, width)
        clean_pixels[x, y] = pixels[x, y]
    cleaned = image.copy()
    cleaned.putalpha(clean_alpha)
    return cleaned


def component_cells(image: Image.Image, count: int, columns: int) -> list[Image.Image]:
    """Extract complete transparent subjects even when a pose crosses the guide grid."""
    alpha = image.getchannel("A")
    width, height = alpha.size
    pixels = alpha.load()
    visited = bytearray(width * height)
    components: list[list[int]] = []
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
            components.append(component)

    components = sorted(components, key=len, reverse=True)[:count]
    if len(components) != count:
        raise ValueError(f"expected {count} subjects, found {len(components)}")

    subjects: list[tuple[float, float, Image.Image]] = []
    for component in components:
        xs = [offset % width for offset in component]
        ys = [offset // width for offset in component]
        left, top, right, bottom = min(xs), min(ys), max(xs) + 1, max(ys) + 1
        subject = Image.new("RGBA", (right - left, bottom - top), (0, 0, 0, 0))
        source = image.load()
        target = subject.load()
        for offset in component:
            source_y, source_x = divmod(offset, width)
            target[source_x - left, source_y - top] = source[source_x, source_y]
        subjects.append(((top + bottom) / 2, (left + right) / 2, subject))

    ordered: list[Image.Image] = []
    by_row = sorted(subjects, key=lambda item: item[0])
    for start in range(0, count, columns):
        ordered.extend(item[2] for item in sorted(by_row[start:start + columns], key=lambda item: item[1]))
    return ordered


def normalize_cells(cells: list[Image.Image], align: str, subject_width_limit: int = 576, subject_height_limit: int = 516) -> list[Image.Image]:
    boxes = [alpha_box(cell) for cell in cells]
    width_limit = subject_width_limit / max(box[2] - box[0] for box in boxes)
    height_limit = subject_height_limit / max(box[3] - box[1] for box in boxes)
    # Keep one source-art pixel at the same visual scale as the original 420px room bird.
    # Upscaling here made the generated poses visibly larger even when the CSS frame matched.
    scale = min(1.0, width_limit, height_limit)
    frames: list[Image.Image] = []
    for cell in cells:
        resized = cell.resize(
            (max(1, round(cell.width * scale)), max(1, round(cell.height * scale))),
            Image.Resampling.LANCZOS,
        )
        left, top, right, bottom = alpha_box(resized)
        paste_x = round(FRAME_SIZE[0] / 2 - (left + right) / 2)
        paste_y = (516 - bottom) if align == "bed" else round(FRAME_SIZE[1] / 2 - (top + bottom) / 2)
        frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
        frame.alpha_composite(resized, (paste_x, paste_y))
        frames.append(frame)
    return frames


def save_strip(spec: Sheet) -> None:
    source = Image.open(spec.source_dir / spec.source).convert("RGBA")
    cells = component_cells(source, spec.columns * spec.rows, spec.columns) if spec.component_extract else grid_cells(source, spec.columns, spec.rows)
    frames = normalize_cells(cells, spec.align)
    strip = Image.new("RGBA", (FRAME_SIZE[0] * len(frames), FRAME_SIZE[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        strip.alpha_composite(frame, (index * FRAME_SIZE[0], 0))
    strip.save(OUTPUT_DIR / spec.output, optimize=True)
    print(f"WROTE {spec.output}: {len(frames)} frames")


def save_reactions(
    source_name: str,
    filenames: tuple[str, str],
    source_dir: Path = SOURCE_DIR,
    component_extract: bool = True,
    subject_width_limit: int = 576,
) -> None:
    source = Image.open(source_dir / source_name).convert("RGBA")
    cells = component_cells(source, 2, 2) if component_extract else grid_cells(source, 2, 1)
    frames = normalize_cells(cells, "bed", subject_width_limit)
    for frame, filename in zip(frames, filenames):
        frame.save(OUTPUT_DIR / filename, optimize=True)
        print(f"WROTE {filename}")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for spec in SHEETS:
        save_strip(spec)
    save_reactions("sleep-reactions-contact.png", ("room-sleep-look.png", "room-sleep-angry.png"))
    save_reactions(
        "sleep-reactions-contact-bed-v2.png",
        ("room-sleep-look-bed-v2.png", "room-sleep-angry-bed-v2.png"),
        TRACKED_SOURCE_DIR,
        False,
        320,
    )


if __name__ == "__main__":
    main()
