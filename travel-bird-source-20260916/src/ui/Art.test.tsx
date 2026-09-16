import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { CropArt, FoodArt, ItemArt } from "./Art";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let host: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
});

test("keeps scene crop artwork on its legacy path outside the inventory mapping", () => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(<><CropArt cropId="carrot" /><ItemArt name="satchel" /></>));

  const crop = host.querySelector<HTMLImageElement>(".crop-art");
  expect(crop?.getAttribute("src")).toBe("/art/carrot-ready.webp");
  expect(crop?.classList.contains("inventory-item-art")).toBe(false);
  expect(host.querySelector(".item-art[src=\"/art/satchel.webp\"]")).not.toBeNull();
});

test("uses the unified item artwork anywhere seeds and food are displayed", () => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(<><CropArt cropId="carrot" stage="seed" /><FoodArt foodId="strawberry-cloud-bun" /></>));

  expect(host.querySelector<HTMLImageElement>(".crop-art")?.getAttribute("src"))
    .toBe("/art/inventory/carrot-seeds.png");
  expect(host.querySelector<HTMLImageElement>(".food-art")?.getAttribute("src"))
    .toBe("/art/inventory/strawberry-cloud-bun.png");
});
