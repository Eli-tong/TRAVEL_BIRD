import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App";
import { createNewGame, exportSave } from "./domain/game";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EXPECTED_INVENTORY_ART = [
  "/art/inventory/wheat-seeds.png",
  "/art/inventory/carrot-seeds.png",
  "/art/inventory/strawberry-seeds.png",
  "/art/inventory/wheat-ingredient.png",
  "/art/inventory/carrot-ingredient.png",
  "/art/inventory/strawberry-ingredient.png",
  "/art/inventory/strawberry-cloud-bun.png",
  "/art/inventory/carrot-crescent-crisp.png",
  "/art/inventory/tricolor-travel-bites.png"
];

describe("inventory artwork", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    const game = createNewGame(1_000);
    game.settings.seenIntro = true;
    localStorage.setItem("travel-bird-save-v1", exportSave(game));
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root.render(<App />));
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    localStorage.clear();
    vi.useRealTimers();
  });

  test("renders all nine visible items from the dedicated inventory PNG map", () => {
    const cabinet = host.querySelector<HTMLButtonElement>('[data-hotspot="cabinet"]');
    expect(cabinet).not.toBeNull();
    act(() => cabinet!.click());

    const images = [...host.querySelectorAll<HTMLImageElement>(".inventory-grid img")];
    expect(images).toHaveLength(9);
    expect(images.map((image) => image.getAttribute("src"))).toEqual(EXPECTED_INVENTORY_ART);
    expect(images.every((image) => image.classList.contains("inventory-item-art"))).toBe(true);
    expect(images.every((image) => image.draggable === false)).toBe(true);
    expect(images.some((image) => /-seed\.webp|-ready\.webp|\/art\/foods\//.test(image.src))).toBe(false);
  });
});
