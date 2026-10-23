from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from math import sqrt
from pathlib import Path
from statistics import median
import colorsys

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "output" / "imagegen" / "authentic-motion"
OUTPUT_DIR = ROOT / "public" / "art" / "bird-routine"
SUPPORT = (270, 509)


@dataclass(frozen=True)
class Sheet:
    source: str
    output: str
    columns: int
    rows: int
    frame_width: int = 540
    frame_height: int = 540
    grounded: bool = True
    preserve: str = "subject"


SHEETS = (
    Sheet("walk-left-v3-contact.png", "garden-walk-left-v3.png", 4, 4),
    Sheet("water-pickup-v3-contact.png", "garden-water-pickup-v3.png", 4, 3, preserve="water"),
    Sheet("water-pour-v3-contact.png", "garden-water-pour-v3.png", 4, 4, preserve="water"),
    Sheet("water-putdown-v3-contact.png", "garden-water-putdown-v3.png", 4, 3, preserve="water"),
    Sheet("preen-v2-contact.png", "garden-preen-v2.png", 4, 6),
    Sheet("sunbathe-v2-contact.png", "garden-sunbathe-v2.png", 4, 2),
    Sheet("sleep-side-v3-contact.png", "room-sleep-side-v3.png", 4, 4, 600, 540, False, "sleep"),
    Sheet("wake-side-v3-contact.png", "room-wake-side-v3.png", 4, 3, 600, 540, False, "sleep"),
    Sheet("land-branch-v1-contact.png", "room-land-branch-v1.png", 4, 3),
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


def remove_generated_background(image: Image.Image) -> Image.Image:
    """Flood-fill low-saturation generated backdrops without entering outlined art."""
    alpha = image.getchannel("A")
    corners = (alpha.getpixel((0, 0)), alpha.getpixel((image.width - 1, 0)),
               alpha.getpixel((0, image.height - 1)), alpha.getpixel((image.width - 1, image.height - 1)))
    if sum(value > 240 for value in corners) < 3:
        return image
    source = image.load()
    seen = bytearray(image.width * image.height)
    queue: deque[int] = deque()

    def eligible(x: int, y: int) -> bool:
        red, green, blue, opacity = source[x, y]
        if opacity <= 8:
            return True
        hue, saturation, value = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)
        _ = hue
        return saturation < 0.34 and 0.10 < value < 0.96

    for x in range(image.width):
        for y in (0, image.height - 1):
            if eligible(x, y):
                offset = y * image.width + x
                seen[offset] = 1
                queue.append(offset)
    for y in range(image.height):
        for x in (0, image.width - 1):
            if eligible(x, y):
                offset = y * image.width + x
                seen[offset] = 1
                queue.append(offset)
    while queue:
        offset = queue.popleft()
        y, x = divmod(offset, image.width)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if not (0 <= nx < image.width and 0 <= ny < image.height):
                continue
            neighbor = ny * image.width + nx
            if seen[neighbor] or not eligible(nx, ny):
                continue
            seen[neighbor] = 1
            queue.append(neighbor)
    cleaned = image.copy()
    clean_alpha = cleaned.getchannel("A")
    pixels = clean_alpha.load()
    for offset, background in enumerate(seen):
        if background:
            y, x = divmod(offset, image.width)
            pixels[x, y] = 0
    cleaned.putalpha(clean_alpha)
    return cleaned


def components(image: Image.Image) -> list[list[int]]:
    alpha = image.getchannel("A")
    pixels = alpha.load()
    seen = bytearray(image.width * image.height)
    found: list[list[int]] = []
    for y in range(image.height):
        for x in range(image.width):
            offset = y * image.width + x
            if seen[offset] or pixels[x, y] <= 8:
                continue
            seen[offset] = 1
            stack = [offset]
            component: list[int] = []
            while stack:
                current = stack.pop()
                component.append(current)
                cy, cx = divmod(current, image.width)
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if not (0 <= nx < image.width and 0 <= ny < image.height):
                        continue
                    neighbor = ny * image.width + nx
                    if seen[neighbor] or pixels[nx, ny] <= 8:
                        continue
                    seen[neighbor] = 1
                    stack.append(neighbor)
            found.append(component)
    return sorted(found, key=len, reverse=True)


