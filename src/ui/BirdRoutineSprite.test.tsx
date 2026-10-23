import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { BirdActivityId } from "../domain/types";

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

// Dynamic loading lets the first RED assert the missing feature rather than fail collection.
async function player() {
  const load = import.meta.glob<typeof import("./BirdRoutineSprite")>("./BirdRoutineSprite.tsx")["./BirdRoutineSprite.tsx"];
  expect(load, "routine sprite player must exist").toBeDefined();
  return (await load()).BirdRoutineSprite;
}
async function manifest() {
  const load = import.meta.glob<typeof import("./birdRoutineArt")>("./birdRoutineArt.ts")["./birdRoutineArt.ts"];
  expect(load, "routine artwork manifest must exist").toBeDefined();
  return load();
}
async function render(activity: BirdActivityId = "garden-walk", extra = {}) {
  const Sprite = await player();
  act(() => root.render(<Sprite activity={activity} location={activity.startsWith("room") ? "room" : "garden"}
    birdName="小蓝" mood="calm" onClick={() => {}} interactionLocked={false} {...extra} />));
}

test("defines all routine activities as horizontal frame strips with support anchors and approved fallback", async () => {
  const { BIRD_ROUTINE_ART, BIRD_ROUTINE_WALK_ART, BIRD_ROUTINE_FLIGHT_ART, GARDEN_REACTION_ART, GARDEN_ROUTE_ART, ROOM_BRANCH_REACTION_ART, ROOM_SLEEP_REACTION_ART, WATERING_CAN_ART } = await manifest();
  expect(Object.keys(BIRD_ROUTINE_ART)).toHaveLength(20);
  for (const [activity, art] of Object.entries(BIRD_ROUTINE_ART)) {
    if (!["room-idle", "room-ruffle", "room-read", "room-write", "room-flight", "room-sleep", "room-wake", "room-leave", "room-arrive",
      "room-land", "garden-walk", "garden-preen", "garden-sunbathe", "garden-water-pickup", "garden-water-pour", "garden-water-putdown"].includes(activity)) {
      expect(art.src).toBe(`/art/bird-routine/${activity}.png`);
    }
    expect(art.frameWidth).toBeGreaterThan(0);
    expect(art.frameHeight).toBeGreaterThan(0);
    expect(art.fps).toBeGreaterThan(0);
    expect(["loop", "once"]).toContain(art.loop);
    expect(art.anchor.x).toBeGreaterThanOrEqual(0);
    expect(art.anchor.x).toBeLessThanOrEqual(art.frameWidth);
    expect(art.anchor.y).toBeGreaterThanOrEqual(0);
    expect(art.anchor.y).toBeLessThanOrEqual(art.frameHeight);
    expect(art.fallback).toBe("/art/room-v2/blue-quaker-calm-corrected.png");
    if (!["garden-walk", "room-ruffle", "garden-preen", "garden-water-pickup", "garden-water-pour", "garden-water-putdown"].includes(activity)) {
      expect(art.frameCount).toBeGreaterThanOrEqual(6);
      expect(art.frameCount).toBeLessThanOrEqual(16);
    }
  }
  expect(WATERING_CAN_ART).toBe("/art/bird-routine/watering-can.png");
  expect(BIRD_ROUTINE_WALK_ART.left).toMatchObject({ src: "/art/bird-routine/garden-walk-left-v3.png", fps: 8 });
  expect(BIRD_ROUTINE_WALK_ART.right).toMatchObject({ src: "/art/bird-routine/garden-walk-right-v3.png", fps: 8 });
  expect(BIRD_ROUTINE_WALK_ART.left.frameCount).toBe(16);
  expect(BIRD_ROUTINE_WALK_ART.right.frameCount).toBe(16);
  expect(BIRD_ROUTINE_WALK_ART.left.frameWidth).toBe(540);
  expect(BIRD_ROUTINE_WALK_ART.right.frameWidth).toBe(540);
  expect(GARDEN_ROUTE_ART.hopRight).toMatchObject({
    src: "/art/bird-routine/garden-door-hop-right-v1.png", frameCount: 8, fps: 10, loop: "once",
  });
  expect(GARDEN_ROUTE_ART.enterBack).toMatchObject({
    src: "/art/bird-routine/garden-door-enter-back-v1.png", frameCount: 12, fps: 8, loop: "loop",
  });
  expect(BIRD_ROUTINE_FLIGHT_ART.left).toMatchObject({
    src: "/art/bird-routine/room-flight-left.png", frameCount: 16, frameWidth: 600,
  });
  expect(BIRD_ROUTINE_FLIGHT_ART.right).toMatchObject({
    src: "/art/bird-routine/room-flight-right.png", frameCount: 16, frameWidth: 600,
  });
  expect(BIRD_ROUTINE_ART["room-sleep"]).toMatchObject({
    src: "/art/bird-routine/room-sleep-side-v3.png", frameCount: 16, frameWidth: 600, fps: 2,
  });
  expect(BIRD_ROUTINE_ART["room-wake"]).toMatchObject({
    src: "/art/bird-routine/room-wake-side-v3.png", frameCount: 12, frameWidth: 600,
  });
  expect(BIRD_ROUTINE_ART["room-land"]).toMatchObject({
    src: "/art/bird-routine/room-land-branch-v1.png", frameCount: 12, frameWidth: 540,
    fps: 10, loop: "once", anchor: { x: 270, y: 509 },
  });
  expect(BIRD_ROUTINE_ART["room-wake"]).toMatchObject({ frameCount: 12, frameWidth: 600 });
  expect(ROOM_SLEEP_REACTION_ART).toEqual({
    happy: "/art/bird-routine/room-sleep-look-side-v3.png",
    angry: "/art/bird-routine/room-sleep-angry-side-v3.png",
  });
  expect(ROOM_BRANCH_REACTION_ART).toEqual({
    happy: "/art/bird-routine/bird-reaction-happy-branch-v3.png",
    angry: "/art/bird-routine/bird-reaction-angry-branch-v3.png",
  });
  expect(GARDEN_REACTION_ART).toEqual({
    happy: "/art/bird-routine/bird-reaction-happy-v2.png",
    angry: "/art/bird-routine/bird-reaction-angry-v2.png",
  });
  for (const activity of ["room-idle", "room-ruffle", "room-read", "room-write"] as const) {
    expect(BIRD_ROUTINE_ART[activity]).toMatchObject({
      src: `/art/bird-routine/${activity}-v2.png`, frameWidth: 540, anchor: { x: 270, y: 509 },
    });
  }
  expect(BIRD_ROUTINE_ART["room-read"].frameHeight).toBe(600);
  expect(BIRD_ROUTINE_ART["room-write"].frameHeight).toBe(600);
  expect(BIRD_ROUTINE_ART["room-leave"]).toMatchObject({ src: "/art/bird-routine/room-flight-right.png", frameWidth: 600 });
  expect(BIRD_ROUTINE_ART["room-arrive"]).toMatchObject({ src: "/art/bird-routine/room-flight-left.png", frameWidth: 600 });
  expect(BIRD_ROUTINE_ART["garden-preen"]).toMatchObject({ src: "/art/bird-routine/garden-preen-v2.png", frameCount: 24, fps: 6 });
  expect(BIRD_ROUTINE_ART["garden-sunbathe"]).toMatchObject({ src: "/art/bird-routine/garden-sunbathe-v2.png", frameCount: 8, fps: 1 });
  expect(BIRD_ROUTINE_ART["garden-forage"].frameCount).toBe(16);
  expect(BIRD_ROUTINE_ART["garden-water-pickup"]).toMatchObject({
    src: "/art/bird-routine/garden-water-pickup-v3.png", frameCount: 12, sceneScale: 1,
  });
  expect(BIRD_ROUTINE_ART["garden-water-pour"]).toMatchObject({
    src: "/art/bird-routine/garden-water-pour-v3.png", frameCount: 16, sceneScale: 1.13,
  });
  expect(BIRD_ROUTINE_ART["garden-water-putdown"]).toMatchObject({
    src: "/art/bird-routine/garden-water-putdown-v3.png", frameCount: 12, sceneScale: 1,
  });
  for (const art of [...Object.values(BIRD_ROUTINE_WALK_ART), BIRD_ROUTINE_ART["garden-preen"],
    BIRD_ROUTINE_ART["garden-forage"], BIRD_ROUTINE_ART["garden-water-pickup"],
    BIRD_ROUTINE_ART["garden-water-pour"], BIRD_ROUTINE_ART["garden-water-putdown"],
    ...Object.values(BIRD_ROUTINE_FLIGHT_ART), BIRD_ROUTINE_ART["room-sleep"], BIRD_ROUTINE_ART["room-wake"],
    BIRD_ROUTINE_ART["room-idle"], BIRD_ROUTINE_ART["room-ruffle"], BIRD_ROUTINE_ART["room-read"],
    BIRD_ROUTINE_ART["room-write"], BIRD_ROUTINE_ART["room-land"], ...Object.values(ROOM_BRANCH_REACTION_ART).map(src => ({ src })),
    ...Object.values(ROOM_SLEEP_REACTION_ART).map(src => ({ src })), ...Object.values(GARDEN_ROUTE_ART)]) {
    expect(existsSync(resolve(`public${art.src}`)), art.src).toBe(true);
  }
  expect(BIRD_ROUTINE_ART["room-ruffle"].frameCount).toBe(7);
  expect(BIRD_ROUTINE_ART["room-leave"].fps).toBe(8);
  expect(BIRD_ROUTINE_ART["garden-arrive"].fps).toBe(2);
  expect(["garden-water-pickup", "garden-water-pour", "garden-water-putdown"].map(id =>
    BIRD_ROUTINE_ART[id as BirdActivityId].frameCount)).toEqual([12, 16, 12]);
});

