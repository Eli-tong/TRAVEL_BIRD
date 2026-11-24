# Bug Fix History Final｜技术缺陷历史

何为 · 2026-11-24

| Bug ID／状态 | 表现与原因依据 | 代码及修改记录 | 验证与边界 |
| --- | --- | --- | --- |
| TB-BUG-01 · 已校准，真机待验 | 热点与美术物件偏移。具体旧设备和复现存档缺失；09-12 日志记录出门箭头调整以及画布坐标修正。本轮还在 WebKit 模拟复现作物图拦截收获点击。 | [roomLayout.ts](../../src/ui/roomLayout.ts) 的 ROOM_HOTSPOTS、hotspotStyle 与 [scene.css](../../src/scene.css) 的等比画布；[gardenLayout.ts](../../src/ui/gardenLayout.ts) 使用庭院独立坐标。树屋基线 b16816bbf914bde82fe604c5f829a22453e3e266；本轮 [gardenScene.css](../../src/gardenScene.css) 让气泡中的装饰作物忽略指针。 | roomLayout.test、RoomScene.test、Chrome 与 WebKit 模拟均完成点按；手机真机边缘点击仍待测。 |
| TB-BUG-02 · 已修正，真机待验 | 外出时庭院仍可见小鸟。10-19 日志归因于初版小鸟画入背景，先局部叠无鸟图，后拆独立角色。 | 7984e3e6362095da91122a9c5d3ec79c87fa3fb0、bcf2fc3f94455939b819613150cf7a1def02296c；[GardenScene.tsx](../../src/ui/GardenScene.tsx) 使用无鸟底图，将位置、旅行和进出场分层。 | App.garden.test、RoomScene.test；进出场动画允许短时出现角色。 |
| TB-BUG-03 · 已修正，真机待验 | 邮箱及行囊职责重叠，旧入口复用整趟领奖。10-19 日志保留原原因。 | 7984e3e6362095da91122a9c5d3ec79c87fa3fb0；[game.ts](../../src/domain/game.ts) 拆分 claimTravelPostcard、claimTravelSeeds 和待领队列；[App.tsx](../../src/App.tsx) 分别接线。 | travelRewardChannels.test 覆盖两顺序、刷新和重复领取；多标签并写待验。 |
| TB-BUG-04 · 主流程具备回归验证 | 第一趟回来后难以继续。历史日志记载庭院入口与真实种植此前尚未连通；单次历史卡死的完整存档缺失。 | 7984e3e6362095da91122a9c5d3ec79c87fa3fb0 接入种植与自主旅行，首趟奖励解锁胡萝卜、脆饼与苔光森林。结清两种奖励后回 home 才能继续装包。 | firstTrip.test 覆盖两趟间的前置；当前浏览器止点见 [验证报告](Technical_Verification_Final.md)。 |
| TB-BUG-05 · **Open** | 多设备偶发缺图。已证实缺失静态路径回 200 HTML、并发预载 26 项；原始设备的具体失败 URL、请求及解码信息缺失，触发原因未定。 | 2026-11-24 工作区 [preload.ts](../../src/ui/preload.ts)、[useSceneBackground.ts](../../src/ui/useSceneBackground.ts)、[public/_redirects](../../public/_redirects)。 | [调查](Asset_Loading_Investigation.md) 与 [修复方法及结果](Asset_Loading_Fix_Report.md)。发布后 Netlify 及 Android/iPhone 真机仍需验证。 |

历史记录来源为 [PROGRESS.md](../../PROGRESS.md)，本轮命令与日期见 [Technical Verification](Technical_Verification_Final.md)。
