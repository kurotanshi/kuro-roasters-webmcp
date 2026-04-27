import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';

// build 結果是單一 index.html（JS / CSS 全部 inline），跟原本「打開一個 html 就能跑」的精神一致。
// vendor/mcp-b-global.iife.js 走 publicDir 原樣搬到 dist/，build 之後 package.json 的 postbuild
// 再把 dist/* 攤平到 repo 根目錄，讓 GitHub Pages 直接服務（部署沿用原本的 main branch root 設定）。
export default defineConfig({
  // src/ 是 Vite 入口（src/index.html）
  root: 'src',
  publicDir: '../public',
  // GH Pages 部署在子路徑（kuro.tw/kuro-roasters-webmcp/），所以全部用相對路徑
  base: './',
  plugins: [vue(), viteSingleFile()],
  build: {
    // 先輸出到 repo 的 dist/，避免 outDir 跟 publicDir / src/ 重疊
    outDir: '../dist',
    emptyOutDir: true,
    cssCodeSplit: false
  },
  server: {
    port: 3000
  }
});
