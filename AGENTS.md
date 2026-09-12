# 彩色小连珠：Agent 交接说明

本文件是后续开发 agent 的首要仓库说明。开始工作前，先阅读本文件、`README.md` 和 `docs/WECHAT_MINIGAME.md`，再检查 `git status`；不得覆盖或顺手提交用户尚未提交的本地改动。

## 项目目标与当前边界

- 产品名称统一为“彩色小连珠”。这是独立的新游戏，不要在产品文案或 README 中加入旧游戏、复刻、改编或原作者来源等描述。
- 仓库同时维护网页/PWA、微信小游戏和一个独立后端骨架。
- 当前后端只有 `GET /health`，游戏没有登录、云存档、联网排行榜、广告、支付、云开发或业务 API 调用。
- 必须符合微信小程序开发规范；微信游戏端必须符合微信小游戏开发规范。
- 未经用户明确要求，不要执行提审、正式发布、修改线上访问权限或引入新的外部服务。

## 架构与唯一源码

| 范围 | 目录/文件 | 责任 |
| --- | --- | --- |
| 网页/PWA | `app/`、`public/` | React 界面、浏览器存储、Web Audio、键盘/触控和 PWA |
| 微信小游戏 | `wechat-game/` | 可独立导入、预览和上传的完整 Canvas 2D 游戏包 |
| 共享玩法规则 | `wechat-game/shared/game-core.js` | 棋盘、寻路、连线、生成球和计分的唯一实现 |
| 共享规则类型 | `wechat-game/shared/game-core.d.ts` | 网页 TypeScript 使用的声明；必须与 JS 导出保持一致 |
| 共享音效数据 | `wechat-game/shared/audio-cues.js` | 网页和小游戏共同使用的合成音符定义 |
| 小游戏视觉配置 | `wechat-game/shared/design-tokens.js` | 小游戏 Canvas 颜色与彩球渐变 |
| 微信平台适配 | `wechat-game/src/` | Canvas 绘制、触摸命中、微信存储、声音和震动 |
| 独立后端 | `miniprogram/backend/` | 单独部署的 Node.js 服务，不进入小游戏代码包 |

重要约束：网页可以向内引用 `wechat-game/shared/`，但小游戏运行时代码的任何引用都不得越出 `wechat-game/`。不要在 `app/` 或其他目录复制一份游戏规则。

## 修改位置速查

- 改移动、寻路、消除、随机生成、初始棋盘或计分：修改 `wechat-game/shared/game-core.js`，同步类型声明和规则测试。
- 改两端音效旋律：修改 `wechat-game/shared/audio-cues.js`；改某个平台的播放方式才修改对应平台适配。
- 改网页版界面：修改 `app/page.tsx` 和 `app/globals.css`，不要复制共享算法。
- 改小游戏界面：修改 `wechat-game/src/game-app.js` 和 `design-tokens.js`。
- 改后端 API：修改 `miniprogram/backend/`，同时补测试、HTTPS/合法域名说明和隐私安全评估。
- 改小游戏配置：只以 `wechat-game/project.config.json` 和 `wechat-game/game.json` 为准。

棋盘必须始终是严格 `9 × 9` 等分布局。Canvas 绘制和触控命中必须复用同一个 `cellSize = boardSize / 9`，不得分别取整。彩球颜色必须保持高辨识度，尤其不能让紫色与粉色、黄色与绿色、红色与橙色难以区分。

## 微信开发者工具

- 导入目录必须是仓库内的 `wechat-game/`，项目类型必须是“小游戏”。
- 不要导入仓库根目录，也不要寻找已经移除的 `miniprogram/frontend/`。
- 小游戏入口是 `wechat-game/game.js`，全局配置是 `wechat-game/game.json`。
- `wechat-game/project.config.json` 中的 AppID 是小游戏 AppID；AppSecret 和上传私钥绝不能提交。
- 若根目录出现另一个 `project.config.json`，它不是当前架构的权威配置，通常是错误导入根目录后生成的本地文件。不要在未确认架构变更的情况下提交或依赖它。
- 设置体验版时，小游戏没有页面路由，“页面路径”保持空白即可。
- 正式提审前按 `docs/WECHAT_MINIGAME.md` 完成预览、体验版、iOS/Android 真机、隐私接口、合法域名和素材检查。

## 本地命令

环境要求：Node.js `>=22.13.0`、pnpm `11.19.0`。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
pnpm dev:backend
pnpm check:all
```

- 网页开发地址：`http://localhost:3000/`
- 后端开发地址：`http://127.0.0.1:8788/health`
- 微信小游戏自身不需要 `pnpm install`；直接由微信开发者工具加载 `wechat-game/`。

`pnpm check:all` 必须通过，包含：目录检查、共享规则测试、小游戏 Canvas 冒烟测试、ESLint、网页生产构建、小游戏包边界检查和后端测试。

## 每次改动的最低验收标准

1. 先确认改动属于网页、共享核心、小游戏平台层还是后端，避免跨层复制代码。
2. 修改前检查工作树并保留所有非本任务改动。
3. 修改共享规则时至少添加或更新一个 `tests/game-core.test.mjs` 用例。
4. 修改小游戏时运行 `pnpm test:wechat-game` 和 `pnpm check:wechat-game`。
5. 修改网页时运行 `pnpm lint`、`pnpm build`，并在浏览器验证主菜单、开始游戏、81 个等大格和一次合法移动。
6. 修改后端时运行 `pnpm check:backend`，且不信任客户端上报的分数或身份。
7. 合并前运行 `pnpm check:all`；CI 定义位于 `.github/workflows/ci.yml`。
8. 涉及微信发布时还必须手动完成开发者工具编译、预览和真机验证；自动化静态检查不能替代真机验收。

## 数据、网络和安全

- 网页使用 `localStorage`，小游戏使用微信本地存储；当前存档不跨端同步。
- 后端与两个客户端独立部署。后端源码和环境变量不会随小游戏上传。
- 新增 `wx.request` 前，必须使用 HTTPS 服务、配置微信公众平台合法域名，并实现超时、失败和弱网处理。
- 新增登录、排行榜、广告、支付、分享、统计或用户内容时，必须重新评估权限、隐私、内容审核、类目和安全规则。
- 禁止提交 `.env`、AppSecret、上传私钥、数据库密码、访问令牌或用户数据。
- 禁止远程下载并执行 JavaScript，禁止 `eval` 和 `new Function`。

## 当前已知待办

- `specs/wechat-game-shared-core/tasks.md` 的第 6 项仍是人工发布验收：需要在微信开发者工具完成编译、预览，以及 iOS/Android 真机验证后才能勾选。
- 自有服务器后端尚未接入任何游戏业务；不要把健康检查骨架描述成已完成的线上后端。
- 微信小游戏体验版、审核版和正式版属于不同发布状态；上传成功不代表已经审核或正式上线。

