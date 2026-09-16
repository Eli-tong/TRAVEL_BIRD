import type { CSSProperties } from "react";

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
  bird: { source: { width: 420, height: 540 }, anchor: { x: 238, y: 329 },
    contact: { x: 668, y: 708 }, width: 231, anchorMode: "support-foot",
    supportAnchor: { x: 238, y: 329 },
    branchSupport: { point: { x: 668, y: 708 }, line: { from: { x: 638, y: 713 }, to: { x: 668, y: 708 } } } },
  travelBag: { source: { width: 1254, height: 1254 }, anchor: { x: 700, y: 938 },
    contact: { x: 451.6667, y: 1006.3333 }, width: 209 }
};
export const ROOM_HOTSPOTS = [
  // x/y are the top-left corner of the visual object's bounds in the shared art plane.
  { id: "bird", name: "轻轻招呼小鸟", x: 560, y: 520, width: 260, height: 250, requires: "bird" },
  { id: "travelBag", name: "打开行囊", x: 340, y: 920, width: 220, height: 140, requires: "travelBag" },
  { id: "kitchen", name: "打开料理台", x: 0, y: 1150, width: 285, height: 370, requires: "room" },
  { id: "pot", name: "打开料理台", x: 85, y: 1190, width: 150, height: 150, requires: "room" },
  { id: "cabinet", name: "打开储物柜", x: 700, y: 1090, width: 241, height: 430, requires: "room" },
  // The lower wooden passage leads out of the illustration. No new door is drawn.
  { id: "exit", name: "门口：庭院准备中", x: 465, y: 1430, width: 240, height: 200, requires: "room" }
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
