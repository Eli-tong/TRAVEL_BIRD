# 2026-09-12：出口箭头位置与场景点击水波纹

- 出口热点统一坐标调整为 `ROOM_HOTSPOTS.exit = (615, 1490)`，沿用现有 `exit-arrow.png`，显示宽度由 58px 增至 76px，高度保持 52px；箭头仍指向下方出门通道。
- 出口不显示文字、矩形底板或白色框，保留无障碍名称与原“庭院准备中”提示逻辑。
- 在统一场景容器接入单一 Pointer Events 水波纹：以场景容器实际缩放矩形换算百分比坐标，暖白中心光点约 150ms、浅金扩散环约 560ms，反馈层 `pointer-events: none`；弹窗阻塞时不生成，减少动态效果时缩短为 140ms。
- 未修改背景、小鸟、背包、菜单结构、存档、旅程或庭院业务逻辑。
- 390×844、320×568、1440×1000 浏览器检查通过；22 个相关 Vitest 用例通过；`pnpm build` 通过；无溢出、重复水波纹或弹窗穿透。

---
# 2026-09-12：新版室内视觉与点击反馈打磨

完成本轮小范围视觉修正：移除左上“林间小屋”和门口文字矩形；门口改为透明背景的手绘木质方向箭头，点击只显示“外面的小路还在准备中，过些时候再去看看吧。”；右上菜单改为手绘羽毛透明图标，保留可访问名称与原菜单弹窗。普通游玩时热点没有 active 白色矩形，静态厨房／柜子／门口直接开面板，鸟与背包仅做一次性固定锚点微缩放，连续点击不叠加，减少动态时禁用。

新增母图 `assets/derived/menu-feather-master.png`、`exit-arrow-master.png`，运行图 `public/art/room-v2/menu-feather.png`、`exit-arrow.png`；两者实际为 RGBA，浅深底预览和操作录制位于 `output/room-polish/`。未改背景、统一坐标、存档、旧庭院或部署。

当前新版室内只使用已验收的蓝色和尚平静图。旧 happy／sleepy／angry 文件与 useBirdMood 逻辑仍在项目中，但未作为新版室内状态接入；其素材风格或边缘不满足本轮验收，四状态美术仍是后续缺口。

Chromium 390×844、320×568 实测无溢出；菜单、箭头、厨房、柜子、行囊、门口、键盘焦点、弹窗隔离、隐藏状态和固定锚点反馈通过；实际录制 interaction-demo.webm。相关 21 项测试与 `pnpm build` 通过，`git diff --check` 通过。完整截图、测量与限制见 `output/room-polish/室内视觉打磨验收.md`。本轮结束。

---

# 2026-09-12：新版室内接入与浏览器验收

已将认可室内的干净背景、v2 鸟与 v2 背包接入实际 App。统一 941×1672 contain 画布，坐标／锚点／热点集中在 src/ui/roomLayout.ts，运行组件 src/ui/RoomScene.tsx。门口 onRequestGarden 仅打开“庭院准备中”，不连接旧庭院。料理／行囊／库存复用真实 v1 状态；鸟复用情绪逻辑，旅行时鸟与包及其热点同步消失。无明确相册物件，未添加相册热点。

DEV 下 ?roomDebug=1 提供轮廓及单独／同时隐藏，默认关闭且不保存。生产版已验证忽略参数。Modal 修复 StrictMode 与 inert 切换时的焦点恢复。

正式 pnpm build 通过；相关20项测试通过。应用编译与测试文件分离，Vitest 限 src，防止运行归档副本。全量 pnpm test 为21通过、38失败；失败仅来自未改动的原有 v2／migration 草稿，不能宣称全量通过，未为其扩展后续玩法。

Chromium 模拟 320×568、375×667、390×844、430×932、1440×1000：无溢出、主要热点>=44px且不重叠，五入口、模态隔离、键盘焦点、显示隐藏、刷新及真实制作领取装包验证通过；生产资源正常。不是手机真机测试。截图、日志、完整文件列表与说明在 output/room-v2/新版室内开发验收.md。

当前本地开发 http://127.0.0.1:5174/ ，生产预览 http://127.0.0.1:5175/ 。停止后可在项目执行 pnpm dev --host 127.0.0.1 --port 5174。

