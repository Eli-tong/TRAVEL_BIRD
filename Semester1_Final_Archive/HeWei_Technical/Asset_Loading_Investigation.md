# Asset Loading Investigation｜素材加载调查

2026-11-24（UTC+8） · 负责人 何为 · TB-BUG-05

目标站点为 [当前 Netlify 生产站](https://tranquil-lokum-a62556.netlify.app/)。本地对照是当天改动前生成的 baseline-dist。生产首页指向 index-CMvK51Jd.js 和 index-T3bTNP28.css，两份在线实体文件的 SHA-256 与本地重建一致。随机失败设备的 Network/HAR、确切路径与复现步骤无存档，因此间歇性故障保持 **Open**。

## 已确认

| 检查 | 观察与依据 |
| --- | --- |
| 线上静态缺失响应 | GET /art/room-v2/does-not-exist.png、/assets/missing.js 返回 200 和 text/html，内容是应用首页。/missing-route 也通过 SPA 回退载入首页。现有 /art/room-v2/background.png 与 trunk-foreground.png 会返回 image/png。缺失文件被 SPA 回退掩盖；本轮特意请求的不存在路径用来验证行为。 |
| 静态引用 | 从 src 及打包 JS/CSS 收集 art、fonts、assets 路径，与 public／dist 相对路径按原始大小写精确比较。基线初检各 95 项。最终审计再实例化动画注册表和作物等路径，各检查 110 项，0 缺失。入口 CSS/JS 在 dist。 [审计输出](verification/asset-references.txt) |
| 资源来源 | Vite 默认 base /，部署在站点根。public 资源原样进入 dist，CSS 和 TS/TSX 使用同源根路径；没找到运行时远程插画、Service Worker 注册或 Cache Storage 实现。部分旧素材仍随 public 进入 dist。 |
| 缓存与发布 | 抽样首页、两个带哈希的 JS/CSS 和在用 PNG 见到 public,max-age=0,must-revalidate。刷新中出现正常 304。当前样本的入口和资源版本匹配。尚无原始故障设备的代理、缓存头或 Deploy ID。 |
| 首屏竞争 | 修复前 preloadArt() 在 React 渲染以前创建 26 个 Image 并调 decode()，失败被吞掉。室内静态资源又由可见元素请求；浏览器可能合并请求。Windows Chrome 本地弱网下仍能解码背景，但等待较长。具体数值见 [修复报告](Asset_Loading_Fix_Report.md)。 |
| 图片体积 | public 有 181 个图片文件，合计 147,927,507 字节（约 141.07 MiB），包括历史兼容图；这不是首屏传输量。在用树屋背景 2.49 MiB、庭院背景 3.02 MiB、首张明信片 4.25 MiB，多个庭院动作帧条在 2 MiB 以上。 |
| 日志缺口 | curl.exe 个别 HTTPS 探测返回 Windows Schannel TLS 错误（35），后续对应资源请求或 Chrome 解码成功。探测失败是本机链路观察；没有证据将其归因于 Netlify 或原始设备。 |

## 现网观察与仍待确认

Windows Google Chrome 157，在桌面 1366×900 和 390×844 触控视口分别实测。两种视口的室内／庭院底图均解码成功，主动刷新和关闭后再打开均成功。冷访室内从导航到解码约 11.38 s 和 56.33 s，来自单次运行，并受当时链路和同时执行任务影响。没有稳定复现用户描述的缺图。

尚未确认当时设备是否遇到 404/MIME 错误、失败解码、传输中断、旧浏览器兼容或内存压力。GitHub main 源码快照与现网来源的关联需由 Netlify 的部署详情补齐。后续证据需记录失败 URL、状态、MIME、Netlify 请求 ID、设备、浏览器、连接、缓存状态与出现频率。

[官方重写与 404 规则](https://docs.netlify.com/manage/routing/redirects/redirect-options/) · [修复报告](Asset_Loading_Fix_Report.md) · [真机清单](Cross_Device_Test_Checklist.md)
