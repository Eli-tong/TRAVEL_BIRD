import { describe, expect, it } from "vitest";
import {
  GARDEN_POINTS,
  GARDEN_WALK_SPEED_PX_PER_SECOND,
  gardenPolylineLength,
  gardenRoutePoints,
  gardenWalkDurationMs,
  resampleGardenPolyline,
} from "./gardenMotion";

describe("garden motion geometry", () => {
  it("uses the measured gait speed and precise route milliseconds", () => {
    expect(GARDEN_WALK_SPEED_PX_PER_SECOND).toBe(50.28575);
    expect(gardenPolylineLength(gardenRoutePoints("door", "soil"))).toBeCloseTo(791.509029, 5);
    expect(gardenWalkDurationMs("door", "soil")).toBe(15_740);
  });

  it("resamples bends into four equal-distance progress points", () => {
    const points = resampleGardenPolyline([{ x: 0, y: 0 }, { x: 100, y: 0 }], 4);
    expect(points.map((point) => point.y)).toEqual([0, 0, 0, 0]);
    expect(points[0].x).toBe(0);
    expect(points[1].x).toBeCloseTo(100 / 3, 12);
    expect(points[2].x).toBeCloseTo(200 / 3, 12);
    expect(points[3].x).toBe(100);
  });

  it("keeps the wood board distinct from the three elevated contacts", () => {
    expect(GARDEN_POINTS.door).toEqual({ x: 85.2, y: 61.2 });
    expect(GARDEN_POINTS["door-step-1"]).toEqual({ x: 90.2, y: 56.2 });
    expect(GARDEN_POINTS["door-step-2"]).toEqual({ x: 94, y: 52.2 });
    expect(GARDEN_POINTS["door-threshold"]).toEqual({ x: 96.6, y: 48.3 });
  });
});
