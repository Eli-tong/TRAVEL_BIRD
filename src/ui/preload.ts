import { ROOM_ART, ROOM_ICONS } from "./roomLayout";
import { BIRD_ROUTINE_ART, BIRD_ROUTINE_WALK_ART, GARDEN_ROUTE_ART } from "./birdRoutineArt";

const ROUTINE_PRELOAD = [
  ...Object.values(BIRD_ROUTINE_WALK_ART).map((art) => art.src),
  BIRD_ROUTINE_ART["garden-preen"].src,
  BIRD_ROUTINE_ART["garden-water-pickup"].src,
  BIRD_ROUTINE_ART["garden-water-pour"].src,
  BIRD_ROUTINE_ART["garden-water-putdown"].src,
  GARDEN_ROUTE_ART.hopRight.src,
  GARDEN_ROUTE_ART.enterBack.src,
];

export function preloadArt() {
  const sources = new Set([...Object.values(ROOM_ART), ...Object.values(ROOM_ICONS), ...ROUTINE_PRELOAD]);
  sources.forEach((src) => {
    const image = new Image();
    image.src = src;
    image.decode().catch(() => {});
  });
}
