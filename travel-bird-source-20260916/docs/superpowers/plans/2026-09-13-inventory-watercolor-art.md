# 库存九件套水彩素材统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前 Inventory 的九个可见物品全部替换为同一套库存专用透明水彩 PNG，并确保库存不再引用旧 Crop WebP 或旧 Food PNG。

**Architecture:** 九张新图片放在独立的 `public/art/inventory/`。`src/ui/InventoryItemArt.tsx` 集中维护 category + 现有 ID 到图片路径的映射，`InventoryPanel` 三个分类只通过该组件渲染图片；旧 `CropArt`、`FoodArt`、domain 配置和数据结构不变。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、透明 PNG、浏览器实测。

## Global Constraints

- 保留 `wheat`、`carrot`、`strawberry`、`strawberry-cloud-bun`、`carrot-crescent-crisp`、`tricolor-travel-bites` 的现有 ID。
- 不修改 Inventory data shape、数量、recipe、save、旅行、明信片、庭院或种植逻辑。
- 不覆盖 `/art/<crop>-seed.webp`、`/art/<crop>-ready.webp` 和现有 `/art/foods/*.png`。
- 九张新素材必须是透明 PNG，统一为“高级的幼稚画 + 平面手绘水彩”。

---

### Task 1: 生成并验收九张库存专用素材

**Files:**
- Create: `public/art/inventory/wheat-seeds.png`
- Create: `public/art/inventory/carrot-seeds.png`
- Create: `public/art/inventory/strawberry-seeds.png`
- Create: `public/art/inventory/wheat-ingredient.png`
- Create: `public/art/inventory/carrot-ingredient.png`
- Create: `public/art/inventory/strawberry-ingredient.png`
- Create: `public/art/inventory/strawberry-cloud-bun.png`
- Create: `public/art/inventory/carrot-crescent-crisp.png`
- Create: `public/art/inventory/tricolor-travel-bites.png`

**Interfaces:**
- Produces nine square transparent PNG files consumed by `INVENTORY_ART_MAP`.

- [ ] Generate a seed-bag anchor image with the approved silhouette, line, watercolor, palette, transparency and safe-margin rules.
- [ ] Inspect the anchor at full size and thumbnail size; reject it if the background is opaque, the line is black/heavy, or the object reads as an app icon.
- [ ] Generate the other eight assets using the same prompt language and the accepted anchor as a style reference.
- [ ] Verify alpha channels, dimensions, visible-pixel bounds and consistent occupancy for all nine files.

### Task 2: Add the failing inventory-art mapping test

**Files:**
- Create: `src/ui/InventoryItemArt.test.tsx`

**Interfaces:**
- Consumes future `INVENTORY_ART_MAP` and `InventoryItemArt` exports from `./InventoryItemArt`.
- Expects categories `seeds`, `ingredients`, `foods` and the existing crop/food IDs.

- [ ] Write a test that enumerates all nine expected `(category, id, src)` tuples and renders each tuple.
- [ ] Assert each image has `inventory-item-art`, the exact `/art/inventory/*.png` path, its supplied alt text, and `draggable=false` using plain DOM APIs.
- [ ] Run `pnpm vitest run src/ui/InventoryItemArt.test.tsx`; expect failure because `./InventoryItemArt` does not exist.

### Task 3: Implement the centralized inventory art component

**Files:**
- Create: `src/ui/InventoryItemArt.tsx`
- Test: `src/ui/InventoryItemArt.test.tsx`

**Interfaces:**
- Produces `INVENTORY_ART_MAP` with typed `seeds`, `ingredients`, and `foods` records.
- Produces `InventoryItemArt` with a discriminated union of `{ category, itemId, alt }` props.

- [ ] Define the typed nine-entry mapping with exact paths from Task 1.
- [ ] Implement one `<img>` renderer with `item-art inventory-item-art inventory-item-art--<category>`, supplied alt text, and `draggable={false}`.
- [ ] Run the focused test and confirm it passes.

### Task 4: Route all Inventory artwork through the new mapping

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/panelSurface.css`
- Test: `src/ui/InventoryItemArt.test.tsx`

**Interfaces:**
- `InventoryPanel` retains the same `game: GameState` input and existing labels/counts.
- Only image rendering changes; callbacks and domain data are untouched.

- [ ] Add a failing source/DOM assertion proving Inventory has no `CropArt` or `FoodArt` image source and all nine entries use inventory PNG paths.
- [ ] Replace the three `CropArt stage="seed"`, three `CropArt stage="ready"`, and three `FoodArt` calls inside `InventoryPanel` with `InventoryItemArt`.
- [ ] Replace the inventory-only crop/food CSS selector with `.inventory-item-art`; set a consistent square, `object-fit: contain`, safe padding and soft shadow without clipping.
- [ ] Run focused tests and confirm they pass.

### Task 5: Browser and build verification

**Files:**
- Create: `output/playwright/inventory-watercolor-320.png`
- Create: `output/playwright/inventory-watercolor-375.png`
- Create: `output/playwright/inventory-watercolor-390.png`
- Create: `output/playwright/inventory-watercolor-430.png`

**Interfaces:**
- Consumes the production Inventory UI and nine public assets.

- [ ] Run the full test suite and record total passed/failed tests.
- [ ] Run `pnpm build`; require exit code 0.
- [ ] Open Inventory at 320, 375, 390 and 430 pixel widths and capture screenshots.
- [ ] At every width, inspect all nine `currentSrc` values, `complete`, natural dimensions, rendered rectangles and clipping.
- [ ] Confirm no Inventory image requests `/art/*-seed.webp`, `/art/*-ready.webp`, or `/art/foods/*.png`.
- [ ] Inspect git status/diff and confirm no domain, travel, postcard, garden, recipe or save files were changed by this task.

