import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useBirdMood } from "./useBirdMood";

let root: Root;
let container: HTMLDivElement;
let hidden = false;
function Harness({ atHome = true, sceneVisible = true, scene = "home" }) {
  const bird = useBirdMood(atHome, sceneVisible);
  return <button onClick={bird.onClick} data-scene={scene}>{bird.mood}</button>;
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
  hidden = false;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.useRealTimers(); });
const render = (props = {}) => act(() => root.render(<Harness {...props} />));
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const click = () => act(() => container.querySelector("button")!.click());
test("跨场景共享六次点击，旧高兴截止不会覆盖生气", () => {
  render(); click(); click(); click(); render({ scene: "garden" }); click(); click(); click();
  expect(container.textContent).toBe("angry");
  advance(3000); expect(container.textContent).toBe("angry");
  click(); advance(7800); expect(container.textContent).toBe("angry");
  advance(200); expect(container.textContent).toBe("calm");
});
test("仅累计可见场景时间，打盹后轻点唤醒", () => {
  render(); advance(30000);
  act(() => { hidden = true; document.dispatchEvent(new Event("visibilitychange")); });
  expect(vi.getTimerCount()).toBe(0); advance(120000);
  expect(container.textContent).toBe("calm");
  act(() => { hidden = false; document.dispatchEvent(new Event("visibilitychange")); });
  advance(30000); expect(container.textContent).toBe("sleepy");
  click(); expect(container.textContent).toBe("happy"); advance(3000); expect(container.textContent).toBe("calm");
});
test("旅行禁用互动，离开场景与卸载清理计时器", () => {
  render(); expect(vi.getTimerCount()).toBe(1);
  render({ sceneVisible: false }); expect(vi.getTimerCount()).toBe(0);
  render({ atHome: false }); click(); advance(120000); expect(container.textContent).toBe("calm");
  render(); advance(59000); expect(container.textContent).toBe("calm");
  act(() => root.unmount()); expect(vi.getTimerCount()).toBe(0);
  root = createRoot(container);
});
