# Kuro Roasters — WebMCP Demo（Vue 3.5 + Pinia + VueUse）

**Live demo：<https://kuro.tw/kuro-roasters-webmcp/>**

一個假想的手沖咖啡豆選購頁面，示範怎麼用 [WebMCP](https://webmachinelearning.github.io/webmcp/) 把一個網站的功能暴露成 AI Agent 可以呼叫的 tool，並且把 Google Gemini 的 function calling 接起來，讓使用者能直接用自然語言操作整個頁面。

> 這個分支（`vue`）把原本的 zero-framework 版本改寫成 **Vue 3.5 + Pinia 3 + VueUse + Vite 8** 的標準現代 Vue 技術棧：
>
> - **Pinia stores**（setup syntax）取代 `provide`/`inject`：每個關注點是一個 `defineStore`，components 用 `useXxxStore()` 直接拿 singleton。
> - **VueUse**：`useLocalStorage` 自動同步購物車 / Gemini 設定到 localStorage，`useTimeoutFn` 處理動畫 timer，省下手寫 `watch` 與 setTimeout ID 管理的樣板程式。
> - **Vue 3.5 SFC** + `<script setup>` + `storeToRefs()`：Pinia 標準解構 reactive state 的寫法。
> - **Vite 8** + `vite-plugin-singlefile`：build 出來仍然是單一 inline `index.html`（105KB / gzip 42KB），維持「打開一個檔案就能跑」的精神。
>
> WebMCP tool 註冊邏輯與 `main` 分支一致；差別在畫面更新與 state 完全由 Pinia 驅動，沒有任何手動 DOM 操作。

整支 demo 的邏輯拆分在 [`src/`](./src/) 底下方便閱讀，build 後會組成單一 `index.html` 供 GitHub Pages 部署。想先看完整程式碼建議直接讀 `src/`。

## 做得到的事

頁面註冊了五個 WebMCP tool：

| Tool | 說明 |
|---|---|
| `search_products` | 關鍵字 / 產地 / 烘焙度 / 價格上限搜尋，`readOnlyHint: true` |
| `get_product` | 依 id 取單品詳情 |
| `add_to_cart` | 加入購物車，透過 `requestUserInteraction` 跳確認 |
| `view_cart` | 取購物車內容與合計 |
| `checkout` | 結帳，同樣透過 `requestUserInteraction` 跳確認 |

頁面有三條路徑讓讀者體感 Agent 操作：

1. **情境模擬**（寫死的腳本，不需 API key）— 兩個按鈕觸發預先寫好的 tool call 序列，畫面自動更新、寫入型 tool 會跳確認
2. **跟 Gemini 對話**（需 API key）— 貼上 Gemini API key 就能用自然語言下需求，LLM 自己決定要呼叫哪些 tool
3. **手動觸發**（工具逐一呼叫）— 想看某個 tool 的 input / output 格式可以從這邊跑

## 本地跑起來

> 需要 **Node 20.19+** 或 **Node 22.12+**（Vite 8 的最低需求）。建議用最新的 LTS。

```bash
npm install         # 第一次先裝 vue / pinia / @vueuse/core / vite / @vitejs/plugin-vue / vite-plugin-singlefile
npm run dev         # Vite 8 dev server，預設 http://localhost:3000，HMR 開
```

build 給 GH Pages 部署：

```bash
npm run build       # vite build → 產生 dist/，再用 scripts/postbuild.mjs 攤平到 repo 根
```

build 完根目錄會更新 `index.html`（單檔含 inlined Vue + Pinia + 全部 JS/CSS）以及 `vendor/mcp-b-global.iife.js`（polyfill）。

## 原始碼導覽

```
src/
├─ index.html             Vite 入口，掛載 #app + polyfill <script>
├─ main.js                createApp(App).use(createPinia()).mount('#app')
├─ App.vue                root：頁面 layout + 啟動 WebMCP 註冊
├─ style.css              全站 CSS（從 main.js import）
├─ data.js                PRODUCTS、searchProducts、getProduct、formatPrice 等純資料 helper
├─ stores/                Pinia stores（setup syntax）
│   ├─ cart.js            useCartStore：cart + total + CRUD（用 useLocalStorage 自動同步）
│   ├─ filter.js          useFilterStore：reactive filter + computed filtered + applyArgs
│   ├─ flash.js           useFlashStore：.highlight-flash 動畫觸發（用 useTimeoutFn 管 timer）
│   ├─ logs.js            useAgentLogStore + useChatLogStore：共享同一個 setup function
│   ├─ output.js          useOutputStore：手動觸發面板下方的 <pre> 共用 output
│   ├─ tools.js           useToolsStore：TOOL_DEFS + executeRegisteredTool（單一來源）
│   ├─ webmcp.js          useWebMcpStore：navigator.modelContext.registerTool + 原生 / polyfill 偵測
│   ├─ scenarios.js       useScenariosStore：寫死的 SCENARIOS 腳本 + run()
│   └─ chat.js            useChatStore：Gemini API key（useLocalStorage）+ runChatLoop
└─ components/            SFC：每個都是 <script setup> 直接 useXxxStore()
    ├─ StatusBadge.vue    WebMCP 狀態膠囊
    ├─ ProductSection.vue 篩選欄 + 商品卡片
    ├─ CartSection.vue    購物車內容 + 結帳
    ├─ ScenarioPanel.vue  情境按鈕 + AgentLogList
    ├─ ChatPanel.vue      Gemini 設定 + AgentLogList + 輸入框
    ├─ ToolPanel.vue      手動觸發 tool 按鈕 + 輸出 <pre>
    └─ AgentLogList.vue   ScenarioPanel / ChatPanel 共用的 log 顯示元件
```

## 怎麼實際讓 Agent 來呼叫

最完整的體驗在 Chrome 146+ Canary：打開 `chrome://flags`，搜尋並啟用 **Experimental Web Platform features**，重開瀏覽器後回到這頁，狀態列會顯示「原生 API」。安裝 *Model Context Tool Inspector* 擴充就能看到註冊的 tool 並手動觸發。

其他瀏覽器（含一般 Chrome / Safari / Firefox）這頁會透過 [`@mcp-b/global`](https://www.npmjs.com/package/@mcp-b/global) polyfill 補上 `navigator.modelContext`，手動觸發面板仍可運作，tool 本身也實際註冊完成，只是目前沒有這些瀏覽器內建的 Agent 可以自動呼叫它。

## License

MIT
