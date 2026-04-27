import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { useToolsStore } from './tools.js';
import { useChatLogStore } from './logs.js';

// 真的跟 Gemini 對話 store：把 TOOL_DEFS 轉成 functionDeclarations，跑 agent loop。
const SYSTEM_PROMPT = `你是「Kuro Roasters」這間手沖咖啡豆選購店的選品助理。
你可以透過以下 WebMCP tool 幫使用者搜尋商品、查看細節、加入購物車、看購物車、結帳。

原則：
- 以繁體中文回覆
- 需要商品資料時直接呼叫對應 tool，不要自己編造
- 呼叫 add_to_cart 或 checkout 會跳確認視窗，如果回傳 cancelled 就停下來說明並等使用者下一步
- 回覆精簡，說清楚你做了什麼、找到什麼、下一步打算做什麼
- 使用者的需求如果太模糊（例如「幫我挑一款」），先用 search_products 拉清單再給建議`;

const truncate = (t, max = 240) => t.length <= max ? t : t.slice(0, max) + '…';

export const useChatStore = defineStore('chat', () => {
  const tools = useToolsStore();
  const log   = useChatLogStore();

  // useLocalStorage 自動把 ref 同步到 localStorage（reset 給空字串 / 預設模型即可，不用手寫 watch）
  const apiKey = useLocalStorage('webmcp-demo-gemini-key',   '');
  const model  = useLocalStorage('webmcp-demo-gemini-model', 'gemini-2.5-flash');

  // pendingKey 是 input 欄位的暫存值，按下儲存才同步進 apiKey
  const pendingKey   = ref('');
  const inputText    = ref('');
  // Gemini contents 格式：[{ role: 'user' | 'model', parts: [...] }]
  const conversation = ref([]);
  const busy         = ref(false);
  const configOpen   = ref(!apiKey.value);

  const hasKey  = computed(() => Boolean(apiKey.value));
  const canSend = computed(() => hasKey.value && !busy.value);
  const keyStatus = computed(() => {
    if (!hasKey.value) return { text: '未設定', color: 'var(--muted)' };
    const masked = apiKey.value.length > 14
      ? `${apiKey.value.slice(0, 8)}…${apiKey.value.slice(-4)}`
      : '已儲存';
    return { text: `已儲存（${masked}）`, color: 'var(--success)' };
  });

  function saveKey() {
    const val = pendingKey.value.trim();
    if (val) {
      apiKey.value = val;
      pendingKey.value = '';
    }
  }

  function clearKey() {
    if (!confirm('清除儲存的金鑰？')) return;
    apiKey.value = '';
    configOpen.value = true;
  }

  function reset() {
    conversation.value = [];
    log.clear();
  }

  // 把 TOOL_DEFS 轉成 Gemini 的 function_declarations 格式
  function getGeminiTools() {
    return [{
      functionDeclarations: tools.TOOL_DEFS.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.inputSchema
      }))
    }];
  }

  async function callGeminiAPI(body) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.value)}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey.value
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        msg = err?.error?.message || err?.error?.status || JSON.stringify(err).slice(0, 200);
      } catch {
        try { msg = await res.text(); } catch {}
      }
      throw new Error(`Gemini API 錯誤：${msg}`);
    }
    return res.json();
  }

  async function runChatLoop() {
    const maxIterations = 6;
    const geminiTools = getGeminiTools();
    const systemInstruction = { parts: [{ text: SYSTEM_PROMPT }] };

    for (let iter = 0; iter < maxIterations; iter++) {
      const response = await callGeminiAPI({
        contents: conversation.value,
        tools: geminiTools,
        systemInstruction
      });

      const candidate = response.candidates?.[0];
      if (!candidate) {
        log.append('error', '模型沒有回傳任何 candidate');
        return;
      }

      const parts = candidate.content?.parts || [];

      // 先把文字輸出 log 出來
      for (const part of parts) {
        if (part.text && part.text.trim()) {
          log.append('think', part.text.trim());
        }
      }

      conversation.value.push({ role: 'model', parts });

      // 收集這一輪的 function call
      const functionCalls = parts.filter(p => p.functionCall);
      if (functionCalls.length === 0) return;

      const functionResponseParts = [];
      for (const part of functionCalls) {
        const { name, args } = part.functionCall;
        const argText = JSON.stringify(args || {});
        log.append('call', `${name}(${argText})`);
        try {
          const wrapped = await tools.executeRegisteredTool(name, args || {});
          const resultText = wrapped?.content?.[0]?.text ?? JSON.stringify(wrapped);
          log.append('result', truncate(resultText));
          let responseObj;
          try { responseObj = JSON.parse(resultText); }
          catch { responseObj = { output: resultText }; }
          functionResponseParts.push({
            functionResponse: { name, response: { result: responseObj } }
          });
        } catch (err) {
          log.append('error', err.message);
          functionResponseParts.push({
            functionResponse: { name, response: { error: err.message } }
          });
        }
      }
      conversation.value.push({ role: 'user', parts: functionResponseParts });
    }
    log.append('error', `超過 ${maxIterations} 輪工具呼叫，強制中止`);
  }

  async function send() {
    if (busy.value) return;
    const text = inputText.value.trim();
    if (!text) return;
    if (!apiKey.value) {
      alert('請先在上方設定並儲存 Gemini API key');
      return;
    }
    inputText.value = '';
    busy.value = true;

    try {
      log.append('user', text);
      conversation.value.push({ role: 'user', parts: [{ text }] });
      await runChatLoop();
    } catch (err) {
      log.append('error', err.message || String(err));
    } finally {
      busy.value = false;
    }
  }

  return {
    apiKey, pendingKey, model, inputText, conversation, busy, configOpen,
    hasKey, canSend, keyStatus,
    saveKey, clearKey, reset, send
  };
});
