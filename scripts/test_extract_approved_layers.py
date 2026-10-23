import json
import sys
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from extract_approved_layers import alpha_report  # noqa: E402


class ApprovedLayerExtractionTests(unittest.TestCase):
    def test_cutouts_are_tight_rgba_with_real_transparency(self) -> None:
        expected_holes = {
            "blue-quaker-calm-cutout.png": 0,
            "travel-bag-cutout.png": 0,
        }
        for name, hole_count in expected_holes.items():
            path = ROOT / "assets" / "derived" / name
            with Image.open(path) as image:
                report = alpha_report(image)
            self.assertEqual(report["mode"], "RGBA")
            self.assertEqual(report["alpha_min"], 0)
            self.assertEqual(report["alpha_max"], 255)
            self.assertGreater(report["transparent_pixels"], 0)
            self.assertGreater(report["opaque_pixels"], 0)
            self.assertTrue(report["touches_all_crop_sides"])
            self.assertEqual(report["enclosed_hole_count"], hole_count)

    def test_full_canvas_masks_and_metadata_match_approved_source(self) -> None:
        with Image.open(ROOT / "assets" / "concepts" / "treehouse-interior-direction-01.png") as source:
            source_size = source.size
        for name in ("blue-quaker-calm-mask.png", "travel-bag-mask.png"):
            with Image.open(ROOT / "assets" / "derived" / "masks" / name) as mask:
                self.assertEqual(mask.mode, "L")
                self.assertEqual(mask.size, source_size)
                self.assertEqual(mask.getextrema(), (0, 255))

        metadata = json.loads((ROOT / "assets" / "derived" / "approved-layer-metadata.json").read_text(encoding="utf-8"))
        self.assertEqual(metadata["source_size"], list(source_size))
        self.assertEqual(set(metadata["layers"]), {"bird", "bag"})
        for layer in metadata["layers"].values():
            self.assertEqual(len(layer["crop_box_xyxy"]), 4)
            self.assertEqual(len(layer["anchor_in_source_xy"]), 2)
            self.assertEqual(len(layer["anchor_in_cutout_xy"]), 2)


if __name__ == "__main__":
    unittest.main()
