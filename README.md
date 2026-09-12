# 彩色连珠 · Puzzle Ball

一个根据旧版 iOS 单机游戏体验重新制作的彩色连珠网页游戏。项目以经典 `9 × 9` 连珠规则为核心，同时支持手机、平板和桌面浏览器，并可作为 PWA 添加到主屏幕离线游玩。

## 强制项目要求

> **必须符合微信小程序开发规范。**

任何功能、依赖、接口或界面变更都必须同时检查微信小程序兼容性。不得引入小程序运行环境不支持的 DOM、`window`、浏览器 `localStorage`、动态代码执行或未经配置的网络请求。涉及用户个人信息或隐私接口时，必须先完成隐私保护指引、用途说明和授权流程，才能提交审核。完整约束与发布清单见 [`docs/WECHAT_MINIPROGRAM.md`](docs/WECHAT_MINIPROGRAM.md)。

> 本项目是怀旧复刻与个人学习项目，与原开发者 EidolonStudio 无隶属关系。仓库不包含原应用的程序、图片或音频文件；界面由 CSS 重新实现，音效由 Web Audio API 即时合成。

## 功能

- 经典 `9 × 9` 棋盘，所有格子严格等宽等高
- 点击彩球后移动到可到达的空格
- 横向、纵向或斜向连接至少 5 颗同色球即可消除
- 下一组颜色预告
- 本机自动存档与最高分记录
- 经典模式与独立的闪电模式
- 原创复古合成音效与可选触感反馈
- 响应式触控界面，支持键盘和鼠标
- PWA 离线缓存，可添加到手机主屏幕
- 原生微信小程序版本，与网页版本并行维护

## 技术栈

- React 19
- TypeScript
- Next.js / Vinext
- Vite
- CSS
- Web Audio API
- Service Worker / Web App Manifest

## 本地调试

### 环境要求

- Node.js `22.13.0` 或更高版本
- pnpm

推荐使用 Node.js 自带的 Corepack 启用 pnpm：

```bash
corepack enable
```

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

然后在浏览器打开：

```text
http://localhost:3000/
```

修改 `app/page.tsx` 或 `app/globals.css` 后，页面会自动刷新。

## 微信小程序调试

1. 安装并打开微信开发者工具。
2. 选择“导入项目”，目录选择本仓库根目录。
3. 在开发者工具中填写你的小程序 AppID；仓库中的 `touristappid` 仅供本地体验。
4. 确认小程序目录为 `miniprogram/`，然后点击“编译”。
5. 提交前完成预览、真机调试、代码质量检查和隐私接口检查。

小程序源码不依赖网页运行时，也不需要执行 `pnpm install`。详细流程见 [`docs/WECHAT_MINIPROGRAM.md`](docs/WECHAT_MINIPROGRAM.md)。

仓库开发时还可以运行基础静态检查：

```bash
pnpm check:miniprogram
```

## 构建与本地运行

生成生产构建：

```bash
pnpm build
```

运行生产版本：

```bash
pnpm start
```

## 项目结构

```text
app/
  globals.css          游戏界面、棋盘和彩球样式
  layout.tsx           页面信息与移动端配置
  page.tsx             游戏规则、状态和交互逻辑
public/
  manifest.webmanifest PWA 配置
  sw.js                 离线缓存
miniprogram/
  app.js / app.json     小程序入口和全局配置
  pages/index/          小程序游戏页面
  utils/audio.js        小程序合成音效
docs/
  WECHAT_MINIPROGRAM.md 小程序强制规范与发布清单
.openai/
  hosting.json          Sites 发布配置
project.config.json     微信开发者工具公共配置
```

## 游戏数据

游戏进度、设置和最高分使用浏览器 `localStorage` 保存在当前设备，不会上传到服务器。清理浏览器网站数据会同时清除存档。

## 安装到设备

- **iPhone / iPad：** 使用 Safari 打开游戏，点击“分享”→“添加到主屏幕”。
- **Android / 桌面浏览器：** 打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。

## 说明

当前仓库尚未附加开源许可证。在添加许可证之前，代码默认保留全部权利；如需开放他人使用或修改，建议后续选择合适的许可证。
