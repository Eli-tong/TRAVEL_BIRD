import type { CSSProperties } from "react";
import { describe, expect, test } from "vitest";
import type { BirdRoutineState } from "../domain/types";
import { ROOM, ROOM_HOTSPOTS, ROOM_SPRITES, hotspotStyle, roomRoutinePlacement, spriteStyle } from "./roomLayout";

const sourcePixels = (value: unknown, dimension: number) =>
  Number.parseFloat(String(value)) / 100 * dimension;

const expectBox = (
  style: CSSProperties,
  expected: { left: number; top: number; width: number; height: number },
) => {
  expect(sourcePixels(style.left, ROOM.width)).toBeCloseTo(expected.left, 8);
  expect(sourcePixels(style.top, ROOM.height)).toBeCloseTo(expected.top, 8);
  expect(sourcePixels(style.width, ROOM.width)).toBeCloseTo(expected.width, 8);
  expect(sourcePixels(style.height, ROOM.height)).toBeCloseTo(expected.height, 8);
};

describe("room bird physical contact layout", () => {
  test("uses measured foot anchor and branch contact in the shared art plane", () => {
    const style = spriteStyle(ROOM_SPRITES.bird);
    const scale = ROOM_SPRITES.bird.width / ROOM_SPRITES.bird.source.width;
    expect(ROOM_SPRITES.bird.width).toBe(168);
    expect(ROOM_SPRITES.bird.anchorMode).toBe("support-foot");
    expect(ROOM_SPRITES.bird.anchor).toEqual({ x: 210, y: 509 });
    expect(ROOM_SPRITES.bird.supportAnchor).toEqual({ x: 210, y: 509 });
    expect(ROOM_SPRITES.bird.branchSupport).toEqual({ point: { x: 668, y: 708 }, line: { from: { x: 638, y: 713 }, to: { x: 668, y: 708 } } });
    expect(style.left).toBe(`${(668 - 210 * scale) / ROOM.width * 100}%`);
    expect(style.top).toBe(`${(708 - 509 * scale) / ROOM.height * 100}%`);
    expect(style.transformOrigin).toBe(`${210 / 420 * 100}% ${509 / 540 * 100}%`);
  });
});