test("keeps garden-leave semantics while switching explicit doorway art", async () => {
  const { GARDEN_ROUTE_ART } = await manifest();
  await render("garden-leave", { artOverride: GARDEN_ROUTE_ART.enterBack });
  const first = host.querySelector("button")!;
  expect(first.dataset.activity).toBe("garden-leave");
  expect(first.dataset.frameCount).toBe("12");
  expect(first.querySelector(".bird-routine-asset-probe")?.getAttribute("src"))
    .toBe("/art/bird-routine/garden-door-enter-back-v1.png");

  await render("garden-leave", { artOverride: GARDEN_ROUTE_ART.hopRight });
  const second = host.querySelector("button")!;
  expect(second.dataset.activity).toBe("garden-leave");
  expect(second.dataset.frameCount).toBe("8");
  expect(second.querySelector(".bird-routine-asset-probe")?.getAttribute("src"))
    .toBe("/art/bird-routine/garden-door-hop-right-v1.png");
});

test("selects the directional walk strip and exposes location, frame count, duration and accessible name", async () => {
  await render("garden-walk", { facing: "right" });
  const button = host.querySelector("button")!;
  expect(button.dataset.activity).toBe("garden-walk");
  expect(button.dataset.location).toBe("garden");
  expect(button.dataset.frameCount).toBe("16");
  expect(button.dataset.facing).toBe("right");
  expect(button.getAttribute("aria-label")).toContain("小蓝");
  expect(button.getAttribute("aria-label")).toContain("庭院");
  const frame = host.querySelector<HTMLElement>(".bird-routine-frame")!;
  expect(frame.style.backgroundImage).toContain("/art/bird-routine/garden-walk-right-v3.png");
  expect(frame.style.getPropertyValue("--bird-frame-count")).toBe("16");
  expect(frame.style.getPropertyValue("--bird-duration")).toMatch(/s$/);
  await render("room-ruffle");
  expect(host.querySelector("button")!.dataset.frameCount).toBe("7");
  expect(host.querySelector("button")!.getAttribute("aria-label")).toContain("抖羽");
});

