import { ROOM_ART, ROOM_ICONS } from "./roomLayout";
// Only the approved room layers belong in the initial preload.
export function preloadArt() {
  [...Object.values(ROOM_ART), ...Object.values(ROOM_ICONS)].forEach((src) => { const image = new Image(); image.src = src; image.decode().catch(() => {}); });
}