保留原图、旧庭院源码与资源、有效存档及原有未提交改动。未更改部署配置，未发布。下一步新版庭院只需在认可并完成后替换 App 传给 RoomScene 的 onRequestGarden 回调。本轮结束，不自动制作庭院。

---

# 2026-09-12：认可室内图本地抠图完成（仅素材）

本轮按用户授权只完成蓝色和尚鹦鹉平静状态与行囊两件透明素材；没有修改 `App`、`Scene`、样式、业务逻辑或 `public/art`，没有重新生成室内背景或其他角色状态。

## 输入与方法

- 定稿原图：`assets/concepts/treehouse-interior-direction-01.png`，实际尺寸 941×1672；原文件未覆盖。
- 干净背景：`assets/derived/treehouse-interior-background.png`；只用于同尺寸差异定位与还原合成，未覆盖。
- 可复用脚本：`scripts/extract_approved_layers.py`。
- 处理方法：干净背景差异图 + 4 倍分辨率手工支撑轮廓 + 指定前景种子连通域；小鸟差异阈值 35，行囊差异阈值 45。边缘只加 0.45px 抗锯齿；仅在小鸟脚底接触区使用蓝羽/粉色爪的局部约束清除树枝，不使用全局白色或浅色键控。

## 交付素材

| 文件 | 尺寸/模式 | 原图裁切框 `(left, top, right, bottom)` | 原图锚点 | 裁切图锚点 | SHA256 |
| --- | --- | --- | --- | --- | --- |
| `assets/derived/blue-quaker-calm-cutout.png` | 168×191 RGBA | `(534, 530, 702, 721)` | 脚底 `(647, 713)` | `(113, 183)` | `5A4C249DF10EC0A31BB2B9B7CAAF3CE54C992F68DB6090174F06E5964912F798` |
| `assets/derived/travel-bag-cutout.png` | 165×98 RGBA | `(368, 909, 533, 1007)` | 袋底 `(461, 1004)` | `(93, 95)` | `B461F604DC3F37AAB74D4CAB51C73526513EB7FB984A7F2FAF8DDCB1AE48FA7E` |

遮挡关系：小鸟只保留枝面以上实际可见的爪和身体，没有补画被枝条遮住的脚部；行囊后侧背带只保留定稿图中实际可见部分，袋体遮住的部分没有恢复。

## 蒙版、元数据与检查图

- 全画布蒙版：`assets/derived/masks/blue-quaker-calm-mask.png`、`assets/derived/masks/travel-bag-mask.png`，均为 941×1672 灰度 PNG。
- 完整参数与锚点：`assets/derived/approved-layer-metadata.json`。
- 原位还原合成：`assets/derived/approved-room-restored-preview.png`，941×1672 RGB；两件素材按各自裁切框左上角原位叠加到干净背景。
- 浅/深底无损边缘放大：`output/matting-inspection/blue-quaker-edge-check.png`、`output/matting-inspection/travel-bag-edge-check.png`。
- 最终处理与测试日志：`output/matting-inspection/extract-final.log`、`output/matting-inspection/test-final.log`。

## 验证结果

- `scripts/test_extract_approved_layers.py`：2 项测试通过。
- 小鸟：Alpha 0–255；透明 14,336 像素，完全不透明 14,602 像素，半透明边缘 3,150 像素；封闭透明孔 0。
- 行囊：Alpha 0–255；透明 3,157 像素，完全不透明 10,660 像素，半透明边缘 2,353 像素；封闭透明孔 0。背带内的负形与外部透明区域相通，按原图保留。
- 浅色和深色底检查未见棋盘格、矩形底色、明显白边/黑边或大块墙面、树枝、桌面残留；白胸、羽毛高光、喙、爪、完整可见尾部、袋体、背带和叶片标记均保留。
- 原位合成中，小鸟和行囊的尺寸与位置来自原图裁切坐标；爪子接触枝面，行囊落在圆桌桌布上，没有第二只鸟、固定行囊或明显残影。

## 已知边缘限制与停止点

- 原图为水彩像素合成，极细羽尖和深色轮廓包含原画自身的柔和抗锯齿；本轮只做亚像素级修整，没有为追求硬边侵蚀轮廓。
- 干净背景由此前局部修复产生，纹理与原图在局部存在轻微生成差异；不影响本轮透明素材，但还原预览不会与定稿原图逐像素相同。
- 本轮到此停止，不接入游戏。

---

