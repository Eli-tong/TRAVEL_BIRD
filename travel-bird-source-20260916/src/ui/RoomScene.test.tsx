import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { RoomScene } from "./RoomScene";

let root: Root;
let host: HTMLDivElement;
const handlers = { onBird: vi.fn(), onBag: vi.fn(), onKitchen: vi.fn(), onInventory: vi.fn(), onRequestGarden: vi.fn() };
beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  vi.clearAllMocks();
});
afterEach(() => { act(() => root.unmount()); host.remove(); history.replaceState(null, "", "/"); });
const render = (props = {}) => act(() => root.render(<RoomScene birdName="啾啾" atHome {...handlers} {...props} />));
const target = (id: string) => host.querySelector<HTMLButtonElement>(`[data-hotspot="${id}"]`);

test("旅行隐藏两件素材时同步移除热点", () => {
  render(); expect(target("bird")).not.toBeNull(); expect(target("travelBag")).not.toBeNull();
  render({ atHome: false });
  expect(target("bird")).toBeNull(); expect(target("travelBag")).toBeNull();
  expect(host.querySelector('[data-layer="bird"]')).toBeNull();
  expect(host.querySelector('[data-layer="travelBag"]')).toBeNull();
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
test("图片加载失败时移除对应热点并显示错误", () => {
  render(); act(() => host.querySelector('[data-layer="bird"]')!.dispatchEvent(new Event("error")));
  expect(target("bird")).toBeNull(); expect(target("travelBag")).not.toBeNull();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("加载失败");
});
test("出门使用图标而非可见文字按钮，保留可访问名称", () => {
  render();
  expect(target("exit")?.textContent).toBe("");
  expect(target("exit")?.querySelector("img")).not.toBeNull();
  expect(target("exit")?.getAttribute("aria-label")).toContain("门口");
});
test("指针按下在统一场景坐标生成一次不阻挡点击的水波纹", () => {
  render();
  const canvas = host.querySelector<HTMLDivElement>(".room-canvas")!;
  Object.defineProperty(canvas, "getBoundingClientRect", { value: () => ({ left: 10, top: 20, width: 100, height: 200 }) });
  const event = new Event("pointerdown", { bubbles: true });
  Object.defineProperties(event, { clientX: { value: 60 }, clientY: { value: 120 }, pointerType: { value: "touch" } });
  act(() => canvas.dispatchEvent(event));
  const ripple = host.querySelector<HTMLElement>(".room-ripple");
  expect(ripple).not.toBeNull(); expect(ripple?.style.left).toBe("50%"); expect(ripple?.style.top).toBe("50%");
  expect(getComputedStyle(ripple!).pointerEvents).toBe("none");
});
