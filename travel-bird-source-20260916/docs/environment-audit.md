# 环境审计：旅行小鸟

审计日期：2026-09-12，Asia/Shanghai。项目：`C:\Users\wenru\Documents\ChatGPT\旅行小鸟`。

本审计验证技能目录、开发运行时、浏览器工具与修改前页面。技能文件存在、工具可调用、工具实际调用成功是三个不同结论，本文分开记录。

## 技能与官方目录

以下为技能核对结果，所有既有技能均保留，没有覆盖或重装：

| 技能 | 本地位置 | 结论 |
| --- | --- | --- |
| skill-installer | `C:\Users\wenru\.codex\skills\.system\skill-installer\SKILL.md` | 系统技能可读；已使用其现成目录脚本 |
| imagegen | `C:\Users\wenru\.codex\skills\.system\imagegen\SKILL.md` | 文件存在；系统预置。图片生成与透明度验证由主任务另行记录 |
| openai-docs | `C:\Users\wenru\.codex\skills\.system\openai-docs\SKILL.md` | 系统版已读；另有 `C:\Users\wenru\.codex\skills\openai-docs\SKILL.md`，保留既有副本 |
| playwright-interactive | `C:\Users\wenru\.codex\skills\playwright-interactive\SKILL.md` | 已安装且已读 |
| playwright | `C:\Users\wenru\.codex\skills\playwright\SKILL.md` | 已安装且已读；CLI 路线所需 npx 未在本次 PATH 中提供 |

执行既有脚本直接从 `openai/skills` 的 `main` 分支 `skills/.curated` 目录获取当前目录，退出码 0：

```powershell
python 'C:\Users\wenru\.codex\skills\.system\skill-installer\scripts\list-skills.py' --format json
```

取得 39 项。原始 JSON 保存在 [official-skill-catalog-2026-09-12.json](official-skill-catalog-2026-09-12.json)。脚本的 `installed` 标记仅检查 `$CODEX_HOME/skills` 的直接子目录；不能用该标记判断 `.system` 中预置的 imagegen 是否存在。当前 curated 目录不包含 imagegen，但已通过本地文件与本次会话技能列表确认它是预置技能。

本次目录：aspnet-core、chatgpt-apps、cli-creator、cloudflare-deploy、define-goal、figma、figma-code-connect-components、figma-create-design-system-rules、figma-create-new-file、figma-generate-design、figma-generate-library、figma-implement-design、figma-use、gh-address-comments、gh-fix-ci、hatch-pet、jupyter-notebook、linear、migrate-to-codex、netlify-deploy、notion-knowledge-capture、notion-meeting-intelligence、notion-research-documentation、notion-spec-to-implementation、openai-docs、pdf、playwright、playwright-interactive、render-deploy、screenshot、security-best-practices、security-ownership-map、security-threat-model、sentry、speech、transcribe、vercel-deploy、winui-app、yeet。脚本对这 39 项均返回 `installed: true`。

指定的 imagegen、playwright-interactive、openai-docs 都已存在，因此没有需要安装的技能，也没有新增其他技能。

## 运行时与依赖

| 检查命令 | 实测输出或结论 |
| --- | --- |
| `node --version` | `v24.19.0` |
| `pnpm --version` | `11.19.0` |
| `git --version` | `git version 2.53.0.windows.3` |
| `Get-Command node,pnpm -All` | 复用 Codex 已有 bundled runtime 与 pnpm wrapper |
| `Get-Command npm,npx`、`where.exe npm`、`where.exe npx` | 本次 shell PATH 中未找到 npm/npx；没有因此重装 Node |
| 安装前 `node -e "import('playwright')..."` | `Cannot find package 'playwright'` |
| `pnpm add -D playwright` | 成功，新增 devDependency `playwright 1.63.0` 与 `playwright-core 1.63.0`；退出码 0 |
| `pnpm exec playwright --version` | `Version 1.63.0` |
| 安装后动态导入 | `playwright import ok`；退出码 0 |

Node 可执行文件：`C:\Users\wenru\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`。

pnpm wrapper：`C:\Users\wenru\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd`，实际调用 bundled Node 中的 `pnpm.mjs`。

项目原有 `pnpm-lock.yaml`、`pnpm-workspace.yaml`，因此沿用 pnpm。只新增 Playwright 开发依赖；既有包版本没有升级，原有 `dev` 脚本的 `0.0.0.0` 设置保留。pnpm 对依赖排序产生的无关变化已还原。未安装 Node/npm/Git，也未执行 pnpm 自身的升级提示。安装时 npm 注册表发生一次 `ECONNRESET` 与一次包下载 `UND_ERR_SOCKET`，自动重试后成功，总耗时 55.3 秒。

修改前 `git status --short` 已有 README、package.json、多个 src 文件的改动及 assets/docs/public 等未跟踪文件；没有回退、清理或提交这些变化。

## 浏览器与工具

本会话没有名称为 `js_repl` 的工具，但有实际可调用的持久化 `mcp__node_repl__js`。已调用它，确认 cwd 是本项目，并保留 browser/context/page/mobileContext/mobilePage 句柄。它与终端中的 Node 程序不是同一个接口。

`mcp__node_repl__js_add_node_module_dir` 已加入本项目 node_modules。初次直接 `import('playwright')` 在该 REPL 报模块导出不匹配，改用 `createRequire(nodeRepl.cwd + '/package.json')('playwright')` 明确加载本项目的 1.63.0 包后成功。没有修改用户全局 Codex 配置，也没有把技能存在当作工具成功调用的证据。

机器原有浏览器：

