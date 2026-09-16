# 树屋四类面板视觉改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为厨房、设置、储物柜和行囊建立统一但材质不同的树屋面板表面，并在不改变业务逻辑的前提下完成 390×844 / 320×568 实机验收。

**Architecture:** 新增 `PanelSurface` 作为视觉壳层，内部复用现有 `Modal` 的无障碍和弹窗行为。`App.tsx` 仅负责把目标内容接入 paper、wood-cabinet、travel-bag、handbook 四个表面；所有过渡材质集中在 `src/panelSurface.css`，未来可通过本地图片 props 替换 CSS 皮肤。

**Tech Stack:** React 19、TypeScript、Vite、Vitest/jsdom、现有 `lucide-react` 图标和本地 `/art` 素材。

## Global Constraints

- 只修改厨房、设置、储物柜和行囊面板，不修改室内背景、小鸟、背包、庭院、旅行逻辑、食物数值、存档和明信片。
- 继续复用现有本地食物、作物、行囊和鸟类图片；不引入外部图片、在线字体、临时链接或付费 API。
- CSS 过渡版本必须明确标记为过渡，不宣称为最终手绘水彩美术。
- 面板业务逻辑必须与视觉壳层分离；后续替换 PNG/WebP 不得重写业务组件。
- 保留 `role="dialog"`、`aria-modal`、Escape、焦点恢复、背景阻断、内部滚动和手机安全区。

---

### Task 1: 建立 PanelSurface 接口并覆盖最小行为

**Files:**
- Create: `src/ui/PanelSurface.tsx`
- Create: `src/ui/PanelSurface.test.tsx`
- Modify: `src/ui/Modal.tsx`

**Interfaces:**
- `PanelSurfaceKind = "paper" | "wood-cabinet" | "travel-bag" | "handbook"`。
- `PanelSurface` 接受 `kind`, `title`, `onClose`, `children`, `backgroundImage?`, `textureImage?`, `edgeImage?`, `titleDecoration?`, `closeIcon?`, `itemSlotStyle?`。
- `Modal` 新增可选的 `className`, `style`, `titleDecoration`, `closeIcon`, `animateClose`，不改变默认调用行为。

- [ ] **Step 1: Write the failing test**

在 `PanelSurface.test.tsx` 中用 `createRoot` 渲染 `PanelSurface`，断言 dialog 带有 `.room-panel-surface--paper`、资源 CSS 变量和 `aria-label="关闭弹层"`，并断言 `role="dialog"` / `aria-modal="true"` 保留。

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm vitest run src/ui/PanelSurface.test.tsx`

Expected: FAIL because `PanelSurface` and its new resource interface do not exist.

- [ ] **Step 3: Write minimal implementation**

让 `PanelSurface` 把资源映射为 `--panel-background-image`、`--panel-texture-image`、`--panel-edge-image` 和 `data-item-slot-style`，并把 `Feather` 作为目标面板默认关闭图标传入 `Modal`。`Modal` 只在 `animateClose` 为真时延迟 240ms 卸载，默认同步关闭，避免旧测试改变。

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pnpm vitest run src/ui/PanelSurface.test.tsx src/ui/Modal.test.tsx`

Expected: PASS with no failed tests。

- [ ] **Step 5: Commit**

```powershell
git add src/ui/PanelSurface.tsx src/ui/PanelSurface.test.tsx src/ui/Modal.tsx
git commit -m "feat: add treehouse panel surface shell"
```

### Task 2: 接入四类目标面板的语义表面

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Create: `src/panelSurface.css`

**Interfaces:**
- 四类目标面板分别使用 `PanelSurface kind="paper" | "wood-cabinet" | "travel-bag" | "handbook"`。
- 现有 `action`, `setBagFood`, `startCooking`, `claimCooking`, `setMode`, `importSave`, `exportSave` 等函数调用保持不变。

- [ ] **Step 1: Write the failing test**