# 2026-09-12：认可室内图落地（素材里程碑，按停止条件暂停）

## 唯一视觉依据

- 用户附件原文件：`C:/Users/wenru/AppData/Local/Temp/codex-clipboard-96a5ee4f-e553-4a0f-bdc2-1ff43f745353.png`
- 项目保留副本：`assets/concepts/treehouse-interior-direction-01.png`
- 两者均为 2,778,788 字节，SHA256 均为 `8D89394FB0AA14C0112C05CE1056DC3CCF5D7B49A8C6A02E2534F3F44670E8C9`。原图未覆盖、未重采样。

## 已完成素材

- `assets/derived/treehouse-interior-background.png`：941×1672、2,614,013 字节，SHA256 `44CC9573EC2587AD7DF4F1DB03484199338075CDE0DBFDFD240E1531BE4341C9`。
- 该背景以认可图为唯一编辑目标，只移除了枝头小鸟和圆桌行囊，并补全了枝面、墙面光影、桌面和桌布；床、窗、树干、料理台、储物柜、圆桌、杯子、灯和其余构图保留。
- 已逐图查看背景，未发现残留第二只鸟或固定行囊。

## 阻断与失败素材

- `assets/derived/blue-quaker-calm.png`：第一次从认可图提取的小鸟，1336×1177、24-bit RGB，无 Alpha；灰白棋盘格被画入像素。SHA256 `60BAF6C117A2130843D766EB7F5A4AB1D74740A69DEECCB0F072C69C538EBB9D`。
- `assets/derived/blue-quaker-calm-alpha.png`：只针对透明度修复的一次重试，仍为 1336×1177、24-bit RGB，无 Alpha；棋盘格仍被画入像素。SHA256 `3C329ECBC9A657BBCF8685B6D6820C5D0762C295B9B38E037F675FDFA256C382`。
- 透明度检查使用实际 PNG 像素格式与 Alpha 取样：两份小鸟文件均为 `Format24bppRgb`，`AlphaMin=255`、`AlphaMax=255`、透明样本数 0。不是查看器显示透明网格，而是失败输出。
- 按用户停止条件，连续两次失败后已停止重试；没有继续生成行囊，也没有用旧小鸟、旧室内或带棋盘格图片冒充完成。

## 代码与验证状态

- 尚未替换 `public/art` 或接入场景代码，因为关键的独立小鸟层不合格；现有可运行项目保持原状。
- 未进行 390×844 浏览器验收或正式构建，因为素材里程碑没有通过，继续接入会得到明确不符合完成标准的半成品。
- 本轮新增了范围设计与实施清单：`docs/superpowers/specs/2026-09-12-approved-treehouse-interior-design.md`、`docs/superpowers/plans/2026-09-12-approved-treehouse-interior.md`。

## 下一步（等待用户决定）

需要获得一种可以可靠输出真实 Alpha 的处理路径后，从认可图继续提取同一只鸟和行囊，再执行场景接入。内置图像编辑已达到本轮重试停止阈值，不应自动再调用。

---

# 阶段 A-1：树屋室内场景骨架与基本交互

本轮范围按用户最新指令收窄。已停止后续阶段；没有重新审计或安装技能，没有生成新图片，没有批量处理素材，没有增加庭院、第二只鸟、情绪、旅行、明信片、商店或声音系统。只检查了 390×844 浏览器视口。

## 实际修改

| 文件 | 本轮改动 |
| --- | --- |
| `src/App.tsx` | 主入口改为室内场景；移除实际渲染的网页顶栏、底栏和全屏功能页面；行囊、料理台、柜子通过物件打开居中面板。保留已有 v1 存档读取、保存、设置和基础料理操作。行囊只选择便当，不提供出发按钮。 |
| `src/ui/Scene.tsx` | 新增独立 `RoomScene`；背景与物件共享 900×1350 原画坐标层，统一缩放裁切；三个物件点击区域均大于 44px。旧 `Scene` 代码保留，未接入本轮入口。 |
| `src/ui/Art.tsx` | 新增 `RoomBirdArt`，仅使用现有 `/art/bird-calm.webp` 静态蓝色和尚，不加载四态作为室内表现。 |
| `src/scene.css` | 室内高度使用 100dvh；边角小木牌和菜单；物件坐标、面板、触摸反馈。首张截图行囊被左侧裁切，已将整个坐标层右移最多 30px 后重新验证。 |
| `src/ui/preload.ts` | 首屏只预加载室内、柜子、静态小鸟与行囊，停止主动预加载其他场景和情绪。 |
| `PROGRESS.md` | 本轮范围、素材状态、实际验证和剩余问题。 |

