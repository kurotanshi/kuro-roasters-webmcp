<script setup>
// Root component：Pinia stores 是 singleton，子元件用 useXxxStore() 直接取，
// 這裡只負責頁面 layout、kick off WebMCP 註冊。
import { onMounted } from 'vue';
import { useWebMcpStore } from './stores/webmcp.js';

import StatusBadge    from './components/StatusBadge.vue';
import ProductSection from './components/ProductSection.vue';
import CartSection    from './components/CartSection.vue';
import ScenarioPanel  from './components/ScenarioPanel.vue';
import ChatPanel      from './components/ChatPanel.vue';
import ToolPanel      from './components/ToolPanel.vue';

const webmcp = useWebMcpStore();

// polyfill IIFE 在 head 載入，但 navigator.modelContext 掛上有時略有延遲，所以 mounted 後再開始輪詢
onMounted(() => {
  webmcp.waitFor();
});
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
      <p>一個假想的咖啡豆選購頁面，註冊了五個 tool 給 AI Agent 使用：搜尋商品、看商品細節、加入購物車、查看購物車、結帳。這個版本以 Vue 3.5 + Pinia + VueUse + Vite 改寫，所有 state 都集中在 Pinia stores。</p>
      <p class="hint">
        這頁是 build 後的單一檔案，原始碼拆分在
        <a
          href="https://github.com/kurotanshi/kuro-roasters-webmcp/tree/vue/src"
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
        最完整的體驗在 Chrome 146+ Canary：打開 <code>chrome://flags</code>，搜尋並啟用
        <em>Experimental Web Platform features</em>，重開瀏覽器後回到這頁，狀態列會顯示「原生 API」。
        安裝 <em>Model Context Tool Inspector</em> 擴充（Chrome Web Store 搜尋名稱）就能看到註冊的 tool 並手動觸發。
      </p>
      <p class="hint">
        其他瀏覽器（含一般 Chrome / Safari / Firefox）這頁會透過
        <a href="https://www.npmjs.com/package/@mcp-b/global" target="_blank" rel="noopener"><code>@mcp-b/global</code></a>
        polyfill 補上 <code>navigator.modelContext</code>，手動觸發面板仍可運作，tool 本身也實際註冊完成，
        只是目前沒有這些瀏覽器內建的 Agent 可以自動呼叫它。
      </p>
      <p class="hint">
        購物車狀態存在 <code>localStorage</code>，資料不會上傳。想清空執行 <code>localStorage.clear()</code> 即可。
      </p>
    </section>
  </div>
</template>
