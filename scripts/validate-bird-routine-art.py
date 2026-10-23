from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "public" / "art" / "bird-routine"
FRAME_WIDTH = 540
FRAME_HEIGHT = 540
EXPECTED = {
    "garden-walk-left-v2.png": 16,
    "garden-walk-right-v2.png": 16,
    "garden-preen.png": 16,
    "garden-forage.png": 16,
    "garden-water-pickup-v2.png": 12,
    "garden-water-pour-v2.png": 16,
    "garden-water-putdown-v2.png": 12,
}


def visible_count(alpha: Image.Image) -> int:
    return sum(1 for value in alpha.get_flattened_data() if value > 8)


def component_areas(alpha: Image.Image) -> list[int]:
    width, height = alpha.size
    pixels = alpha.load()
    visited = bytearray(width * height)
    areas: list[int] = []
    for y in range(height):
        for x in range(width):
            offset = y * width + x
            if visited[offset] or pixels[x, y] <= 8:
                continue
            visited[offset] = 1
            stack = [offset]
            area = 0
            while stack:
                current = stack.pop()
                area += 1
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
            areas.append(area)
    return sorted(areas, reverse=True)


def validate_strip(filename: str, frame_count: int) -> None:
    path = ART_DIR / filename
    if not path.exists():
        raise AssertionError(f"missing sprite strip: {path}")
    image = Image.open(path).convert("RGBA")
    expected_size = (FRAME_WIDTH * frame_count, FRAME_HEIGHT)
    if image.size != expected_size:
        raise AssertionError(f"{filename}: expected {expected_size}, got {image.size}")

    visible_areas: list[int] = []
    for index in range(frame_count):
        frame = image.crop((index * FRAME_WIDTH, 0, (index + 1) * FRAME_WIDTH, FRAME_HEIGHT))
        alpha = frame.getchannel("A")
        box = alpha.getbbox()
        if box is None:
            raise AssertionError(f"{filename}: frame {index + 1} is empty")
        area = visible_count(alpha)
        if area < 20_000:
            raise AssertionError(f"{filename}: frame {index + 1} is unexpectedly sparse")
        if any(alpha.getpixel((x, 0)) > 8 for x in range(FRAME_WIDTH)):
            raise AssertionError(f"{filename}: frame {index + 1} is cropped at the top")
        if any(alpha.getpixel((0, y)) > 8 or alpha.getpixel((FRAME_WIDTH - 1, y)) > 8 for y in range(FRAME_HEIGHT)):
            raise AssertionError(f"{filename}: frame {index + 1} is cropped at a side")
        visible_areas.append(area)
        if filename == "garden-forage.png":
            fragments = component_areas(alpha)[1:]
            if any(fragment > 24 for fragment in fragments):
                raise AssertionError(f"{filename}: frame {index + 1} contains disconnected edge fragments")

    if max(visible_areas) / min(visible_areas) > 1.45:
        raise AssertionError(f"{filename}: apparent character size changes too much between frames")
    print(f"PASS {filename}: {frame_count} frames")


def main() -> None:
    for filename, frame_count in EXPECTED.items():
        validate_strip(filename, frame_count)


if __name__ == "__main__":
    main()
