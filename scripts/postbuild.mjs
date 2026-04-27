#!/usr/bin/env node
// 把 vite build 出去的 dist/* 攤平到 repo 根目錄，讓 GitHub Pages 直接從 main branch root 服務。
// 部署只看 repo 根的 index.html 與 vendor/，dist/ 純粹是 vite 的暫存區、build 完就刪掉。
import { cpSync, rmSync, existsSync } from 'node:fs';
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
rmSync(dist, { recursive: true, force: true });
console.log('postbuild: flattened dist/ into repo root');
