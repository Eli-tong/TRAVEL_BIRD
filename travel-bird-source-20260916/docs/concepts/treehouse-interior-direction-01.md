# 树屋室内概念图 · 方向 01

用途：供用户确认原创构图与美术方向。仅生成一张，未接入游戏代码，未修改玩法、存档、部署或旧素材。

## 原图

- 项目内原图：`assets/concepts/treehouse-interior-direction-01.png`
- 图像工具原始输出：`C:/Users/wenru/.codex/generated_images/01a09178-d28e-7d92-a8e5-61ab350b090b/exec-5bdc1679-ce12-49d2-930a-022bac27753b.png`
- 原样复制，没有重采样、裁切、调色或再次生成；SHA256校验一致。
- 生成工具：内置 `image_gen.imagegen`，一次调用，提供四张输入图。不使用额外付费API或密钥。

## 参考输入

1. 旅行青蛙室内截图：`C:/Users/wenru/AppData/Local/Temp/codex-clipboard-5ff62784-a960-4449-840f-2cd8e0f8596e.png`；用于整屏竖向空间、小动物尺度与边缘入口组织。
2. 温暖树屋：`D:/Tencent/xwechat_files/wxid_winannxt5am822_5f75/temp/RWTemp/2026-09/487eb49c9a1893e8939a3b2407e9880e/4e74b69fb086b8fe3942c26540e8ca98.jpg`；用于木质结构与温暖窗光。
3. 清新水彩：`D:/Tencent/xwechat_files/wxid_winannxt5am822_5f75/temp/RWTemp/2026-09/487eb49c9a1893e8939a3b2407e9880e/b4769b409eece8b74831b2bb29ff7af9.jpg`；用于浅绿、水彩铺色与纸感。
4. 标准透明蓝色和尚鹦鹉母图：`assets/source/v2/birds-alpha.png`（修正版 2048×2048 RGBA）；后续角色状态与明信片只允许以此母图作为角色参考。

没有向工具提供旧游戏室内背景，不以其构图作为改造底稿。

## 主要位置与复核

- 上部：圆窗、床铺与睡眠平台；左侧木阶连接下层。
- 中部偏右：树干伸出的天然栖木与一只蓝色和尚，爪子接触枝面。
- 中部偏下：独立圆木餐桌，行囊位于桌面。
- 下部左侧：料理台；下部右侧：储物柜；中央通道连接各处。
- 床右侧：三张空白卡片的展示绳，未制作明信片玩法。
- 原图未生成文字、数字或按钮。右上枝叶与右下前景仍略密，后续若采用该方向，需进一步收简UI安全区域。
- 此图将鸟、行囊及家具合在同一概念画面中，**不能直接作为最终可交互背景**；方向确认后还需把小鸟、行囊和可变物件独立分层。
- 已展示生成原图，等待用户确认。没有生成第二候选或自动进入代码开发。

## 完整生成提示词

```text
Use case: illustration-story / original game environment concept.
Deliver exactly ONE complete portrait image, one coherent design direction, aspect ratio 9:16 (prefer 1080 x 1920). This is a composition and art-direction concept painting, NOT a screenshot, NOT a UI mockup, NOT a sprite sheet and NOT a production background.

INPUT ROLES:
Image 1 (Travel Frog interior screenshot): reference ONLY for a full-screen vertical miniature animal living space, readable organic furniture, clear hand-drawn contours, gentle quiet game composition and small UI-safe edges. Do NOT copy its house, furniture arrangement, character, text, logos or controls.
Image 2 (warm illustrated tree interior): reference ONLY for warm window light, believable timber support, small cozy textiles and handmade living details. Do not include its person, cat or exact room layout.
Image 3 (fresh watercolor treehouse): primary reference for airy translucent pale green washes, cream paper, light fresh color, softly imperfect pencil linework. Do not include its cats or outdoor magic scene.
Image 4: the previously generated transparent-background blue Quaker parrot asset. Use THIS one bird as the character insert/identity source, preserve its powder-blue wings, pale gray-white face and fluffy breast, tiny dark eyes, curved peach beak, long blue tail and natural feet. No crest, no yellow face. Scale into the room with feet touching the perch, no rectangular matte, no checkerboard. No other birds or characters.

PRIMARY REQUEST:
Create an entirely NEW ORIGINAL interior of a small bird's treehouse. A full-bleed, vertically layered, inviting 2D watercolor picture-book living illustration with an intelligible open room and future clickable furniture. A shallow three-quarter cutaway view, gentle spatial depth, all furnishings on a coherent scale. The scene fills the entire portrait canvas. It must feel like a quiet little inhabited home, not a dollhouse product rendering.

NEW COMPOSITION:
A softly curving load-bearing living tree trunk rises on the RIGHT side and supports a small elevated sleeping platform toward the UPPER LEFT/back. A circular window above that sleeping nook admits fresh daylight through green leaves. A low little wooden bed with a simple cream pillow and pale sage linen sits fully visible on the upper platform. A short organically curving run of wooden steps against the LEFT edge connects the platform with the main room; NO giant ladder crossing the center.
The MIDDLE is open and breathable: a natural branch perch emerges from the right-side structural trunk toward the room, with the single blue Quaker from image 4 resting there. Bird body about 17–20% of image width, total silhouette including tail around 23–27%, a small resident rather than a giant mascot. Nearby, slightly lower and to the left, is a clearly visible low oval wooden dining table with a modest sage cloth satchel on its tabletop. Leave separation around the satchel for a future tap target. Natural branch-supported seating and a small mug are enough; do not clutter.
The LOWER LEFT has a distinct small cream-and-light-wood cooking counter, one simple cooking pot, a cutting board and a folded cloth. The LOWER RIGHT/center has a clearly separate short wooden storage cupboard with closed doors and small simple handles. A pale wooden walkway curves between these objects toward a doorway/passsage at the lower side, maintaining clear access. Keep the table, kitchen counter and storage cabinet visually distinct, each with unambiguous contact with its supporting surface.
Reserve a quiet wall area beside the sleeping platform for a small postcard display cord or wooden ledge with 3 blank cream cards (NO writing or generated pictures on them).
The support trunk, platform, bed, circular window, perch, dining table, satchel, cooking counter, cupboard and walkway must all be clearly present and readable.

ART DIRECTION:
Flat soft watercolor washes and delicate warm-gray/gray-green colored-pencil contours, gently irregular handmade edges, visible but restrained cold-pressed paper texture, simplified material marks. Fresh creamy whites, pale birch wood, sage and young leaf greens, muted golden sunlight. A warm, calm, airy home with enough open floor and wall to breathe. Light and legible at phone size. The bird's provided soft illustrated style should fit the room.
No photorealistic woodgrain, no polished 3D, no plush toy rendering, no plastic, no vector geometry, no hyper-detailed sepia fantasy cavern, no dark orange varnished timber, no glossy dramatic light, no thick black outlines, no SaaS cards.

UI-SAFE SPACE WITHOUT UI:
Top-left about 22% width x 8% height: quiet pale wall/soft foliage for future currency.
Top-right about 16% width x 9% height: quiet low-detail timber/wall for future menu.
Bottom-right about 20% width x 15% height: uncluttered floor/threshold for future scene switch.
These must remain part of the painted room, NOT white boxes or blank graphic panels. DO NOT draw any letters, numbers, captions, labels, buttons, menus, icon badges, logos, borders, watermarks or UI.

This image intentionally includes the bird and satchel for concept review only; later these mutable objects will be made into separate layers. Do not make alternate candidates, a collage or multiple panels.
```