test("click delegates without a component-local response timer, including locked watering", async () => {
  const onClick = vi.fn();
  await render("garden-water-pour", { interactionLocked: true, onClick });
  const button = host.querySelector("button")!;
  act(() => button.click());
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(button.classList.contains("is-responding")).toBe(false);
  expect(button.dataset.activity).toBe("garden-water-pour");
  expect(button.disabled).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
  expect(button.dataset.activity).toBe("garden-water-pour");
});

test("renders localized speech in a scene-attached live bubble", async () => {
  await render("room-read", { speech: "今天读到一段很有趣的故事。" });
  const bubble = host.querySelector<HTMLElement>(".bird-routine-bubble");
  expect(bubble?.getAttribute("role")).toBe("status");
  expect(bubble?.textContent).toBe("今天读到一段很有趣的故事。");
  expect(bubble?.closest('[data-location="room"]')).not.toBeNull();
});

test("shows the approved look-at-player and angry watercolor poses without replacing the activity", async () => {
  await render("garden-walk", { mood: "happy" });
  let button = host.querySelector<HTMLButtonElement>("button")!;
  expect(button.dataset.activity).toBe("garden-walk");
  expect(button.dataset.mood).toBe("happy");
  expect(host.querySelector<HTMLImageElement>(".bird-routine-reaction")?.getAttribute("src"))
    .toBe("/art/bird-routine/bird-reaction-happy-v2.png");
  expect(host.querySelector(".bird-routine-frame")?.classList.contains("is-reaction-covered")).toBe(true);
  expect(host.querySelector(".bird-routine-reaction")?.getAttribute("data-reaction-placement")).toBe("ground");

  await render("room-read", { mood: "happy" });
  expect(host.querySelector<HTMLImageElement>(".bird-routine-reaction")?.getAttribute("src"))
    .toBe("/art/bird-routine/bird-reaction-happy-branch-v3.png");
  expect(host.querySelector(".bird-routine-reaction")?.getAttribute("data-reaction-placement")).toBe("branch");

  await render("garden-walk", { mood: "angry", speech: "小蓝鼓起了脸颊：让我安静一会儿嘛。" });
  button = host.querySelector<HTMLButtonElement>("button")!;
  expect(button.dataset.activity).toBe("garden-walk");
  expect(button.dataset.mood).toBe("angry");
  expect(host.querySelector<HTMLImageElement>(".bird-routine-reaction")?.getAttribute("src"))
    .toBe("/art/bird-routine/bird-reaction-angry-v2.png");
  expect(host.querySelector(".bird-routine-bubble")?.textContent).toContain("安静一会儿");
});

