import type { GardenSpotId } from "./types";

export type GardenPoint = { x: number; y: number };

export const GARDEN_REFERENCE_SIZE = { width: 1024, height: 1536 } as const;
export const GARDEN_WALK_SPEED_PX_PER_SECOND = 50.28575;
export const MIN_GARDEN_WALK_MS = 1_250;

export const GARDEN_POINTS = {
  door: { x: 85.2, y: 61.2 },
  "door-inside": { x: 104, y: 47.8 },
  "door-step-1": { x: 90.2, y: 56.2 },
  "door-step-2": { x: 94, y: 52.2 },
  "door-threshold": { x: 96.6, y: 48.3 },
  "path-right": { x: 78, y: 63 },
  "path-center": { x: 59, y: 69 },
  "forage-left": { x: 46, y: 71.5 },
  "forage-center": { x: 52, y: 72.5 },
  "forage-right": { x: 68, y: 70.5 },
  forage: { x: 52, y: 72.5 },
  sun: { x: 61, y: 69 },
} as const satisfies Record<string, GardenPoint>;

export const DEFAULT_SOIL_POINT: GardenPoint = { x: 11, y: 64 };

function pointFor(spot: GardenSpotId, soil: GardenPoint): GardenPoint {
  if (spot === "soil") return soil;
  return GARDEN_POINTS[spot];
}

export function gardenRoutePoints(
  from: GardenSpotId,
  to: GardenSpotId,
  soil = DEFAULT_SOIL_POINT,
): GardenPoint[] {
  const via: GardenSpotId[] = from === to ? [from, to]
    : from === "door" ? [from, "path-right", "path-center", to]
      : to === "door" ? [from, "path-center", "path-right", to]
        : from === "path-center" || to === "path-center" ? [from, to]
          : [from, "path-center", to];
  return via.map((spot) => pointFor(spot, soil));
}

function segmentLength(from: GardenPoint, to: GardenPoint): number {
  const dx = (to.x - from.x) * GARDEN_REFERENCE_SIZE.width / 100;
  const dy = (to.y - from.y) * GARDEN_REFERENCE_SIZE.height / 100;
  return Math.hypot(dx, dy);
}

export function gardenPolylineLength(points: readonly GardenPoint[]): number {
  return points.slice(1).reduce(
    (sum, point, index) => sum + segmentLength(points[index], point),
    0,
  );
}

export function gardenWalkDurationMs(from: GardenSpotId, to: GardenSpotId): number {
  if (from === to) return MIN_GARDEN_WALK_MS;
  const duration = gardenPolylineLength(gardenRoutePoints(from, to))
    / GARDEN_WALK_SPEED_PX_PER_SECOND * 1_000;
  return Math.max(MIN_GARDEN_WALK_MS, Math.round(duration));
}

export function resampleGardenPolyline(points: readonly GardenPoint[], count: number): GardenPoint[] {
  if (count < 2) throw new RangeError("count must be at least 2");
  if (points.length < 2) throw new RangeError("at least two points are required");

  const lengths = points.slice(1).map((point, index) => segmentLength(points[index], point));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  if (total === 0) return Array.from({ length: count }, () => ({ ...points[0] }));

  return Array.from({ length: count }, (_, sampleIndex) => {
    const target = total * sampleIndex / (count - 1);
    let consumed = 0;
    for (let index = 0; index < lengths.length; index += 1) {
      const length = lengths[index];
      if (target <= consumed + length || index === lengths.length - 1) {
        const ratio = length === 0 ? 0 : (target - consumed) / length;
        return {
          x: points[index].x + (points[index + 1].x - points[index].x) * ratio,
          y: points[index].y + (points[index + 1].y - points[index].y) * ratio,
        };
      }
      consumed += length;
    }
    return { ...points[points.length - 1] };
  });
}
