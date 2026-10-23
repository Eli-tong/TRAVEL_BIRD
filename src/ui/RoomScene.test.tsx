import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { RoomScene } from "./RoomScene";
import type { BirdRoutineState } from "../domain/types";

let root: Root;
let host: HTMLDivElement;
const handlers = { onBird: vi.fn(), onBag: vi.fn(), onKitchen: vi.fn(), onInventory: vi.fn(), onRequestGarden: vi.fn() };
beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  vi.clearAllMocks();
});
afterEach(() => { act(() => root.unmount()); host.remove(); history.replaceState(null, "", "/"); });
const roomRoutine: BirdRoutineState = { location: "room", activity: "room-read", activityStartedAt: 1, nextDecisionAt: 10, sequenceStep: 2 };
const gardenRoutine: BirdRoutineState = { location: "garden", activity: "garden-walk", activityStartedAt: 1, nextDecisionAt: 10, sequenceStep: 3 };
const render = (props = {}) => act(() => root.render(<RoomScene birdName="啾啾" routine={roomRoutine} travelling={false} {...handlers} {...props} />));
const target = (id: string) => host.querySelector<HTMLButtonElement>(`[data-hotspot="${id}"]`);

test("只在小鸟位于室内且未旅行时显示动态角色，行囊始终可用", () => {
  render(); expect(target("bird")).not.toBeNull(); expect(target("travelBag")).not.toBeNull();
  expect(host.querySelector('[data-activity="room-read"]')).not.toBeNull();
  render({ routine: gardenRoutine });
  expect(target("bird")).toBeNull();
  render({ routine: roomRoutine, travelling: true });
  expect(target("bird")).toBeNull(); expect(target("travelBag")).not.toBeNull();
  expect(host.querySelector('.bird-routine-sprite')).toBeNull();
  expect(host.querySelector('[data-layer="travelBag"]')).not.toBeNull();
});
test("厨房、锅、行囊、柜子及门口只调用各自处理函数", () => {
  render();
  for (const [id, callback] of [["kitchen", handlers.onKitchen], ["pot", handlers.onKitchen], ["travelBag", handlers.onBag], ["cabinet", handlers.onInventory], ["exit", handlers.onRequestGarden]] as const) {
    vi.clearAllMocks(); act(() => target(id)?.click());
    expect(callback).toHaveBeenCalledTimes(1);
    for (const other of Object.values(handlers)) if (other !== callback) expect(other).not.toHaveBeenCalled();
  }
});
test("主要面板打开时场景按钮不可操作", () => {
  render({ blocked: true });
  for (const id of ["bird", "travelBag", "kitchen", "pot", "cabinet", "exit"]) {
    expect(target(id)?.disabled).toBe(true); act(() => target(id)?.click());
  }
  for (const callback of Object.values(handlers)) expect(callback).not.toHaveBeenCalled();
});
test("开发检查可分别隐藏素材且不写入存档", () => {
  history.replaceState(null, "", "/?roomDebug=1");
  localStorage.setItem("travel-bird-save-v1", "unchanged"); render();
  const controls = host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  act(() => controls[1].click());
  expect(target("bird")).toBeNull(); expect(target("travelBag")).not.toBeNull();
  act(() => controls[2].click()); expect(target("travelBag")).toBeNull();
  const restore = [...host.querySelectorAll("button")].find((button) => button.textContent === "恢复正常")!;
  act(() => restore.click()); expect(target("bird")).not.toBeNull(); expect(target("travelBag")).not.toBeNull();
  expect(localStorage.getItem("travel-bird-save-v1")).toBe("unchanged");
});
test("点击动态小鸟只触发温馨回应，不改变活动", () => {
  render({ speech: "我正在看书呢。" }); const bird = target("bird")!;
  expect(host.querySelector('.room-trunk-occluder')).toBeNull();
  act(() => bird.click());
  expect(handlers.onBird).toHaveBeenCalledTimes(1);
  expect(host.querySelector('[data-activity="room-read"]')).not.toBeNull();
  expect(host.querySelector('.room-trunk-occluder')).toBeNull();
  expect(host.querySelector('.bird-routine-bubble')?.textContent).toBe("我正在看书呢。");
});
test("室内飞行沿保存的树枝到床铺路线播放，并在床上保留睡眠互动", () => {
  const flight: BirdRoutineState = {
    location: "room", activity: "room-flight", roomSpot: "branch", flightFrom: "branch", flightTo: "bed",
    plannedActivity: "room-sleep", activityStartedAt: Date.now(), nextDecisionAt: Date.now() + 5_000, sequenceStep: 4,
  };
  render({ routine: flight });
  const route = host.querySelector<HTMLElement>('.room-bird-routine[data-route="branch-bed"]');
  expect(route?.dataset.flightFacing).toBe("left");
  expect(route?.querySelector('.bird-routine-asset-probe')?.getAttribute("src")).toBe("/art/bird-routine/room-flight-left.png");

  render({ routine: { ...flight, activity: "room-sleep", roomSpot: "bed", flightFrom: null, flightTo: null }, mood: "happy" });
  expect(host.querySelector('.room-bird-routine')?.getAttribute("data-route")).toBeNull();
  expect(host.querySelector<HTMLImageElement>('.bird-routine-reaction')?.getAttribute("src"))
    .toBe("/art/bird-routine/room-sleep-look-side-v3.png");
  const sourceWidth = (element: HTMLElement | null) =>
    Number.parseFloat(element?.style.width ?? "0") / 100 * 941;
  const sourceLeft = (element: HTMLElement | null) =>
    Number.parseFloat(element?.style.left ?? "0") / 100 * 941;
  const happyWrapper = host.querySelector<HTMLElement>(".room-bird-routine");
  expect(sourceWidth(happyWrapper)).toBeCloseTo(158.4, 8);
  expect(sourceLeft(happyWrapper)).toBeCloseTo(255.8, 8);

  render({ routine: { ...flight, activity: "room-sleep", roomSpot: "bed", flightFrom: null, flightTo: null }, mood: "angry" });
  const angryWrapper = host.querySelector<HTMLElement>(".room-bird-routine");
  expect(sourceWidth(angryWrapper)).toBeCloseTo(158.4, 8);
  expect(host.querySelector<HTMLImageElement>(".bird-routine-reaction")?.getAttribute("src"))
    .toBe("/art/bird-routine/room-sleep-angry-side-v3.png");

  render({ routine: { ...flight, activity: "room-sleep", roomSpot: "bed", flightFrom: null, flightTo: null }, mood: "calm" });
  expect(sourceWidth(host.querySelector<HTMLElement>(".room-bird-routine"))).toBeCloseTo(240, 8);
  act(() => target("bird")?.click());
  expect(handlers.onBird).toHaveBeenCalledTimes(1);
  expect(host.querySelector('[data-activity="room-sleep"]')).not.toBeNull();
});
test("使用现有右侧树干遮住室内离场和回场，不绘制临时树枝", () => {
  const leaving: BirdRoutineState = {
    location: "room", activity: "room-leave", roomSpot: "branch", flightFrom: "branch", flightTo: "trunk",
    plannedActivity: "garden-arrive", activityStartedAt: Date.now(), nextDecisionAt: Date.now() + 5_000, sequenceStep: 6,
  };
  render({ routine: leaving });
  expect(host.querySelector('.room-bird-routine[data-route="branch-trunk"]')).not.toBeNull();
  expect(host.querySelector('.room-trunk-occluder')?.getAttribute("aria-hidden")).toBe("true");
  expect(host.querySelector('.bird-routine-asset-probe')?.getAttribute("src")).toBe("/art/bird-routine/room-flight-right.png");

  render({ routine: { ...leaving, activity: "room-arrive", roomSpot: "trunk", flightFrom: "trunk", flightTo: "branch", plannedActivity: "room-idle" } });
  expect(host.querySelector('.room-bird-routine[data-route="trunk-branch"]')).not.toBeNull();
  expect(host.querySelector('.bird-routine-asset-probe')?.getAttribute("src")).toBe("/art/bird-routine/room-flight-left.png");
});
test("出门使用图标而非可见文字按钮，并明确进入庭院", () => {
  render();
  expect(target("exit")?.textContent).toBe("");
  expect(target("exit")?.querySelector("img")).not.toBeNull();
  expect(target("exit")?.getAttribute("aria-label")).toBe("去庭院");
});
test("指针按下在统一场景坐标生成一次不阻挡点击的水波纹", () => {
  vi.useFakeTimers();
  render();
  const canvas = host.querySelector<HTMLDivElement>(".room-canvas")!;
  Object.defineProperty(canvas, "getBoundingClientRect", { value: () => ({ left: 10, top: 20, width: 100, height: 200 }) });
  const event = new Event("pointerdown", { bubbles: true });
  Object.defineProperties(event, { clientX: { value: 60 }, clientY: { value: 120 }, pointerType: { value: "touch" } });
  act(() => canvas.dispatchEvent(event));
  const ripple = host.querySelector<HTMLElement>(".room-ripple");
  expect(ripple).not.toBeNull(); expect(ripple?.style.left).toBe("50%"); expect(ripple?.style.top).toBe("50%");
  expect(getComputedStyle(ripple!).pointerEvents).toBe("none");
  act(() => vi.advanceTimersByTime(700));
  vi.useRealTimers();
});
