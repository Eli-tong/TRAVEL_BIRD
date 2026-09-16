# 库存九件套水彩素材统一设计

## 范围

本次只重绘当前 Inventory 实际可见的九个物品：`wheat`、`carrot`、`strawberry` 三种种子，同三个 ID 的原料，以及 `strawberry-cloud-bun`、`carrot-crescent-crisp`、`tricolor-travel-bites` 三种成品食物。`souvenirs` 存在于存档数据但当前未在 Inventory 渲染，本次不新增分类或展示。

不改变 item ID、recipe ID、Inventory 数据结构、数量、配方、存档、旅行、明信片、庭院和种植逻辑，也不覆盖现有 `/art/<crop>-seed.webp`、`/art/<crop>-ready.webp` 或现有 Food PNG。

## 视觉语言

九张素材统一为“高级的幼稚画 + 平面手绘水彩”：清楚而略微抖动的低饱和深棕轮廓，圆润、简单、轻微不对称的绘本造型，柔和水彩铺色、少量叠色和纸张笔触。禁止纯黑粗描边、3D、塑料高光、摄影写实、Emoji、Q 版手游 icon 和贴纸感。

三种种子采用同系列小纸袋、植物小图案和两三颗散落种子的构图；原料分别采用松扎小麦束、两三根略歪胡萝卜、两三颗带叶草莓；食物保持各自识别特征，但统一为简单、略笨拙可爱的绘本食物。所有图片为透明 PNG、正方形画布、相近视觉重量和安全留白，适配手机库存格。

## 技术结构

新增 `public/art/inventory/` 保存九张库存专用 PNG。新增 `src/ui/InventoryItemArt.tsx`，集中导出 `INVENTORY_ART_MAP`，按 `seeds`、`ingredients`、`foods` 和现有 ID 映射图片路径，并由 `InventoryItemArt` 统一渲染 class、alt 与不可拖动行为。

`InventoryPanel` 的三个分区全部改用 `InventoryItemArt`。旧 `CropArt`、`FoodArt` 及 `RECIPES[*].artKey` 保持不变，继续服务库存之外的已有界面。库存 CSS 只针对 `.inventory-item-art` 统一大小、`object-fit: contain`、透明边缘和缩放。

## 验证

- 自动化测试逐项断言九个 category/ID 都映射到 `/art/inventory/*.png`，并确认旧 Crop WebP 与旧 Food PNG 不出现在 Inventory DOM。
- 真实浏览器打开 Inventory，读取九张图片的 `currentSrc`、自然尺寸、渲染尺寸与加载状态。
- 在 320、375、390、430 像素宽度分别截图，检查辨识度、裁切、留白、透明边缘与视觉重量。
- 运行完整测试和生产 build。