- Chrome：`C:\Program Files\Google\Chrome\Application\chrome.exe`，版本 `151.0.7922.138`。
- Edge：`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`，版本 `152.0.4191.66`。

Playwright 的 `channel: 'chrome'` 自动路径解析在当前 REPL 环境中出现 `undefined\Program Files...`。改为显式 `executablePath` 指向上述已安装 Chrome 后实际启动成功。修改前截图均由真实 Chrome 的 headless 模式生成，CSS 像素比例为 1；不是静态 HTML 伪造截图，也不是 UI 自动化插件的原生桌面控制。

Playwright 默认 Chromium 路径最初不存在。`pnpm exec playwright install chromium` 已成功完成，退出码 0；工具自动下载 Chromium v1243、对应 Headless Shell、FFmpeg v1011 和 Windows 依赖检查工具 Winldd v1007，没有改动机器既有 Chrome/Edge。

专用二进制：`C:\Users\wenru\AppData\Local\ms-playwright\chromium-1243\chrome-win64\chrome.exe`。`Test-Path` 返回 `True`，文件版本为 `153.0.8010.12`。随后在同一持久化 REPL 中实际执行 `await chromium.launch({headless: true})`，新建 context/page 并访问本地项目；返回浏览器版本 `153.0.8010.12`、标题 `旅行小鸟`、URL `http://127.0.0.1:5173/`。截图为 [Chromium 启动检查](../output/playwright/environment-chromium-smoke.png)，独立检查用的 context/browser 已显式关闭。该截图属于环境验证，不作为修改前基线。

可复用的实际 REPL 加载方式：

```javascript
var auditRequire = (await import('node:module')).createRequire(nodeRepl.cwd + '/package.json');
var { chromium } = auditRequire('playwright');
var browser = await chromium.launch({ headless: true });
var context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
var page = await context.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.screenshot({ path: nodeRepl.cwd + '/output/playwright/example.png', scale: 'css' });
```

以上最后一行是后续复用示例，实际已生成的截图文件名列于本文；没有宣称 `example.png` 已生成。

## 启动证据

在持久化 TTY 中运行：

```powershell
pnpm dev --host 127.0.0.1 --port 5173
```

Vite `7.3.6` 于 1108 ms 内就绪。本次覆盖 host 为 loopback，地址为 [http://127.0.0.1:5173/](http://127.0.0.1:5173/)。持久终端 session ID 为 `11272`，监听 `127.0.0.1:5173` 的进程 PID 为 `81168`。两者仅适用于本次会话。

`Invoke-WebRequest http://127.0.0.1:5173/` 实测 HTTP `200`；`Get-NetTCPConnection -LocalPort 5173 -State Listen` 确認该端口正在监听。浏览器页面标题为 `旅行小鸟`。

## 修改前浏览器 QA

本轮环境审计仅签署环境可运行与修改前状态可观察；重构后的玩法与布局由后续验证签署。

开始浏览器验证前，已在本文件写下以下 QA 清单：桌面 1440×1000 初始体验；手机 390×844 初始体验；探索首次欢迎界面与进入小屋；探索正常刷新与状态持久化；控制台、失败请求与视口边界检查。

实际通过可见按钮 `快速试玩` 进入小屋，随后正常刷新。两个独立 context 中刷新后都没有重新显示欢迎入口，页面标题仍正确。检查了 header 与 nav 的边界。

| 检查 | 桌面 | 手机 |
| --- | --- | --- |
| 视口 | 1440×1000 | 390×844 |
| 文档尺寸 | 1440×1000 | 390×865 |
| 横向滚动 | 无 | 无 |
| 纵向滚动 | 无 | 有，21 px |
| header 边界 | x505 y12，430×76 | x0 y0，390×76 |
| nav 边界 | x505 y919，430×69，底部988 | x0 y775，390×69，底部844 |
| 页面 JavaScript 异常 | 0 | 0 |
| 首次 `requestfailed` | 0 | 未记录该事件；HTTP≥400响应为0 |

截图人工查看确认主场景、鸟、热点与底部导航可见；手机文档仍有 21 px 纵向溢出，因此没有把修改前手机布局宣称为无溢出。桌面初开出现 1 条资源 404 控制台消息；首条未记录 URL。后续独立请求 `/favicon.ico` 返回 404；刷新捕获的 HTTP≥400 响应为空，不能据此把首条 404 确定归因为 favicon。手机没有捕获到控制台错误或 HTTP≥400 响应。

修改前原始 PNG 均于 2026-09-12 01:23（Asia/Shanghai）生成，并在主任务开始 src 编辑前报告：

- [桌面欢迎界面](../output/playwright/before-desktop-intro.png)
- [桌面小屋](../output/playwright/before-desktop-home.png)
- [手机欢迎界面](../output/playwright/before-mobile-intro.png)
- [手机小屋](../output/playwright/before-mobile-home.png)

小屋截图 SHA256：

```text
before-desktop-home.png 24F94B24A795D7FF5A82B235C47C37C913141C92DCC331D36F7809733138F3CB
before-mobile-home.png  97158392F34D1AD09A874B728CF088E3825166EB96DC5801B61D76C63348B4B1
```

## 范围

本审计未修改 src，未增加游戏后端、支付或 API 依赖，未部署站点。开发服务器与浏览器验证仅针对本地项目。环境变更为项目开发依赖、Playwright 浏览器缓存与本审计产物。最终 `git diff --check -- package.json pnpm-lock.yaml` 退出码 0，`pnpm list --depth 0` 确认原有依赖版本与新增 Playwright 1.63.0；此处未运行或宣称游戏逻辑测试，重构后的构建与功能测试由主任务负责。
