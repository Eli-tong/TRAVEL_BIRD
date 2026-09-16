# 第一部分库存素材与按钮视觉统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变游戏逻辑和存档的前提下，统一库存物品展示与主要文字按钮的水彩纸张视觉，并确认明信片没有独立语言入口。

**Architecture:** 新增无状态 `BirdButton` 展示组件，把变体 class 集中在 `src/ui/birdButton.css`。在现有 App/面板 JSX 中只替换主要文字按钮，不重构业务回调。库存素材继续由 `Art.tsx` 的现有组件渲染，使用统一 class 约束尺寸和透明边距。

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS。

## Global Constraints

- 不改变 Inventory 数据结构中原来的 item ID。
- 不修改旅行算法、奖励机制、小鸟状态机、庭院布局、室内背景或 localStorage 结构。
- 不引入新的 UI 框架或大型 design system。
- 保留平面水彩手绘、纸张质感、柔和圆角和轻微不规则感。

### Task 1: 建立 BirdButton 最小组件

**Files:**
- Create: `src/ui/BirdButton.tsx`
- Create: `src/ui/birdButton.css`
- Test: `src/ui/BirdButton.test.tsx`
- Modify: `src/main.tsx` (import global button stylesheet if needed)

**Interfaces:**
- `BirdButton` props: `variant?: "primary" | "secondary" | "small" | "danger"`, plus native `ButtonHTMLAttributes<HTMLButtonElement>`。
- 输出原生 `button`，class 为 `bird-button bird-button--<variant>`，保留 children、disabled、type、onClick 等原生属性。

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BirdButton } from "./BirdButton";

describe("BirdButton", () => {
  it("renders the requested visual variant and native button state", () => {
    render(<BirdButton variant="small" disabled>收下</BirdButton>);
    const button = screen.getByRole("button", { name: "收下" });
    expect(button).toHaveClass("bird-button", "bird-button--small");
    expect(button).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/ui/BirdButton.test.tsx`
Expected: FAIL because `./BirdButton` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement a typed wrapper around `button`, defaulting `variant` to `primary`, and add CSS for the four variants plus pressed/disabled/focus states. Keep transitions limited to the existing short press feedback.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/ui/BirdButton.test.tsx`
Expected: PASS.

### Task 2: 迁移主要文字按钮

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/ui/Modal.tsx`
- Modify: `src/ui/PanelSurface.tsx`
- Modify: `src/ui/PostcardPreview.tsx`
- Modify: `src/ui/RoomScene.tsx`
- Modify: `src/styles.css`
- Modify: `src/scene.css`
- Modify: `src/panelSurface.css`
- Test: `src/ui/PostcardPreview.test.tsx` and focused existing panel tests

**Interfaces:**
- Existing callbacks and labels remain unchanged.
- Only text-action buttons use `BirdButton`; hotspot and icon-only controls remain native buttons with existing classes.

- [ ] **Step 1: Write the failing integration assertion**

Extend the existing postcard test to assert the visible flip action has `bird-button` and that querying for `中文` or `English` buttons finds nothing. Add a focused assertion to an existing panel test for a primary action class.

- [ ] **Step 2: Run focused tests to verify the new assertions fail**

Run: `pnpm vitest run src/ui/PostcardPreview.test.tsx src/ui/PanelSurface.test.tsx`
Expected: FAIL on missing `bird-button` class if the current implementation still uses raw buttons.

- [ ] **Step 3: Replace only the targeted text-action buttons**

Use `BirdButton` for close/confirm/cancel/reset/save/language, inventory/cooking/planting/travel actions, postcard flip and reward confirmation. Preserve existing class names when CSS selectors depend on them by combining them with BirdButton’s class.

- [ ] **Step 4: Remove obsolete generic button declarations that override the new visual language**

Keep layout rules and hotspot rules; remove only duplicated background, border, radius and shadow declarations for migrated text buttons. Do not alter data or callback code.

- [ ] **Step 5: Run focused tests to verify they pass**

Run: `pnpm vitest run src/ui/PostcardPreview.test.tsx src/ui/PanelSurface.test.tsx src/ui/BirdButton.test.tsx`
Expected: PASS.

### Task 3: 统一库存素材展示容器

**Files:**
- Modify: `src/ui/Art.tsx`
- Modify: `src/styles.css`
- Modify: `src/panelSurface.css`
- Test: `src/ui/Art.test.tsx`

**Interfaces:**
- Existing `CropArt`, `FoodArt`, and `ItemArt` IDs and props remain unchanged.
- Rendered image elements receive a shared `item-art` class while preserving existing semantic classes and source paths.

- [ ] **Step 1: Write the failing test**

Render one crop and one food item and assert both image elements include `item-art` while their existing source mapping remains present.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/ui/Art.test.tsx`
Expected: FAIL because the shared class is not yet present.

- [ ] **Step 3: Add the shared image class and CSS container rules**

Use a fixed square display box with `object-fit: contain`, transparent padding through CSS, consistent filter/shadow softness, and no emoji/SVG replacement. Do not change item IDs or underlying asset URLs.

- [ ] **Step 4: Run the focused test**

Run: `pnpm vitest run src/ui/Art.test.tsx`
Expected: PASS.

### Task 4: 全量验证与范围检查

**Files:**
- Inspect all changed files; no new product feature files beyond Tasks 1-3.

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: Vitest exits 0 with zero failed tests.

- [ ] **Step 2: Run TypeScript and production build**

Run: `pnpm build`
Expected: `tsc --noEmit` and `vite build` both exit 0.

- [ ] **Step 3: Check scope**

Run: `git status --short` and `git diff --stat`; confirm only button, inventory-art presentation, postcard button markup, tests, and this phase documentation changed. Confirm no domain, travel, reward, save, bird-state, or garden logic files were modified.

- [ ] **Step 4: Record manual acceptance checks**

Run the dev server and check a mobile viewport: open inventory, kitchen, travel bag, settings/save, and postcard album; verify consistent buttons, visible item art, postcard flip only, and unchanged actions.