所有既有未提交内容保留；`output/pre-rebuild-20260912` 备份未改动。domain、部署配置、包管理器配置没有在 A-1 中修改。原有旧版辅助页面函数保留在源码中，但不作为 A-1 主流程。未发布网站。

## 素材与场景

- 复用项目内 `public/art/indoor.webp`、`cabinet.webp`、`satchel.webp`、`bird-calm.webp`，来源延续项目此前记录的 AI 生成本地位图；未下载第三方素材。
- 实际检查 `bird-calm.webp`：420×420、4 通道、`hasAlpha=true`、`isOpaque=false`，不是把棋盘格当透明使用。柜子与行囊也有真实透明通道。
- 本轮不使用 `assets/source/v2` 的棋盘格母图，也不使用此前生成的双鸟状态。既有文件原位保留。
- 树干、木平台、床、枝状栖木、料理台和墙上的明信片展示位置来自原室内图；柜子、行囊和小鸟为单独位图层。
- **临时素材安排 / 待替换素材**：当前使用原画中的圆木凳兼作小餐桌，行囊放在其台面；暂无独立、专用的餐桌画作。室内图与旧小鸟仍偏写实、颜色较深，不宣称达到最终清透水彩风格。本轮只完成布局骨架和基本交互。
- 背景墙上已有静态风景画，只作为明信片展示位置，不代表新明信片功能已经完成。

## 390×844 浏览器验证

在真实 Chromium 中运行本地页面 `http://127.0.0.1:5173/`，独立测试存储，不修改用户真实浏览器存档。

- 页面和文档尺寸均为 **390×844**，无横向或纵向溢出。
- 行囊热区约 79×79、料理台约 113×84、柜子约 158×158 CSS 像素，均在视口内。
- 三个面板实际通过触摸点击打开，通过关闭按钮关闭；Esc 可关闭并将焦点还给入口；点击遮罩也能关闭。
- 料理台内容高于面板时可滚动（clientHeight 718、scrollHeight 759），关闭按钮固定于面板顶部。
- 已实际走通既有基础操作：料理台制作面包→领取→行囊选择面包→刷新后选择仍保留。没有开始任何旅程。
- 打开/关闭只读面板不改变存档；页面刷新后 v1 存档继续可读。
- 所有当前室内图片加载成功；捕获到的页面脚本异常为 0、HTTP 错误响应为 0。
- 本轮未测试其他屏幕尺寸、桌面布局或手机真机。

截图与记录：

- `output/playwright/a1-room-390x844.png`：修正后的完整室内。
- `output/playwright/a1-bag-390x844.png`：已选便当的行囊。
- `output/playwright/a1-kitchen-390x844.png`：料理台。
- `output/playwright/a1-cabinet-390x844.png`：储物柜。
- `output/playwright/a1-checks.json`：视口、热区、面板、资源与存档验证数据。

## 构建结果：正式构建未通过

实际执行 `pnpm build`，退出码 **2**。日志：`output/playwright/a1-build.log`。

阻碍在 A-1 源码修改前已存在：上一轮并行任务写入但尚未实现的 `src/domain/game.v2.test.ts` 与 `src/domain/migration.test.ts` 引用了 `cookFood`、`prepareBag`、`settleGame`、`schemaVersion` 等 v2 接口，现有生产逻辑仍是 v1。正式 `tsc` 包含这些测试，因此在 Vite 打包前停止。本轮遵守“保留全部未提交改动、只改室内”的范围，没有删除测试、排除它们或实现整套 v2 来掩盖失败。

补充定位验证（**不能替代正式构建**）：

- 用现有 TypeScript 配置仅检查应用源文件，排除测试文件的诊断结果为 **0**。
- `pnpm exec vite build --outDir output/a1-bundle` 成功，退出码 **0**；输出放在单独目录，不覆盖原 `dist`。日志：`output/playwright/a1-vite-build.log`。
- 本轮源文件的 `git diff --check` 通过。

没有宣称全量测试通过，也没有宣称正式可部署构建完成。

## 当前问题与下一轮建议

