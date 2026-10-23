import type { BirdActivityId } from "../domain/types";
import { ROOM_ART } from "./roomLayout";

export type BirdRoutineArt = {
  src: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: "loop" | "once";
  anchor: { x: number; y: number };
  fallback: string;
  sceneScale?: number;
};

// Artwork contract: one horizontal strip of equal transparent cells.
// Generated poses share a common ground line close to the bottom of each cell.
function strip(activity: BirdActivityId, frameCount: number, fps: number, loop: BirdRoutineArt["loop"], src?: string, frameWidth = 420): BirdRoutineArt {
  return {
    src: src ?? `/art/bird-routine/${activity}.png`,
    frameWidth, frameHeight: 540, frameCount, fps, loop,
    anchor: { x: frameWidth / 2, y: 525 }, fallback: ROOM_ART.bird
  };
}

function branchStrip(activity: BirdActivityId, frameCount: number, fps: number, loop: BirdRoutineArt["loop"], frameHeight = 540): BirdRoutineArt {
  return {
    ...strip(activity, frameCount, fps, loop, `/art/bird-routine/${activity}-v2.png`, 540),
    frameHeight,
    anchor: { x: 270, y: 509 },
  };
}

export const BIRD_ROUTINE_WALK_ART = {
  left: strip("garden-walk", 16, 8, "loop", "/art/bird-routine/garden-walk-left-v3.png", 540),
  right: strip("garden-walk", 16, 8, "loop", "/art/bird-routine/garden-walk-right-v3.png", 540)
} satisfies Record<"left" | "right", BirdRoutineArt>;

export const GARDEN_ROUTE_ART = {
  hopRight: strip("garden-leave", 8, 10, "once", "/art/bird-routine/garden-door-hop-right-v1.png", 540),
  enterBack: strip("garden-leave", 12, 8, "loop", "/art/bird-routine/garden-door-enter-back-v1.png", 540),
} as const satisfies Record<"hopRight" | "enterBack", BirdRoutineArt>;

export const BIRD_ROUTINE_FLIGHT_ART = {
  left: strip("room-flight", 16, 8, "loop", "/art/bird-routine/room-flight-left.png", 600),
  right: strip("room-flight", 16, 8, "loop", "/art/bird-routine/room-flight-right.png", 600)
} satisfies Record<"left" | "right", BirdRoutineArt>;

export const ROOM_SLEEP_REACTION_ART = {
  happy: "/art/bird-routine/room-sleep-look-side-v3.png",
  angry: "/art/bird-routine/room-sleep-angry-side-v3.png"
} as const;

export const ROOM_BRANCH_REACTION_ART = {
  happy: "/art/bird-routine/bird-reaction-happy-branch-v3.png",
  angry: "/art/bird-routine/bird-reaction-angry-branch-v3.png"
} as const;

export const GARDEN_REACTION_ART = {
  happy: "/art/bird-routine/bird-reaction-happy-v2.png",
  angry: "/art/bird-routine/bird-reaction-angry-v2.png"
} as const;

export const BIRD_ROUTINE_ART: Record<BirdActivityId, BirdRoutineArt> = {
  "room-idle": branchStrip("room-idle", 6, 4, "loop"),
  "room-ruffle": branchStrip("room-ruffle", 7, 8, "once"),
  "room-read": branchStrip("room-read", 8, 6, "loop", 600),
  "room-write": branchStrip("room-write", 8, 6, "loop", 600),
  "room-flight": BIRD_ROUTINE_FLIGHT_ART.left,
  "room-sleep": strip("room-sleep", 16, 2, "loop", "/art/bird-routine/room-sleep-side-v3.png", 600),
  "room-wake": strip("room-wake", 12, 6, "once", "/art/bird-routine/room-wake-side-v3.png", 600),
  "room-land": {
    ...strip("room-land", 12, 10, "once", "/art/bird-routine/room-land-branch-v1.png", 540),
    anchor: { x: 270, y: 509 },
  },
  "room-leave": { ...BIRD_ROUTINE_FLIGHT_ART.right, loop: "once" },
  "room-arrive": { ...BIRD_ROUTINE_FLIGHT_ART.left, loop: "once" },
  "garden-arrive": strip("garden-arrive", 8, 2, "once"),
  "garden-walk": BIRD_ROUTINE_WALK_ART.left,
  "garden-inspect": strip("garden-inspect", 6, 5, "loop"),
  "garden-preen": strip("garden-preen", 24, 6, "loop", "/art/bird-routine/garden-preen-v2.png", 540),
  "garden-forage": {
    ...strip("garden-forage", 16, 8, "loop", undefined, 540),
    sceneScale: 0.92,
  },
  "garden-water-pickup": {
    ...strip("garden-water-pickup", 12, 8, "once", "/art/bird-routine/garden-water-pickup-v3.png", 540),
    sceneScale: 1,
  },
  "garden-water-pour": {
    ...strip("garden-water-pour", 16, 8, "once", "/art/bird-routine/garden-water-pour-v3.png", 540),
    sceneScale: 1.13,
  },
  "garden-water-putdown": {
    ...strip("garden-water-putdown", 12, 8, "once", "/art/bird-routine/garden-water-putdown-v3.png", 540),
    sceneScale: 1,
  },
  "garden-sunbathe": strip("garden-sunbathe", 8, 1, "loop", "/art/bird-routine/garden-sunbathe-v2.png", 540),
  "garden-leave": strip("garden-leave", 8, 8, "once")
};

export const WATERING_CAN_ART = "/art/bird-routine/watering-can.png";
