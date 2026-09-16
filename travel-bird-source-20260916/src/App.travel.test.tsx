import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App";
import { FIRST_TRIP_POSTCARD_ID } from "./domain/config";
import { createNewGame, exportSave } from "./domain/game";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t0 = Date.UTC(2026, 8, 13, 10, 0, 0);
let host: HTMLDivElement;
let root: Root;

const buttonContaining = (label: string) => [...host.querySelectorAll<HTMLButtonElement>("button")]
  .find((button) => button.textContent?.includes(label));

const clickSelector = (selector: string) => {
  const button = host.querySelector<HTMLButtonElement>(selector);
  expect(button, `missing button: ${selector}`).not.toBeNull();
  act(() => button!.click());
};

const clickText = (label: string) => {
  const button = buttonContaining(label);
  expect(button, `missing button containing: ${label}`).not.toBeUndefined();
  act(() => button!.click());
};

const remountApp = () => {
  act(() => root.unmount());
  root = createRoot(host);
  act(() => root.render(<App />));
};

describe("first trip player flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(t0);
    localStorage.clear();
    const game = createNewGame(t0);
    game.inventory.foods["strawberry-cloud-bun"] = 1;
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

  test("prepares, departs, returns and stores the first gifts once", () => {
    clickSelector('[data-hotspot="travelBag"]');
    clickText("风车田野");
    clickText("草莓云朵麦包");
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("确认行囊");
    clickText("出发");
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("正在旅行");

    clickSelector('button[aria-label="关闭弹层"]');
    remountApp();
    act(() => vi.advanceTimersByTime(15_300));
    clickSelector('[data-hotspot="travelBag"]');
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("小鸟回来了");
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("新明信片");
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("新种子");

    const collect = buttonContaining("收下旅行礼物");
    expect(collect).not.toBeUndefined();
    act(() => {
      collect!.click();
      collect!.click();
    });

    const saved = JSON.parse(localStorage.getItem("travel-bird-save-v1") ?? "null");
    expect(saved.inventory.seeds.carrot).toBe(1);
    expect(saved.travelLog).toHaveLength(1);
    expect(saved.album.collected).toHaveLength(1);
    expect(saved.album.collected[0].postcardId).toBe(FIRST_TRIP_POSTCARD_ID);
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("旅行礼物已收好");

    remountApp();
    const reopened = JSON.parse(localStorage.getItem("travel-bird-save-v1") ?? "null");
    expect(reopened.currentJourney).toBeNull();
    expect(reopened.inventory.seeds.carrot).toBe(1);
    expect(reopened.travelLog).toHaveLength(1);
    expect(reopened.album.collected).toHaveLength(1);

    clickSelector(".room-menu");
    clickText("相册");
    const album = host.querySelector('[role="dialog"]');
    expect(album?.textContent).toContain("蒲公英风坡");
    const earnedCard = album?.querySelector<HTMLImageElement>(`img[alt="蒲公英风坡"]`);
    expect(earnedCard?.getAttribute("src")).toContain("postcard-first-dandelion-hill-blue-quaker-front");
  });

  test("does not expose unearned postcard previews in the album", () => {
    clickSelector(".room-menu");
    clickText("相册");
    const album = host.querySelector('[role="dialog"]');
    expect(album?.textContent).toContain("相册还空着");
    expect(album?.textContent).not.toContain("内测预览");
    expect(album?.textContent).not.toContain("预览第一张明信片");
  });
});
