# 本地字体资源

## Delius Regular

- 文件：`delius-regular.ttf`，77,488 字节。
- 用途：为英文 UI 提供圆头、清楚、不连笔的手写字形，与游戏的中文手写风格协调。此目录仅保存字体资源；实际字体应用由界面样式决定。
- 设计者：Natalia Raices。字体内部名称为 `Delius` / `Regular`，PostScript 名称为 `Delius-Regular`，版本为 `1.001`，常规字重为 400。
- 资源取得日期：2026-11-06。
- 原版来源：[Google Fonts — Delius-Regular.ttf](https://raw.githubusercontent.com/google/fonts/main/ofl/delius/Delius-Regular.ttf)。下载后只调整本地文件名，未修改、转码或子集化字体内容。
- 原版 TTF 的 SHA-256：`c0fd66626926b637d64eb13de013b3318dbd72cdf92c33e41a29a03828bab6f6`。

来源说明与追溯：

- [Google Fonts 字体说明](https://raw.githubusercontent.com/google/fonts/main/ofl/delius/DESCRIPTION.en_us.html)描述了圆头记号笔形成的笔画及手写动作特征。
- [Google Fonts 元数据](https://raw.githubusercontent.com/google/fonts/main/ofl/delius/METADATA.pb)标注分类为 `HANDWRITING`、Latin 字符集、常规字重 400，并指向[设计源仓库](https://github.com/googlefonts/delius)，所记录的设计源提交为 `ed462df7139cca792e2a3df0111c5f43dd2bafce`。该提交号是元数据记录的设计源版本，不是 Google Fonts 下载地址的提交号；下载内容以以上哈希为准。

### 许可

随字体分发未经修改的 `delius-OFL.txt`，对应[官方 OFL.txt](https://raw.githubusercontent.com/google/fonts/main/ofl/delius/OFL.txt)，采用 SIL Open Font License 1.1。

可在本游戏中使用、嵌入和随软件分发；分发时保留版权与许可文件，不得单独售卖字体。许可列出的保留字体名称为 `Delia`、`Delia Unicase`、`Delius`、`Delius Unicase`，修改字体后的命名须遵守该许可。完整条件以 `delius-OFL.txt` 为准。

许可原文文件的 SHA-256：`d8eb8611f8c98d20cbf18a28425652d6022dc2a5cca15026b920f1f2bc92a612`。

### 字形验证

验证于 2026-11-06，未安装额外依赖、未改写 TTF。当前系统 Python 和应用附带 Python 均未提供 `fontTools`，因此使用 Python 标准库只读解析 TrueType/sfnt 表目录、`head`、`maxp`、`name`、Unicode `cmap`，并使用已有 Pillow/FreeType 实际载入字体。

- 解析通过：298 个字形，267 个 Unicode 映射，Unicode `cmap` 格式 4；关键表及字形索引有效。
- 可正常载入 `Delius / Regular`，并测量包含英文、数字和弯引号的示例文本。
- 完整覆盖 ASCII U+0020–U+007E，包括 A–Z、a–z、0–9 与基本标点。
- 覆盖弯单引号 `‘ ’`（U+2018/U+2019）、弯双引号 `“ ”`（U+201C/U+201D）、短横线与长横线 `– —`、省略号 `…`、项目符号 `•`、间隔点 `·`、乘号 `×`、右箭头 `→`。
- 对 `src/i18n/dictionary.ts` 的 358 个英文翻译值进行码点核对：74 个不同的非空白字符全部存在，没有缺失。动态鸟名与日期等运行时文本不在此静态核对范围；中文与其他非 Latin 字符继续由中文字体或后备字体负责。

## 已有字体

本次新增 Delius 资源时保留目录内已有的 `xiaolai-game.woff2`、`xiaolai-OFL.txt`、`nunito-latin.woff2`、`nunito-latin-italic.woff2`、`nunito-OFL.txt`，未修改这些文件。各字体的许可由其对应的许可文件说明。
