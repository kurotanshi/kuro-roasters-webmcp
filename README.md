# Kuro Roasters — WebMCP Demo

**Live demo：<https://kuro.tw/kuro-roasters-webmcp/>**

一個假想的手沖咖啡豆商店，示範網站如何透過 [WebMCP](https://webmachinelearning.github.io/webmcp/) 的 `document.modelContext`，把既有功能註冊成瀏覽器 AI Agent 可發現、可呼叫的工具。

專案使用 Vue 3.5、Pinia、VueUse 與 Vite 8。原始碼拆分在 [`src/`](./src/)，build 後會產生可直接部署的單一 `index.html`。

## 五個工具

| Tool | 行為 | WebMCP annotation |
|---|---|---|
| `search_products` | 依關鍵字、產地、烘焙度與價格搜尋，並同步頁面篩選 | `readOnlyHint: true` |
| `get_product` | 依整數 id 取得商品詳情 | `readOnlyHint: true` |
| `add_to_cart` | 把指定商品與數量加入購物車 | `readOnlyHint: false` |
| `view_cart` | 取得購物車內容、商品數與合計 | `readOnlyHint: true` |
| `place_order` | 建立模擬訂單並清空購物車 | `readOnlyHint: false` |

每個工具都有 `title`、封閉的 JSON Schema（`additionalProperties: false`）、執行期輸入驗證與可序列化的原始回傳值。工具定義集中在 [`src/stores/tools.js`](./src/stores/tools.js)，供以下路徑共用：

1. `document.modelContext.registerTool()`：真正的瀏覽器 WebMCP 註冊。
2. 情境按鈕：本頁直接執行寫死的呼叫序列，不需 API key。
3. Gemini function calling 模擬器：把相同定義轉為 Gemini `functionDeclarations`，再於本頁執行。
4. 手動面板：逐一查看工具 input / output。

後三者是本機模擬，不代表瀏覽器 Agent 已透過 WebMCP 呼叫。由於沒有瀏覽器的安全審查，`add_to_cart` 與 `place_order` 會先用 `window.confirm()` 徵求確認；真正的 WebMCP 路徑則交由瀏覽器審查與確認，避免重複提示。

Gemini API key 只保留在目前分頁的記憶體，重新整理即清除；不會寫入 `localStorage`。新版首次建立聊天 store 時，也會移除舊版曾寫入的 `webmcp-demo-gemini-key`。購物車與模型偏好會留在 `localStorage`。

## 實際測試 WebMCP

### ChatGPT 桌面版

在 ChatGPT 內建瀏覽器開啟 live demo，從 **Site tools** 查看網站提供的工具並讓 ChatGPT 呼叫。支援範圍與操作方式以 [OpenAI WebMCP 文件](https://learn.chatgpt.com/docs/webmcp) 為準；瀏覽器會檢查每次呼叫，具後果的操作仍需使用者確認。

### Chrome

在支援 WebMCP 測試功能的 Chrome 版本開啟：

```text
chrome://flags/#enable-webmcp-testing
```

啟用後重新啟動瀏覽器。Chrome 149 也提供 WebMCP Origin Trial。本 demo 不載入 WebMCP polyfill，執行環境必須原生提供 `document.modelContext` 才會註冊工具；若頁面顯示 `document.modelContext 不可用`，情境按鈕、Gemini function calling 與手動面板仍可本機執行，但瀏覽器 Agent 無法透過 WebMCP 呼叫工具。

若要在 Chrome 149+ DevTools 的 Application 面板檢查、手動執行與追蹤工具，另啟用 `chrome://flags/#devtools-webmcp-support`。

### Pinia 與 structured clone

`TOOL_DEFS` 從 Pinia store 回傳時，預設會被 Vue 轉成 reactive Proxy；WebMCP 註冊工具時需要跨執行環境複製 schema 與 annotations，但 structured clone 無法複製 Proxy，因此會出現 `An object could not be cloned.`，並讓 ChatGPT 判定頁面沒有可用工具。本專案用 Vue 的 `markRaw()` 保持工具定義為普通物件，避免 WebMCP 註冊失敗。

## 本地開發

需要 Node 20.19+ 或 Node 22.12+：

```bash
pnpm install
pnpm dev
```

驗證工具契約、輸入邊界與完整購物車流程：

```bash
pnpm test
```

建立 GitHub Pages 產物：

```bash
pnpm build
```

Vite 會先產生 `dist/`，`scripts/postbuild.mjs` 再把單檔產物同步到 repo 根目錄的 `index.html`。

## 原始碼導覽

```text
src/
├─ index.html             Vite HTML 入口
├─ main.js                建立 Vue app；WebMCP API 由執行環境提供
├─ App.vue                頁面 layout 與 WebMCP 註冊生命週期
├─ data.js                商品資料與純資料 helpers
├─ stores/
│  ├─ tools.js            唯一工具定義、驗證與本機執行入口
│  ├─ webmcp.js           document.modelContext 註冊與清理
│  ├─ chat.js             Gemini function calling 模擬器
│  ├─ scenarios.js        寫死的情境腳本
│  └─ ...                 購物車、篩選、輸出與 log stores
└─ components/            Vue SFC 畫面元件
```

## License

MIT
