import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { LanguageContext } from "../i18n/LanguageContext";
import type { AlbumEntry } from "../domain/types";
import type { Language } from "../i18n/dictionary";
import { PostcardViewer } from "./PostcardViewer";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
});

const entry: AlbumEntry = {
  postcardId: "first-dandelion-hill-selfie",
  firstCollectedAt: Date.UTC(2026, 8, 13, 12),
  firstJourneyId: "first-trip",
  firstStory: "",
  birdNameSnapshot: "啾啾"
};

function mount(language: Language = "zh-CN") {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(
    <LanguageContext.Provider value={language}>
      <PostcardViewer postcardId={entry.postcardId} entry={entry} birdName="啾啾" onClose={() => undefined} />
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
