import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { BirdButton } from "./BirdButton";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let host: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
});

test("renders a small paper button and preserves native disabled state", () => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(<BirdButton variant="small" disabled>收下</BirdButton>));

  const button = host.querySelector("button");
  expect(button).not.toBeNull();
  expect(button).toHaveClass("bird-button", "bird-button--small");
  expect(button).toBeDisabled();
});
