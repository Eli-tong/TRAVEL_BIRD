import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createNewGame, startPlanting } from "../domain/game";
import { GardenScene } from "./GardenScene";

const t0 = Date.UTC(2026, 9, 14, 8, 0, 0);
let root: Root;
let host: HTMLDivElement;
const handlers = {
  onBird: vi.fn(),
  onEnterHome: vi.fn(),
  onMailbox: vi.fn(),
  onPlot: vi.fn(),
  onScrollLeftChange: vi.fn()
};

const render = (props: Partial<Parameters<typeof GardenScene>[0]> = {}) => {
  const game = props.game ?? createNewGame(t0);
  act(() => root.render(<GardenScene game={game} now={t0} blocked={false} initialScrollLeft={null} {...handlers} {...props} />));
};

const pointerEvent = (type: string, fields: Record<string, unknown>) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, { value }])));
  return event;
};

describe("GardenScene", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    vi.clearAllMocks();
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
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
  });

  test("renders the approved continuous scene and three natural plot targets", () => {
    render();
    const background = host.querySelector<HTMLImageElement>(".garden-background");
    expect(background?.getAttribute("src")).toBe("/art/garden-v1/background-away.png");
    expect(host.querySelectorAll("[data-plot]")).toHaveLength(3);
    expect(host.querySelector(".garden-grid")).toBeNull();
  });

  test("renders a clickable bird only for a garden routine and keeps the activity intact", () => {
    const game = createNewGame(t0);
    game.plots[1].cropId = "carrot";
    game.plots[1].plantedAt = t0;
    game.plots[1].readyAt = t0 + 10_000;
    game.bird.routine = { location: "garden", activity: "garden-water-pour", activityStartedAt: t0, nextDecisionAt: t0 + 4_000, sequenceStep: 8 };
    render({ game });
    const bird = host.querySelector<HTMLButtonElement>('[data-garden-hotspot="bird"]');
    expect(bird?.getAttribute("data-activity")).toBe("garden-water-pour");
    expect(bird?.getAttribute("data-interaction-locked")).toBe("true");
    expect(bird?.closest(".garden-bird-routine")?.getAttribute("data-water-target")).toBe("plot-2");
    act(() => bird?.click());
    expect(handlers.onBird).toHaveBeenCalledTimes(1);
    expect(game.bird.routine.activity).toBe("garden-water-pour");
  });

  test("passes a shared angry mood into the garden bird without changing its routine", () => {
    const game = createNewGame(t0);
    game.bird.routine = {
      location: "garden", activity: "garden-sunbathe", activityStartedAt: t0,
      nextDecisionAt: t0 + 14_000, sequenceStep: 6, gardenSpot: "sun",
    };
    render({ game, mood: "angry" });
    const bird = host.querySelector<HTMLButtonElement>('[data-garden-hotspot="bird"]');
    expect(bird?.dataset.mood).toBe("angry");
    expect(bird?.dataset.activity).toBe("garden-sunbathe");
    expect(bird?.querySelector<HTMLImageElement>(".bird-routine-reaction")?.src).toContain("bird-reaction-angry-v2.png");
  });

  test("continues an arrival into a timestamped walk from the door instead of teleporting", () => {
    const game = createNewGame(t0);
    game.bird.routine = {
      location: "garden", activity: "garden-walk", activityStartedAt: t0 - 1_250,
      nextDecisionAt: t0 + 5_750, sequenceStep: 4, previousActivity: "garden-arrive",
      gardenSpot: "door", walkFrom: "door", walkTo: "soil", plannedActivity: "garden-forage",
    };
    render({ game, now: t0 });
    const path = host.querySelector<HTMLElement>(".garden-bird-routine");
    expect(path?.getAttribute("data-route")).toBe("door-soil");
    expect(path?.getAttribute("data-walk-facing")).toBe("left");
    expect(path?.style.getPropertyValue("--garden-route-delay")).toBe("-1250ms");
    expect(path?.style.getPropertyValue("--garden-route-x-2")).toBe("36.456395%");
  });

  test("mirrors the return-hop art while jumping out through the same doorway points", () => {
    const game = createNewGame(t0);
    game.bird.routine = {
      location: "garden", activity: "garden-arrive", activityStartedAt: t0,
      nextDecisionAt: t0 + 5_100, sequenceStep: 4, gardenSpot: "door-inside",
    };
    render({ game, now: t0 + 1_000 });
    const path = host.querySelector<HTMLElement>('.garden-bird-routine[data-route="door-hidden-door"]');
    expect(path?.dataset.walkFacing).toBe("left");
    expect(path?.dataset.routeKind).toBe("door-arrive");
    expect(path?.dataset.routePhase).toBe("exit-front");
    expect(path?.dataset.routeArt).toBe("door-hop");
    expect(path?.querySelector('.bird-routine-asset-probe')?.getAttribute("src")).toBe("/art/bird-routine/garden-door-hop-right-v1.png");
    expect(host.querySelector('.garden-door-occluder')).toBeNull();

    game.bird.routine = { ...game.bird.routine, activity: "garden-leave" };
    render({ game, now: t0 + 1_000 });
    expect(host.querySelector('.garden-bird-routine')?.getAttribute("data-route")).toBe("door-door-hidden");
    expect(host.querySelector('.garden-bird-routine')?.getAttribute("data-route-kind")).toBe("door-leave");
    expect(host.querySelector('.bird-routine-asset-probe')?.getAttribute("src")).toBe("/art/bird-routine/garden-door-hop-right-v1.png");
  });

  test.each([
    [100, "approach", "/art/bird-routine/garden-door-hop-right-v1.png"],
    [1_000, "hop-1", "/art/bird-routine/garden-door-hop-right-v1.png"],
    [1_900, "hop-2", "/art/bird-routine/garden-door-hop-right-v1.png"],
    [2_800, "hop-3", "/art/bird-routine/garden-door-hop-right-v1.png"],
    [3_600, "enter-back", "/art/bird-routine/garden-door-enter-back-v1.png"],
  ])("renders doorway phase %s with its dedicated art", (elapsed, phase, src) => {
    const game = createNewGame(t0);
    game.bird.routine = {
      location: "garden", activity: "garden-leave", gardenSpot: "door",
      activityStartedAt: t0, nextDecisionAt: t0 + 5_100, sequenceStep: 10,
    };
    render({ game, now: t0 + elapsed });
    const route = host.querySelector<HTMLElement>('.garden-bird-routine[data-route="door-door-hidden"]');
    expect(route?.dataset.routeKind).toBe("door-leave");
    expect(route?.dataset.routePhase).toBe(phase);
    expect(route?.dataset.routeArt).toBe(phase === "enter-back" ? "door-enter-back" : "door-hop");
    expect(route?.querySelector('.bird-routine-asset-probe')?.getAttribute("src")).toBe(src);
    const sprite = route?.querySelector<HTMLElement>('.bird-routine-sprite');
    expect(sprite?.getAttribute("data-activity")).toBe("garden-leave");
    expect(sprite?.dataset.playbackKey).toBe(phase);
  });

  test("keeps the route delay fixed while live phase updates avoid double-speed doorway motion", () => {
    const game = createNewGame(t0);
    game.bird.routine = {
      location: "garden", activity: "garden-leave", gardenSpot: "door",
      activityStartedAt: t0, nextDecisionAt: t0 + 5_100, sequenceStep: 10,
    };
    render({ game, now: t0 + 100 });
    expect(host.querySelector<HTMLElement>(".garden-bird-routine")?.style.getPropertyValue("--garden-route-delay")).toBe("-100ms");

    render({ game, now: t0 + 3_600 });
    const route = host.querySelector<HTMLElement>(".garden-bird-routine");
    expect(route?.style.getPropertyValue("--garden-route-delay")).toBe("-100ms");
    expect(route?.dataset.routePhase).toBe("enter-back");
  });

  test("defines mirrored reverse hop arcs and keeps the final enter shift continuous", () => {
    const css = readFileSync(resolve("src/gardenScene.css"), "utf8");
    expect(css).toMatch(/@keyframes garden-door-leave/);
    expect(css).toMatch(/@keyframes garden-door-arrive/);
    expect(css).toMatch(/20\.588235%[\s\S]*38\.235294%[\s\S]*55\.882353%/);
    expect(css).toMatch(/35\.294118%[\s\S]*52\.941176%[\s\S]*70\.588235%[\s\S]*88\.235294%/);
    expect(css).toMatch(/100%\s*\{\s*left:\s*var\(--garden-door-inside-x\)/);
    expect(css).toMatch(/data-route-kind="door-arrive"[^}]*data-route-art="door-hop"[\s\S]*scaleX\(-1\)/);
    expect(css).toMatch(/data-route-art="door-enter-back"[^}]*\.bird-routine-sprite[\s\S]*animation:\s*garden-door-enter-shift/);
    expect(css).toMatch(/@keyframes garden-door-enter-shift\s*\{[\s\S]*translateX\(0\)[\s\S]*translateX\(50%\)/);
    expect(css).not.toContain(".garden-door-occluder");
  });

  test("walks from the watering soil position toward the next activity instead of snapping", () => {
    const game = createNewGame(t0);
    game.bird.routine = {
      location: "garden", activity: "garden-walk", activityStartedAt: t0 - 500,
      nextDecisionAt: t0 + 4_000, sequenceStep: 10, previousActivity: "garden-water-putdown",
      gardenSpot: "soil", walkFrom: "soil", walkTo: "sun", plannedActivity: "garden-preen",
    };
    render({ game, now: t0 });
    const path = host.querySelector<HTMLElement>(".garden-bird-routine");
    expect(path?.getAttribute("data-route")).toBe("soil-sun");
    expect(path?.getAttribute("data-walk-facing")).toBe("right");
    expect(path?.style.left).toBe("11%");
    expect(path?.style.getPropertyValue("--garden-route-x-3")).toBe("61%");
  });

  test("hides the garden bird while it is indoors or travelling", () => {
    const indoors = createNewGame(t0);
    render({ game: indoors });
    expect(host.querySelector('[data-garden-hotspot="bird"]')).toBeNull();
    const travelling = createNewGame(t0);
    travelling.bird.routine = { location: "garden", activity: "garden-walk", activityStartedAt: t0, nextDecisionAt: t0 + 4_000, sequenceStep: 3 };
    travelling.travel.status = "travelling";
    render({ game: travelling });
    expect(host.querySelector('[data-garden-hotspot="bird"]')).toBeNull();
  });

  test("routes the entrance, mailbox, and each planting position through callbacks", () => {
    render();
    act(() => host.querySelector<HTMLButtonElement>('[data-garden-hotspot="entrance"]')!.click());
    expect(handlers.onEnterHome).toHaveBeenCalledTimes(1);
    act(() => host.querySelector<HTMLButtonElement>('[data-garden-hotspot="mailbox"]')!.click());
    expect(handlers.onMailbox).toHaveBeenCalledTimes(1);
    act(() => host.querySelector<HTMLButtonElement>('[data-plot="plot-2"]')!.click());
    expect(handlers.onPlot).toHaveBeenCalledWith("plot-2");
  });

  test("shows existing crop art for growing and ready states", () => {
    const planted = startPlanting(createNewGame(t0), "plot-1", "wheat", t0);
    render({ game: planted, now: t0 + 1_000 });
    expect(host.querySelector('[data-plot="plot-1"]')?.getAttribute("data-phase")).toBe("growing");
    expect(host.querySelector<HTMLImageElement>('[data-plot="plot-1"] .crop-art')?.src).toContain("wheat-growing.webp");
    render({ game: planted, now: t0 + 5_000 });
    expect(host.querySelector('[data-plot="plot-1"]')?.getAttribute("data-phase")).toBe("ready");
    expect(host.querySelector<HTMLImageElement>('[data-plot="plot-1"] .crop-art')?.src).toContain("garden-crops/wheat-ready.png");
  });

  test("defaults to the right edge and restores a remembered garden position", () => {
    render();
    expect(host.querySelector<HTMLElement>(".garden-viewport")?.scrollLeft).toBe(200);
    render({ initialScrollLeft: 82 });
    expect(host.querySelector<HTMLElement>(".garden-viewport")?.scrollLeft).toBe(82);
  });

  test("supports desktop mouse dragging inside the viewport", () => {
    render({ initialScrollLeft: 100 });
    const viewport = host.querySelector<HTMLElement>(".garden-viewport")!;
    act(() => {
      viewport.dispatchEvent(pointerEvent("pointerdown", { pointerType: "mouse", button: 0, pointerId: 1, clientX: 200 }));
      viewport.dispatchEvent(pointerEvent("pointermove", { pointerType: "mouse", pointerId: 1, clientX: 150 }));
      viewport.dispatchEvent(pointerEvent("pointerup", { pointerType: "mouse", pointerId: 1, clientX: 150 }));
    });
    expect(viewport.scrollLeft).toBe(150);
  });

  test("does not treat a small pointer movement on an interactive hotspot as a scene drag", () => {
    render();
    const viewport = host.querySelector<HTMLElement>(".garden-viewport")!;
    const entrance = host.querySelector<HTMLButtonElement>('[data-garden-hotspot="entrance"]')!;
    act(() => {
      entrance.dispatchEvent(pointerEvent("pointerdown", { pointerType: "mouse", button: 0, pointerId: 2, clientX: 200 }));
      viewport.dispatchEvent(pointerEvent("pointermove", { pointerType: "mouse", pointerId: 2, clientX: 190 }));
      viewport.dispatchEvent(pointerEvent("pointerup", { pointerType: "mouse", pointerId: 2, clientX: 190 }));
      entrance.click();
    });
    expect(handlers.onEnterHome).toHaveBeenCalledTimes(1);
  });

  test("passes localized bird speech into the moving garden sprite", () => {
    const game = createNewGame(t0);
    game.bird.routine = {
      location: "garden", activity: "garden-walk", activityStartedAt: t0,
      nextDecisionAt: t0 + 4_000, sequenceStep: 2, gardenSpot: "path-center",
    };
    render({ game, speech: "外面的风闻起来香香的。" });
    expect(host.querySelector('.bird-routine-bubble')?.textContent).toBe("外面的风闻起来香香的。");
  });
});
