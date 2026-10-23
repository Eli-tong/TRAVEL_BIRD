from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "public" / "art" / "bird-routine"
CELL = 540


def load_strip(name: str, frames: int) -> Image.Image:
    path = ART / name
    assert path.exists(), f"missing sprite strip: {path}"
    image = Image.open(path).convert("RGBA")
    assert image.size == (CELL * frames, CELL), (name, image.size)
    assert image.getchannel("A").getbbox() is not None, name
    return image


def dark_outline_count(frame: Image.Image) -> int:
    pixels = frame.load()
    return sum(
        1
        for y in range(180, 480)
        for x in range(330, 520)
        if pixels[x, y][3] > 40 and max(pixels[x, y][:3]) < 110
    )


def validate_ground_anchor(name: str, image: Image.Image, frame_count: int) -> None:
    boxes = [
        image.crop((index * CELL, 0, (index + 1) * CELL, CELL)).getchannel("A").getbbox()
        for index in range(frame_count)
    ]
    assert all(box is not None for box in boxes), f"{name} has an empty frame"
    ground = [box[3] for box in boxes if box]
    assert max(ground) - min(ground) <= 24, f"{name} ground anchor drifts: {ground}"


forage = load_strip("garden-forage.png", 16)
forage_frames = [
    forage.crop((index * CELL, 0, (index + 1) * CELL, CELL))
    for index in range(16)
]
neighbor_floor = min(
    dark_outline_count(forage_frames[11]),
    dark_outline_count(forage_frames[13]),
) * 0.90
assert dark_outline_count(forage_frames[12]) >= neighbor_floor, (
    "forage frame 13 head outline is clipped"
)

hop = load_strip("garden-door-hop-right-v1.png", 8)
enter = load_strip("garden-door-enter-back-v1.png", 12)
validate_ground_anchor("hop", hop, 8)
validate_ground_anchor("enter", enter, 12)
