# 彩色小连珠

彩色小连珠是一款以 `9 × 9` 棋盘为核心的连珠益智游戏。项目同时提供网页/PWA 版和原生微信小程序版，并预留了可独立部署的自有服务器后端。

## 项目状态

| 部分 | 目录 | 当前状态 |
| --- | --- | --- |
| 网页/PWA | `app/` + `public/` | 可本地调试、构建和安装到主屏幕 |
| 微信小程序前端 | `miniprogram/frontend/` | 原生 WXML/WXSS/JavaScript，可导入微信开发者工具 |
| 微信小程序后端 | `miniprogram/backend/` | 独立 Node.js 基础服务，目前只提供健康检查，未接入游戏业务 |

## 功能

- `9 × 9` 等分棋盘，格子视觉尺寸与触控区域一致
- 点选彩球后，可移动到上下左右路径可达的空格
- 横向、纵向或斜向连成至少 5 颗同色球即可消除并得分
- 下一组颜色预告与本机自动存档
- 经典模式与独立的闪电模式
- 高对比度彩球、合成音效与可选触感反馈
- 手机、平板和桌面端响应式交互
- 网页版支持 PWA 离线缓存

## 强制项目要求

> **必须符合微信小程序开发规范。**

任何小程序端功能、依赖、接口或界面变更，都必须同时检查基础库兼容性、代码包边界、服务器合法域名、隐私接口声明和真机表现。详细要求见 [`docs/WECHAT_MINIPROGRAM.md`](docs/WECHAT_MINIPROGRAM.md)。

## 环境要求

- Node.js `22.13.0` 或更高版本
- pnpm
- 微信开发者工具（调试小程序时）

可使用 Node.js 自带的 Corepack 启用 pnpm：

```bash
corepack enable
pnpm install
```

## 网页版调试

```bash
pnpm dev
```

浏览器打开 `http://localhost:3000/`。修改 `app/page.tsx` 或 `app/globals.css` 后，开发服务器会自动刷新。

生成生产构建：

```bash
pnpm build
```

## 微信小程序前端调试

1. 安装并打开微信开发者工具。
2. 选择“导入项目”，项目目录选择本仓库根目录。
3. 在开发者工具中填写真实小程序 AppID；仓库中的 `touristappid` 仅供本地体验。
4. 确认小程序根目录为 `miniprogram/frontend/`。
5. 编译后完成预览、iOS/Android 真机测试和隐私接口检查。

小程序前端不依赖网页运行时，也不需要执行 `pnpm install`。

## 独立后端调试

```bash
pnpm dev:backend
```

默认地址为 `http://127.0.0.1:8788`，健康检查接口为 `GET /health`。当前小程序前端尚未调用该后端。增加正式 API 后，后端必须部署到 HTTPS 域名，并在微信公众平台配置为 request 合法域名。

后端详细说明见 [`miniprogram/backend/README.md`](miniprogram/backend/README.md)。

## 质量检查

```bash
pnpm check:structure
pnpm lint
pnpm build
pnpm check:miniprogram
pnpm check:backend
```

`pnpm check:all` 会按顺序执行上述全部检查。

## 项目结构

```text
app/                              网页界面、状态与游戏逻辑
public/                           PWA 配置与离线缓存
miniprogram/
  frontend/                       微信小程序前端打包根目录
    app.js / app.json / app.wxss  小程序入口与全局配置
    pages/index/                  游戏主页面
    utils/audio.js                小程序合成音效
  backend/                        独立部署的自有服务器后端
    src/server.mjs                HTTP 服务入口
    test/health.test.mjs          后端健康检查测试
docs/WECHAT_MINIPROGRAM.md        小程序开发与发布规范
scripts/                          项目结构与小程序静态检查
.openai/hosting.json              网页版 Sites 发布配置
project.config.json               微信开发者工具公共配置
```

## 数据与部署边界

- 网页版使用浏览器 `localStorage` 保存进度、设置和最高分。
- 小程序版使用 `wx.getStorageSync` / `wx.setStorageSync` 保存同类数据。
- 两个客户端的存档当前不会上传或互相同步。
- 网页版、小程序前端和后端必须分别构建与部署。
- 真实密钥、AppSecret、数据库凭据和上传私钥不得提交到仓库。

## 安装到设备

- **iPhone / iPad：** 使用 Safari 打开网页版，点击“分享”→“添加到主屏幕”。
- **Android / 桌面浏览器：** 打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。
- **微信：** 小程序审核发布后，通过搜索、扫码或分享卡片进入。

## 许可证

当前仓库尚未附加开源许可证。在添加许可证之前，代码默认保留全部权利。
