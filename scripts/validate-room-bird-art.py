from __future__ import annotations

from pathlib import Path
from statistics import median

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "public" / "art" / "bird-routine"
STRIPS = {
    "room-flight-left.png": (16, 2.25, 600, 540),
    "room-flight-right.png": (16, 2.25, 600, 540),
    "room-sleep.png": (16, 1.35, 600, 540),
    "room-wake.png": (12, 1.75, 600, 540),
    "room-sleep-bed-v2.png": (16, 1.35, 600, 540),
    "room-wake-bed-v2.png": (12, 1.75, 600, 540),
    "room-idle-v2.png": (6, 1.35, 540, 540),
    "room-ruffle-v2.png": (7, 1.45, 540, 540),
    "room-read-v2.png": (8, 1.65, 540, 600),
    "room-write-v2.png": (8, 1.75, 540, 600),
}
SINGLES = {
    "room-sleep-look.png": 600, "room-sleep-angry.png": 600,
    "room-sleep-look-bed-v2.png": 600, "room-sleep-angry-bed-v2.png": 600,
    "bird-reaction-happy-v2.png": 540, "bird-reaction-angry-v2.png": 540,
}
BRANCH_REACTIONS = (
    "bird-reaction-happy-branch-v3.png",
    "bird-reaction-angry-branch-v3.png",
)


def is_bird_pixel(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    if alpha <= 16:
        return False
    return (
        (red > 135 and green > 140 and blue > 145)
        or (blue > 115 and blue > red * 1.04 and blue > green * 1.01 and red > 58)
        or (red > 125 and red > green * 1.08 and red > blue * 1.03)
        or (red > 28 and red > green * 1.22 and green > blue * 1.04)
        or max(red, green, blue) < 58
    )


def support_foot_y(image: Image.Image) -> int:
    points = [
        (index % image.width, index // image.width)
        for index, pixel in enumerate(image.get_flattened_data())
        if is_bird_pixel(pixel)
    ]
    ys = [y for _, y in points]
    lower = min(ys) + round((max(ys) - min(ys)) * 0.58)
    pink = [
        (x, y) for x, y in points if y >= lower
        and (lambda pixel: pixel[0] > 135 and pixel[0] > pixel[1] * 1.08 and pixel[0] > pixel[2] * 1.03)(image.getpixel((x, y)))
    ]
    support_y = max(y for _, y in pink)
    return round(median(y for _, y in pink if y >= support_y - 2))


def validate_frame(frame: Image.Image, name: str) -> int:
    alpha = frame.getchannel("A")
    if alpha.getbbox() is None:
        raise AssertionError(f"{name}: empty frame")
    visible = sum(1 for value in alpha.get_flattened_data() if value > 8)
    if visible < 20_000:
        raise AssertionError(f"{name}: unexpectedly sparse")
    if any(alpha.getpixel((x, 0)) > 8 or alpha.getpixel((x, frame.height - 1)) > 8 for x in range(frame.width)):
        raise AssertionError(f"{name}: cropped vertically")
    if any(alpha.getpixel((0, y)) > 8 or alpha.getpixel((frame.width - 1, y)) > 8 for y in range(frame.height)):
        raise AssertionError(f"{name}: cropped horizontally")
    return visible


def main() -> None:
    for filename, (count, max_area_ratio, frame_width, frame_height) in STRIPS.items():
        image = Image.open(ART_DIR / filename).convert("RGBA")
        if image.size != (frame_width * count, frame_height):
            raise AssertionError(f"{filename}: wrong dimensions {image.size}")
        areas = [validate_frame(image.crop((index * frame_width, 0, (index + 1) * frame_width, frame_height)), f"{filename}#{index + 1}") for index in range(count)]
        if max(areas) / min(areas) > max_area_ratio:
            raise AssertionError(f"{filename}: unstable apparent size")
        print(f"PASS {filename}: {count} frames")
    for filename, frame_width in SINGLES.items():
        image = Image.open(ART_DIR / filename).convert("RGBA")
        if image.size != (frame_width, 540):
            raise AssertionError(f"{filename}: wrong dimensions {image.size}")
        validate_frame(image, filename)
        print(f"PASS {filename}")
    for filename in BRANCH_REACTIONS:
        image = Image.open(ART_DIR / filename).convert("RGBA")
        if image.size != (540, 600):
            raise AssertionError(f"{filename}: wrong dimensions {image.size}")
        validate_frame(image, filename)
        foot_y = support_foot_y(image)
        if abs(foot_y - 509) > 2:
            raise AssertionError(f"{filename}: support foot is at y={foot_y}, expected 509")
        print(f"PASS {filename}: branch support y={foot_y}")
    sleep = Image.open(ART_DIR / "room-sleep-bed-v2.png").convert("RGBA")
    sleep_widths = [
        sleep.crop((index * 600, 0, (index + 1) * 600, 540)).getchannel("A").getbbox()[2]
        - sleep.crop((index * 600, 0, (index + 1) * 600, 540)).getchannel("A").getbbox()[0]
        for index in range(16)
    ]
    sleep_width = sum(sleep_widths) / len(sleep_widths)
    for filename in ("room-sleep-look-bed-v2.png", "room-sleep-angry-bed-v2.png"):
        reaction = Image.open(ART_DIR / filename).convert("RGBA")
        box = reaction.getchannel("A").getbbox()
        assert box is not None
        ratio = (box[2] - box[0]) / sleep_width
        if not 0.85 <= ratio <= 1.15:
            raise AssertionError(f"{filename}: interaction scale differs from sleep strip ({ratio:.2f}x)")
        print(f"PASS {filename}: sleep-scale matched")


if __name__ == "__main__":
    main()
