import type { CSSProperties } from "react";
import type { BirdActivityId, BirdRoutineState, GardenSpotId } from "../domain/types";
import { GARDEN_POINTS, gardenRoutePoints, resampleGardenPolyline, type GardenPoint } from "../domain/gardenMotion";
import { BIRD_ROUTINE_ART, BIRD_ROUTINE_WALK_ART } from "./birdRoutineArt";

export const GARDEN_ART = {
  background: "/art/garden-v1/background-away.png",
  backgroundAway: "/art/garden-v1/background-away.png"
} as const;

type GardenPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const GARDEN_HOTSPOTS = [
  { id: "entrance", x: 84, y: 25, width: 16, height: 28 },
  { id: "mailbox", x: 70, y: 38, width: 18, height: 17 }
] as const satisfies ReadonlyArray<GardenPlacement & { id: "entrance" | "mailbox" }>;

export const GARDEN_PLOTS = [
  { plotId: "plot-1", x: 2, y: 47, width: 22, height: 18 },
  { plotId: "plot-2", x: 19, y: 44, width: 23, height: 18 },
  { plotId: "plot-3", x: 24, y: 58, width: 23, height: 18 }
] as const satisfies ReadonlyArray<GardenPlacement & { plotId: string }>;

export type GardenHotspotId = typeof GARDEN_HOTSPOTS[number]["id"];

export function defaultGardenScrollLeft(scrollWidth: number, clientWidth: number, remembered: number | null) {
  const maximum = Math.max(0, scrollWidth - clientWidth);
  const requested = remembered === null || !Number.isFinite(remembered) ? maximum : remembered;
  return Math.max(0, Math.min(maximum, requested));
}

export function gardenPlacementStyle(placement: GardenPlacement): CSSProperties {
  return {
    left: `${placement.x}%`,
    top: `${placement.y}%`,
    width: `${placement.width}%`,
    height: `${placement.height}%`
  };
}

const WATERING_ACTIVITIES = new Set<BirdActivityId>([
  "garden-water-pickup", "garden-water-pour", "garden-water-putdown"
]);

export function isWateringActivity(activity: BirdActivityId) {
  return WATERING_ACTIVITIES.has(activity);
}

export function preferredWateringPlot(plotIdsWithCrops: readonly string[]) {
  return GARDEN_PLOTS.find((plot) => plotIdsWithCrops.includes(plot.plotId)) ?? GARDEN_PLOTS[0];
}

export function gardenBirdPlacement(
  activity: BirdActivityId,
  wateringPlot: (typeof GARDEN_PLOTS)[number] = GARDEN_PLOTS[0],
  gardenSpot?: GardenSpotId,
): CSSProperties {
  const art = BIRD_ROUTINE_ART[activity];
  const width = 12 * art.frameWidth / 420 * (art.sceneScale ?? 1);
  const anchored = (left: number, top: number): CSSProperties => ({
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    aspectRatio: `${art.frameWidth} / ${art.frameHeight}`,
    transform: "translate(-50%, -94.25925925925925%)",
  });
  if (isWateringActivity(activity) || activity === "garden-inspect") {
    const targetX = wateringPlot.x + wateringPlot.width / 2;
    return anchored(targetX - 2, wateringPlot.y + wateringPlot.height - 1);
  }
  if (activity === "garden-arrive" || activity === "garden-leave") {
    return anchored(GARDEN_POINTS.door.x, GARDEN_POINTS.door.y);
  }
  if (activity === "garden-sunbathe" || activity === "garden-preen") {
    return anchored(61, 69);
  }
  if (activity === "garden-forage") {
    const forageSpot = gardenSpot === "forage-left" || gardenSpot === "forage-right"
      ? gardenSpot : "forage-center";
    const point = GARDEN_POINTS[forageSpot];
    return anchored(point.x, point.y);
  }
  return anchored(54, 69);
}