def clean_components(image: Image.Image, preserve: str) -> Image.Image:
    found = components(image)
    if not found:
        raise ValueError("contact sheet contains an empty frame")
    keep = {offset for offset in found[0]}
    source = image.load()
    for component in found[1:]:
        if len(component) < 18:
            continue
        xs = [offset % image.width for offset in component]
        ys = [offset // image.width for offset in component]
        touches_edge = min(xs) < 5 or min(ys) < 5 or max(xs) >= image.width - 5 or max(ys) >= image.height - 5
        if touches_edge:
            continue
        avg = tuple(sum(source[offset % image.width, offset // image.width][channel] for offset in component) / len(component) for channel in range(3))
        blue_mark = avg[2] > avg[0] * 1.15 and avg[2] > avg[1] * 1.04
        pink_mark = avg[0] > avg[1] * 1.08 and avg[0] > avg[2] * 1.02
        water_region = sum(xs) / len(xs) > image.width * 0.45 and sum(ys) / len(ys) > image.height * 0.42
        meaningful_part = len(component) >= max(18, round(len(found[0]) * 0.01))
        if ((preserve == "sleep" and (blue_mark or meaningful_part))
                or (preserve == "water" and ((water_region and len(component) > 35) or pink_mark or meaningful_part))
                or (preserve == "subject" and (pink_mark or meaningful_part))):
            keep.update(component)
    alpha = image.getchannel("A")
    old = alpha.load()
    new = Image.new("L", image.size, 0)
    target = new.load()
    for offset in keep:
        y, x = divmod(offset, image.width)
        target[x, y] = old[x, y]
    result = image.copy()
    result.putalpha(new)
    return result


def subject_cells(image: Image.Image, count: int, columns: int, preserve: str) -> list[Image.Image]:
    """Extract complete generated poses even when the model crosses nominal grid lines."""
    cleaned = remove_generated_background(image)
    found = components(cleaned)
    if len(found) < count:
        raise ValueError(f"expected {count} generated poses, found {len(found)}")
    main = found[:count]
    source = cleaned.load()

    def center(component: list[int]) -> tuple[float, float]:
        return (sum(offset % cleaned.width for offset in component) / len(component),
                sum(offset // cleaned.width for offset in component) / len(component))

    groups = [set(component) for component in main]
    centers = [center(component) for component in main]
    # Keep disconnected water droplets or hand-painted Zzz marks with their nearest pose.
    if preserve in {"water", "sleep"}:
        for component in found[count:]:
            if len(component) < 22:
                continue
            avg = tuple(sum(source[offset % cleaned.width, offset // cleaned.width][channel] for offset in component) / len(component) for channel in range(3))
            blue_mark = avg[2] > avg[0] * 1.12 and avg[2] > avg[1] * 1.02
            if not blue_mark:
                continue
            extra_center = center(component)
            nearest = min(range(count), key=lambda index: (centers[index][0] - extra_center[0]) ** 2 + (centers[index][1] - extra_center[1]) ** 2)
            max_distance = max(cleaned.width / columns, cleaned.height / ((count + columns - 1) // columns)) * 0.52
            distance = ((centers[nearest][0] - extra_center[0]) ** 2 + (centers[nearest][1] - extra_center[1]) ** 2) ** 0.5
            if distance <= max_distance:
                groups[nearest].update(component)

    subjects: list[tuple[float, float, Image.Image]] = []
    for index, pixels in enumerate(groups):
        xs = [offset % cleaned.width for offset in pixels]
        ys = [offset // cleaned.width for offset in pixels]
        left, top, right, bottom = min(xs), min(ys), max(xs) + 1, max(ys) + 1
        padding = 12
        subject = Image.new("RGBA", (right - left + padding * 2, bottom - top + padding * 2), (0, 0, 0, 0))
        target = subject.load()
        for offset in pixels:
            y, x = divmod(offset, cleaned.width)
            target[x - left + padding, y - top + padding] = source[x, y]
        cx, cy = centers[index]
        subjects.append((cy, cx, subject))

    ordered: list[Image.Image] = []
    by_row = sorted(subjects, key=lambda item: item[0])
    for start in range(0, count, columns):
        ordered.extend(item[2] for item in sorted(by_row[start:start + columns], key=lambda item: item[1]))
    return ordered


def is_bird_pixel(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    if alpha <= 16:
        return False
    pale = red > 135 and green > 140 and blue > 145
    blue_feather = blue > 110 and blue > red * 1.05 and blue > green * 1.01 and red > 50
    pink = red > 130 and red > green * 1.08 and red > blue * 1.02
    return pale or blue_feather or pink


def bird_points(image: Image.Image) -> list[tuple[int, int]]:
    return [(index % image.width, index // image.width)
            for index, pixel in enumerate(image.get_flattened_data()) if is_bird_pixel(pixel)]


def bird_area(image: Image.Image) -> int:
    return len(bird_points(image))


def foot_anchor(image: Image.Image) -> tuple[int, int]:
    points = bird_points(image)
    if not points:
        raise ValueError("frame has no detectable bird pixels")
    left, right = min(x for x, _ in points), max(x for x, _ in points)
    top, bottom = min(y for _, y in points), max(y for _, y in points)
    lower = top + round((bottom - top) * 0.58)
    pink = []
    for y in range(lower, image.height):
        for x in range(left, right + 1):
            red, green, blue, alpha = image.getpixel((x, y))
            if alpha > 24 and red > 130 and red > green * 1.08 and red > blue * 1.02:
                pink.append((x, y))
    if not pink:
        return (round(median(x for x, _ in points if _ >= bottom - 3)), bottom)
    support_y = max(y for _, y in pink)
    support_x = round(median(x for x, y in pink if y >= support_y - 8))
    return support_x, support_y


def reference_area() -> int:
    reference = Image.open(OUTPUT_DIR / "garden-walk-left-v2.png").convert("RGBA")
    return round(median(bird_area(reference.crop((index * 540, 0, (index + 1) * 540, 540))) for index in range(16)))


def normalize_sheet(spec: Sheet, target_area: int) -> list[Image.Image]:
    source = Image.open(SOURCE_DIR / spec.source).convert("RGBA")
    cells = subject_cells(source, spec.columns * spec.rows, spec.columns, spec.preserve)
    if spec.output == "room-sleep-side-v3.png":
        # One generated mid-cycle pose changes blanket perspective; repeat the
        # adjacent quiet-breath frame so the bed silhouette never pops.
        cells[7] = cells[6].copy()
    source_area = median(bird_area(cell) for cell in cells)
    scale = max(0.45, min(1.35, sqrt(target_area / source_area)))
    # Sleep art is intentionally a compact horizontal silhouette rather than a standing bird.
    if spec.output == "room-sleep-side-v3.png":
        scale = min(scale, 1.0)
    frames: list[Image.Image] = []
    for cell in cells:
        frame_scale = scale
        max_frame_scale = 1.55 if spec.output == "garden-preen-v2.png" else 1.35
        frame_scale = max(0.45, min(max_frame_scale, sqrt(target_area / bird_area(cell))))
        if spec.output == "room-sleep-side-v3.png":
            frame_scale = min(frame_scale, 1.0)
        resized = cell.resize((max(1, round(cell.width * frame_scale)), max(1, round(cell.height * frame_scale))), Image.Resampling.LANCZOS)
        box = resized.getchannel("A").getbbox()
        if box is None:
            raise ValueError(f"{spec.source}: empty frame")
        if spec.grounded:
            foot_x, foot_y = foot_anchor(resized)
            if spec.preserve == "water" and box[3] > foot_y + 23:
                clipped_alpha = resized.getchannel("A")
                clipped_alpha.paste(0, (0, foot_y + 23, resized.width, resized.height))
                resized.putalpha(clipped_alpha)
                box = resized.getchannel("A").getbbox()
                if box is None:
                    raise ValueError(f"{spec.source}: empty frame after water-stream trim")
            paste_x = round(spec.frame_width / 2 - foot_x)
            paste_y = SUPPORT[1] - foot_y
        else:
            paste_x = round(spec.frame_width / 2 - (box[0] + box[2]) / 2)
            paste_y = 476 - box[3]
        paste_x = max(8 - box[0], min(paste_x, spec.frame_width - 8 - box[2]))
        paste_y = max(8 - box[1], min(paste_y, spec.frame_height - 8 - box[3]))
        frame = Image.new("RGBA", (spec.frame_width, spec.frame_height), (0, 0, 0, 0))
        frame.alpha_composite(resized, (paste_x, paste_y))
        frames.append(frame)
    strip = Image.new("RGBA", (spec.frame_width * len(frames), spec.frame_height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        strip.alpha_composite(frame, (index * spec.frame_width, 0))
    strip.save(OUTPUT_DIR / spec.output, optimize=True)
    print(f"WROTE {spec.output}: {len(frames)} frames, scale={scale:.3f}")
    return frames


def save_walk_right(frames: list[Image.Image]) -> None:
    mirrored = [ImageOps.mirror(frame) for frame in frames]
    strip = Image.new("RGBA", (540 * len(mirrored), 540), (0, 0, 0, 0))
    for index, frame in enumerate(mirrored):
        strip.alpha_composite(frame, (index * 540, 0))
    strip.save(OUTPUT_DIR / "garden-walk-right-v3.png", optimize=True)
    print("WROTE garden-walk-right-v3.png: 16 mirrored frames")


def save_sleep_reactions(target_area: int) -> None:
    source = Image.open(SOURCE_DIR / "sleep-reactions-side-v3-contact.png").convert("RGBA")
    cells = subject_cells(source, 2, 2, "sleep")
    source_area = median(bird_area(cell) for cell in cells)
    scale = max(0.45, min(1.0, sqrt(target_area / source_area)))
    names = ("room-sleep-look-side-v3.png", "room-sleep-angry-side-v3.png")
    for cell, name in zip(cells, names):
        resized = cell.resize((round(cell.width * scale), round(cell.height * scale)), Image.Resampling.LANCZOS)
        box = resized.getchannel("A").getbbox()
        if box is None:
            raise ValueError(f"{name}: empty")
        paste_x = max(8 - box[0], min(round(300 - (box[0] + box[2]) / 2), 592 - box[2]))
        paste_y = max(8 - box[1], min(476 - box[3], 532 - box[3]))
        frame = Image.new("RGBA", (600, 540), (0, 0, 0, 0))
        frame.alpha_composite(resized, (paste_x, paste_y))
        frame.save(OUTPUT_DIR / name, optimize=True)
        print(f"WROTE {name}")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    target_area = reference_area()
    walk_frames: list[Image.Image] = []
    sleep_frames: list[Image.Image] = []
    for spec in SHEETS:
        output = normalize_sheet(spec, target_area)
        if spec.output == "garden-walk-left-v3.png":
            walk_frames = output
        if spec.output == "room-sleep-side-v3.png":
            sleep_frames = output
    save_walk_right(walk_frames)
    sleep_target = round(median(bird_area(frame) for frame in sleep_frames))
    save_sleep_reactions(sleep_target)


if __name__ == "__main__":
    main()
