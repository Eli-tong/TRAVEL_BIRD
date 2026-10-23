import type { CSSProperties } from "react";
import type { BirdMood } from "../domain/birdMood";
import type { BirdRoutineState, RoomSpotId } from "../domain/types";

// All positions use the approved, uncropped reference image's pixels.
export const ROOM = { width: 941, height: 1672 } as const;
export const ROOM_ART = {
  background: "/art/room-v2/background.png",
  bird: "/art/room-v2/blue-quaker-calm-corrected.png",
  travelBag: "/art/room-v2/travel-bag.png"
} as const;
export const ROOM_ICONS = {
  menu: "/art/room-v2/menu-feather.png",
  exit: "/art/room-v2/exit-arrow.png"
} as const;
type Point = { x: number; y: number };
export type SpritePlacement = {
  source: { width: number; height: number };
  anchor: Point; contact: Point; width: number;
  anchorMode?: "support-foot";
  supportAnchor?: Point;
  branchSupport?: { point: Point; line?: { from: Point; to: Point } };
};
export const ROOM_SPRITES: Record<"bird" | "travelBag", SpritePlacement> = {
  // The rear/support foot (image-right foot) is the primary physical anchor.
  bird: { source: { width: 420, height: 540 }, anchor: { x: 210, y: 509 },
    contact: { x: 668, y: 708 }, width: 168, anchorMode: "support-foot",
    supportAnchor: { x: 210, y: 509 },
    branchSupport: { point: { x: 668, y: 708 }, line: { from: { x: 638, y: 713 }, to: { x: 668, y: 708 } } } },
  travelBag: { source: { width: 1254, height: 1254 }, anchor: { x: 700, y: 938 },
    contact: { x: 451.6667, y: 1006.3333 }, width: 209 }
};

const ROOM_BED_CONTACT = { x: 335, y: 322.4 } as const;

const ROOM_BED_BIRD: SpritePlacement = {
  source: { width: 600, height: 540 }, anchor: { x: 300, y: 476 },
  contact: ROOM_BED_CONTACT, width: 240,
};

const ROOM_WAKE_BIRD: SpritePlacement = {
  ...ROOM_BED_BIRD,
  width: 158.4,
};

const ROOM_BRANCH_BIRD: SpritePlacement = {
  source: { width: 540, height: 540 }, anchor: { x: 270, y: 509 },
  contact: { x: 668, y: 708 }, width: 216,
};

const ROOM_LAND_BIRD: SpritePlacement = {
  ...ROOM_BRANCH_BIRD,
  width: 190.08,
};

const ROOM_BRANCH_PROP_BIRD: SpritePlacement = {
  ...ROOM_BRANCH_BIRD,
  source: { width: 540, height: 600 },
};

type RoomMotionPoint = { x: number; y: number };
export type RoomRoutinePlacement = {
  style: CSSProperties;
  routeId: string | null;
  facing: "left" | "right";
};

const ROOM_FLIGHT_POINTS: Record<RoomSpotId, RoomMotionPoint> = {
  // Wrapper top-left positions. Both use a 600 × 540 frame displayed at the
  // original room bird's source-pixel scale (240 × 216 room-art pixels).
  branch: { x: 548, y: 500 },
  bed: { x: 215, y: 112.4 },
  // The final flight frame sits wholly under the real right-side trunk.
  trunk: { x: 735, y: 500 },
};

function roomFlightRoute(from: RoomSpotId, to: RoomSpotId): RoomMotionPoint[] {
  if (from === "branch" && to === "bed") {
    return [ROOM_FLIGHT_POINTS.branch, { x: 506, y: 430 }, { x: 374, y: 298 }, ROOM_FLIGHT_POINTS.bed];
  }
  if (from === "bed" && to === "branch") {
    return [ROOM_FLIGHT_POINTS.bed, { x: 374, y: 298 }, { x: 506, y: 430 }, ROOM_FLIGHT_POINTS.branch];
  }
  return [ROOM_FLIGHT_POINTS[from], ROOM_FLIGHT_POINTS[from], ROOM_FLIGHT_POINTS[to], ROOM_FLIGHT_POINTS[to]];
}

