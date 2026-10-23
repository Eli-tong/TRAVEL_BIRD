import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import type { PostcardId } from "../domain/types";
import { CropArt, FoodArt, ItemArt, PostcardArt } from "./Art";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let host: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
});

test("uses dedicated transparent artwork only for mature crops", () => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(<>
    <CropArt cropId="carrot" stage="ready" />
    <CropArt cropId="strawberry" stage="ready" />
    <CropArt cropId="wheat" stage="ready" />
    <CropArt cropId="wheat" stage="growing" />
    <ItemArt name="satchel" />
  </>));

  const crops = [...host.querySelectorAll<HTMLImageElement>(".crop-art")];
  expect(crops.map((crop) => crop.getAttribute("src"))).toEqual([
    "/art/garden-crops/carrot-ready.png",
    "/art/garden-crops/strawberry-ready.png",
    "/art/garden-crops/wheat-ready.png",
    "/art/wheat-growing.webp",
  ]);
  expect(crops.every((crop) => !crop.classList.contains("inventory-item-art"))).toBe(true);
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

test("uses an explicit v2 front image and localized alt for every postcard", () => {
  const ids: PostcardId[] = [
    "first-dandelion-hill-selfie",
    "wind_field_01", "wind_field_02", "wind_field_03",
    "moss_forest_01", "moss_forest_02", "moss_forest_03",
    "salt_town_01", "salt_town_02", "salt_town_03",
  ];
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(<>{ids.map((id) => <PostcardArt key={id} postcardId={id} />)}</>));

  const art = [...host.querySelectorAll<HTMLImageElement>(".postcard-art")];
  expect(art[0].getAttribute("src")).toBe("/art/postcards/postcard-first-dandelion-hill-blue-quaker-front-v2-no-visible-nares.png");
  ids.slice(1).forEach((id, index) => {
    expect(art[index + 1].getAttribute("src")).toBe(`/art/postcards/v2/${id}.png`);
    expect(art[index + 1].getAttribute("alt")).not.toBe("");
  });
});