test("keeps sleeping in bed while using the blanket look and angry reactions", async () => {
  await render("room-sleep", { mood: "happy" });
  expect(host.querySelector<HTMLImageElement>(".bird-routine-reaction")?.getAttribute("src"))
    .toBe("/art/bird-routine/room-sleep-look-side-v3.png");
  expect(host.querySelector("button")?.dataset.activity).toBe("room-sleep");
  expect(host.querySelector(".bird-routine-reaction")?.getAttribute("data-reaction-placement")).toBe("bed");
  await render("room-sleep", { mood: "angry" });
  expect(host.querySelector<HTMLImageElement>(".bird-routine-reaction")?.getAttribute("src"))
    .toBe("/art/bird-routine/room-sleep-angry-side-v3.png");
});

test("asset failure reports once, stops the strip, and retains a button if fallback also fails", async () => {
  const onAssetError = vi.fn();
  await render("garden-walk", { onAssetError });
  const probe = host.querySelector<HTMLImageElement>("img")!;
  act(() => probe.dispatchEvent(new Event("error")));
  expect(onAssetError).toHaveBeenCalledExactlyOnceWith("garden-walk");
  expect(host.querySelector(".bird-routine-frame")).toBeNull();
  const fallback = host.querySelector<HTMLImageElement>("img")!;
  expect(fallback.getAttribute("src")).toBe("/art/room-v2/blue-quaker-calm-corrected.png");
  act(() => fallback.dispatchEvent(new Event("error")));
  expect(onAssetError).toHaveBeenCalledTimes(1);
  expect(host.querySelector("img")).toBeNull();
  expect(host.querySelector("button")!.getAttribute("aria-label")).toContain("小蓝");
  await render("room-ruffle", { onAssetError });
  expect(host.querySelector(".bird-routine-frame")).not.toBeNull();
});

