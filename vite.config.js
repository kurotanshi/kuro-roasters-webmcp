import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';

// build 結果是單一 index.html（WebMCP bridge、JS、CSS 全部 inline）。
// postbuild 再把 dist/* 攤平到 repo 根目錄，讓 GitHub Pages 直接服務。
export default defineConfig({
  // src/ 是 Vite 入口（src/index.html）
  root: 'src',
  // GH Pages 部署在子路徑（kuro.tw/kuro-roasters-webmcp/），所以全部用相對路徑
  base: './',
  plugins: [vue(), viteSingleFile()],
  build: {
    // 先輸出到 repo 的 dist/，避免 outDir 跟 src/ 重疊
    outDir: '../dist',
    emptyOutDir: true,
    cssCodeSplit: false
  },
  server: {
    port: 3000
  }
});
