import type { CropId, FoodId, PostcardId } from "../domain/types";
import type { BirdMood } from "../domain/birdMood";
import { POSTCARDS, RECIPES } from "../domain/config";
import { useTranslation } from "../i18n/LanguageContext";
import { postcardTitle } from "../i18n/content";
import { INVENTORY_ART_MAP } from "./InventoryItemArt";

// Existing project asset: verified non-opaque RGBA WebP. A-1 uses one still pose.
export function RoomBirdArt() {
  const { t } = useTranslation();
  return <img src="/art/room-v2/blue-quaker-calm-corrected.png" alt={t("scene.roomBirdAlt")} draggable={false} />;
}

export function BirdArt({ mood = "calm" }: { mood?: BirdMood }) {
  return <span className="bird-art" aria-hidden="true">{(["calm", "happy", "sleepy", "angry"] as BirdMood[]).map((state) =>
    <img key={state} src={"/art/bird-" + state + ".webp"} className={state === mood ? "bird-frame visible" : "bird-frame"} alt="" draggable={false} />
  )}</span>;
}
export function ItemArt({ name, className = "" }: { name: string; className?: string }) {
  return <img src={"/art/" + name + ".webp"} alt="" className={"item-art " + className} draggable={false} />;
}
export function CropArt({ cropId, stage = "ready" }: { cropId: CropId; stage?: "seed" | "growing" | "ready" }) {
  const src = stage === "seed"
    ? INVENTORY_ART_MAP.seeds[cropId]
    : "/art/" + cropId + "-" + stage + ".webp";
  return <img className="crop-art" src={src} alt="" draggable={false} />;
}
export function FoodArt({ foodId }: { foodId: FoodId }) {
  const { t } = useTranslation();
  return <img className="food-art" src={INVENTORY_ART_MAP.foods[foodId]} alt={t(RECIPES[foodId].nameKey)} draggable={false} />;
}
export function PostcardArt({ postcardId, locked = false }: { postcardId: PostcardId; locked?: boolean }) {
  const { t } = useTranslation();
  const postcard = POSTCARDS[postcardId];
  const src = locked
    ? "/art/postcards.webp"
    : "frontArtKey" in postcard ? postcard.frontArtKey : `/art/${postcardId}.webp`;
  return <img className={"postcard-art" + (locked ? " locked-art" : "")} src={src} alt={locked ? t("postcard.lockedAlt") : postcardTitle(t, postcardId)} loading="lazy" />;
}
