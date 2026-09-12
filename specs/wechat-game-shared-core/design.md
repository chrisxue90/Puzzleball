# 技术设计

## 单一源码结构

`wechat-game/shared/game-core.js` 是棋盘、寻路、连线、生成球和计分的唯一规则来源。文件使用不依赖 DOM、React 或 `wx` 的纯 JavaScript，因此既能被微信小游戏直接打包，也能被网页版构建工具导入。

## 平台适配

- 网页版负责 React 状态、DOM、浏览器存储、Web Audio 与键盘操作。
- 微信小游戏负责 Canvas 2D 绘制、触摸命中、微信本地存储、音频与震动。
- 平台适配层不得复制共享核心内的算法。
- 后端保留在 `miniprogram/backend/`，与小游戏包独立。

## 发布安全

- 微信开发者工具只导入 `wechat-game/`。
- 小游戏运行时依赖不得越出该目录。
- `scripts/check-wechat-game.mjs` 校验入口、JSON、引用边界、禁止 API 和核心复用。
- GitHub Actions 对每次提交执行完整检查。

## 验证

- 固定随机种子验证初始棋盘可重复。
- 验证路径、四个连线方向、直接消除、生成球和计分。
- 验证网页类型检查、lint 和生产构建。
- 真实上传前仍需在微信开发者工具完成编译、预览和 iOS/Android 真机测试。
