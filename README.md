# Kuro Roasters — WebMCP Demo

**Live demo：<https://kuro.tw/kuro-roasters-webmcp/>**

一個假想的手沖咖啡豆選購頁面，示範怎麼用 [WebMCP](https://webmachinelearning.github.io/webmcp/) 把一個網站的功能暴露成 AI Agent 可以呼叫的 tool，並且把 Google Gemini 的 function calling 接起來，讓使用者能直接用自然語言操作整個頁面。

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

```bash
npm run dev
# 會先跑 build 把 src/ 組成 index.html，再用 npx serve . 起在 port 3000
```

或單獨 build 後用自己的靜態伺服器：

```bash
npm run build
python3 -m http.server 8080
```

打開 `http://localhost:3000`（或對應 port）即可。

## 部署

這個 repo 用 GitHub Pages 部署：settings → Pages → Source 指向 `main` branch root 即可。預設網址是 `https://<user>.github.io/kuro-roasters-webmcp/`；本 repo 實際部署在 **<https://kuro.tw/kuro-roasters-webmcp/>**，透過 `kurotanshi.github.io` 的自訂 domain 對應過來。

## 架構重點

### Tool 定義集中管理

所有 tool 定義放在一個 `TOOL_DEFS` 陣列裡，WebMCP 註冊、Gemini function calling、手動觸發、情境模擬全部共用同一份資料：

```js
const TOOL_DEFS = [
  {
    name: 'search_products',
    description: '搜尋咖啡豆。可用關鍵字、產地、烘焙度、價格上限過濾。',
    inputSchema: {
      type: 'object',
      properties: {
        query:    { type: 'string' },
        origin:   { type: 'string' },
        roast:    { type: 'string', enum: ['淺焙', '中焙', '深焙'] },
        maxPrice: { type: 'number' }
      }
    },
    annotations: { readOnlyHint: true },
    execute: async (input) => {
      reflectFilterArgsOnUI(input);  // 讓 UI 跟著動
      const results = searchProducts(input);
      return { content: [{ type: 'text', text: JSON.stringify(results) }] };
    }
  },
  // ... 其他 tool
];
```

`execute` 裡直接呼叫 `reflectFilterArgsOnUI()`、`flashElement()` 之類的副作用，讓原生 Agent、polyfill、手動面板、LLM chat 不管從哪條路進來呼叫 tool，畫面都會同步更新。

### WebMCP 註冊

```js
if ('modelContext' in navigator) {
  for (const def of TOOL_DEFS) {
    navigator.modelContext.registerTool(def);
  }
}
```

### Polyfill 與原生 API 兼容

Chrome 146 Canary 以後的版本原生支援 `navigator.modelContext`。其他瀏覽器用 [`@mcp-b/global`](https://www.npmjs.com/package/@mcp-b/global) 的 IIFE 版本補上，預先設定 `nativeModelContextBehavior: 'preserve'` 讓它在偵測到原生時不覆蓋：

```html
<script>
  window.__webModelContextOptions = {
    autoInitialize: true,
    nativeModelContextBehavior: 'preserve'
  };
</script>
<script src="./vendor/mcp-b-global.iife.js"></script>
```

這個 repo 把 polyfill 直接 commit 到 `vendor/` 底下（~250KB），不靠 CDN，部署到 GitHub Pages 就能離線運作。

### Gemini function calling 對接

對話邏輯是標準的 agent loop：

```js
async function runChatLoop() {
  const tools = [{
    functionDeclarations: TOOL_DEFS.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema
    }))
  }];
  const systemInstruction = { parts: [{ text: SYSTEM_PROMPT }] };

  for (let iter = 0; iter < 6; iter++) {
    const response = await callGeminiAPI({
      contents: conversation,
      tools,
      systemInstruction
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    // log text
    for (const p of parts) if (p.text) appendLog('think', p.text);

    conversation.push({ role: 'model', parts });

    const functionCalls = parts.filter(p => p.functionCall);
    if (functionCalls.length === 0) return;

    const functionResponseParts = [];
    for (const part of functionCalls) {
      const { name, args } = part.functionCall;
      const wrapped = await executeRegisteredTool(name, args || {});
      const resultText = wrapped?.content?.[0]?.text ?? JSON.stringify(wrapped);
      functionResponseParts.push({
        functionResponse: { name, response: { result: JSON.parse(resultText) } }
      });
    }
    conversation.push({ role: 'user', parts: functionResponseParts });
  }
}
```

API call 本身很簡單，不需要 Anthropic 那種 `dangerous-direct-browser-access` opt-in header：

```js
async function callGeminiAPI(body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': geminiKey
    },
    body: JSON.stringify(body)
  });
  return res.json();
}
```

### `requestUserInteraction` 的模擬

真正 WebMCP spec 下 `client.requestUserInteraction(callback)` 是由瀏覽器 / Agent runtime 提供，demo 在沒原生 runtime 的情境下自己給一個 mock：

```js
async function executeRegisteredTool(name, input) {
  const def = TOOL_DEFS.find(t => t.name === name);
  const mockClient = {
    requestUserInteraction: async (fn) => await fn()
  };
  return await def.execute(input || {}, mockClient);
}
```

因為 tool 的 execute 裡用 `window.confirm`，mock client 就只是把 callback 執行一下。真實 runtime 會額外做 UI 包裝（像 Chrome Canary 會顯示「Agent 想呼叫這個工具，要允許嗎？」），但效果是一樣的。

## 需要自備

- 一個 Chromium 系瀏覽器（Chrome、Edge、Arc 都可以）或 Firefox / Safari
- （對話功能）一把 [Google AI Studio](https://aistudio.google.com/app/apikey) 申請的 Gemini API key

金鑰只存在瀏覽器 `localStorage`，從瀏覽器直接打 `generativelanguage.googleapis.com`，不經過任何伺服器。公開電腦用完記得按 demo 上的「清除金鑰」。

## 檔案結構

```
.
├── src/                            # 原始碼，hand-edited
│   ├── index.template.html         # HTML 殼，{{STYLES}} / {{SCRIPT}} 為注入點
│   ├── styles.css
│   ├── data.js                     # PRODUCTS + matchRoast
│   ├── state.js                    # 共享狀態、DOM refs、小 util
│   ├── cart.js                     # 商品搜尋與購物車 CRUD
│   ├── render.js                   # renderProducts / renderCart
│   ├── ui.js                       # 使用者事件、appendLog、視覺提示
│   ├── tools.js                    # TOOL_DEFS + executeRegisteredTool + 手動面板
│   ├── scenarios.js                # 模擬 Agent 操作的腳本
│   ├── chat.js                     # Gemini API 對話
│   ├── webmcp.js                   # navigator.modelContext 註冊
│   └── init.js                     # 初始化呼叫
├── scripts/
│   └── build.mjs                   # 把 src/ 組成單一 index.html
├── index.html                      # build 產物，GitHub Pages 部署的檔
├── vendor/
│   └── mcp-b-global.iife.js        # WebMCP polyfill
├── package.json
├── .gitignore
├── README.md
└── LICENSE
```

`index.html` 是 build 出來的，**不要手改**。每次改完 `src/` 跑 `npm run build` 再 commit。

## 延伸閱讀

- [WebMCP 規格草稿](https://webmachinelearning.github.io/webmcp/)
- [`@mcp-b/global` npm 頁面](https://www.npmjs.com/package/@mcp-b/global)
- [Chrome：When to use WebMCP and MCP](https://developer.chrome.com/blog/webmcp-mcp-usage)
- [Gemini function calling 官方文件](https://ai.google.dev/gemini-api/docs/function-calling)
- [Kuro 的部落格文章 — 讓網站直接跟 AI Agent 對話：初試 WebMCP](https://kurohsu.dev/learn/learning-webmcp.html)

## License

MIT。polyfill 來自 [WebMCP-org/npm-packages](https://github.com/WebMCP-org/npm-packages) (MIT)，商品資料純屬虛構。
