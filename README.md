# 彩色连珠 · Puzzle Ball

一个根据旧版 iOS 单机游戏体验重新制作的彩色连珠网页游戏。项目以经典 `9 × 9` 连珠规则为核心，同时支持手机、平板和桌面浏览器，并可作为 PWA 添加到主屏幕离线游玩。

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
.openai/
  hosting.json          Sites 发布配置
```

## 游戏数据

游戏进度、设置和最高分使用浏览器 `localStorage` 保存在当前设备，不会上传到服务器。清理浏览器网站数据会同时清除存档。

## 安装到设备

- **iPhone / iPad：** 使用 Safari 打开游戏，点击“分享”→“添加到主屏幕”。
- **Android / 桌面浏览器：** 打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。

## 说明

当前仓库尚未附加开源许可证。在添加许可证之前，代码默认保留全部权利；如需开放他人使用或修改，建议后续选择合适的许可证。

