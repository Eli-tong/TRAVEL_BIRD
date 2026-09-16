import type { CropId, FoodId, PostcardId } from "../domain/types";
import type { BirdMood } from "../domain/birdMood";
import { POSTCARDS, RECIPES } from "../domain/config";

export function BirdArt({ mood = "calm" }: { mood?: BirdMood }) {
  return <span className="bird-art" aria-hidden="true">{(["calm", "happy", "sleepy", "angry"] as BirdMood[]).map((state) =>
    <img key={state} src={"/art/bird-" + state + ".webp"} className={state === mood ? "bird-frame visible" : "bird-frame"} alt="" draggable={false} />
  )}</span>;
}
export function ItemArt({ name, className = "" }: { name: string; className?: string }) {
  return <img src={"/art/" + name + ".webp"} alt="" className={"item-art " + className} draggable={false} />;
}
export function CropArt({ cropId, stage = "ready" }: { cropId: CropId; stage?: "seed" | "growing" | "ready" }) {
  return <img className="crop-art" src={"/art/" + cropId + "-" + stage + ".webp"} alt="" draggable={false} />;
}
export function FoodArt({ foodId }: { foodId: FoodId }) {
  return <img className="food-art" src={"/art/" + foodId + ".webp"} alt={RECIPES[foodId].name} draggable={false} />;
}
export function PostcardArt({ postcardId, locked = false }: { postcardId: PostcardId; locked?: boolean }) {
  return <img className={"postcard-art" + (locked ? " locked-art" : "")} src={"/art/" + (locked ? "postcards" : postcardId) + ".webp"} alt={locked ? "尚未收集的明信片" : POSTCARDS[postcardId].title} loading="lazy" />;
}
