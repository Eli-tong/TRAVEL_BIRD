import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { LanguageContext } from "../i18n/LanguageContext";
import type { AlbumEntry, PostcardId } from "../domain/types";
import type { Language } from "../i18n/dictionary";
import { PostcardViewer } from "./PostcardViewer";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
});

const entry: AlbumEntry = {
  postcardId: "first-dandelion-hill-selfie",
  firstCollectedAt: Date.UTC(2026, 8, 13, 12),
  firstJourneyId: "first-trip",
  firstStory: "",
  birdNameSnapshot: "啾啾"
};

function mount(language: Language = "zh-CN", postcardId: PostcardId = entry.postcardId) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(
    <LanguageContext.Provider value={language}>
      <PostcardViewer postcardId={postcardId} entry={{ ...entry, postcardId }} birdName="啾啾" onClose={() => undefined} />
    </LanguageContext.Provider>
  ));
}

test("keeps the location outside the artwork and all back copy inside the postcard", () => {
  mount();

  expect(host.querySelector(".postcard-front .postcard-location-tag")).toBeNull();
  expect(host.querySelector(".postcard-stage + .postcard-location-tag")?.textContent).toBe("蒲公英风坡");

  const flip = [...host.querySelectorAll("button")].find((button) => button.textContent === "翻到背面");
  expect(flip).toBeTruthy();
  act(() => flip?.click());

  const back = host.querySelector(".postcard-back");
  expect(back?.contains(host.querySelector(".postcard-message"))).toBe(true);
  expect(back?.contains(host.querySelector(".postcard-address"))).toBe(true);
  expect(back?.querySelector(".postcard-mobile-stamp")).not.toBeNull();
  expect(back?.getAttribute("data-copy-size")).toBe("medium");
});

test("uses the compact long-copy layout for the longer English letter", () => {
  mount("en");
  const flip = [...host.querySelectorAll("button")].find((button) => button.textContent === "Turn to the back");
  expect(flip).toBeTruthy();
  act(() => flip?.click());
  expect(host.querySelector(".postcard-back")?.getAttribute("data-copy-size")).toBe("long");
});

test("renders every new Chinese family letter with the long-copy layout and its explicit front", () => {
  const ids: PostcardId[] = [
    "wind_field_01", "wind_field_02", "wind_field_03",
    "moss_forest_01", "moss_forest_02", "moss_forest_03",
    "salt_town_01", "salt_town_02", "salt_town_03",
  ];

  for (const id of ids) {
    mount("zh-CN", id);
    expect(host.querySelector<HTMLImageElement>(".postcard-art")?.getAttribute("src"))
      .toBe(`/art/postcards/v2/${id}.png`);
    const flip = [...host.querySelectorAll("button")].find((button) => button.textContent === "翻到背面");
    act(() => flip?.click());
    expect(host.querySelector(".postcard-back")?.getAttribute("data-copy-size")).toBe("long");
    expect(host.querySelector(".postcard-message")?.textContent?.length).toBeGreaterThan(80);
    act(() => root?.unmount());
    host?.remove();
    root = undefined;
    host = undefined;
  }
});