1. 正式构建仍受两份 v2 测试草稿阻断。下一轮先明确如何保留并隔离后续阶段测试草稿，再恢复正式构建；不要被测试草稿驱动着扩展完整玩法。
2. 专用餐桌与最终清新手绘美术尚缺，现有透明旧素材只满足 A-1 骨架展示。
3. 已有旅行进度原样保留，旧存档中的外出小鸟在 A-1 仍不显示；本轮未添加归来领奖、旅行或其他场景入口。

到此停止，未自动进入 A-2。

# 2026-09-12：本轮素材复检与 v2 交付

本节更新此前“本地抠图完成”的验收结论：旧鸟腿部／右侧边缘和旧包提带存在缺损，不能按旧结论直接复用。已参照同一认可图通过内置图像工具重建两件独立透明素材，稳定 -cutout.png 已替换，新版同时另存 -cutout-v2.png，旧版另存 -cutout-v1-before-20260912.png。新版尺寸：鸟 1230×1278，包 1254×1254，均真实 RGBA；浅深底与干净背景合成已实际查看。完整说明及 Alpha 数据位于 assets/derived/素材验收-v2.md、alpha-validation-v2.json。

复用干净背景，不生成室内图；没有改源码、public/art、功能或部署。旧 approved-layer-metadata.json、蒙版及提取脚本只对应 v1；下一步接入必须使用 v2 说明中的完整画布与新坐标。本轮素材交付完成后停止。

## 2026-09-12 箭头位置与场景水波纹反馈

- 将出口热点统一场景坐标调整为 `ROOM_HOTSPOTS.exit = (615, 1490)`，箭头仍沿原方向指向下方出门通道；沿用现有 `exit-arrow.png`，显示宽度由 58px 增至 76px，高度保持 52px。
- 移除出口文字、矩形底板与白色框，箭头仍保留无障碍名称和原庭院准备中提示逻辑。
- 在 `RoomScene` 的统一场景容器上接入单一 `onPointerDown` 水波纹：按场景容器的实际缩放矩形换算百分比坐标，450–650ms 内暖白光点和浅金扩散环淡出，`pointer-events: none`；弹窗阻塞时不生成；`prefers-reduced-motion` 使用 140ms 短反馈。
- 未修改背景、小鸟、背包、菜单结构、存档、旅程或庭院业务逻辑。
- 验证：390×844、320×568、1440×1000 浏览器检查通过；22 个相关 Vitest 用例通过；`pnpm build` 通过；无溢出、重复水波纹或弹窗穿透。

## 2026-09-12 三种正式食物与首张明信片

本轮范围：三种食物正式设定、独立水彩透明素材、厨房/库存/行囊接入、第一张明信片正反面与双语只读预览。继续使用 React + TypeScript + Vite、本地资源、`travel-bird-save-v1` 本地存档及现有 `PanelSurface`。未发布网站。

### 正式食物

| 稳定 ID | 中文 / English | 配方 | 游戏图片 |
| --- | --- | --- | --- |
| `strawberry-cloud-bun` | 草莓云朵麦包 / Strawberry Cloud Bun | 小麦×1 + 草莓×1 | `public/art/foods/food-strawberry-cloud-bun.png` |
| `carrot-crescent-crisp` | 胡萝卜月牙脆饼 / Carrot Crescent Crisp | 小麦×1 + 胡萝卜×1 | `public/art/foods/food-carrot-crescent-crisp.png` |
| `tricolor-travel-bites` | 三色旅行小团子 / Three-Color Travel Bites | 小麦×1 + 胡萝卜×1 + 草莓×1 | `public/art/foods/food-tricolor-travel-bites.png` |

`src/domain/config.ts` 的 `FOODS` 与 `RECIPES` 为同一配置对象；`src/i18n/dictionary.ts` 是当前运行代码新增的中英文词典（之前只有未接入的 v2 文档，没有现成词典）。名称、完整描述通过 `nameKey` / `descriptionKey` 读取，图片通过 `artKey` 读取。

