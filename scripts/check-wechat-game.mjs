import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const gameRoot = path.join(projectRoot, 'wechat-game');
const backendRoot = path.join(projectRoot, 'miniprogram', 'backend');
const errors = [];

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(target) : [target];
  });
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${path.relative(projectRoot, file)} 不是合法 JSON：${error.message}`);
    return null;
  }
}

for (const relativePath of [
  'wechat-game/game.js',
  'wechat-game/game.json',
  'wechat-game/project.config.json',
  'wechat-game/src/game-app.js',
  'wechat-game/src/audio.js',
  'wechat-game/shared/game-core.js',
  'wechat-game/shared/audio-cues.js',
  'wechat-game/shared/design-tokens.js',
]) {
  if (!fs.existsSync(path.join(projectRoot, relativePath))) {
    errors.push(`缺少微信小游戏必需文件：${relativePath}`);
  }
}

if (!fs.existsSync(backendRoot)) errors.push('缺少 miniprogram/backend/ 独立后端目录');

const projectConfig = readJson(path.join(gameRoot, 'project.config.json'));
if (projectConfig?.compileType !== 'game') {
  errors.push('wechat-game/project.config.json 的 compileType 必须为 game');
}
if (!projectConfig?.appid || projectConfig.appid === 'touristappid') {
  errors.push('wechat-game/project.config.json 必须配置真实的微信小游戏 AppID');
}

const gameConfig = readJson(path.join(gameRoot, 'game.json'));
if (gameConfig?.deviceOrientation !== 'portrait') {
  errors.push('wechat-game/game.json 必须声明 portrait 竖屏方向');
}

const files = listFiles(gameRoot);
files.filter((file) => file.endsWith('.json')).forEach(readJson);

const forbidden = [
  [/\bdocument\b/, 'DOM document'],
  [/\blocalStorage\b/, '浏览器 localStorage'],
  [/\beval\s*\(/, 'eval'],
  [/new\s+Function\b/, '动态 Function'],
  [/\bwindow\s*[.[]/, '浏览器 window'],
  [/https?:\/\//, '未经审查的网络地址'],
];

const importPattern = /(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g;
for (const file of files.filter((entry) => entry.endsWith('.js'))) {
  const source = fs.readFileSync(file, 'utf8');
  const relativeFile = path.relative(projectRoot, file);

  for (const [pattern, label] of forbidden) {
    if (pattern.test(source)) errors.push(`${relativeFile} 使用了禁止项：${label}`);
  }

  for (const match of source.matchAll(importPattern)) {
    const request = match[1];
    if (!request.startsWith('.')) {
      errors.push(`${relativeFile} 引用了未打包的外部模块：${request}`);
      continue;
    }
    const resolved = path.resolve(path.dirname(file), request);
    const insideGameRoot = resolved === gameRoot || resolved.startsWith(`${gameRoot}${path.sep}`);
    if (!insideGameRoot) {
      errors.push(`${relativeFile} 的运行时引用越出微信小游戏目录：${request}`);
    } else if (!fs.existsSync(resolved)) {
      errors.push(`${relativeFile} 引用了不存在的文件：${request}`);
    }
  }
}

const webPage = fs.readFileSync(path.join(projectRoot, 'app', 'page.tsx'), 'utf8');
if (!webPage.includes("wechat-game/shared/game-core.js")) {
  errors.push('网页版必须直接引用 wechat-game/shared/game-core.js，禁止复制玩法算法');
}

const requirements = fs.readFileSync(path.join(projectRoot, 'docs', 'WECHAT_MINIGAME.md'), 'utf8');
if (!requirements.includes('必须符合微信小程序开发规范')) {
  errors.push('项目文档缺少“必须符合微信小程序开发规范”强制要求');
}
if (!requirements.includes('必须符合微信小游戏开发规范')) {
  errors.push('项目文档缺少“必须符合微信小游戏开发规范”强制要求');
}

const packageBytes = files.reduce((total, file) => total + fs.statSync(file).size, 0);
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`微信小游戏静态检查通过：${files.length} 个文件，${packageBytes} 字节。`);
console.log('wechat-game/ 可独立导入，全部运行时引用均位于上传目录内。');
console.log('正式发布前仍需使用微信开发者工具完成编译、预览、真机和隐私接口检查。');
