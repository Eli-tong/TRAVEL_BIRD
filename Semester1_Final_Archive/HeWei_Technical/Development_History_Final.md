# Development History Final｜开发历程

何为 · ENT303TC · 整理于 2026-11-24（UTC+8）

本地日期取 Git author 字段记录的日历日，工作日志日期来自 [PROGRESS.md](../../PROGRESS.md)。GitHub 上传时间单列。提交可核对对应代码；测试以原有记录和本轮运行记录为依据。

| 日期 | 实现与决策 | 原始指针与边界 |
| --- | --- | --- |
| 2026-09-09 | React 网页原型建立种植、制作、出行和本地存档。随后改成可点按的室内与菜园，增加小鸟情绪及早期水彩造型。 | 本地 6fe1cb5a4630dcfd19523bd292987022fd5f22d7、ca9c674ee04d2cd272ec7f36b925c00ed055b75b、b9955354b6fed2cbdc5613bc3f052344dbaae736。真机原始记录缺失。 |
| 2026-09-12 | 认可树屋以水彩背景、独立蓝色和尚鹦鹉和行囊分层接入。941×1672 画布统一热点坐标，厨房、柜子和行囊各有面板。日志记载当时出口显示「庭院准备中」，并校准方向箭头和点击反馈。 | 本地 78b7610a2907b342a3ef96b0f0617bb5fd25dbbc、a5743186c187a8339b46ea932ce4e37ca4c668c4、b16816bbf914bde82fe604c5f829a22453e3e266；PROGRESS.md 的 09-12 记录。 |
| 2026-09-16 | GitHub 初始快照和源码上传。 | [源码上传提交](https://github.com/Eli-tong/TRAVEL_BIRD/commit/92237618e6a8bfd333179d6c5b54ea10e7256982)。 |
| 2026-10-14／19 | 10-19 周日志回溯 10-14 验收，记录庭院接入、三地块、外出隐藏与分渠道领奖；当时完整第二趟端到端仍为缺口。 | PROGRESS.md 的 TB-GARDEN-E01 至 E04。10-14 独立 Git 修复提交缺失。 |
| 2026-10-20 | 提交自主出发、归来待领奖、利用胡萝卜进入第二趟；引入日常活动持久化与离线归来重置。 | 本地 7984e3e6362095da91122a9c5d3ec79c87fa3fb0、8fa6a8a1fc76020a97667a6df0468580f11697b6、4f63d3688e89882a888884fd2808c595b4f97c4a、47bafb040b82f4a908d6e1fcb94c360fab1f7607。 |
| 2026-10-21 至 23 | 角色跨场景日常及成熟作物水彩图接入；十张卡片登记显式路径；校准鸟进门、步速、脚底、室内飞行与睡眠。 | 本地 bcf2fc3f94455939b819613150cf7a1def02296c、2f2f0b06e6567c2e987a306e02fcafeab05cdaf3、08687d020c9ce6315c9d3111cc08696d403b4282、d6dc43aa841a1eb86551431ebd9c045013cdc3a7、8ec20db13d03d94887367b85e9a3c8349f513079。同期浏览器检查按 PROGRESS.md 的范围理解。 |
| 2026-10-24（UTC+8） | GitHub 源码快照「Update TRAVEL_BIRD latest version」。Git author 时间为 10-23 17:55:22 UTC。 | [GitHub 源码快照](https://github.com/Eli-tong/TRAVEL_BIRD/commit/e3d79bff7cff409e7e54337f1f18127abde0e791)。 |
| 2026-11-22 | GitHub main 建立最终归档角色目录。何为目录在读取时有占位文件。 | [GitHub 归档快照](https://github.com/Eli-tong/TRAVEL_BIRD/tree/9b5d3e5c1bf2bbc461ebba865a1cdfc157b32f9f/Semester1_Final_Archive)。 |

## 当前工作区与 2026-11-24 复测

交接时已有未提交的旅行出入场编排、水彩相册、房间摆件面板、库存柜和庭院气泡等。各项独立起始日期和提交 SHA 缺失。现网入口 JS/CSS 与修复前工作区重建逐字节相符，其 Netlify Deploy ID 及确切源码提交待核。

本轮完成证据补档、验证和图片加载防护，见 [调查](Asset_Loading_Investigation.md) 与 [修复](Asset_Loading_Fix_Report.md)。本轮结果以 2026-11-24 记账，供后续进度汇报引用。前十周历史成功率、实际人数、访谈、导师反馈及旧测试日期以各自原始资料为准；本包没有新增此类历史证据。
