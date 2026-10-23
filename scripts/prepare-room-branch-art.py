from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from pathlib import Path
from statistics import median

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "public" / "art" / "bird-routine"
FRAME_SIZE = (540, 540)
SUPPORT = (270, 509)


@dataclass(frozen=True)
class Strip:
    source: str
    output: str
    count: int
    frame_height: int = 540
    shift_y: int = 0


STRIPS = (
    Strip("room-idle.png", "room-idle-v2.png", 6),
    Strip("room-ruffle.png", "room-ruffle-v2.png", 7),
    # Reading and writing props extend below the feet. Give those strips extra
    # transparent room so the feet—not the book or paper—remain on the branch.
    Strip("room-read.png", "room-read-v2.png", 8, 600, 49),
    Strip("room-write.png", "room-write-v2.png", 8, 600, 49),
)


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
    _, (left, top, right, bottom) = bird_measurements(image)
    lower = top + round((bottom - top) * 0.58)
    pink: list[tuple[int, int]] = []
    for y in range(lower, image.height):
        for x in range(left, right):
            red, green, blue, alpha = image.getpixel((x, y))
            if alpha > 24 and red > 135 and red > green * 1.08 and red > blue * 1.03:
                pink.append((x, y))
    if not pink:
        return ((left + right) // 2, bottom - 1)
    support_y = max(y for _, y in pink)
    support_xs = [x for x, y in pink if y >= support_y - 12]
    return (round(median(support_xs)), support_y)


def normalized_frame(source: Image.Image, scale: float) -> Image.Image:
    resized = source.resize(
        (max(1, round(source.width * scale)), max(1, round(source.height * scale))),
        Image.Resampling.LANCZOS,
    )
    foot_x, foot_y = foot_anchor(resized)
    box = resized.getchannel("A").getbbox()
    if box is None:
        raise ValueError("empty room action frame")
    desired_x = SUPPORT[0] - foot_x
    min_x = 8 - box[0]
    max_x = FRAME_SIZE[0] - 8 - box[2]
    paste_x = min(max(desired_x, min_x), max_x) if min_x <= max_x else desired_x
    desired_y = SUPPORT[1] - foot_y
    min_y = 8 - box[1]
    max_y = FRAME_SIZE[1] - 8 - box[3]
    paste_y = min(max(desired_y, min_y), max_y) if min_y <= max_y else desired_y
    frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    frame.alpha_composite(resized, (paste_x, paste_y))
    return frame


def target_bird_area() -> int:
    reference = Image.open(ROOT / "public" / "art" / "room-v2" / "blue-quaker-calm-corrected.png").convert("RGBA")
    return bird_measurements(reference)[0]


def prepare_strip(spec: Strip, target_area: int) -> None:
    source = Image.open(ART_DIR / spec.source).convert("RGBA")
    cells = [source.crop((index * 420, 0, (index + 1) * 420, 540)) for index in range(spec.count)]
    scale = min(1.0, sqrt(target_area / median(bird_measurements(cell)[0] for cell in cells)))
    normalized = [normalized_frame(cell, scale) for cell in cells]
    frames = []
    for frame in normalized:
        expanded = Image.new("RGBA", (FRAME_SIZE[0], spec.frame_height), (0, 0, 0, 0))
        expanded.alpha_composite(frame, (0, spec.shift_y))
        frames.append(expanded)
    output = Image.new("RGBA", (FRAME_SIZE[0] * spec.count, spec.frame_height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        output.alpha_composite(frame, (index * FRAME_SIZE[0], 0))
    output.save(ART_DIR / spec.output, optimize=True)
    print(f"WROTE {spec.output}: {spec.count} frames, scale={scale:.3f}")


def prepare_reaction(source_name: str, output_name: str, target_area: int) -> None:
    source = Image.open(ROOT / "public" / "art" / "v2" / source_name).convert("RGBA")
    scale = min(1.0, sqrt(target_area / bird_measurements(source)[0]))
    normalized_frame(source, scale).save(ART_DIR / output_name, optimize=True)
    print(f"WROTE {output_name}: scale={scale:.3f}")


def prepare_branch_reaction(source_name: str, output_name: str, target_area: int) -> None:
    source = Image.open(ROOT / "public" / "art" / "v2" / source_name).convert("RGBA")
    scale = min(1.0, sqrt(target_area / bird_measurements(source)[0]))
    resized = source.resize(
        (max(1, round(source.width * scale)), max(1, round(source.height * scale))),
        Image.Resampling.LANCZOS,
    )
    foot_x, foot_y = foot_anchor(resized)
    frame = Image.new("RGBA", (FRAME_SIZE[0], 600), (0, 0, 0, 0))
    frame.alpha_composite(resized, (SUPPORT[0] - foot_x, SUPPORT[1] - foot_y))
    frame.save(ART_DIR / output_name, optimize=True)
    print(f"WROTE {output_name}: support={SUPPORT}, scale={scale:.3f}")


def main() -> None:
    target_area = target_bird_area()
    for spec in STRIPS:
        prepare_strip(spec, target_area)
    prepare_reaction("blue_quaker-happy.webp", "bird-reaction-happy-v2.png", target_area)
    prepare_reaction("blue_quaker-angry.webp", "bird-reaction-angry-v2.png", target_area)
    prepare_branch_reaction("blue_quaker-happy.webp", "bird-reaction-happy-branch-v3.png", target_area)
    prepare_branch_reaction("blue_quaker-angry.webp", "bird-reaction-angry-branch-v3.png", target_area)


if __name__ == "__main__":
    main()
