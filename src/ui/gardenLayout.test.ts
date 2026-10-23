import { describe, expect, test } from "vitest";
import { GARDEN_HOTSPOTS, GARDEN_PLOTS, defaultGardenScrollLeft, gardenBirdPlacement, gardenPlacementStyle, gardenRoutePlacement } from "./gardenLayout";
import type { BirdRoutineState } from "../domain/types";

describe("garden layout", () => {
  test("defaults to the right edge so the treehouse and mailbox are visible", () => {
    expect(defaultGardenScrollLeft(600, 400, null)).toBe(200);
  });

  test("restores and clamps a remembered offset", () => {
    expect(defaultGardenScrollLeft(600, 400, 82)).toBe(82);
    expect(defaultGardenScrollLeft(600, 400, 999)).toBe(200);
    expect(defaultGardenScrollLeft(300, 400, 30)).toBe(0);
  });

  test("keeps interaction targets normalized and plots naturally staggered", () => {
    expect(GARDEN_HOTSPOTS.map((target) => target.id)).toEqual(["entrance", "mailbox"]);
    expect(GARDEN_PLOTS.map((plot) => plot.plotId)).toEqual(["plot-1", "plot-2", "plot-3"]);
    expect(new Set(GARDEN_PLOTS.map((plot) => plot.y)).size).toBe(3);
    expect(gardenPlacementStyle(GARDEN_PLOTS[0])).toEqual({
      left: `${GARDEN_PLOTS[0].x}%`,
      top: `${GARDEN_PLOTS[0].y}%`,
      width: `${GARDEN_PLOTS[0].width}%`,
      height: `${GARDEN_PLOTS[0].height}%`
    });
  });

  test("matches the original indoor bird size and anchors feet to scene contact points", () => {
    expect(gardenBirdPlacement("garden-walk")).toMatchObject({
      left: "54%", top: "69%", width: `${12 * 540 / 420}%`, aspectRatio: "540 / 540",
      transform: "translate(-50%, -94.25925925925925%)"
    });
    expect(gardenBirdPlacement("garden-water-pickup", GARDEN_PLOTS[0])).toMatchObject({
      left: "11%", top: "64%", width: `${12 * 540 / 420}%`, aspectRatio: "540 / 540",
      transform: "translate(-50%, -94.25925925925925%)"
    });
  });

  test("normalizes watering size around one fixed foot anchor", () => {
    const pickup = gardenBirdPlacement("garden-water-pickup", GARDEN_PLOTS[0]);
    const pour = gardenBirdPlacement("garden-water-pour", GARDEN_PLOTS[0]);
    const putdown = gardenBirdPlacement("garden-water-putdown", GARDEN_PLOTS[0]);
    expect(pickup.top).toBe(pour.top);
    expect(pour.top).toBe(putdown.top);
    expect(pickup.transform).toBe(pour.transform);
    expect(pour.transform).toBe(putdown.transform);
    expect(Number.parseFloat(String(pour.width))).toBeCloseTo(Number.parseFloat(String(pickup.width)) * 1.13, 5);
    expect(putdown.width).toBe(pickup.width);
  });

  test("maps persisted door and soil walks onto the safe garden path", () => {
    const doorToSoil: BirdRoutineState = {
      location: "garden", activity: "garden-walk", activityStartedAt: 1_000,
      nextDecisionAt: 16_740, sequenceStep: 4, gardenSpot: "door",
      walkFrom: "door", walkTo: "soil", plannedActivity: "garden-forage",
    };
    const outbound = gardenRoutePlacement(doorToSoil, GARDEN_PLOTS[0], 2_250);
    expect(outbound.routeId).toBe("door-soil");
    expect(outbound.facing).toBe("left");
    expect(outbound.style).toMatchObject({
      left: "85.2%", top: "61.2%", width: `${12 * 540 / 420}%`, aspectRatio: "540 / 540",
      "--garden-route-x-3": "11%", "--garden-route-y-3": "64%",
      "--garden-route-duration": "15740ms", "--garden-route-delay": "-1250ms",
      "--garden-route-step-count": 126, "--garden-route-cycle-count": 8,
      "--garden-gait-cycle-duration": "1967.5ms",
      "--garden-route-progress-1": "33.333333%", "--garden-route-progress-2": "66.666667%",
    });

    const returning: BirdRoutineState = {
      ...doorToSoil, activityStartedAt: 16_740, nextDecisionAt: 32_480,
      gardenSpot: "soil", walkFrom: "soil", walkTo: "door", plannedActivity: "garden-leave",
    };
    const inbound = gardenRoutePlacement(returning, GARDEN_PLOTS[0], 29_500);
    expect(inbound.routeId).toBe("soil-door");
    expect(inbound.facing).toBe("right");
    expect(inbound.style).toMatchObject({ left: "11%", top: "64%", "--garden-route-cycle-count": 8 });
  });

  test("walks through the real far-right doorway instead of using a painted transition prop", () => {
    const arriving: BirdRoutineState = {
      location: "garden", activity: "garden-arrive", activityStartedAt: 1_000,
      nextDecisionAt: 9_000, sequenceStep: 6, gardenSpot: "door",
    };
    const inbound = gardenRoutePlacement({ ...arriving, nextDecisionAt: 6_100 }, GARDEN_PLOTS[0], 2_000);
    expect(inbound.routeId).toBe("door-hidden-door");
    expect(inbound.facing).toBe("left");
    expect(inbound).toMatchObject({ routeKind: "door-arrive", phase: "exit-front", artMode: "door-hop" });
    expect(inbound.style).toMatchObject({
      left: "104%", top: "47.8%", "--garden-route-x-1": "96.6%", "--garden-route-x-3": "85.2%", "--garden-route-delay": "-1000ms",
      "--garden-route-duration": "5100ms", "--garden-route-cycle-count": 3,
    });

    const outbound = gardenRoutePlacement({ ...arriving, activity: "garden-leave", nextDecisionAt: 6_100 }, GARDEN_PLOTS[0], 2_000);
    expect(outbound.routeId).toBe("door-door-hidden");
    expect(outbound.facing).toBe("right");
    expect(outbound.style).toMatchObject({
      left: "85.2%", top: "61.2%",
      "--garden-door-step-1-x": "90.2%", "--garden-door-step-1-y": "56.2%",
      "--garden-door-step-2-x": "94%", "--garden-door-step-2-y": "52.2%",
      "--garden-door-threshold-x": "96.6%", "--garden-door-threshold-y": "48.3%",
      "--garden-door-inside-x": "104%", "--garden-door-inside-y": "47.8%",
    });
  });

  test.each([
    [1_100, "approach", "door-hop"],
    [1_800, "hop-1", "door-hop"],
    [2_700, "hop-2", "door-hop"],
    [3_600, "hop-3", "door-hop"],
    [5_200, "enter-back", "door-enter-back"],
  ])("maps persisted leave time %i to %s", (now, phase, artMode) => {
    const route = gardenRoutePlacement({
      location: "garden", activity: "garden-leave", gardenSpot: "door",
      activityStartedAt: 1_000, nextDecisionAt: 6_100, sequenceStep: 10,
    }, GARDEN_PLOTS[0], now);
    expect(route).toMatchObject({ routeKind: "door-leave", phase, artMode });
  });

  test.each([
    [1_100, "exit-front"],
    [3_000, "hop-3-down"],
    [3_900, "hop-2-down"],
    [4_800, "hop-1-down"],
    [5_800, "settle"],
  ])("maps persisted arrival time %i to %s", (now, phase) => {
    const route = gardenRoutePlacement({
      location: "garden", activity: "garden-arrive", gardenSpot: "door-inside",
      activityStartedAt: 1_000, nextDecisionAt: 6_100, sequenceStep: 10,
    }, GARDEN_PLOTS[0], now);
    expect(route).toMatchObject({ routeKind: "door-arrive", phase, artMode: "door-hop", facing: "left" });
  });

  test("keeps foraging away from crop-dependent watering soil and supplies four-point routes", () => {
    const forage = gardenBirdPlacement("garden-forage", GARDEN_PLOTS[0]);
    const walk = gardenBirdPlacement("garden-walk", GARDEN_PLOTS[0]);
    expect(forage).toMatchObject({ left: "52%", top: "72.5%" });
    expect(Number.parseFloat(String(forage.width))).toBeCloseTo(Number.parseFloat(String(walk.width)) * 0.92, 6);
    for (const plot of GARDEN_PLOTS) {
      expect(gardenBirdPlacement("garden-forage", plot).left).not.toBe(gardenBirdPlacement("garden-water-pour", plot).left);
    }
    const routine: BirdRoutineState = {
      location: "garden", activity: "garden-walk", activityStartedAt: 1_000,
      nextDecisionAt: 13_000, sequenceStep: 7, gardenSpot: "forage",
      walkFrom: "forage", walkTo: "soil", plannedActivity: "garden-water-pickup",
    };
    const route = gardenRoutePlacement(routine, GARDEN_PLOTS[0], 1_500);
    expect(route.routeId).toBe("forage-soil");
    expect(route.style).toMatchObject({
      left: "52%", top: "72.5%", "--garden-route-x-3": "11%",
    });
  });

  test.each([
    ["forage-left", "46%", "71.5%"],
    ["forage-center", "52%", "72.5%"],
    ["forage-right", "68%", "70.5%"],
  ] as const)("keeps a finished forage action at %s", (gardenSpot, left, top) => {
    const route = gardenRoutePlacement({
      location: "garden", activity: "garden-forage", gardenSpot,
      activityStartedAt: 1_000, nextDecisionAt: 11_000, sequenceStep: 8,
    }, GARDEN_PLOTS[0], 2_000);
    expect(route.style).toMatchObject({ left, top });
  });
});
