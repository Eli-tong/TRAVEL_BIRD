from __future__ import annotations

from pathlib import Path
from statistics import median

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "public" / "art" / "bird-routine"
STRIPS = {
    "garden-walk-left-v3.png": (16, 540, 540, 1.10),
    "garden-walk-right-v3.png": (16, 540, 540, 1.10),
    "garden-water-pickup-v3.png": (12, 540, 540, 1.12),
    "garden-water-pour-v3.png": (16, 540, 540, 1.12),
    "garden-water-putdown-v3.png": (12, 540, 540, 1.12),
    "garden-preen-v2.png": (24, 540, 540, 1.20),
    "garden-sunbathe-v2.png": (8, 540, 540, 1.10),
    "room-sleep-side-v3.png": (16, 600, 540, 1.10),
    "room-wake-side-v3.png": (12, 600, 540, 1.25),
    "room-land-branch-v1.png": (12, 540, 540, 1.25),
}
REACTIONS = ("room-sleep-look-side-v3.png", "room-sleep-angry-side-v3.png")
GROUNDED = {
    "garden-walk-left-v3.png", "garden-walk-right-v3.png",
    "garden-water-pickup-v3.png", "garden-water-pour-v3.png",
    "garden-water-putdown-v3.png", "garden-preen-v2.png",
    "garden-sunbathe-v2.png", "room-land-branch-v1.png",
}


def frames(image: Image.Image, count: int, width: int, height: int):
    for index in range(count):
        yield index, image.crop((index * width, 0, (index + 1) * width, height))


def is_bird_pixel(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    if alpha <= 16:
        return False
    return ((red > 135 and green > 140 and blue > 145)
            or (blue > 110 and blue > red * 1.05 and blue > green * 1.01 and red > 50)
            or (red > 130 and red > green * 1.08 and red > blue * 1.02))


def bird_area(frame: Image.Image) -> int:
    return sum(is_bird_pixel(pixel) for pixel in frame.get_flattened_data())


def foot_support(frame: Image.Image) -> int:
    points = [(index % frame.width, index // frame.width)
              for index, pixel in enumerate(frame.get_flattened_data()) if is_bird_pixel(pixel)]
    top, bottom = min(y for _, y in points), max(y for _, y in points)
    lower = top + round((bottom - top) * 0.58)
    pink_y = []
    for x, y in points:
        if y < lower:
            continue
        red, green, blue, alpha = frame.getpixel((x, y))
        if alpha > 24 and red > 130 and red > green * 1.08 and red > blue * 1.02:
            pink_y.append(y)
    return max(pink_y) if pink_y else bottom


def validate_strip(filename: str, spec: tuple[int, int, int, float]) -> list[tuple[int, int, int, int]]:
    count, width, height, max_ratio = spec
    path = ART_DIR / filename
    if not path.exists():
        raise AssertionError(f"missing sprite strip: {path}")
    image = Image.open(path).convert("RGBA")
    if image.size != (count * width, height):
        raise AssertionError(f"{filename}: expected {(count * width, height)}, got {image.size}")
    areas: list[int] = []
    boxes: list[tuple[int, int, int, int]] = []
    for index, frame in frames(image, count, width, height):
        alpha = frame.getchannel("A")
        box = alpha.getbbox()
        if box is None:
            raise AssertionError(f"{filename}: frame {index + 1} is empty")
        if box[0] < 8 or box[1] < 8 or box[2] > width - 8 or box[3] > height - 8:
            raise AssertionError(f"{filename}: frame {index + 1} violates the 8px clear margin: {box}")
        support = foot_support(frame)
        if filename in GROUNDED and not 507 <= support <= 511:
            raise AssertionError(f"{filename}: frame {index + 1} support is {support}, expected 509±2")
        areas.append(bird_area(frame))
        boxes.append(box)
    if min(areas) <= 0 or max(areas) / min(areas) > max_ratio:
        raise AssertionError(f"{filename}: apparent area ratio {max(areas) / min(areas):.3f} exceeds {max_ratio:.2f}")
    print(f"PASS {filename}: {count} frames, ratio={max(areas) / min(areas):.3f}")
    return boxes


def validate_reactions(sleep_width: float) -> None:
    for filename in REACTIONS:
        path = ART_DIR / filename
        if not path.exists():
            raise AssertionError(f"missing sleep reaction: {path}")
        image = Image.open(path).convert("RGBA")
        if image.size != (600, 540):
            raise AssertionError(f"{filename}: expected 600x540, got {image.size}")
        box = image.getchannel("A").getbbox()
        if box is None:
            raise AssertionError(f"{filename}: empty")
        ratio = (box[2] - box[0]) / sleep_width
        if not 0.85 <= ratio <= 1.15:
            raise AssertionError(f"{filename}: silhouette width ratio {ratio:.3f} outside 15%")
        print(f"PASS {filename}: silhouette ratio={ratio:.3f}")


def main() -> None:
    sleep_boxes: list[tuple[int, int, int, int]] = []
    for filename, spec in STRIPS.items():
        boxes = validate_strip(filename, spec)
        if filename == "room-sleep-side-v3.png":
            sleep_boxes = boxes
    sleep_width = sum(box[2] - box[0] for box in sleep_boxes) / len(sleep_boxes)
    validate_reactions(sleep_width)


if __name__ == "__main__":
    main()
