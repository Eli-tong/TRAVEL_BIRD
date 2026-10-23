import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App";
import { createNewGame, exportSave } from "./domain/game";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

const click = (selector: string) => {
  const button = host.querySelector<HTMLButtonElement>(selector);
  expect(button, `missing button: ${selector}`).not.toBeNull();
  act(() => button!.click());
};

const clickText = (label: string) => {
  const button = [...host.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.trim() === label);
  expect(button, `missing button text: ${label}`).not.toBeUndefined();
  act(() => button!.click());
};

describe("global language switching", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
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

  test("updates open settings, inventory, bird response and persistence without a refresh", () => {
    click(".room-menu");
    clickText("设置与存档");
    clickText("English");

    const settings = host.querySelector<HTMLElement>('[role="dialog"]');
    expect(settings?.textContent).toContain("Settings");
    expect(settings?.textContent).toContain("Bird name");
    expect(settings?.textContent).toContain("Save data");
    expect(settings?.textContent).toContain("Export");
    expect(settings?.textContent).toContain("Reset game");

    const saved = JSON.parse(localStorage.getItem("travel-bird-save-v1") ?? "null");
    expect(saved.settings.language).toBe("en");

    click('button[aria-label="Close dialog"]');
    act(() => vi.advanceTimersByTime(250));
    click('[data-hotspot="cabinet"]');
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("Inventory");
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("Seeds");
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("Wheat seeds");
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("Ingredients");

    click('button[aria-label="Close dialog"]');
    act(() => vi.advanceTimersByTime(250));
    click('[data-hotspot="bird"]');
    expect(host.querySelector('[role="status"]')?.textContent)
      .toContain("You’re here! Let’s play again today!");

    click(".room-menu");
    clickText("Settings & save");
    clickText("中文");
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("设置");
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("小鸟名字");
  });

  test("uses sleep-specific dialogue only while the bird is in bed", () => {
    act(() => root.unmount());
    const game = createNewGame(Date.now());
    game.bird.routine = {
      location: "room",
      activity: "room-sleep",
      roomSpot: "bed",
      activityStartedAt: Date.now(),
      nextDecisionAt: Date.now() + 60_000,
      sequenceStep: 4,
    };
    localStorage.setItem("travel-bird-save-v1", exportSave(game));
    root = createRoot(host);
    act(() => root.render(<App />));

    click('[data-hotspot="bird"]');
    expect(host.querySelector('[role="status"]')?.textContent)
      .toBe("（从枕边探头）你也醒啦？再陪我赖一会儿嘛！");
  });

  test("renders an existing collected postcard from save data in the global language", () => {
    act(() => root.unmount());
    const game = createNewGame(1_000);
    game.settings.language = "en";
    game.album.collected.push({
      postcardId: "wind_field_01",
      firstCollectedAt: 2_000,
      firstJourneyId: "legacy-trip",
      firstStory: "清晨的风车把云影慢慢推开，麦穗像一封封还没寄出的信。"
    });
    localStorage.setItem("travel-bird-save-v1", exportSave(game));
    root = createRoot(host);
    act(() => root.render(<App />));

    click(".room-menu");
    clickText("Postcard album");
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("The Windmill Yawned");
    expect(host.querySelector('[role="dialog"]')?.textContent).not.toContain("晨风风车");
    clickText("The Windmill Yawned");
    expect(host.querySelector('[role="dialog"]')?.textContent).not.toContain("The windmill woke up before I did this morning");
    clickText("Turn to the back");
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("The windmill woke up before I did this morning");
    expect(host.querySelector('[role="dialog"]')?.textContent).not.toContain("清晨的风车");
  });
});
