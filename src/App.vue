<script setup>
// Root component：Pinia stores 是 singleton，子元件用 useXxxStore() 直接取，
// 這裡只負責頁面 layout、kick off WebMCP 註冊。
import { onMounted, onUnmounted } from 'vue';
import { useWebMcpStore } from './stores/webmcp.js';

import StatusBadge    from './components/StatusBadge.vue';
import ProductSection from './components/ProductSection.vue';
import CartSection    from './components/CartSection.vue';
import ScenarioPanel  from './components/ScenarioPanel.vue';
import ChatPanel      from './components/ChatPanel.vue';
import ToolPanel      from './components/ToolPanel.vue';

const webmcp = useWebMcpStore();

onMounted(() => void webmcp.register());
onUnmounted(() => webmcp.cleanup());
</script>

<template>
  <div class="container">
    <header>
      <div class="brand">
        <h1>Kuro Roasters</h1>
        <span class="subtitle">手沖咖啡豆選購（WebMCP × Vue 3.5 × Pinia）</span>
        <a
          class="source-link"
          href="https://github.com/kurotanshi/kuro-roasters-webmcp"
          target="_blank"
          rel="noopener"
        >GitHub ↗</a>
      </div>
      <p>一個假想的咖啡豆選購頁面，透過 <code>document.modelContext</code> 註冊五個 tool 給 AI Agent 使用：搜尋商品、看商品細節、加入購物車、查看購物車、送出訂單。</p>
      <p class="hint">
        這頁是 build 後的單一檔案，原始碼拆分在
        <a
          href="https://github.com/kurotanshi/kuro-roasters-webmcp/tree/main/src"
          target="_blank"
          rel="noopener"
        ><code>src/</code></a>
        底下，讀 source 建議從那邊開始。
      </p>
      <StatusBadge :status="webmcp.status" />
    </header>

    <ProductSection />
    <CartSection />
    <ScenarioPanel />
    <ChatPanel />
    <ToolPanel />

    <hr>

    <section>
      <h2>怎麼實際讓 Agent 來呼叫</h2>
      <p class="hint">
        ChatGPT 桌面版可在內建瀏覽器開啟這頁，透過 <em>Site tools</em> 查看並呼叫網站提供的工具；
        詳情見 <a href="https://learn.chatgpt.com/docs/webmcp" target="_blank" rel="noopener">OpenAI WebMCP 文件</a>。
      </p>
      <p class="hint">
        Chrome 測試版可開啟 <code>chrome://flags/#enable-webmcp-testing</code> 啟用 WebMCP 測試功能，
        並用 <code>chrome://flags/#devtools-webmcp-support</code> 開啟 DevTools 檢查面板；
        Chrome 149 另提供 Origin Trial。其他瀏覽器仍可透過
        <a href="https://www.npmjs.com/package/@mcp-b/global" target="_blank" rel="noopener"><code>@mcp-b/global</code></a>
        補上 <code>document.modelContext</code>；手動面板、情境按鈕與 Gemini function calling 都是本頁的本機模擬，
        不代表瀏覽器 Agent 已呼叫 WebMCP。
      </p>
      <p class="hint">
        購物車狀態存在 <code>localStorage</code>，資料不會上傳。想清空執行 <code>localStorage.clear()</code> 即可。
      </p>
    </section>
  </div>
</template>
