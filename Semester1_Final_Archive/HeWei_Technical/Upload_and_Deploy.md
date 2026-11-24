# Upload and Deploy｜交付操作

2026-11-24 · 何为 · 归档与线上更新可分开执行

## GitHub

- 证据归档放在现有的 Semester1_Final_Archive/HeWei_Technical/。直接复制同名目录下的 Markdown 与 verification。保留占位文件、周 Evidence 和其他角色的目录。
- 如需同步本次可构建源码，在 GitHub main 的最新 checkout 新建工作分支。将 output/technical-handoff-20261124 中的源码 ZIP 解压到仓库根目录，保持相对路径。该 ZIP 以 2026-11-24 读到的 GitHub main 为比较依据，包含需要同步的 src、public、相关构建配置、原有进度记录和技术证据。里面也有交接时已有、现网正在运行的源码与美术更新，建议在提交差异中一并审核。
- 在仓库根运行 pnpm install --frozen-lockfile、pnpm build；确认文件列表和构建通过后按团队流程手工提交。检查远端在本轮之后是否有团队改动，逐文件合并。提交后把实际 GitHub SHA 交给李知桐登记。dist、node_modules、工作区旧草稿及历史素材删除操作无需加入。
- 本次改动集中在 main.tsx、preload.ts、useSceneBackground.ts、RoomScene.tsx、GardenScene.tsx、gardenScene.css、两份回归测试、public/_redirects、public/404.html、netlify.toml。归档路径与各文件用途见 [Evidence Index](Technical_Evidence_Index.md)。

## 更新原 Netlify 站点

1. 登录 Netlify，选择现有站点 **tranquil-lokum-a62556**，打开 **Deploys**。把本地 **dist** 目录拖到该站点的手工部署区。若拿到部署 ZIP，先解压后拖入其中的 dist。目录第一层应能直接看到 index.html、404.html、_redirects、assets、art、fonts。
2. 等待发布完成，确认域名仍为原生产域。打开部署详情，记录发布的 Deploy ID、时间、URL 和凭证截图。检查新首页的 JS、CSS 文件名和 [Technical Verification](Technical_Verification_Final.md) 一致。
3. 按 [Cross-device Checklist](Cross_Device_Test_Checklist.md) 检查两个场景，再检查缺失资源 404、SPA 回退及真机。确认新版存档需用相同域名与原浏览器，清站点数据前先导出 JSON。
4. 团队日后如改用 Git 连续部署，根目录为空（仓库根）、Build command 为 npm run build、Publish directory 为 dist。Vite 会将 public/_redirects 复制到发布根目录。手工上传直接使用已构建目录。 [Netlify 手工部署说明](https://docs.netlify.com/deploy/create-deploys/)

如发布后发现明显新问题，在原项目 Deploys 保留记录并按团队流程恢复上一可用生产部署。本次没有提交、推送或部署。