扩展 `PanelSurface.test.tsx`，加入四种 `kind` 的渲染检查；对 `.room-panel-surface` 断言只出现一个 dialog surface，且未来资源 hook 在 DOM 上可定位。

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm vitest run src/ui/PanelSurface.test.tsx`

Expected: FAIL for the four missing variant classes.

- [ ] **Step 3: Write minimal implementation**

在 `App.tsx` 中仅替换目标面板的 `Modal` 壳层，给厨房/仓库/行囊/设置内容增加明确的 `.room-kitchen-content`、`.room-inventory-content`、`.room-bag-content`、`.room-settings-content` 语义类；仓库把真实数据分为种子、原料、食物三层，不复制库存状态；行囊选择反馈文案改为“已准备”。在 `main.tsx` 引入 `panelSurface.css`。

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pnpm vitest run src/ui/PanelSurface.test.tsx src/ui/Modal.test.tsx src/ui/RoomScene.test.tsx`

Expected: PASS。

- [ ] **Step 5: Commit**

```powershell
git add src/App.tsx src/main.tsx src/panelSurface.css src/ui/PanelSurface.test.tsx
git commit -m "feat: map room panels to distinct surfaces"
```

### Task 3: 完成 CSS 材质过渡与响应式规则

**Files:**
- Modify: `src/panelSurface.css`

**Interfaces:**
- CSS 只作用于 `.room-panel-surface` 及其后代，不改变 `.room-background`、`.room-layer`、场景热点或庭院页面。

- [ ] **Step 1: Write the failing test**

在 `PanelSurface.test.tsx` 中检查 CSS hook 类和 `data-item-slot-style` 已挂载；在代码审查中确认不出现 `backdrop-filter`、蓝紫色变量或外部 URL。

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm vitest run src/ui/PanelSurface.test.tsx`

Expected: FAIL until the variant CSS hook is added to the rendered surface。

- [ ] **Step 3: Write minimal implementation**

添加暖色遮罩、240ms 开关动画、内部 body 滚动、safe-area、reduced-motion、focus-visible 和四种低对比 CSS 材质：纸张用不规则边缘/叠层；木柜用浅木色边缘与层板；行囊用布色、缝线和软贴签；手册用纸页分隔线与木牌标题。食物/作物/行囊图片继续使用现有 `/art` 路径。

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pnpm vitest run src/ui/PanelSurface.test.tsx src/ui/Modal.test.tsx`

Expected: PASS。

- [ ] **Step 5: Commit**

```powershell
git add src/panelSurface.css src/ui/PanelSurface.test.tsx
git commit -m "style: paint treehouse panel surfaces with css"
```

### Task 4: 实机验收、构建和交付证据

**Files:**
- Create: `output/panel-visuals/room-panels-before-kitchen.png` (captured artifact)
- Create: `output/panel-visuals/room-panels-kitchen-390.png`
- Create: `output/panel-visuals/room-panels-settings-390.png`
- Create: `output/panel-visuals/room-panels-inventory-390.png`
- Create: `output/panel-visuals/room-panels-bag-390.png`
- Create: `output/panel-visuals/room-panels-320-check.json`
- Create: `output/panel-visuals/room-panels-report.md`

- [ ] **Step 1: Run unit tests and build**

Run: `pnpm test` then `pnpm build`。

Expected: Record exact exit codes. If existing v2 tests still block `tsc`, report the unchanged pre-existing failure without removing or excluding those tests。

- [ ] **Step 2: Capture actual 390×844 screenshots**

Use the running localhost app, open each target hotspot/menu route, verify visible title and content, capture four screenshots. Keep background blocked and close one panel before opening the next。

- [ ] **Step 3: Capture 320×568 checks**

Set viewport to 320×568, open all four panels, check no horizontal overflow, internal scroll, Escape close and focus restore; write results to JSON.

- [ ] **Step 4: Inspect scope and report**

Run `git status --short`, `git diff --check`, and `rg -n "https?://|backdrop-filter|#(?:[0-9a-fA-F]{3}){1,2}" src/panelSurface.css` as appropriate. Report changed files, build result, actual screenshots, CSS transition limits, existing raster materials, and future asset paths.

- [ ] **Step 5: Commit**

```powershell
git add output/panel-visuals
git commit -m "test: capture room panel visual acceptance"
```

