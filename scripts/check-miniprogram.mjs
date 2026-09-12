import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const miniRoot = path.join(projectRoot, 'miniprogram', 'frontend');
const backendRoot = path.join(projectRoot, 'miniprogram', 'backend');
const errors = [];

function listFiles(directory) {
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

if (!fs.existsSync(miniRoot)) errors.push('缺少 miniprogram/frontend/ 小程序前端目录');
if (!fs.existsSync(backendRoot)) errors.push('缺少 miniprogram/backend/ 独立后端目录');

const projectConfig = readJson(path.join(projectRoot, 'project.config.json'));
if (projectConfig?.compileType !== 'miniprogram') errors.push('project.config.json 的 compileType 必须为 miniprogram');
if (projectConfig?.miniprogramRoot !== 'miniprogram/frontend/') errors.push('project.config.json 的 miniprogramRoot 必须为 miniprogram/frontend/');

const appConfig = readJson(path.join(miniRoot, 'app.json'));
if (appConfig?.window?.navigationBarTitleText !== '彩色小连珠') errors.push('小程序导航栏名称必须为“彩色小连珠”');
for (const filename of ['app.js', 'app.json', 'app.wxss', 'sitemap.json']) {
  if (!fs.existsSync(path.join(miniRoot, filename))) errors.push(`缺少 miniprogram/frontend/${filename}`);
}

for (const page of appConfig?.pages || []) {
  for (const extension of ['.js', '.json', '.wxml', '.wxss']) {
    const file = path.join(miniRoot, `${page}${extension}`);
    if (!fs.existsSync(file)) errors.push(`页面缺少文件：miniprogram/frontend/${page}${extension}`);
  }
}

const files = fs.existsSync(miniRoot) ? listFiles(miniRoot) : [];
const jsonFiles = files.filter((file) => file.endsWith('.json'));
jsonFiles.forEach(readJson);

const forbidden = [
  [/\bdocument\b/, 'DOM document'],
  [/\blocalStorage\b/, '浏览器 localStorage'],
  [/\beval\s*\(/, 'eval'],
  [/new\s+Function\b/, '动态 Function'],
  [/\bwindow\s*[.[]/, '浏览器 window'],
  [/https?:\/\//, '未经审查的网络地址']
];

for (const file of files.filter((entry) => entry.endsWith('.js'))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const [pattern, label] of forbidden) {
    if (pattern.test(source)) errors.push(`${path.relative(projectRoot, file)} 使用了禁止项：${label}`);
  }
}

const requirements = fs.readFileSync(path.join(projectRoot, 'docs', 'WECHAT_MINIPROGRAM.md'), 'utf8');
if (!requirements.includes('必须符合微信小程序开发规范')) errors.push('项目文档缺少强制合规要求');

const packageBytes = files.reduce((total, file) => total + fs.statSync(file).size, 0);
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`小程序静态检查通过：${files.length} 个前端文件，${packageBytes} 字节。`);
console.log('前端打包边界为 miniprogram/frontend/，后端目录不会进入小程序主包。');
console.log('提交审核前仍需使用微信开发者工具完成编译、预览、真机与隐私接口检查。');
