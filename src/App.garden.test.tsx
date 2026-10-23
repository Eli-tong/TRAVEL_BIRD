import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App";
import { createNewGame, exportSave, prepareTravel, setBagDestination, setBagFood, startTravel } from "./domain/game";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t0 = Date.UTC(2026, 9, 14, 8, 0, 0);
let host: HTMLDivElement;
let root: Root;

const click = (selector: string) => {
  const button = host.querySelector<HTMLButtonElement>(selector);
  expect(button, `missing button: ${selector}`).not.toBeNull();
  act(() => button!.click());
};

const clickText = (label: string) => {
  const button = [...host.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => !candidate.disabled && candidate.textContent?.includes(label));
  expect(button, `missing button containing: ${label}`).not.toBeUndefined();
  act(() => button!.click());
};

const remount = () => {
  act(() => root.unmount());
  root = createRoot(host);
  act(() => root.render(<App />));
};

const mount = (game = createNewGame(t0)) => {
  game.settings.seenIntro = true;
  localStorage.setItem("travel-bird-save-v1", exportSave(game));
  act(() => root.render(<App />));
};

describe("garden player flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(t0);
    localStorage.clear();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() { return this.classList?.contains("garden-viewport") ? 400 : 0; }
    });
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() { return this.classList?.contains("garden-viewport") ? 600 : 0; }
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    localStorage.clear();
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
    vi.useRealTimers();
  });

  test("moves between room and garden while retaining the internal horizontal position", () => {
    mount();
    const routineBefore = JSON.parse(localStorage.getItem("travel-bird-save-v1")!).bird.routine;
    click('[data-hotspot="exit"]');
    const viewport = host.querySelector<HTMLElement>(".garden-viewport")!;
    expect(viewport).not.toBeNull();
    expect(viewport.scrollLeft).toBe(200);
    viewport.scrollLeft = 74;
    act(() => viewport.dispatchEvent(new Event("scroll", { bubbles: true })));

    click('[data-garden-hotspot="entrance"]');
    expect(host.querySelector(".room-canvas")).not.toBeNull();
    click('[data-hotspot="exit"]');
    expect(host.querySelector<HTMLElement>(".garden-viewport")?.scrollLeft).toBe(74);
    expect(JSON.parse(localStorage.getItem("travel-bird-save-v1")!).bird.routine).toEqual(routineBefore);
  });

  test("shows a light message when the mailbox has no pending postcard", () => {
    mount();
    click('[data-hotspot="exit"]');
    click('[data-garden-hotspot="mailbox"]');
    expect(host.querySelector('[role="status"]')?.textContent).toContain("今天没有新的信");
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  test("uses the travel phase to hide the garden bird while the bird is away", () => {
    let game = createNewGame(t0);
    game.inventory.foods["strawberry-cloud-bun"] = 1;
    game = setBagDestination(game, "wind_field", t0);
    game = setBagFood(game, "strawberry-cloud-bun");
    game = startTravel(game, t0, () => 0);
    mount(game);

    expect(host.querySelector('[data-hotspot="bird"]')).toBeNull();
    click('[data-hotspot="exit"]');
    expect(host.querySelector<HTMLImageElement>(".garden-background")?.getAttribute("src"))
      .toBe("/art/garden-v1/background-away.png");
    expect(host.querySelector('[data-garden-hotspot="bird"]')).toBeNull();
    act(() => vi.advanceTimersByTime(15_500));
    expect(host.querySelector<HTMLImageElement>(".garden-background")?.getAttribute("src"))
      .toBe("/art/garden-v1/background-away.png");
    expect(host.querySelector('[data-garden-hotspot="bird"]')).toBeNull();
    click('[data-garden-hotspot="entrance"]');
    expect(host.querySelector('[data-hotspot="bird"]')).not.toBeNull();
  });

  test("keeps the bird home while ready, then hides it after the planned departure", () => {
    let game = createNewGame(t0);
    game.inventory.foods["strawberry-cloud-bun"] = 1;
    game = setBagDestination(game, "wind_field", t0);
    game = setBagFood(game, "strawberry-cloud-bun", t0);
    game = prepareTravel(game, t0, () => 0);
    mount(game);

    expect(host.querySelector('[data-hotspot="bird"]')).not.toBeNull();
    click('[data-hotspot="exit"]');
    expect(host.querySelector('[data-garden-hotspot="bird"]')).toBeNull();

    act(() => vi.advanceTimersByTime(5_100));
    expect(host.querySelector('[data-garden-hotspot="bird"]')).toBeNull();
    click('[data-garden-hotspot="entrance"]');
    expect(host.querySelector('[data-hotspot="bird"]')).toBeNull();
  });

  test("keeps postcard mail and seed bag rewards independent across reload", () => {
    let game = createNewGame(t0);
    game.inventory.foods["strawberry-cloud-bun"] = 1;
    game = setBagDestination(game, "wind_field", t0);
    game = setBagFood(game, "strawberry-cloud-bun");
    game = startTravel(game, t0, () => 0);
    vi.setSystemTime((game.currentJourney?.returnsAt ?? t0) + 1);
    mount(game);

    click('[data-hotspot="exit"]');
    expect(host.querySelector(".garden-mail-envelope")).not.toBeNull();
    click('[data-garden-hotspot="mailbox"]');
    const mailbox = host.querySelector('[role="dialog"]');
    expect(mailbox?.textContent).toContain("蒲公英风坡");
    expect(mailbox?.textContent).not.toContain("胡萝卜种子");
    expect(mailbox?.textContent).not.toContain("新食谱");
    clickText("收好明信片");

    let saved = JSON.parse(localStorage.getItem("travel-bird-save-v1") ?? "null");
    expect(saved.album.collected).toHaveLength(1);
    expect(saved.inventory.seeds.carrot).toBe(0);
    expect(saved.currentJourney.postcardClaimed).toBe(true);
    expect(saved.currentJourney.seedRewardsClaimed).toBe(false);

    remount();
    click('[data-hotspot="exit"]');
    expect(host.querySelector(".garden-mail-envelope")).toBeNull();
    click('[data-garden-hotspot="mailbox"]');
    expect(host.querySelector('[role="status"]')?.textContent).toContain("今天没有新的信");
    click('[data-garden-hotspot="entrance"]');
    click('[data-hotspot="travelBag"]');
    const bag = host.querySelector('[role="dialog"]');
    expect(bag?.textContent).toContain("胡萝卜种子");
    expect(bag?.textContent).not.toContain("蒲公英风坡");
    expect(bag?.textContent).not.toContain("新明信片");
    clickText("收好带回的东西");

    saved = JSON.parse(localStorage.getItem("travel-bird-save-v1") ?? "null");
    expect(saved.inventory.seeds.carrot).toBe(1);
    expect(saved.album.collected).toHaveLength(1);
    expect(saved.currentJourney).toBeNull();
    expect(saved.travelLog).toHaveLength(1);

    remount();
    const reopened = JSON.parse(localStorage.getItem("travel-bird-save-v1") ?? "null");
    expect(reopened.inventory.seeds.carrot).toBe(1);
    expect(reopened.album.collected).toHaveLength(1);
    expect(reopened.travelLog).toHaveLength(1);
  });

  test("plants, displays, grows, and harvests a carrot through the existing plot logic", () => {
    const game = createNewGame(t0);
    game.unlocked.crops.push("carrot");
    game.inventory.seeds.carrot = 1;
    mount(game);

    click('[data-hotspot="exit"]');
    click('[data-plot="plot-1"]');
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("胡萝卜种子");
    clickText("胡萝卜种子");

    let saved = JSON.parse(localStorage.getItem("travel-bird-save-v1") ?? "null");
    expect(saved.plots[0].cropId).toBe("carrot");
    expect(saved.inventory.seeds.carrot).toBe(0);
    expect(host.querySelector('[data-plot="plot-1"]')?.getAttribute("data-phase")).toBe("growing");
    expect(host.querySelector<HTMLImageElement>('[data-plot="plot-1"] .crop-art')?.src).toContain("carrot-growing.webp");

    act(() => vi.advanceTimersByTime(5_000));
    expect(host.querySelector('[data-plot="plot-1"]')?.getAttribute("data-phase")).toBe("ready");
    expect(host.querySelector<HTMLImageElement>('[data-plot="plot-1"] .crop-art')?.src)
      .toContain("garden-crops/carrot-ready.png");
    click('[data-plot="plot-1"]');
    clickText("收获作物");

    saved = JSON.parse(localStorage.getItem("travel-bird-save-v1") ?? "null");
    expect(saved.plots[0].cropId).toBeNull();
    expect(saved.inventory.materials.carrot).toBe(2);
    expect(saved.inventory.seeds.carrot).toBe(1);
  });
});