- 已生效：正式 ID、词典名称描述、食材配方、素材、真实库存、现有解锁列表检查、首份食物的引导提示。制作依旧在开始时扣一次材料、完成后手动领取到真实库存；行囊选择不消耗食物、不出发。新存档初始食材额外包含草莓×1以满足首份配方；旧存档不追加任何食材或货币。
- 可靠接口已保存但尚未接入旅行：`travelBand`、`postcardCountMin/Max`、`returnTimeMultiplier`、`friendChanceModifier`、`destinationTags`。三种分别为 near/1–1/1.0/0/sunny+shady，middle/1–2/0.9/0.03/shady+waterside，far/2–3/1.15/0.10/sunny+waterside+highland。
- `referenceValue` 为 10/20/50，仅参考数值，不启用购买，也不额外扣三叶草。`unlockCondition: recipe-unlocked` 描述沿用的旧解锁列表条件，未开启新的解锁流程。
- `bread → strawberry-cloud-bun`、`carrot_cake → carrot-crescent-crisp`、`strawberry_bento → tricolor-travel-bites`；同名旧中文别名也兼容。库存混合新旧 ID 时数量相加，只导出正式 ID，迁移重复执行不增量。行囊、未领取烹饪、现有旅程、历史日志和奖励中食谱解锁引用一并转换；原始故事、日期、收藏、额外货币字段保留。原 JSON 保存于 `foodMigration.originalRaw`；未知 ID/非法数量明确拒绝而不清空原存档。

### 第一张明信片

- 固定 ID：`FIRST_TRIP_POSTCARD_ID = "first-dandelion-hill-selfie"`。
- 地点：蒲公英风坡 / Dandelion Breeze Hill；`destinationId: dandelion-breeze-hill`。
- `foodAffinity: [strawberry-cloud-bun]`，`storyVariant: first-solo-selfie`，`isFirstTripGuaranteed: true`，`sortOrder: 0`。
- 正面：`public/art/postcards/postcard-first-dandelion-hill-blue-quaker-front.webp`。
- 背面：`public/art/postcards/postcard-paper-back-dandelion.webp`。
- `birdArtVariants["blue-quaker"]` 指向本轮自拍，`cockatiel: null` 明确缺口，不回退到蓝色和尚图片。
- 入口：室内羽毛菜单 → 相册 → 内测预览 → 预览第一张明信片。相册仅显示真实已获得记录，预览卡不计收藏。
- 只完成内容配置和预览，**尚未接入旅行状态机**。旧普通随机池维持原有九个 ID；首张卡仅加入内容注册表，没有加入随机抽取池。
- 预览打开时捕获当前名字到 `PostcardSnapshot.birdNameSnapshot`，不读取实时名字覆盖落款；`travelDate: null` 显示日期预留。未来正式获得卡片必须用出发快照；`Journey` 与 `AlbumEntry` 已预留名字/鸟种/日期字段，本轮没有制造虚假历史名字或旅行日期。
- 明信片正文、落款、地点由 UI 渲染；正面先显示，可用明确按钮或键盘 Enter/Space 翻面，支持屏幕阅读器和减少动态效果。手机背面使用同一纸张的安静区域纵向排文，文字不缩成难读小字，可在弹窗内滚动。

### 后续美术待办（未完成）

厨房、设置、仓库和行囊目前已经完成统一的米色卡片与纹理过渡，功能、响应式和可访问性可用，但仍属于CSS功能性版本，不代表最终手绘水彩UI完成。后续需要制作并接入本地栅格面板皮肤，包括食谱纸、木柜内页、布制行囊内页和设置手册/木牌，同时减少规则矩形和标准卡片感。替换美术时应复用现有PanelSurface和业务逻辑，不重新实现库存、厨房、行囊或设置状态。

本轮不制作其他明信片、玄凤版本、新庭院或小鸟其他状态；不接通备好自动出发、旅行倒计时、离线结算、邮箱、归来包裹、奖励发放或普通旅行随机新流程。


## 2026-09-12 蓝色和尚鹦鹉角色母图修正

