import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

const requiredFiles = [
  'app/page.tsx',
  'app/layout.tsx',
  'app/globals.css',
  'public/manifest.webmanifest',
  'public/sw.js',
  '.openai/hosting.json',
  'wechat-game/game.js',
  'wechat-game/game.json',
  'wechat-game/project.config.json',
  'wechat-game/src/game-app.js',
  'wechat-game/shared/game-core.js',
  'miniprogram/backend/package.json',
  'miniprogram/backend/src/server.mjs',
  'miniprogram/backend/test/health.test.mjs',
  'README.md',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`缺少必需文件：${file}`);
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  } catch (error) {
    errors.push(`${relativePath} 不是合法 JSON：${error.message}`);
    return null;
  }
}

const projectConfig = readJson('wechat-game/project.config.json');
if (projectConfig?.compileType !== 'game') errors.push('微信端必须配置为微信小游戏 compileType: game');

const manifest = readJson('public/manifest.webmanifest');
if (manifest?.name !== '彩色小连珠') errors.push('网页 PWA 名称未统一为“彩色小连珠”');

const readmePath = path.join(root, 'README.md');
if (fs.existsSync(readmePath)) {
  const readme = fs.readFileSync(readmePath, 'utf8');
  for (const [pattern, label] of [
    [/旧版/i, '旧版'],
    [/复刻/i, '复刻'],
    [/改编/i, '改编'],
    [/Eidolon/i, 'Eidolon'],
  ]) {
    if (pattern.test(readme)) errors.push(`README 仍包含不再适用的来源描述：${label}`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log('项目结构检查通过：网页版、微信小游戏和独立后端目录均已完整。');
