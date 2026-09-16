"""Deterministically extract the approved bird and travel bag with hand masks.

Run with the bundled workspace Python (Pillow + NumPy). The masks are authored in
the 944x1674 approved-source coordinate system and are saved for later adjustment.
No generated/checkerboard images are read by this script.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "assets" / "concepts" / "treehouse-interior-direction-01.png"
BACKGROUND_PATH = ROOT / "assets" / "derived" / "treehouse-interior-background.png"
DERIVED = ROOT / "assets" / "derived"
MASK_DIR = DERIVED / "masks"
CHECK_DIR = ROOT / "output" / "matting-inspection"
SCALE = 4


# Points sit on the centre of the approved illustration's dark outer contour.
# Feet/toes are separate so branch-colored gaps remain transparent.
BIRD_POLYGONS = [
    [
        (577, 663), (563, 653), (555, 638), (553, 620), (556, 601),
        (563, 581), (572, 562), (585, 547), (600, 536), (617, 527),
        (635, 525), (653, 530), (669, 540), (681, 554), (687, 570),
        (686, 586), (694, 600), (699, 616), (700, 635), (696, 652),
        (688, 669), (680, 680), (670, 686), (658, 689), (647, 691),
        (636, 692), (624, 691), (611, 689), (599, 684), (586, 677),
    ],
    [
        (590, 646), (584, 660), (574, 674), (562, 688), (548, 701),
        (537, 710), (534, 716), (537, 720), (547, 720), (559, 716),
        (568, 719), (579, 715), (590, 705), (599, 692), (605, 677),
        (601, 660),
    ],
    [(614, 685), (621, 685), (623, 702), (620, 708), (615, 704)],
    [(617, 701), (631, 700), (642, 705), (650, 712), (648, 717), (642, 714), (633, 709), (620, 710)],
    [(617, 701), (608, 701), (599, 705), (594, 710), (595, 714), (601, 712), (609, 707), (621, 708)],
    [(618, 706), (625, 710), (630, 717), (630, 723), (626, 725), (623, 719), (615, 711)],
    [(645, 685), (653, 684), (655, 701), (652, 706), (647, 702)],
    [(651, 700), (666, 699), (680, 704), (692, 710), (697, 716), (695, 722), (690, 721), (686, 716), (677, 712), (655, 710)],
    [(651, 700), (641, 700), (633, 703), (631, 708), (636, 711), (644, 707), (655, 707)],
    [(655, 706), (663, 710), (668, 716), (666, 721), (661, 720), (658, 715), (651, 710)],
]


# The rear strap is a separate loop. Its visible inner opening is explicitly cut
# out below; the hidden part behind the bag is not invented.
BAG_POLYGONS = [
    [
        (370, 992), (374, 965), (378, 940), (385, 916), (397, 899),
        (411, 890), (424, 890), (436, 899), (444, 911), (448, 927),
        (439, 932), (432, 918), (421, 907), (410, 906), (400, 916),
        (394, 934), (390, 957), (387, 980), (384, 998),
    ],
    [
        (386, 968), (389, 946), (397, 928), (409, 917), (425, 912),
        (444, 908), (510, 908), (523, 916), (528, 931), (531, 950),
        (532, 974), (529, 990), (519, 999), (505, 1003), (411, 1005),
        (397, 1000), (388, 989),
    ],
    [(522, 923), (529, 929), (532, 946), (533, 968), (531, 982), (527, 985), (525, 970)],
]

BAG_HOLES = [
    [
        (384, 970), (388, 946), (395, 925), (404, 911), (414, 903),
        (424, 903), (434, 911), (439, 921), (437, 927), (429, 918),
        (419, 912), (411, 917), (403, 930), (398, 949), (396, 969),
    ]
]


def _scaled(points: list[tuple[int, int]]) -> list[tuple[int, int]]:
    return [(x * SCALE, y * SCALE) for x, y in points]


def make_mask(size: tuple[int, int], polygons: list[list[tuple[int, int]]], holes: list[list[tuple[int, int]]] | None = None) -> Image.Image:
    large = Image.new("L", (size[0] * SCALE, size[1] * SCALE), 0)
    draw = ImageDraw.Draw(large)
    for polygon in polygons:
        draw.polygon(_scaled(polygon), fill=255)
    for hole in holes or []:
        draw.polygon(_scaled(hole), fill=0)
    # Supersampling supplies a crisp, subpixel antialiased edge without broad blur.
    return large.resize(size, Image.Resampling.LANCZOS)


def _component_from_seeds(binary: np.ndarray, seeds: list[tuple[int, int]]) -> np.ndarray:
    """Return all 8-connected candidate components touched by source-space seeds."""
    height, width = binary.shape
    result = np.zeros_like(binary, dtype=bool)
    visited = np.zeros_like(binary, dtype=bool)
    for seed_x, seed_y in seeds:
        if not (0 <= seed_x < width and 0 <= seed_y < height) or not binary[seed_y, seed_x] or visited[seed_y, seed_x]:
            continue
        stack = [(seed_x, seed_y)]
        visited[seed_y, seed_x] = True
        while stack:
            x, y = stack.pop()
            result[y, x] = True
            for ny in range(max(0, y - 1), min(height, y + 2)):
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    if binary[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        stack.append((nx, ny))
    return result


def _fill_holes(binary: np.ndarray) -> np.ndarray:
    """Fill only enclosed holes; transparent gaps connected to the crop edge remain."""
    height, width = binary.shape
    outside = np.zeros_like(binary, dtype=bool)
    stack: list[tuple[int, int]] = []
    for x in range(width):
        stack.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        stack.extend(((0, y), (width - 1, y)))
    while stack:
        x, y = stack.pop()
        if outside[y, x] or binary[y, x]:
            continue
        outside[y, x] = True
        if x > 0:
            stack.append((x - 1, y))
        if x + 1 < width:
            stack.append((x + 1, y))
        if y > 0:
            stack.append((x, y - 1))
        if y + 1 < height:
            stack.append((x, y + 1))
    return binary | (~outside)


def _component_areas(binary: np.ndarray) -> list[int]:
    height, width = binary.shape
    visited = np.zeros_like(binary, dtype=bool)
    areas: list[int] = []
    for y in range(height):
        for x in range(width):
            if not binary[y, x] or visited[y, x]:
                continue
            area = 0
            stack = [(x, y)]
            visited[y, x] = True
            while stack:
                current_x, current_y = stack.pop()
                area += 1
                for next_y in range(max(0, current_y - 1), min(height, current_y + 2)):
                    for next_x in range(max(0, current_x - 1), min(width, current_x + 2)):
                        if binary[next_y, next_x] and not visited[next_y, next_x]:
                            visited[next_y, next_x] = True
                            stack.append((next_x, next_y))
            areas.append(area)
    return sorted(areas, reverse=True)


def _dilate(binary: np.ndarray, radius: int) -> np.ndarray:
    padded = np.pad(binary, radius, mode="constant")
    height, width = binary.shape
    result = np.zeros_like(binary, dtype=bool)
    for dy in range(radius * 2 + 1):
        for dx in range(radius * 2 + 1):
            result |= padded[dy : dy + height, dx : dx + width]
    return result


def difference_guided_mask(
    source: Image.Image,
    background: Image.Image,
    supports: list[list[tuple[int, int]]],
    seeds: list[tuple[int, int]],
    holes: list[list[tuple[int, int]]] | None = None,
    threshold: int = 45,
    contact_filter: str | None = None,
) -> Image.Image:
    """Use the clean plate to locate true edges inside hand-labelled supports."""
    source_array = np.asarray(source.convert("RGB"), dtype=np.int16)
    background_array = np.asarray(background.convert("RGB"), dtype=np.int16)
    difference = np.max(np.abs(source_array - background_array), axis=2)
    support = np.asarray(make_mask(source.size, supports)) >= 128
    candidate = (difference >= threshold) & support
    selected = _component_from_seeds(candidate, seeds)
    selected = _fill_holes(selected) & support

    if contact_filter == "bird":
        red, green, blue = (source_array[:, :, index] for index in range(3))
        blue_feather = (blue > red + 22) & (blue > green + 5) & (blue > 105)
        pink_foot = (red > 140) & (green > 70) & (blue > 65) & (red > green + 14) & (red - blue < 120)
        visible_contact = _dilate(blue_feather, 1) | _dilate(pink_foot, 1)
        yy, xx = np.indices(selected.shape)
        contact_zone = yy >= 693
        visible_contact &= ((xx < 610) | (xx >= 590))
        selected[contact_zone] &= visible_contact[contact_zone]

        # Remove warm wall flecks only from the outer two-pixel contour. The
        # white/blue plumage stays untouched because this is spatially and
        # chromatically constrained, not a global light-color key.
        interior = selected & ~_dilate(~selected, 2)
        boundary = selected & ~interior
        warm_wall = (
            (red > 115)
            & (red > blue + 18)
            & (green > blue + 8)
            & (red - green < 42)
        )
        selected &= ~(boundary & warm_wall)
        selected = _fill_holes(selected)

    if holes:
        hole_mask = np.asarray(make_mask(source.size, holes)) >= 128
        selected &= ~hole_mask

    # Only a subpixel antialias fringe; no broad feathering or color-key removal.
    hard = Image.fromarray(np.where(selected, 255, 0).astype(np.uint8), "L")
    soft = np.asarray(hard.filter(ImageFilter.GaussianBlur(0.45))).copy()
    if contact_filter == "bird":
        enclosed = _fill_holes(soft >= 16) & ~(soft >= 16)
        soft[enclosed] = 255
    return Image.fromarray(soft, "L")


def alpha_report(image: Image.Image) -> dict[str, int | str | bool]:
    rgba = image.convert("RGBA")
    alpha = np.asarray(rgba.getchannel("A"))
    nonzero = alpha > 0
    solid = alpha >= 16
    enclosed = _fill_holes(solid) & ~solid
    enclosed_areas = _component_areas(enclosed)
    return {
        "mode": image.mode,
        "alpha_min": int(alpha.min()),
        "alpha_max": int(alpha.max()),
        "transparent_pixels": int(np.count_nonzero(alpha == 0)),
        "opaque_pixels": int(np.count_nonzero(alpha == 255)),
        "partial_pixels": int(np.count_nonzero((alpha > 0) & (alpha < 255))),
        "touches_all_crop_sides": bool(nonzero[0].any() and nonzero[-1].any() and nonzero[:, 0].any() and nonzero[:, -1].any()),
        "enclosed_hole_count": len(enclosed_areas),
        "enclosed_hole_areas": enclosed_areas,
    }


def save_cutout(source: Image.Image, mask: Image.Image, path: Path) -> tuple[tuple[int, int, int, int], Image.Image]:
    alpha = np.asarray(mask)
    ys, xs = np.nonzero(alpha)
    box = (int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1))
    rgba = source.convert("RGBA")
    rgba.putalpha(mask)
    cutout = rgba.crop(box)
    cutout.save(path, optimize=True)
    return box, cutout


def make_edge_check(cutout: Image.Image, path: Path) -> None:
    scale = min(3, max(1, 720 // max(cutout.size)))
    enlarged = cutout.resize((cutout.width * scale, cutout.height * scale), Image.Resampling.NEAREST)
    margin = 28
    panel_size = (enlarged.width + margin * 2, enlarged.height + margin * 2)
    light = Image.new("RGBA", panel_size, "#f7f1df")
    dark = Image.new("RGBA", panel_size, "#24302c")
    light.alpha_composite(enlarged, (margin, margin))
    dark.alpha_composite(enlarged, (margin, margin))
    check = Image.new("RGBA", (panel_size[0] * 2, panel_size[1]), "white")
    check.alpha_composite(light, (0, 0))
    check.alpha_composite(dark, (panel_size[0], 0))
    check.convert("RGB").save(path, optimize=True)


def main() -> None:
    DERIVED.mkdir(parents=True, exist_ok=True)
    MASK_DIR.mkdir(parents=True, exist_ok=True)
    CHECK_DIR.mkdir(parents=True, exist_ok=True)

    source = Image.open(SOURCE_PATH).convert("RGB")
    background = Image.open(BACKGROUND_PATH).convert("RGB").resize(source.size, Image.Resampling.LANCZOS)

    bird_mask = difference_guided_mask(
        source,
        background,
        BIRD_POLYGONS,
        [(625, 590), (580, 700), (618, 704), (655, 704)],
        threshold=35,
        contact_filter="bird",
    )
    bag_mask = difference_guided_mask(
        source,
        background,
        BAG_POLYGONS,
        [(460, 950), (409, 900), (379, 986), (531, 960)],
        BAG_HOLES,
    )
    bird_mask.save(MASK_DIR / "blue-quaker-calm-mask.png", optimize=True)
    bag_mask.save(MASK_DIR / "travel-bag-mask.png", optimize=True)

    bird_box, bird = save_cutout(source, bird_mask, DERIVED / "blue-quaker-calm-cutout.png")
    bag_box, bag = save_cutout(source, bag_mask, DERIVED / "travel-bag-cutout.png")

    preview = background.convert("RGBA")
    preview.alpha_composite(bird, (bird_box[0], bird_box[1]))
    preview.alpha_composite(bag, (bag_box[0], bag_box[1]))
    preview.convert("RGB").save(DERIVED / "approved-room-restored-preview.png", optimize=True)

    make_edge_check(bird, CHECK_DIR / "blue-quaker-edge-check.png")
    make_edge_check(bag, CHECK_DIR / "travel-bag-edge-check.png")

    anchors = {"bird": (647, 713), "bag": (461, 1004)}
    boxes = {"bird": bird_box, "bag": bag_box}
    cutouts = {"bird": bird, "bag": bag}
    metadata = {
        "source": SOURCE_PATH.relative_to(ROOT).as_posix(),
        "clean_background": BACKGROUND_PATH.relative_to(ROOT).as_posix(),
        "source_size": list(source.size),
        "method": "clean-plate difference constrained by 4x hand-authored support masks and connected foreground seeds; no color-key deletion",
        "edge_policy": "difference-located contour with 0.45px antialias only; no broad feathering",
        "difference_thresholds": {"bird": 35, "bag": 45},
        "mask_files": {
            "bird": "assets/derived/masks/blue-quaker-calm-mask.png",
            "bag": "assets/derived/masks/travel-bag-mask.png",
        },
        "preview": "assets/derived/approved-room-restored-preview.png",
        "edge_checks": {
            "bird": "output/matting-inspection/blue-quaker-edge-check.png",
            "bag": "output/matting-inspection/travel-bag-edge-check.png",
        },
        "layers": {},
    }
    for name in ("bird", "bag"):
        box = boxes[name]
        anchor = anchors[name]
        metadata["layers"][name] = {
            "crop_box_xyxy": list(box),
            "anchor_in_source_xy": list(anchor),
            "anchor_in_cutout_xy": [anchor[0] - box[0], anchor[1] - box[1]],
            "visible_only": True,
            "occlusion_note": "feet stop at the visible branch contact" if name == "bird" else "rear strap remains visible only where it is not hidden by the bag body",
            "alpha_report": alpha_report(cutouts[name]),
        }
    (DERIVED / "approved-layer-metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
