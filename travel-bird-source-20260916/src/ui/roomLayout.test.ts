import { describe, expect, test } from "vitest";
import { ROOM, ROOM_HOTSPOTS, ROOM_SPRITES, hotspotStyle, spriteStyle } from "./roomLayout";

describe("room bird physical contact layout", () => {
  test("uses measured foot anchor and branch contact in the shared art plane", () => {
    const style = spriteStyle(ROOM_SPRITES.bird);
    const scale = ROOM_SPRITES.bird.width / ROOM_SPRITES.bird.source.width;
    expect(ROOM_SPRITES.bird.anchorMode).toBe("support-foot");
    expect(ROOM_SPRITES.bird.supportAnchor).toEqual({ x: 238, y: 329 });
    expect(ROOM_SPRITES.bird.branchSupport).toEqual({ point: { x: 668, y: 708 }, line: { from: { x: 638, y: 713 }, to: { x: 668, y: 708 } } });
    expect(style.left).toBe(`${(668 - 238 * scale) / ROOM.width * 100}%`);
    expect(style.top).toBe(`${(708 - 329 * scale) / ROOM.height * 100}%`);
    expect(style.transformOrigin).toBe(`${238 / 420 * 100}% ${329 / 540 * 100}%`);
  });
});

describe("room interaction geometry", () => {
  test("keeps hotspot coordinates as top-left bounds in the shared art plane", () => {
    const expected = {
      bird: { x: 560, y: 520, width: 260, height: 250 },
      travelBag: { x: 340, y: 920, width: 220, height: 140 },
      kitchen: { x: 0, y: 1150, width: 285, height: 370 },
      pot: { x: 85, y: 1190, width: 150, height: 150 },
      cabinet: { x: 700, y: 1090, width: 241, height: 430 },
      exit: { x: 465, y: 1430, width: 240, height: 200 }
    } as const;

    for (const [id, bounds] of Object.entries(expected)) {
      const hotspot = ROOM_HOTSPOTS.find((target) => target.id === id);
      expect(hotspot).toMatchObject(bounds);
      const style = hotspotStyle(hotspot!);
      expect(style.left).toBe(`${bounds.x / ROOM.width * 100}%`);
      expect(style.top).toBe(`${bounds.y / ROOM.height * 100}%`);
    }
  });
});
