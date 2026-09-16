# 树屋四类面板视觉改造设计

## 目标

只改厨房、设置、储物柜和行囊打开后的面板，让它们继续属于同一间手绘树屋，同时通过不同表面材质避免四个面板看起来像同一套网页卡片。室内背景、鸟、背包、庭院、旅行、食物数值、存档和明信片逻辑不改。

## 方案比较

| 方向 | 与现有室内协调 | 手机可读性 | 现有素材适配 | 后续替换手绘素材 |
| --- | --- | --- | --- | --- |
| A：纸张与食谱本 | 厨房很协调，仓库与行囊区分弱 | 最好 | 食物/作物图片自然 | 容易，但材质同质化风险高 |
| B：木柜、布袋与木牌 | 与木质场景最协调，表面区分强 | 仓库最好，厨房长内容偏紧 | 行囊/作物自然，食谱需额外排版 | 中等，需要多套局部皮肤 |
| C：纸张、木板和布料混合 | 整体协调度最高且仍有层次 | 通过统一内间距和单列内容保持清晰 | 现有食物、作物、行囊均可自然放入 | 最容易按面板逐步替换 |

采用 C：厨房使用纸张和浅木料理板，储物柜使用木架与布袋槽，行囊使用布袋内页，设置使用纸面手册/木牌。共同的遮罩、标题栏、关闭按钮、滚动和底部操作由 `PanelSurface` 复用。

## 组件与数据边界

- `src/ui/PanelSurface.tsx` 只负责表面类型、资源接口和 `Modal` 组合，不读取或修改游戏数据。
- `src/ui/Modal.tsx` 保留现有 dialog、Escape、焦点恢复、`aria-modal` 和背景滚动锁定；只新增可选样式、图标和目标面板的关闭动画能力。
- `src/App.tsx` 只给四类目标面板传递 `PanelSurface` 表面类型，并整理内容层级/语义标签；厨房、仓库、行囊、设置调用的 domain 函数和存档流程不变。
- `src/panelSurface.css` 只作用于 `.room-panel-surface` 及四种变体，所有材质默认由 CSS 过渡模拟；未来可通过 `backgroundImage`、`textureImage`、`edgeImage`、`titleDecoration`、`closeIcon`、`itemSlotStyle` 注入本地 PNG/WebP 或 React 装饰。

## 交互与响应式

- 目标面板使用 240ms 的淡入/轻微上移打开与关闭动画；关闭期间遮罩仍拦截点击。
- 面板本体使用 `display:flex`，只有 `.modal-body` 滚动，遮罩使用暖色暗化，不使用 `backdrop-filter`。
- `document.body` 保留原始 overflow/padding，打开弹窗时补偿滚动条宽度，避免场景跳动。
- `prefers-reduced-motion: reduce` 禁用动画。
- 390×844 和 320×568 下四类面板保持单列可读，禁止横向溢出；内容底部使用 safe-area inset。
- 关闭按钮使用现有 `lucide-react` 的 Feather 图标，并保留 `aria-label="关闭弹层"`。

## 视觉细节

- 使用奶油纸色、浅木棕、鼠尾草绿、暖深棕；不用纯黑、纯白、蓝紫和强阴影。
- 纸张/木板/布袋通过低对比渐变、轻微噪点式 CSS background、错落边框和 `clip-path` 小幅不规则边缘表达，不引入外部字体或网络图片。
- 厨房配方用纵向食谱条目和木牌式制作按钮；材料不足用柔和灰化与短说明。
- 仓库按种子/原料/食物分为木柜内三层，数量仍来自 `game.inventory`。
- 行囊空状态与已准备状态都来自真实 `game.bag.foodId`，选择按钮继续调用 `setBagFood`。
- 设置保留鸟名、模式、导入/导出、重置等现有控件，只改变其分组和表面样式。

## 验收

- 运行中逐一打开/关闭四类面板，确认真实数据和原按钮操作仍在。
- 检查 Escape、背景阻断、焦点恢复、内部滚动、安全区和 reduced-motion。
- 运行相关 Vitest、完整测试与 `pnpm build`；对已有构建阻塞如实记录。
- 用 390×844、320×568 捕获厨房、设置、仓库、行囊截图，并提供一张改造前厨房截图用于对照。

## 资源接口

当前不新增栅格皮肤。后续可将以下本地资源传入 `PanelSurface` 对应 props，不改业务组件：

- 食谱纸/料理木板：`public/art/panels/recipe-paper.webp`
- 木柜/木架背景：`public/art/panels/wood-cabinet.webp`
- 打开的布制行囊内页：`public/art/panels/travel-bag-open.webp`
- 设置手册/木牌：`public/art/panels/handbook.webp`
- 共用边缘纹理（可选）：`public/art/panels/edge-handdrawn.webp`

