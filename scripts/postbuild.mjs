#!/usr/bin/env node
// 把 vite build 出去的 dist/* 攤平到 repo 根目錄，讓 GitHub Pages 直接從 main branch root 服務。
// 部署只看 repo 根的單檔 index.html；dist/ 純粹是 Vite 的暫存區，build 完就刪掉。
import { cpSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');

if (!existsSync(dist)) {
  console.error('postbuild: dist/ not found, did vite build run?');
  process.exit(1);
}

cpSync(dist, root, { recursive: true });
const index = join(root, 'index.html');
writeFileSync(index, readFileSync(index, 'utf8').replace(/[ \t]+$/gm, ''));
rmSync(dist, { recursive: true, force: true });
console.log('postbuild: flattened dist/ into repo root');
