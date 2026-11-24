# Cross Device Test Checklist｜跨设备验收清单

TB-BUG-05 · 2026-11-24 · 发布后由何为与 QA 按实际填写

| 测试对象 | 截止本轮的记录 | 发布后需执行 |
| --- | --- | --- |
| Windows Google Chrome | 157.0.8103.80，现网桌面及 390×844 触控模拟；本地生产包涉及刷新、重新打开、弱网与故障注入 | 在共享 Netlify URL 重跑，保留 Network 记录 |
| Android Chrome | Windows Chrome 的 390×844 模拟结果见上 | Android 手机真机；记录型号、系统和 Chrome 版本 |
| iPhone Safari | Windows Playwright WebKit 26.6 的 iPhone 13 配置通过背景故障注入、收获、两次出发和存档 | iPhone 真机 Safari，记录型号与 iOS；横竖屏切换后重回竖屏 |
| Netlify 新版本 | 待手工上传 | 锁定 Deploy ID、生产 URL、测试时间，并确认页面引用新 JS |

## 操作顺序

1. 在 Netlify 记下 Deploy ID、发布时间和 URL。旧进度在设置中导出 JSON。冷访优先用新的无痕窗口或浏览器测试资料，以保留平常存档。
2. 普通网络下打开首页。等树屋背景、树干、行囊和小鸟显示，点击厨房、橱柜、行囊和菜单。进庭院后横向拖动，试按树屋入口、邮箱和三块地。检查物件位置、触控、屏宽断点、文字和插画，记录任何偏移。
3. 同一窗口刷新；关闭页签后在同一浏览器重新打开。观察画面完成时间并确认进度存在。另用临时测试资料清除该站点数据再冷开，验证空白存档行为。
4. Chrome DevTools 用 Network 禁用缓存，并以 1 Mbps 下载、0.5 Mbps 上传、350 ms 延迟条件重试；手机可用可重复的限速 Wi-Fi 或明确记录其实际较弱蜂窝环境。首屏加载失败时观察背景是否出现 retry=1，最终能否恢复，或在两次失败后提示刷新。记录是否有异常空白。正常环境和弱网至少各跑 3 次，记录每次观察。
5. 在厨房制作草莓云朵麦包，装包选风车田野，观察出发编排。旅途中室内和庭院均无日常小鸟，返程阶段可能出现动画。关闭再打开到期会结算。进庭院邮箱抽出并收好明信片，再在室内行囊领取种子与食谱；另存档反向领取。种胡萝卜、点击成熟气泡的收获按钮、制作胡萝卜月牙脆饼，选择已解锁的苔光森林，验证第二趟进入外出状态。生产旅行主体约 5 分钟，出返程编排另计。
6. 用 curl 或浏览器 Network 检查不存在的 /art/room-v2/does-not-exist.png、/assets/missing.js、/fonts/missing.woff2 为 404。存在的背景为 image/png；JS/CSS 成功且 MIME 正确；/missing-route 延续 SPA 回退。刷新后允许 304，检查图片是否能显示。
7. 发现失败时保持页面，截屏并保存 Network/HAR（分享前移除个人信息）。Android 可使用桌面 Chrome 的设备检查，iPhone 可使用 Mac Safari 的 Web Inspector。缺工具时记录失败时间、区域、截图与可复现步骤。

## 结果记录

| 日期时间与时区 | Deploy ID | 设备／系统／浏览器 | 网络与缓存 | 流程 | 结果／耗时 | 失败 URL／状态／MIME／请求 ID | 截图或 HAR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 |

[修复与限制](Asset_Loading_Fix_Report.md) · [Evidence Index](Technical_Evidence_Index.md)
