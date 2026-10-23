import { act, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { Modal } from "./Modal";

test("StrictMode 下关闭弹窗后恢复原入口焦点", async () => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  function Harness() {
    const [open, setOpen] = useState(false);
    return <><main inert={open}><button disabled={open} onClick={() => setOpen(true)}>入口</button></main>
      {open && <Modal title="检查" onClose={() => setOpen(false)}><button>内容</button></Modal>}</>;
  }
  try {
    act(() => root.render(<StrictMode><Harness /></StrictMode>));
    const opener = host.querySelector("button")!; opener.focus(); act(() => opener.click());
    expect(document.activeElement?.getAttribute("aria-label")).toBe("关闭弹层");
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    await act(async () => { await new Promise<void>((resolve) => requestAnimationFrame(() => resolve())); });
    expect(document.activeElement).toBe(opener);
  } finally { act(() => root.unmount()); host.remove(); }
});
