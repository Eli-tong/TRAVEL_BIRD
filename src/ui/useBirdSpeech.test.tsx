import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { BirdMood } from "../domain/birdMood";
import type { BirdSpeechContext } from "./useBirdSpeech";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.useFakeTimers();
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); });

async function setup(initial: { mood?: BirdMood; active?: boolean; context?: BirdSpeechContext } = {}) {
  const load = import.meta.glob<typeof import("./useBirdSpeech")>("./useBirdSpeech.ts")["./useBirdSpeech.ts"];
  expect(load, "bird speech hook must exist").toBeDefined();
  const { useBirdSpeech } = await load();
  function Harness({ mood = "calm", active = true, context = "general" }: {
    mood?: BirdMood;
    active?: boolean;
    context?: BirdSpeechContext;
  }) {
    const speech = useBirdSpeech(mood, active, context);
    return <><button onClick={speech.respond}>respond</button><output>{speech.speechKey}</output></>;
  }
  const render = (props = initial) => act(() => root.render(<Harness {...props} />));
  render();
  return {
    render,
    click: () => act(() => host.querySelector("button")!.click()),
    advance: (ms: number) => act(() => vi.advanceTimersByTime(ms)),
    text: () => host.querySelector("output")!.textContent,
  };
}

test("cycles six independent general and bed happy replies", async () => {
  const view = await setup();
  const general: string[] = [];
  for (let index = 0; index < 6; index += 1) {
    view.click();
    general.push(view.text() ?? "");
  }
  expect(general).toEqual([
    "bird.response.happy.01", "bird.response.happy.02", "bird.response.happy.03",
    "bird.response.happy.04", "bird.response.happy.05", "bird.response.happy.06",
  ]);
  view.render({ context: "bed" });
  expect(view.text()).toBe("");
  const bed: string[] = [];
  for (let index = 0; index < 6; index += 1) {
    view.click();
    bed.push(view.text() ?? "");
  }
  expect(bed).toEqual([
    "bird.response.bed.happy.01", "bird.response.bed.happy.02", "bird.response.bed.happy.03",
    "bird.response.bed.happy.04", "bird.response.bed.happy.05", "bird.response.bed.happy.06",
  ]);
  view.render({ context: "general" });
  expect(view.text()).toBe("");
  view.click();
  expect(view.text()).toBe("bird.response.happy.01");
  view.advance(2_999);
  expect(view.text()).toBe("bird.response.happy.01");
  view.advance(1);
  expect(view.text()).toBe("");
});

test("starts and advances the angry pool for the current context", async () => {
  const view = await setup({ mood: "happy", context: "general" });
  view.render({ mood: "angry", context: "general" });
  expect(view.text()).toBe("bird.response.angry.01");
  view.click();
  expect(view.text()).toBe("bird.response.angry.02");
  view.render({ mood: "angry", context: "bed" });
  expect(view.text()).toBe("bird.response.bed.angry.01");
  view.click();
  expect(view.text()).toBe("bird.response.bed.angry.02");
  view.advance(7_900);
  view.click();
  expect(view.text()).toBe("bird.response.bed.angry.03");
  view.advance(7_900);
  expect(view.text()).toBe("bird.response.bed.angry.03");
  view.advance(100);
  expect(view.text()).toBe("");
});

test("clears speech when the bird is no longer interactively visible", async () => {
  const view = await setup(); view.click(); expect(view.text()).not.toBe("");
  view.render({ active: false }); expect(view.text()).toBe("");
  expect(vi.getTimerCount()).toBe(0);
});