describe("room autonomous flight and bed placement", () => {
  test("pins sleep, wake, and bed reactions to the approved shared contact", () => {
    const sleep: BirdRoutineState = {
      location: "room", activity: "room-sleep", roomSpot: "bed",
      activityStartedAt: 1_000, nextDecisionAt: 31_000, sequenceStep: 2,
    };
    const wake: BirdRoutineState = {
      ...sleep, activity: "room-wake", plannedActivity: "room-flight",
    };

    expectBox(roomRoutinePlacement(sleep, 1_000, "calm").style, {
      left: 215, top: 132, width: 240, height: 216,
    });
    expectBox(roomRoutinePlacement(wake, 1_000, "calm").style, {
      left: 255.8, top: 196.736, width: 158.4, height: 142.56,
    });
    for (const mood of ["happy", "angry"] as const) {
      expectBox(roomRoutinePlacement(sleep, 1_000, mood).style, {
        left: 255.8, top: 196.736, width: 158.4, height: 142.56,
      });
    }

    const contact = (style: CSSProperties, anchorY: number) => ({
      x: sourcePixels(style.left, ROOM.width) + sourcePixels(style.width, ROOM.width) * 300 / 600,
      y: sourcePixels(style.top, ROOM.height) + sourcePixels(style.width, ROOM.width) * anchorY / 600,
    });
    for (const placement of [
      roomRoutinePlacement(sleep, 1_000, "calm"),
      roomRoutinePlacement(wake, 1_000, "calm"),
    ]) {
      const point = contact(placement.style, 476);
      expect(point.x).toBeCloseTo(335, 8);
      expect(point.y).toBeCloseTo(322.4, 8);
    }
  });

  test("scales landing to eighty-eight percent without moving the branch contact", () => {
    const landing: BirdRoutineState = {
      location: "room", activity: "room-land", roomSpot: "branch",
      plannedActivity: "room-idle", activityStartedAt: 1_000,
      nextDecisionAt: 2_200, sequenceStep: 5,
    };
    expectBox(roomRoutinePlacement(landing).style, {
      left: 572.96, top: 528.832, width: 190.08, height: 190.08,
    });
  });

  test("plays the persisted landing squash at the compact branch placement", () => {
    const landing: BirdRoutineState = {
      location: "room", activity: "room-land", roomSpot: "branch", plannedActivity: "room-idle",
      activityStartedAt: 15_000, nextDecisionAt: 16_200, sequenceStep: 5,
    };
    const placement = roomRoutinePlacement(landing);
    expect(placement.routeId).toBeNull();
    expectBox(placement.style, {
      left: 572.96, top: 528.832, width: 190.08, height: 190.08,
    });
  });

  test("keeps every branch activity on the measured foot contact at the approved static-bird scale", () => {
    for (const activity of ["room-idle", "room-ruffle", "room-read", "room-write"] as const) {
      const placement = roomRoutinePlacement({
        location: "room", activity, roomSpot: "branch",
        activityStartedAt: 1_000, nextDecisionAt: 10_000, sequenceStep: 2,
      });
      expect(placement.routeId).toBeNull();
      expect(placement.style.width).toBe(`${216 / ROOM.width * 100}%`);
      const frameHeight = activity === "room-read" || activity === "room-write" ? 600 : 540;
      expect(placement.style.height).toBe(`${frameHeight * .4 / ROOM.height * 100}%`);
      expect(placement.style.transformOrigin).toBe(`${270 / 540 * 100}% ${509 / frameHeight * 100}%`);
      expect(placement.style.left).toBe(`${(668 - 270 * .4) / ROOM.width * 100}%`);
      expect(placement.style.top).toBe(`${(708 - 509 * .4) / ROOM.height * 100}%`);
    }
  });

  test("flies along a persisted branch-to-bed route and resumes from elapsed time", () => {
    const flight: BirdRoutineState = {
      location: "room", activity: "room-flight", roomSpot: "branch",
      flightFrom: "branch", flightTo: "bed", plannedActivity: "room-sleep",
      activityStartedAt: 10_000, nextDecisionAt: 15_000, sequenceStep: 3,
    };
    const placement = roomRoutinePlacement(flight, 12_500);
    expect(placement.routeId).toBe("branch-bed");
    expect(placement.facing).toBe("left");
    expect(placement.style["--room-route-duration" as keyof typeof placement.style]).toBe("5000ms");
    expect(placement.style["--room-route-delay" as keyof typeof placement.style]).toBe("-2500ms");
    expect(sourcePixels(placement.style["--room-route-x-3" as keyof typeof placement.style], ROOM.width))
      .toBeCloseTo(215, 8);
    expect(sourcePixels(placement.style["--room-route-y-3" as keyof typeof placement.style], ROOM.height))
      .toBeCloseTo(112.4, 8);

    const returning = roomRoutinePlacement({ ...flight, roomSpot: "bed", flightFrom: "bed", flightTo: "branch" }, 11_000);
    expect(returning.routeId).toBe("bed-branch");
    expect(returning.facing).toBe("right");
  });

  test("flies behind the existing right trunk when leaving and emerges from it when returning", () => {
    const leaving: BirdRoutineState = {
      location: "room", activity: "room-leave", roomSpot: "branch",
      flightFrom: "branch", flightTo: "trunk", plannedActivity: "garden-arrive",
      activityStartedAt: 10_000, nextDecisionAt: 15_000, sequenceStep: 5,
    };
    const outbound = roomRoutinePlacement(leaving, 11_000);
    expect(outbound.routeId).toBe("branch-trunk");
    expect(outbound.facing).toBe("right");
    expect(outbound.style["--room-route-x-3" as keyof typeof outbound.style]).toBe(`${735 / ROOM.width * 100}%`);

    const arriving: BirdRoutineState = {
      ...leaving, activity: "room-arrive", roomSpot: "trunk",
      flightFrom: "trunk", flightTo: "branch", plannedActivity: "room-idle",
    };
    const inbound = roomRoutinePlacement(arriving, 11_000);
    expect(inbound.routeId).toBe("trunk-branch");
    expect(inbound.facing).toBe("left");
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