test("CSS uses frame clipping, slows reduced motion and preserves the character and activity semantics", async () => {
  const path = resolve("src/birdRoutine.css");
  expect(existsSync(path), "frame animation stylesheet must exist").toBe(true);
  const css = readFileSync(path, "utf8");
  expect(css).toMatch(/steps\(var\(--bird-frame-count\), jump-none\)/);
  expect(css).toMatch(/@keyframes bird-routine-frames\s*\{\s*to\s*\{\s*background-position:\s*100% 0/);
  expect(css).not.toContain("--bird-strip-end");
  expect(css).toContain("background-position");
  expect(css).toContain("prefers-reduced-motion: reduce");
  expect(css).toContain("calc(var(--bird-duration) * 3)");
  expect(css).toContain(".bird-routine-bubble");
  expect(css).not.toContain('content: "♪"');
  expect(css).not.toMatch(/rotate\(|scale\(/);
  const gardenCss = readFileSync(resolve("src/gardenScene.css"), "utf8");
  expect(gardenCss).toMatch(
    /\.garden-bird-routine\[data-route-art="walk"\]\s+\.bird-routine-frame/,
  );
  expect(gardenCss).toMatch(/animation-iteration-count:\s*var\(--garden-route-cycle-count\)/);
  expect(gardenCss).toMatch(/animation-fill-mode:\s*both/);
  expect(readFileSync(resolve("src/main.tsx"), "utf8")).toContain('import "./birdRoutine.css"');
  await render();
  expect(host.querySelector("button")!.dataset.location).toBe("garden");
  expect(host.querySelector("button")!.dataset.activity).toBe("garden-walk");
});

test("compresses only the final room-flight approach segment", () => {
  const css = readFileSync(resolve("src/scene.css"), "utf8");
  expect(css).toMatch(/37\.5%\s*\{\s*left:\s*var\(--room-route-x-1\)/);
  expect(css).toMatch(/87\.5%\s*\{\s*left:\s*var\(--room-route-x-2\)/);
});

test("room writing holds the pencil through a long writing passage before putting it down", () => {
  const css = readFileSync(resolve("src/birdRoutine.css"), "utf8");
  expect(css).toMatch(/\[data-activity="room-write"\]\s+\.bird-routine-frame\s*\{\s*animation:\s*room-write-long 12s steps\(1, end\) infinite/);
  expect(css).toMatch(/@keyframes room-write-long/);
  // Frame 0/1 are the pencil-down pickup, frames 3/4/6 keep the pencil in
  // the beak, and frame 7 is the final pencil-down pose.
  expect(css).toMatch(/6%\s*\{\s*background-position:\s*42\.857% 0/);
  expect(css).toMatch(/94%\s*\{\s*background-position:\s*85\.714% 0/);
  expect(css).toMatch(/100%\s*\{\s*background-position:\s*100% 0/);
});

test("garden preening stays inside active grooming poses instead of returning to neutral", () => {
  const css = readFileSync(resolve("src/birdRoutine.css"), "utf8");
  expect(css).toMatch(/\[data-activity="garden-preen"\]\s+\.bird-routine-frame\s*\{\s*animation:\s*garden-preen-sustained/);
  expect(css).toMatch(/@keyframes garden-preen-sustained/);
  const sequence = css.slice(css.indexOf("@keyframes garden-preen-sustained"), css.indexOf(".bird-routine-frame.is-reaction-covered"));
  for (const neutral of ["0 0", "21.739% 0", "52.174% 0", "91.304% 0", "95.652% 0", "100% 0"]) {
    expect(sequence).not.toContain(`background-position: ${neutral}`);
  }
});

test("room reading lingers on the page and turns it only once late in the cycle", () => {
  const css = readFileSync(resolve("src/birdRoutine.css"), "utf8");
  expect(css).toMatch(/\[data-activity="room-read"\]\s+\.bird-routine-frame\s*\{\s*animation:\s*room-read-long 16s steps\(1, end\) infinite/);
  expect(css).toMatch(/@keyframes room-read-long/);
  // Most of the cycle stays in the two low reading poses. The lifted-page
  // frames appear only near the end, followed by another held reading pose.
  expect(css).toMatch(/6%\s*\{\s*background-position:\s*28\.571% 0/);
  expect(css).toMatch(/70%\s*\{\s*background-position:\s*28\.571% 0/);
  expect(css).toMatch(/74%\s*\{\s*background-position:\s*57\.143% 0/);
  expect(css).toMatch(/96%\s*\{\s*background-position:\s*100% 0/);
  expect(css).toMatch(/\.bird-routine-sprite\[data-activity="room-read"\]\s+\.bird-routine-frame\s*\{\s*animation:\s*room-read-long 48s steps\(1, end\) infinite !important/);
});

test("composed stylesheet contract overrides the shared active button transform for sprites and fallback", () => {
  const shared = readFileSync(resolve("src/styles.css"), "utf8");
  const routine = readFileSync(resolve("src/birdRoutine.css"), "utf8");
  expect(routine).toMatch(/\.bird-routine-bubble\s*\{/);
  expect(routine).not.toMatch(/\.bird-routine-sprite\.is-responding/);
  // This inherited press rule caused both the strip and approved fallback to move.
  expect(shared).toMatch(/button:active:not\(:disabled\)\s*\{\s*transform:\s*translateY\(2px\) rotate\(-0\.25deg\)/);
  // Adding the component class to the exact shared selector raises specificity.
  expect(routine).toMatch(/button\.bird-routine-sprite:active:not\(:disabled\)\s*\{\s*transform:\s*none\s*;/);
  const main = readFileSync(resolve("src/main.tsx"), "utf8");
  expect(main.indexOf('import "./birdRoutine.css"')).toBeGreaterThan(main.indexOf('import "./styles.css"'));
});

test("combined reduced-motion cascade restores slow stepped playback over universal important resets", () => {
  for (const file of ["styles.css", "scene.css"]) {
    const shared = readFileSync(resolve(`src/${file}`), "utf8");
    expect(shared).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{\s*animation:\s*none\s*!important/);
  }
  const routine = readFileSync(resolve("src/birdRoutine.css"), "utf8");
  const reduced = routine.slice(routine.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  // A full important shorthand restores all fields reset by animation:none!important.
  // The scoped selectors outrank the universals regardless of stylesheet order.
  expect(reduced).toMatch(/\.bird-routine-sprite\s+\.bird-routine-frame\s*\{\s*animation:\s*bird-routine-frames calc\(var\(--bird-duration\) \* 3\) steps\(var\(--bird-frame-count\), jump-none\) infinite\s*!important\s*;/);
  expect(reduced).toMatch(/\.bird-routine-sprite\s+\.bird-routine-frame\.is-once\s*\{\s*animation:\s*bird-routine-once calc\(var\(--bird-duration\) \* 3\) steps\(var\(--bird-frame-count\), jump-none\) 1 both\s*!important\s*;/);
  expect(routine).toMatch(/@keyframes bird-routine-once\s*\{\s*to\s*\{\s*background-position:\s*100% 0/);
  expect(reduced).not.toMatch(/\.bird-routine-sprite\.is-responding/);
});
