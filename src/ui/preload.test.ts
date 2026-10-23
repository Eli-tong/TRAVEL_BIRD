import { afterEach, expect, test, vi } from "vitest";
import { preloadArt } from "./preload";

afterEach(() => vi.unstubAllGlobals());

test("preloads walk, preen, and every watering stage before a routine transition", () => {
  const sources: string[] = [];
  class FakeImage {
    set src(value: string) { sources.push(value); }
    decode() { return Promise.resolve(); }
  }
  vi.stubGlobal("Image", FakeImage);

  preloadArt();

  expect(sources).toEqual(expect.arrayContaining([
    "/art/bird-routine/garden-walk-left-v3.png",
    "/art/bird-routine/garden-walk-right-v3.png",
    "/art/bird-routine/garden-preen-v2.png",
    "/art/bird-routine/garden-water-pickup-v3.png",
    "/art/bird-routine/garden-water-pour-v3.png",
    "/art/bird-routine/garden-water-putdown-v3.png",
    "/art/bird-routine/garden-door-hop-right-v1.png",
    "/art/bird-routine/garden-door-enter-back-v1.png",
  ]));
  expect(new Set(sources).size).toBe(sources.length);
});
