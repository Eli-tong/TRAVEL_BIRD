import type { CropId, FoodId } from "../domain/types";

export const INVENTORY_ART_MAP = {
  seeds: {
    wheat: "/art/inventory/wheat-seeds.png",
    carrot: "/art/inventory/carrot-seeds.png",
    strawberry: "/art/inventory/strawberry-seeds.png"
  },
  ingredients: {
    wheat: "/art/inventory/wheat-ingredient.png",
    carrot: "/art/inventory/carrot-ingredient.png",
    strawberry: "/art/inventory/strawberry-ingredient.png"
  },
  foods: {
    "strawberry-cloud-bun": "/art/inventory/strawberry-cloud-bun.png",
    "carrot-crescent-crisp": "/art/inventory/carrot-crescent-crisp.png",
    "tricolor-travel-bites": "/art/inventory/tricolor-travel-bites.png"
  }
} satisfies {
  seeds: Record<CropId, string>;
  ingredients: Record<CropId, string>;
  foods: Record<FoodId, string>;
};

type InventoryItemArtProps =
  | { category: "seeds" | "ingredients"; itemId: CropId; alt: string }
  | { category: "foods"; itemId: FoodId; alt: string };

export function InventoryItemArt(props: InventoryItemArtProps) {
  const src = props.category === "foods"
    ? INVENTORY_ART_MAP.foods[props.itemId]
    : INVENTORY_ART_MAP[props.category][props.itemId];

  return (
    <img
      className={`item-art inventory-item-art inventory-item-art--${props.category}`}
      src={src}
      alt={props.alt}
      draggable={false}
    />
  );
}