export type GardenRouteArtMode = "walk" | "door-hop" | "door-enter-back";
export type GardenDoorPhase = "approach" | "hop-1" | "hop-2" | "hop-3" | "enter-back"
  | "exit-front" | "hop-3-down" | "hop-2-down" | "hop-1-down" | "settle";
export type GardenRoutePlacement = {
  style: CSSProperties;
  routeId: string | null;
  routeKind: "walk" | "door-arrive" | "door-leave" | null;
  phase: GardenDoorPhase | null;
  phaseProgress: number;
  artMode: GardenRouteArtMode;
  facing: "left" | "right";
};

const DOOR_PHASES = [
  { phase: "approach", start: 0, end: 600 },
  { phase: "hop-1", start: 600, end: 1_500 },
  { phase: "hop-2", start: 1_500, end: 2_400 },
  { phase: "hop-3", start: 2_400, end: 3_300 },
  { phase: "enter-back", start: 3_300, end: 5_100 },
] as const satisfies ReadonlyArray<{ phase: GardenDoorPhase; start: number; end: number }>;

function leaveDoorPhase(elapsedMs: number) {
  const bounded = Math.max(0, Math.min(5_100, elapsedMs));
  const item = DOOR_PHASES.find(({ end }) => bounded < end) ?? DOOR_PHASES[DOOR_PHASES.length - 1];
  return {
    phase: item.phase,
    phaseProgress: Math.max(0, Math.min(1, (bounded - item.start) / (item.end - item.start))),
    artMode: item.phase === "enter-back" ? "door-enter-back" as const : "door-hop" as const,
  };
}

const ARRIVAL_DOOR_PHASES = [
  { phase: "exit-front", start: 0, end: 1_800 },
  { phase: "hop-3-down", start: 1_800, end: 2_700 },
  { phase: "hop-2-down", start: 2_700, end: 3_600 },
  { phase: "hop-1-down", start: 3_600, end: 4_500 },
  { phase: "settle", start: 4_500, end: 5_100 },
] as const satisfies ReadonlyArray<{ phase: GardenDoorPhase; start: number; end: number }>;

function arriveDoorPhase(elapsedMs: number) {
  const bounded = Math.max(0, Math.min(5_100, elapsedMs));
  const item = ARRIVAL_DOOR_PHASES.find(({ end }) => bounded < end)
    ?? ARRIVAL_DOOR_PHASES[ARRIVAL_DOOR_PHASES.length - 1];
  return {
    phase: item.phase,
    phaseProgress: Math.max(0, Math.min(1, (bounded - item.start) / (item.end - item.start))),
    artMode: "door-hop" as const,
  };
}

const percent = (value: number) => `${Number(value.toFixed(6))}%`;
const milliseconds = (value: number) => `${Number(value.toFixed(6))}ms`;

function gardenSpotPoint(spot: GardenSpotId, wateringPlot: (typeof GARDEN_PLOTS)[number]): GardenPoint {
  if (spot !== "soil") return GARDEN_POINTS[spot];
  return {
    x: wateringPlot.x + wateringPlot.width / 2 - 2,
    y: wateringPlot.y + wateringPlot.height - 1,
  };
}

function routePoints(from: GardenSpotId, to: GardenSpotId, wateringPlot: (typeof GARDEN_PLOTS)[number]): GardenPoint[] {
  return gardenRoutePoints(from, to, gardenSpotPoint("soil", wateringPlot));
}

