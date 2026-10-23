import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { PostcardPreview } from "./PostcardPreview";
import type { PostcardSnapshot } from "../domain/types";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let host: HTMLDivElement;
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); });
const snapshot: PostcardSnapshot = { postcardId: "first-dandelion-hill-selfie", birdVariant: "blue-quaker", birdNameSnapshot: "出发时的名字", travelDate: null };
function mount(birdVariant: PostcardSnapshot["birdVariant"] = "blue-quaker") {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  act(() => root.render(<PostcardPreview snapshot={{ ...snapshot, birdVariant }} language="zh-CN" onClose={() => undefined} />));
}
const click = (label: string) => {
  const button = [...host.querySelectorAll("button")].find(b => b.textContent === label);
  expect(button).toBeTruthy(); act(() => button?.click());
};
test("opens on front, follows the game language, retains name snapshot and leaves save untouched", () => {
  localStorage.setItem("travel-bird-save-v1", "unchanged-player-save");
  mount();
  expect(host.querySelector(".postcard-front img")?.getAttribute("src")).toContain("blue-quaker-front-v2-no-visible-nares.png");
  expect(host.querySelector(".postcard-front .postcard-location-tag")).toBeNull();
  expect(host.querySelector(".postcard-stage + .postcard-location-tag")?.textContent).toBe("蒲公英风坡");
  expect(host.querySelector(".postcard-back")).toBeNull();
  expect(host.querySelector(".postcard-language")).toBeNull();
  expect(host.querySelector('button[lang="en"]')).toBeNull();
  click("翻到背面");
  expect(host.querySelector(".postcard-front")).toBeNull();
  const back = host.querySelector(".postcard-back");
  expect(back?.contains(host.querySelector(".postcard-message"))).toBe(true);
  expect(back?.contains(host.querySelector(".postcard-address"))).toBe(true);
  expect(back?.querySelector(".postcard-mobile-stamp")).not.toBeNull();
  expect(back?.getAttribute("data-copy-size")).toBe("medium");
  expect(host.textContent).toContain("我已经记住回家的方向了。");
  expect(host.textContent).toContain("——出发时的名字");
  expect(host.textContent).toContain("待启程");
  click("翻回正面");
  expect(host.querySelector(".postcard-front")).not.toBeNull();
  expect(localStorage.getItem("travel-bird-save-v1")).toBe("unchanged-player-save");
});

test("renders postcard copy in the selected game language without an internal language control", () => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  act(() => root.render(<PostcardPreview snapshot={snapshot} language="en" onClose={() => undefined} />));
  expect(host.querySelector(".postcard-language")).toBeNull();
  expect(host.textContent).toContain("Dandelion Breeze Hill");
  click("Turn to the back");
  expect(host.textContent).toContain("I’ve already remembered the way home.");
});
test("cockatiel never falls back to blue quaker artwork", () => {
  mount("cockatiel");
  expect(host.textContent).toContain("玄凤鹦鹉的这张明信片插画还在准备中");
  expect(host.querySelector('img[src*="blue-quaker"]')).toBeNull();
});
test("dated historical card uses the supplied departure date and name", () => {
  mount();
  act(() => root.render(<PostcardPreview snapshot={{ ...snapshot, travelDate: Date.UTC(2025, 0, 2, 12) }} language="zh-CN" onClose={() => undefined} />));
  click("翻到背面");
  expect(host.querySelector("time")?.getAttribute("dateTime")).toBe("2025-01-02T12:00:00.000Z");
  expect(host.textContent).toContain("出发时的名字");
});
