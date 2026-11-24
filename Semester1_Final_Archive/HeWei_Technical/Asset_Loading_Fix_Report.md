# Asset Loading Fix Report｜素材加载修复

何为 · 2026-11-24（UTC+8） · TB-ASSET-FIX

本地新包已完成针对性修改。用户报告的多设备偶发缺图仍为 **Open**，原始设备未收集到失败 URL／MIME／解码证据。

| 已实施 | 对应文件与验证方式 |
| --- | --- |
| 缺失静态资源真实返回 404 | [public/_redirects](../../public/_redirects) 在 SPA 回退前对 art、assets、fonts 使用非强制 404。存在文件照常服务；兜底指向 [public/404.html](../../public/404.html)。 [netlify.toml](../../netlify.toml) 继续定义构建，统一从发布目录读取重写。详见路由验证记录。 |
| 分离可见加载与后台预热 | [main.tsx](../../src/main.tsx) 延后到 load， [preload.ts](../../src/ui/preload.ts) 最多两个低优先级请求，先预热装包、跳跃等过渡；可见资源由 DOM 发起，移除冗余的室内预热项。失败记具体 URL，其他项目可以继续。 |
| 房间及庭院背景只重试一次 | [useSceneBackground.ts](../../src/ui/useSceneBackground.ts)、[RoomScene.tsx](../../src/ui/RoomScene.tsx)、[GardenScene.tsx](../../src/ui/GardenScene.tsx)。首次失败追加 ?retry=1；第二次失败使用既有提醒与热点禁用。Console 记录 URL 和次数。覆盖两场景的一次中断恢复和持续中断，见浏览器日志。 |
| WebKit 收获按钮命中 | 新增复测中，iPhone 13 WebKit 配置报告气泡内成熟作物图片拦截点击。 [gardenScene.css](../../src/gardenScene.css) 让该装饰图片忽略指针事件，保留原绘图位置、尺寸和收获逻辑。 |
| 保留画风和规则 | public/art 下 176 个文件在改动前后按相对路径及 SHA-256 比较，全部相同。无图像重编码、插画替换、热点坐标或游戏数值修改。 |

## 观测结果

2026-11-24 的单次 Windows Chrome 390×844 受控限速对比使用本地生产预览、冷缓存、350 ms 延迟、约 1 Mbps 下行和 0.5 Mbps 上行。改动前树屋背景从导航到解码约 126.93 s，素材防护加入后约 83.08 s。两次均成功解码并进入庭院。这组数据主要显示较大的延迟和并发预热优化方向，样本量为每版本 1 次，真实网络和手机性能尚待实测。预热改变请求时序，完整加载的素材总量仍较大。

31 项针对性测试通过；Chrome 和 Windows WebKit 对房间、庭院分别注入首次中断与连续中断，触发预期重试／提醒。收获按钮和完整闭环结果见 [技术验证](Technical_Verification_Final.md)。缓存响应样本为 must-revalidate，这一轮沿用现网默认策略；带哈希的入口和公开静态资源共享 assets/public 的部分路径，暂未对整个路径启用 immutable。未加入 Service Worker。

## 发布后验收

本地演练使用 CLI 和生产预览。原站仍需手工更新后确认图片、HTTP 状态与 MIME。跨设备结案条件是真机冷启、重开、刷新、弱网、完整前两趟流程及失败样本记录。下一次捕获失败时，依据具体 URL、Network 状态、Netlify Request ID 和 Console 次数区分传输、部署路径、CDN 与解码。

[调查记录](Asset_Loading_Investigation.md) · [跨设备清单](Cross_Device_Test_Checklist.md) · [部署操作](Upload_and_Deploy.md)
