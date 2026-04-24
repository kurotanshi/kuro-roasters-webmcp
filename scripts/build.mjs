#!/usr/bin/env node
// 把 src/ 底下的 CSS + JS 拆分檔案組回單一 index.html。
// GitHub Pages 部署的是組完的 index.html，所以每次改完 src/ 記得跑 npm run build。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcDir = join(root, 'src');

// 組合順序：定義在前、副作用在後。init.js 一定放最後。
const SCRIPT_FILES = [
  'data.js',
  'state.js',
  'cart.js',
  'render.js',
  'ui.js',
  'tools.js',
  'scenarios.js',
  'chat.js',
  'webmcp.js',
  'init.js',
];

const template = readFileSync(join(srcDir, 'index.template.html'), 'utf8');
for (const marker of ['{{STYLES}}', '{{SCRIPT}}']) {
  if (!template.includes(marker)) {
    throw new Error(`build: template is missing ${marker}`);
  }
}
const styles = readFileSync(join(srcDir, 'styles.css'), 'utf8').trimEnd();

const scriptBlocks = SCRIPT_FILES.map((file) => {
  const body = readFileSync(join(srcDir, file), 'utf8').trimEnd();
  return `// ==== ${file} ====\n${body}`;
});
const script = scriptBlocks.join('\n\n');

const indent = (text, prefix) =>
  text.split('\n').map((line) => (line.length ? prefix + line : line)).join('\n');

// 用 function replacer 避免 $&、$' 之類的 replacement pattern 被解析（例如 JS 裡的 'NT$' 字面值）
const output = template
  .replace('{{STYLES}}', () => indent(styles, '    '))
  .replace('{{SCRIPT}}', () => indent(script, '    '));

writeFileSync(join(root, 'index.html'), output);
console.log(`build: wrote index.html (${output.length} bytes, ${SCRIPT_FILES.length} JS files + styles.css)`);