- 已实际检查用户提供的 `IMG_7109.PNG`：2048×2048、RGBA、存在真实透明通道；上排为四种蓝色和尚鹦鹉状态，喙面已去除两个明显深色鼻孔。
- 正式母图：`assets/source/v2/birds-alpha.png`，内容与保留的 `assets/source/v2/birds-master-corrected-2048.png` 完全一致；SHA256 `9D7F17DC945B974D360F18A8954A0AAA66C517CB0B79C387F72C28B62DFB694F`。
- 历史源文件保留为 `assets/source/v2/birds-alpha-before-20260912.png`，SHA256 `26FB3887135474B4463A0334A8626FC65F9E942BE52B126971EE6B6F69D6CE61`。
- 蓝色和尚鹦鹉采用绘本化简化设计，喙面不表现两个明显深色鼻孔；不得生成黑点、孔洞或替代性的深色斑点。
- `public/art/room-v2/blue-quaker-calm-corrected.png` 已从修正版母图机械裁切生成，保持 420×540 透明画布与脚底锚点 `(250,430)`；`src/ui/roomLayout.ts` 和 `src/ui/Art.tsx` 已切换到该素材。原 `public/art/room-v2/blue-quaker-calm.png` 保留为历史衍生图。
- `scripts/prepare-v2-art.mjs` 已改为按母图尺寸缩放图集坐标，未来生成高兴、打盹、生气和明信片角色时只读取上述标准母图。
- 待修补衍生图：`public/art/v2/blue_quaker-calm.webp`、`blue_quaker-happy.webp`、`blue_quaker-sleepy.webp`、`blue_quaker-angry.webp` 仍是旧图集导出的版本，均需后续只针对喙部局部修补；本轮未整张重新生成。

## 2026-09-12 低范围视觉修复

- 室内当前平静小鸟最终图片：`public/art/room-v2/blue-quaker-calm-corrected.png`；原始旧衍生图 `public/art/room-v2/blue-quaker-calm.png` 保留。
- 透明鸟图实测尺寸 `420×540`，Alpha 有效边界 `[7,37]–[282,362]`；脚爪最低接触点左 `(184,353)`、右 `(231,348)`，`footContactAnchor=(207.5,350.5)`。
- 干净背景承托树枝的 `branchContactAnchor=(651,709)`；两点在 941×1672 统一场景坐标中重合。配置位置：`src/ui/roomLayout.ts` 的 `ROOM_SPRITES.bird.anchor/contact`。
- 第一张明信片正面已确认是整张合并图，没有独立鸟图层。原图 `assets/source/food-postcard/postcard-first-dandelion-hill-blue-quaker-front.png` 与原 WebP 保留；修复版为 `public/art/postcards/postcard-first-dandelion-hill-blue-quaker-front-repaired.png`，仅局部修复两个喙部深色鼻孔区域，尺寸仍为 `1536×1024`。
- 角色规范：蓝色和尚鹦鹉采用绘本化简化设计。喙部保持干净、圆润、连续的颜色与光影，不表现两个明显的深色鼻孔、黑点、孔洞或替代性的深色斑点。所有未来状态和明信片必须以修正后的角色母图为参考。
- 所有未来小鸟图片生成提示词必须包含：“绘本化简化的小型弯喙，喙面颜色与明暗连续，不表现任何明显的深色鼻孔、黑点、孔洞或替代性的深色斑点。”
- 本轮局部修复状态：第一张明信片已完成喙部局部修复；`public/art/v2/blue_quaker-{calm,happy,sleepy,angry}.webp` 等旧图集衍生图仍需后续检查，未在本轮修改；其他明信片仍需检查。

## 2026-09-12 支撑脚与鼻孔边线二次修复

- 撤销“最低像素平均值”作为站立锚点。当前使用 `anchorMode: "support-foot"`，画面右侧靠后的左脚支撑中心 `supportAnchor=(238,329)`，树枝支撑点 `(668,708)`；支撑线从 `(638,713)` 上扬至 `(668,708)`。
- 透明画布、`object-position`、父级缩放与 CSS 额外偏移均已复核；未添加 viewport-specific `translateY` 或图片变形。
- 第二次明信片局部修复严格以上一版 `public/art/postcards/postcard-first-dandelion-hill-blue-quaker-front-repaired.png` 为输入，输出 `public/art/postcards/postcard-first-dandelion-hill-blue-quaker-front-v2-no-visible-nares.png`；原始 PNG、原 WebP 与上一版修复图均保留。
- 第二次修复在 400% 局部检查中清除了残留黑线；修复脚本输出扫描确认两个喙部修复 ROI 无深色边线残留，未发现新增黑点。
- 统一美术标准补充：小鸟在树枝上的站立位置以支撑脚和树枝承托关系为准，不使用透明图片最低像素作为唯一锚点。英文提示词要求：`clean rounded beak with continuous watercolor shading, no visible nostrils, no dark lines, no black dots, no holes, no replacement dark marks`。