export function roomRoutinePlacement(
  routine: BirdRoutineState,
  now = routine.activityStartedAt,
  mood: BirdMood = "calm",
): RoomRoutinePlacement {
  const moving = routine.activity === "room-flight" || routine.activity === "room-leave" || routine.activity === "room-arrive";
  if (!moving || !routine.flightFrom || !routine.flightTo) {
    const sleepActivity = routine.activity === "room-sleep";
    const wakeActivity = routine.activity === "room-wake";
    const bedReaction = sleepActivity && (mood === "happy" || mood === "angry");
    const landingActivity = routine.activity === "room-land";
    const propActivity = routine.activity === "room-read" || routine.activity === "room-write";
    const sprite = wakeActivity || bedReaction
      ? ROOM_WAKE_BIRD
      : sleepActivity
        ? ROOM_BED_BIRD
        : landingActivity
          ? ROOM_LAND_BIRD
          : propActivity
            ? ROOM_BRANCH_PROP_BIRD
            : ROOM_BRANCH_BIRD;
    return { style: spriteStyle(sprite), routeId: null, facing: "left" };
  }

  const points = roomFlightRoute(routine.flightFrom, routine.flightTo);
  const duration = Math.max(1, routine.nextDecisionAt - routine.activityStartedAt);
  const delay = -Math.max(0, now - routine.activityStartedAt);
  const percent = (point: RoomMotionPoint) => ({ x: `${point.x / ROOM.width * 100}%`, y: `${point.y / ROOM.height * 100}%` });
  const p = points.map(percent);
  return {
    routeId: `${routine.flightFrom}-${routine.flightTo}`,
    facing: points[3].x < points[0].x ? "left" : "right",
    style: {
      left: p[0].x, top: p[0].y,
      width: `${240 / ROOM.width * 100}%`, height: `${216 / ROOM.height * 100}%`,
      "--room-route-x-0": p[0].x, "--room-route-y-0": p[0].y,
      "--room-route-x-1": p[1].x, "--room-route-y-1": p[1].y,
      "--room-route-x-2": p[2].x, "--room-route-y-2": p[2].y,
      "--room-route-x-3": p[3].x, "--room-route-y-3": p[3].y,
      "--room-route-duration": `${duration}ms`, "--room-route-delay": `${delay}ms`,
    } as CSSProperties,
  };
}
export const ROOM_HOTSPOTS = [
  // x/y are the top-left corner of the visual object's bounds in the shared art plane.
  { id: "bird", name: "轻轻招呼小鸟", x: 560, y: 520, width: 260, height: 250, requires: "bird" },
  { id: "travelBag", name: "打开行囊", x: 340, y: 920, width: 220, height: 140, requires: "travelBag" },
  { id: "kitchen", name: "打开料理台", x: 0, y: 1150, width: 285, height: 370, requires: "room" },
  { id: "pot", name: "打开料理台", x: 85, y: 1190, width: 150, height: 150, requires: "room" },
  { id: "cabinet", name: "打开储物柜", x: 700, y: 1090, width: 241, height: 430, requires: "room" },
  // The lower wooden passage leads out of the illustration. No new door is drawn.
  { id: "exit", name: "前往庭院", x: 465, y: 1430, width: 240, height: 200, requires: "room" }
] as const;
export type RoomHotspotId = typeof ROOM_HOTSPOTS[number]["id"];

export function spriteStyle(sprite: SpritePlacement): CSSProperties {
  const scale = sprite.width / sprite.source.width;
  return {
    left: `${(sprite.contact.x - sprite.anchor.x * scale) / ROOM.width * 100}%`,
    top: `${(sprite.contact.y - sprite.anchor.y * scale) / ROOM.height * 100}%`,
    width: `${sprite.width / ROOM.width * 100}%`,
    height: `${sprite.source.height * scale / ROOM.height * 100}%`,
    transformOrigin: `${sprite.anchor.x / sprite.source.width * 100}% ${sprite.anchor.y / sprite.source.height * 100}%`
  };
}
export function hotspotStyle(hotspot: typeof ROOM_HOTSPOTS[number]): CSSProperties {
  return { left: `${hotspot.x / ROOM.width * 100}%`, top: `${hotspot.y / ROOM.height * 100}%`,
    width: `${hotspot.width / ROOM.width * 100}%`, height: `${hotspot.height / ROOM.height * 100}%` };
}
