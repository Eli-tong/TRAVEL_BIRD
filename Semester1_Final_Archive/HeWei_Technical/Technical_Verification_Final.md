# Technical Verification Final｜技术验证

何为 · 当前证据日期 2026-11-24（UTC+8） · Windows · Node 24.22.3 · pnpm 11.25.0 · Vite 7.3.6 · Vitest 3.2.7 · Playwright 1.63.0

目标为工作区基于 8ec20db13d03d94887367b85e9a3c8349f513079 的最终 dist。新修复及交接前工作区修改尚未形成 Git SHA，以下产物哈希锁定实际复测版本。现场校验的时间戳如标 Z 则为 UTC，换算为北京时间需加 8 小时。

| 检查与实际命令 | 结果与证据 |
| --- | --- |
| 初始全量 pnpm test | 退出 1。29 套件通过、286 用例通过；两个并发执行下的 5 秒超时，另有 BirdButton 草稿缺失模块而无法加载。 |
| pnpm test --maxWorkers=2 | 退出 1。31 套件的 289 个执行用例全部通过；唯一加载失败为 src/ui/BirdButton.test.tsx 引用不存在的 ./BirdButton。上次的两个超时在此运行通过。该草稿在工作区未跟踪，GitHub main 已有副本，保留在原处。 [全量摘要](verification/vitest-full-summary.txt) |
| pnpm test --maxWorkers=2 --exclude src/ui/BirdButton.test.tsx | 退出 0，31 套件 289 用例通过。覆盖 game、firstTrip、travelChoreography、travelRewardChannels、App.travel、App.garden、roomLayout、RoomScene、GardenScene 等。 [有效套件输出](verification/vitest-active.txt) |
| pnpm exec tsc --noEmit -p tsconfig.json | 退出 0。该 tsconfig 检查产品源码；测试由 Vitest 独立运行。 |
| pnpm build | 退出 0。tsc + Vite 输出最终 dist。 [构建输出](verification/vite-build.txt) · [入口、路由文件及 404 页的 SHA-256](verification/dist-entry-sha256.txt) |
| pnpm exec vitest run src/ui/preload.test.ts src/ui/RoomScene.test.tsx src/ui/GardenScene.test.tsx --maxWorkers=2 | 31 项通过。新增两个回归断言在修复前分别因 26 并发与无重试失败，修改后通过。 |
| node Semester1_Final_Archive/HeWei_Technical/verification/verify-asset-references.mjs | 退出 0。public 和 dist 各检查 110 条静态或配置生成路径，按精确大小写比对，0 缺失；HTML 入口也存在。 [输出](verification/asset-references.txt) |
| pnpm exec vite preview --host 127.0.0.1 --port 4312 --strictPort，另开终端运行 node Semester1_Final_Archive/HeWei_Technical/verification/browser-verification.mjs | Windows Chrome 157.0.8103.80 以 390×844 完成流程。用浏览器虚拟时间推进任务，所有业务操作走 UI。 [Chrome 输出](verification/chrome-game.txt) |
| 同命令设置 TB_TEST_ENGINE=webkit | Windows WebKit 26.6、iPhone 13 模拟配置通过相同流程。修复前在收获按钮上报告成熟作物图片拦截指针；最终版正常点击。 [WebKit 输出](verification/webkit-game.txt) |
| 上述两浏览器命令分别加 --retry-only | 两个场景各验证首次失败后解码成功、连续两次失败提示且不再请求。 [Chrome 输出](verification/chrome-background-retry.txt) · [WebKit 输出](verification/webkit-background-retry.txt) |
| pnpm --package=netlify-cli dlx netlify dev --offline --dir <dist 绝对路径> --port 4314，再用 curl.exe GET | CLI 27.20.1 离线模拟确认存在的资源 200、缺失静态 URL 404、普通路径回退 200。首次尝试 serve 因 CLI 路径参数异常退出，改用 dev；重新构建时旧 dev 实例一度清除规则，重启后用最终 dist 复测成功。 [本地路由输出](verification/netlify-dev-routes.txt) · [现网修复前响应](verification/netlify-production-probes.txt) |

## 浏览器业务覆盖

从新档制作麦包、装包并实际出发；刷新验证 ready 的旅程 ID，确认外出主体阶段两处小鸟隐藏；关闭页面并在同一浏览器重开到期，结算独立待领奖。抽出并双击领取明信片，刷新后领取行囊，验证相册、种子和旅行记录各入账一次。用胡萝卜种子种植、成熟收获、制作月牙脆饼，选择苔光森林并让第二趟进入 travelling。设置页导出有效 JSON，无效输入保留当前档，导入调整后的有效 JSON 并刷新验证。另一种领取顺序由 travelRewardChannels.test 验证。

旧 scripts/verify-autonomous-travel.mjs 使用老版料理 DOM、行囊确认及信封步骤；本轮浏览器记录以归档内 [browser-verification.mjs](verification/browser-verification.mjs) 为准。早期编写测试时曾等待旧版行囊关闭按钮和直接领奖；按现有 UI 修正脚本后重跑。WebKit 收获点击失败是修正脚本后单独复现并修复的产品问题。

## 待验

Android 真机 Chrome、iPhone 真机 Safari、真实网络与长时间挂起、修复上线后的 Netlify CDN，以及用户原始间歇故障的设备日志。本轮未将 Windows 的 WebKit 或移动视口当作真机结果，也未把本轮结果记入前十周历史测试。

[证据索引](Technical_Evidence_Index.md) · [真机步骤](Cross_Device_Test_Checklist.md)
