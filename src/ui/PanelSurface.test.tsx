import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { PanelSurface } from "./PanelSurface";

let root: Root | undefined;
let host: HTMLDivElement | undefined;
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  if (root) act(() => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
});

test("PanelSurface exposes a themed dialog and future local skin hooks", () => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  act(() => root?.render(
    <PanelSurface
      kind="paper"
      title="料理台"
      onClose={() => undefined}
      backgroundImage="/art/panels/recipe-paper.webp"
      textureImage="/art/panels/recipe-paper-texture.webp"
      edgeImage="/art/panels/edge-handdrawn.webp"
      itemSlotStyle="recipe-tag"
    >
      <p>内容</p>
    </PanelSurface>
  ));

  const dialog = host.querySelector<HTMLElement>('[role="dialog"]');
  expect(dialog).not.toBeNull();
  expect(dialog?.className).toContain("room-panel-surface");
  expect(dialog?.className).toContain("room-panel-surface--paper");
  expect(dialog?.getAttribute("data-item-slot-style")).toBe("recipe-tag");
  expect(dialog?.style.getPropertyValue("--panel-background-image")).toContain("recipe-paper.webp");
  expect(dialog?.style.getPropertyValue("--panel-texture-image")).toContain("recipe-paper-texture.webp");
  expect(dialog?.style.getPropertyValue("--panel-edge-image")).toContain("edge-handdrawn.webp");
  expect(dialog?.getAttribute("aria-modal")).toBe("true");
  expect(dialog?.querySelector("button")?.getAttribute("aria-label")).toBe("关闭弹层");
});

test("PanelSurface keeps the four material variants distinct", () => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  for (const kind of ["paper", "wood-cabinet", "travel-bag", "handbook"] as const) {
    act(() => root?.render(<PanelSurface kind={kind} title={kind} onClose={() => undefined}><p>内容</p></PanelSurface>));
    const dialog = host.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.classList.contains(`room-panel-surface--${kind}`)).toBe(true);
  }
});
