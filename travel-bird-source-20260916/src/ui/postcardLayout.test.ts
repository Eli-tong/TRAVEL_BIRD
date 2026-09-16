import { expect, test } from "vitest";
import { postcardCopySize } from "./postcardLayout";

test("classifies postcard copy so the card can tune typography without clipping", () => {
  expect(postcardCopySize("一封短短的旅行问候。")).toBe("short");
  expect(postcardCopySize("风".repeat(71))).toBe("medium");
  expect(postcardCopySize("breeze ".repeat(30))).toBe("long");
});
