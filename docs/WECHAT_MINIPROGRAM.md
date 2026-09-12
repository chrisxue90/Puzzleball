# 微信小程序开发与发布规范

## 不可违反的项目要求

> **必须符合微信小程序开发规范。**

此要求属于项目硬性验收条件，优先级高于新增玩法、视觉效果和第三方依赖。任何改动只要导致微信开发者工具无法正常编译、使用未声明的隐私接口、违反平台内容规则或无法通过审核，就不能合并或发布。

## 多端架构

- `app/` 与 `public/`：网页/PWA 版本。
- `miniprogram/frontend/`：原生微信小程序前端，也是微信开发者工具的打包根目录。
- `miniprogram/backend/`：独立部署的自有服务器后端，不进入小程序代码包。
- `project.config.json`：微信开发者工具可共享的项目配置。
- `project.private.config.json`：开发者个人配置，必须保持在 `.gitignore` 中。

小程序前端使用原生 WXML、WXSS 和 JavaScript，不加载网页版本，也不依赖 DOM、`window`、浏览器 `localStorage` 或 Service Worker。网页与小程序可以共享玩法定义，但运行时接口必须分别适配。

## 当前合规基线

当前“彩色小连珠”小程序实现：

- 仅包含一个主包页面，不使用分包、插件、云函数或第三方 SDK。
- 不发送网络请求，不依赖业务域名，不下载远程代码或资源。
- 不要求登录，不收集昵称、头像、手机号、位置、相册、剪贴板等个人信息。
- 游戏进度、设置与最高分仅通过 `wx.setStorageSync` 保存在用户本机。
- 音效通过 `wx.createWebAudioContext` 本地合成；接口不可用时静默降级。
- 触感反馈仅在用户开启设置后调用 `wx.vibrateShort`。
- 不包含广告、支付、分享诱导或用户生成内容。
- 不使用 `eval`、`new Function` 或任何动态执行代码。
- 已创建独立后端目录，但小程序前端尚未调用后端业务 API。

如果后续增加登录、广告、支付、联网排行榜、分享、分析统计或用户内容，上述合规结论立即失效，必须重新进行权限、隐私、域名、安全和内容审核。

## 开发规范

### 目录与配置

1. 全局入口必须保留 `app.js`、`app.json` 和 `app.wxss`。
2. 页面必须同时具备 `.js`、`.json`、`.wxml` 和 `.wxss` 文件。
3. 所有 JSON 文件必须是合法 JSON，不得加入注释、尾随逗号或 JavaScript 表达式。
4. 页面路径必须在 `app.json` 的 `pages` 中声明。
5. `project.config.json` 的 `miniprogramRoot` 必须指向 `miniprogram/frontend/`，确保后端代码不进入小程序主包。
6. 正式 AppID 应通过开发者工具个人配置管理；不得把密钥、会话、上传凭据或其他秘密提交到仓库。

### API 与运行环境

1. 小程序代码只能使用微信基础库支持的 API；新增 API 前必须确认最低基础库版本与降级策略。
2. 本地存储使用 `wx.getStorageSync` / `wx.setStorageSync`，不得使用浏览器 `localStorage`。
3. 不得引用 DOM、BOM、Service Worker 或只能在普通网页中运行的库。
4. 网络请求只能访问小程序后台配置过的 HTTPS 合法域名，并且必须处理超时、失败和弱网状态。`localhost` 和未配置的 IP 地址不能用于正式发布。
5. AppSecret、数据库密码、签名私钥和管理凭据只能保存在后端运行环境，不得出现在小程序代码包中。
6. 禁止远程下载并执行 JavaScript，禁止 `eval` 和 `new Function`。
7. 只有用户主动操作后才能播放音频；音频与震动失败不得阻塞核心玩法。

### 隐私与权限

1. 遵循最小权限原则，不为“将来可能使用”而申请权限。
2. 处理用户个人信息前，必须在小程序管理后台填写与实际代码完全一致的用户隐私保护指引。
3. 隐私接口的调用目的、时机、授权文案和拒绝后的降级路径必须明确。
4. 不得在日志、缓存、错误信息或仓库中保存个人信息和秘密凭据。
5. 每次提审都要重新核对代码实际调用的隐私接口与提审版本隐私指引是否一致。

### 体验与可访问性

1. 棋盘必须保持严格的 `9 × 9` 等分布局，不能出现大小不一致或触控区域错位。
2. 彩球颜色必须保持高对比度，尤其要区分深蓝紫与亮玫红、黄色与绿色、红色与橙色。
3. 按钮触控区域、文字字号和状态反馈需适合常见手机尺寸。
4. 核心玩法在关闭声音、关闭震动或断网时必须仍可使用。
5. 需要在 iOS 与 Android 微信客户端上进行真机验证。

## 本地调试

1. 安装最新版稳定版微信开发者工具。
2. 选择“导入项目”，项目目录选择仓库根目录。
3. 使用真实小程序 AppID；仅本地体验时可暂时使用配置中的 `touristappid`。
4. 检查项目详情中的小程序目录为 `miniprogram/frontend/`。
5. 点击“编译”，确认控制台没有错误或未处理的警告。
6. 分别试玩新游戏、继续游戏、寻路、连五消除、最高分、声音、震动与闪电模式。
7. 使用“预览”和“真机调试”在至少一台 iOS 与一台 Android 设备上测试。

## 提审前检查清单

- [ ] 使用已认证主体的小程序 AppID，并选择与实际游戏内容一致的服务类目。
- [ ] 微信开发者工具可以从干净仓库直接导入和编译。
- [ ] 所有页面路径、JSON 配置、WXML 和 WXSS 均通过开发者工具检查。
- [ ] 主包体积、资源体积和基础库版本满足提交页面显示的当前平台限制。
- [ ] 没有未配置的网络域名、HTTP 明文请求或远程动态代码。
- [ ] 实际隐私接口调用与用户隐私保护指引完全一致。
- [ ] 小程序名称、图标、简介、截图和类目已准备完成，且拥有相应使用权。
- [ ] 不包含测试账号、密钥、调试入口、违法内容、虚假功能或诱导行为。
- [ ] iOS、Android、不同屏幕尺寸、离线和低性能设备均完成核心流程测试。
- [ ] 已完成开发者工具的代码质量检查、预览、真机调试与体验版验收。
- [ ] 上传版本号和更新说明清晰，再提交平台审核；审核通过后由管理员发布。

## 官方依据

- [微信小程序：开始与代码构成](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/getstart.html)
- [微信开发者工具：项目配置文件](https://developers.weixin.qq.com/miniprogram/dev/devtools/projectconfig.html)
- [微信小程序：全局配置](https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/app.html)
- [微信小程序：分包加载](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages/basic.html)
- [微信小程序：用户隐私保护指引](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/)
- [微信小程序：本地存储 API](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorageSync.html)
- [微信小程序：WebAudioContext](https://developers.weixin.qq.com/miniprogram/dev/api/media/audio/wx.createWebAudioContext.html)
- [微信小程序：振动 API](https://developers.weixin.qq.com/miniprogram/dev/api/device/vibrate/wx.vibrateShort.html)

平台规则会更新。每次提审前必须重新查阅微信官方文档与开发者工具中的当前限制，不能只依赖本文中的历史结论。