export function gardenRoutePlacement(
  routine: BirdRoutineState,
  wateringPlot: (typeof GARDEN_PLOTS)[number] = GARDEN_PLOTS[0],
  now = routine.activityStartedAt,
): GardenRoutePlacement {
  const doorwayTransition = routine.activity === "garden-arrive" || routine.activity === "garden-leave";
  if (!doorwayTransition && (routine.activity !== "garden-walk" || !routine.walkFrom || !routine.walkTo)) {
    return {
      style: gardenBirdPlacement(routine.activity, wateringPlot, routine.gardenSpot),
      routeId: null, routeKind: null, phase: null, phaseProgress: 0, artMode: "walk", facing: "left",
    };
  }
  const points = routine.activity === "garden-arrive"
    ? [GARDEN_POINTS["door-inside"], GARDEN_POINTS["door-threshold"], GARDEN_POINTS["door-step-1"], GARDEN_POINTS.door]
    : routine.activity === "garden-leave"
      ? [GARDEN_POINTS.door, GARDEN_POINTS["door-step-1"], GARDEN_POINTS["door-step-2"], GARDEN_POINTS["door-inside"]]
      : resampleGardenPolyline(routePoints(routine.walkFrom!, routine.walkTo!, wateringPlot), 4);
  const duration = Math.max(1, routine.nextDecisionAt - routine.activityStartedAt);
  const delay = -Math.max(0, now - routine.activityStartedAt);
  const art = BIRD_ROUTINE_WALK_ART.left;
  const gaitCycleMs = art.frameCount / art.fps * 1_000;
  const cycleCount = Math.max(1, Math.round(duration / gaitCycleMs));
  const adjustedGaitCycleMs = duration / cycleCount;
  const doorway = routine.activity === "garden-leave" ? leaveDoorPhase(now - routine.activityStartedAt)
    : routine.activity === "garden-arrive" ? arriveDoorPhase(now - routine.activityStartedAt) : null;
  const style = {
    left: percent(points[0].x), top: percent(points[0].y), width: `${12 * art.frameWidth / 420}%`,
    aspectRatio: `${art.frameWidth} / ${art.frameHeight}`, transform: "translate(-50%, -94.25925925925925%)",
    "--garden-route-x-0": percent(points[0].x), "--garden-route-y-0": percent(points[0].y),
    "--garden-route-x-1": percent(points[1].x), "--garden-route-y-1": percent(points[1].y),
    "--garden-route-x-2": percent(points[2].x), "--garden-route-y-2": percent(points[2].y),
    "--garden-route-x-3": percent(points[3].x), "--garden-route-y-3": percent(points[3].y),
    "--garden-route-duration": `${duration}ms`, "--garden-route-delay": `${delay}ms`,
    "--garden-route-step-count": Math.max(16, Math.round(duration / 125)),
    "--garden-route-cycle-count": cycleCount,
    "--garden-gait-cycle-duration": milliseconds(adjustedGaitCycleMs),
    "--garden-route-progress-1": "33.333333%", "--garden-route-progress-2": "66.666667%",
    "--garden-door-board-x": percent(GARDEN_POINTS.door.x), "--garden-door-board-y": percent(GARDEN_POINTS.door.y),
    "--garden-door-step-1-x": percent(GARDEN_POINTS["door-step-1"].x), "--garden-door-step-1-y": percent(GARDEN_POINTS["door-step-1"].y),
    "--garden-door-step-2-x": percent(GARDEN_POINTS["door-step-2"].x), "--garden-door-step-2-y": percent(GARDEN_POINTS["door-step-2"].y),
    "--garden-door-threshold-x": percent(GARDEN_POINTS["door-threshold"].x), "--garden-door-threshold-y": percent(GARDEN_POINTS["door-threshold"].y),
    "--garden-door-inside-x": percent(GARDEN_POINTS["door-inside"].x), "--garden-door-inside-y": percent(GARDEN_POINTS["door-inside"].y),
  } as CSSProperties;
  return {
    style,
    routeId: routine.activity === "garden-arrive" ? "door-hidden-door"
      : routine.activity === "garden-leave" ? "door-door-hidden"
        : `${routine.walkFrom}-${routine.walkTo}`,
    routeKind: routine.activity === "garden-arrive" ? "door-arrive"
      : routine.activity === "garden-leave" ? "door-leave" : "walk",
    phase: doorway?.phase ?? null,
    phaseProgress: doorway?.phaseProgress ?? 0,
    artMode: doorway?.artMode ?? "walk",
    facing: points[3].x < points[0].x ? "left" : "right",
  };
}
