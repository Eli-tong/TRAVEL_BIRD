# Technical Architecture Final｜技术架构

何为 · 2026-11-24 · React 19、TypeScript、Vite 静态网页游戏

~~~mermaid
flowchart TD
  Host["Netlify 提供 dist"] --> Browser["手机浏览器"]
  Browser --> App["main.tsx / App.tsx"]
  App --> UI["RoomScene、GardenScene、厨房、行囊、邮箱、相册、设置"]
  UI --> Clock["App 操作回调与世界时钟"]
  Clock --> Game["game.ts / GameState"]
  Game --> Rules["config.ts / 作物、食谱、旅行和奖励"]
  Game --> Routine["birdRoutine.ts / 日常"]
  Game --> Motion["travelChoreography.ts / 出入场"]
  Clock --> Save[("localStorage / travel-bird-save-v1")]
  Save --> App
  App --> Warm["低优先级素材预热"]
  UI --> Art["同源 public/art 与 public/fonts"]
  Warm --> Art
~~~

- [src/main.tsx](../../src/main.tsx) 注册 React 根节点并引入样式。页面 load 后，[preload.ts](../../src/ui/preload.ts) 分批预热常用动作和相册图。可见场景从 DOM 或 CSS 发出图片请求。
- [src/App.tsx](../../src/App.tsx) 管理 GameState、当前面板、场景、地块与语言；gameRef 让连续操作读取最新状态。RoomScene、GardenScene 管理渲染、角色与热点。KitchenPanel、TravelBagPacking、InventoryCabinet 负责显示和交互；PostcardAlbum 与 PostcardPreview 展示已领取明信片。
- [game.ts](../../src/domain/game.ts) 实现种植、料理、装包、旅行、独立领奖及存档导入。数据定义在 types.ts，规则配置在 config.ts。birdRoutine.ts 处理日常；travelChoreography.ts 定义进出场阶段；TravelBird.tsx 将时间映射为 sprite 帧和位置。
- [roomLayout.ts](../../src/ui/roomLayout.ts) 与 [gardenLayout.ts](../../src/ui/gardenLayout.ts) 保存坐标、锚点和热点，CSS 维持原画比例；庭院横移在同次场景会话保留。 [src/i18n](../../src/i18n/) 提供中英语言字典。
- 存档 JSON 保存版本、时间戳、经济与旅程数据。重新打开按时间结算，不需要服务器计时；同源浏览器存储无云同步。源码无 Service Worker 注册、后端账号或路由库。
- public 原样进入 dist，位图用站点根相对路径；Vite 默认 base 为 /。构建先由 tsc 检查应用，然后 Vite 产出带哈希的 JS/CSS。[netlify.toml](../../netlify.toml) 设构建和发布目录。[public/_redirects](../../public/_redirects) 设静态缺失 404 与普通 SPA 回退。历史源图和处理脚本位于 assets/source、scripts。

[实现证据](Technical_Evidence_Final.md) · [构建与验证](Technical_Verification_Final.md)
