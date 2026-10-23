# 旅行小鸟 / TRAVEL_BIRD

《旅行小鸟》是一款原创放置游戏手机网页体验版。

玩家可以种植作物、制作食物、为小鸟准备行囊，并让小鸟外出旅行。小鸟旅行归来后会带回明信片、种子、食谱和新的目的地。

## 游戏源码

当前游戏源码位于：

[`travel-bird-source-20260916`](./travel-bird-source-20260916)

## 本地运行

进入游戏源码目录：

```bash
cd travel-bird-source-20260916
pnpm install
pnpm dev -- --port 5173
```

然后在浏览器打开：

```text
http://127.0.0.1:5173/
```

## 构建项目

```bash
cd travel-bird-source-20260916
pnpm build
```

构建结果保存在 `dist` 文件夹中。

## 项目内容

- `travel-bird-source-20260916`：旅行小鸟游戏源码
- `Week2`：第二周研究与设计材料
- `Week 4 Evidence`：第四周项目证据
- `Week 5 Evidence`：第五周项目证据
- `EV-W4-001_Deployment`：部署记录和截图

## 技术栈

- React
- TypeScript
- Vite
- Vitest
- Netlify
