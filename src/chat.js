// 真的跟 Gemini 對話：把 TOOL_DEFS 轉成 functionDeclarations，跑 agent loop
const API_KEY_STORAGE = 'webmcp-demo-gemini-key';
const MODEL_STORAGE   = 'webmcp-demo-gemini-model';

const apiKeyInput  = document.getElementById('api-key-input');
const modelSelect  = document.getElementById('model-select');
const chatInput    = document.getElementById('chat-input');
const chatLogEl    = document.getElementById('chat-log');
const sendBtn      = document.getElementById('send-btn');
const saveKeyBtn   = document.getElementById('save-key-btn');
const clearKeyBtn  = document.getElementById('clear-key-btn');
const chatResetBtn = document.getElementById('chat-reset-btn');
const keyStatusEl  = document.getElementById('key-status');
const chatConfigEl = document.getElementById('chat-config');

let geminiKey     = localStorage.getItem(API_KEY_STORAGE) || '';
let selectedModel = localStorage.getItem(MODEL_STORAGE) || 'gemini-2.5-flash';
// Gemini contents 格式：[{ role: 'user' | 'model', parts: [...] }]
let conversation  = [];
let chatBusy      = false;

modelSelect.value = selectedModel;

function updateKeyStatus() {
  const hasKey = Boolean(geminiKey);
  if (hasKey) {
    const masked = geminiKey.length > 14
      ? `${geminiKey.slice(0, 8)}…${geminiKey.slice(-4)}`
      : '已儲存';
    keyStatusEl.textContent = `已儲存（${masked}）`;
    keyStatusEl.style.color = 'var(--success)';
  } else {
    keyStatusEl.textContent = '未設定';
    keyStatusEl.style.color = 'var(--muted)';
  }
  chatInput.disabled = !hasKey || chatBusy;
  sendBtn.disabled = !hasKey || chatBusy;
  if (!hasKey && chatConfigEl && !chatConfigEl.open) {
    chatConfigEl.open = true;
  }
}

saveKeyBtn.addEventListener('click', () => {
  const val = apiKeyInput.value.trim();
  if (val) {
    geminiKey = val;
    localStorage.setItem(API_KEY_STORAGE, val);
    apiKeyInput.value = '';
  }
  selectedModel = modelSelect.value;
  localStorage.setItem(MODEL_STORAGE, selectedModel);
  updateKeyStatus();
});

clearKeyBtn.addEventListener('click', () => {
  if (!confirm('清除儲存的金鑰？')) return;
  geminiKey = '';
  localStorage.removeItem(API_KEY_STORAGE);
  updateKeyStatus();
});

chatResetBtn.addEventListener('click', () => {
  conversation = [];
  chatLogEl.innerHTML = '<div class="agent-log-empty">對話已清空</div>';
});

sendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});

const SYSTEM_PROMPT = `你是「Kuro Roasters」這間手沖咖啡豆選購店的選品助理。
你可以透過以下 WebMCP tool 幫使用者搜尋商品、查看細節、加入購物車、看購物車、結帳。

原則：
- 以繁體中文回覆
- 需要商品資料時直接呼叫對應 tool，不要自己編造
- 呼叫 add_to_cart 或 checkout 會跳確認視窗，如果回傳 cancelled 就停下來說明並等使用者下一步
- 回覆精簡，說清楚你做了什麼、找到什麼、下一步打算做什麼
- 使用者的需求如果太模糊（例如「幫我挑一款」），先用 search_products 拉清單再給建議`;

async function sendChatMessage() {
  if (chatBusy) return;
  const text = chatInput.value.trim();
  if (!text) return;
  if (!geminiKey) {
    alert('請先在上方設定並儲存 Gemini API key');
    return;
  }
  chatInput.value = '';
  chatBusy = true;
  updateKeyStatus();

  try {
    appendLog(chatLogEl, 'user', text);
    conversation.push({ role: 'user', parts: [{ text }] });
    await runChatLoop();
  } catch (err) {
    appendLog(chatLogEl, 'error', err.message || String(err));
  } finally {
    chatBusy = false;
    updateKeyStatus();
  }
}

// 把 TOOL_DEFS 轉成 Gemini 的 function_declarations 格式
function getGeminiTools() {
  return [{
    functionDeclarations: TOOL_DEFS.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema
    }))
  }];
}

async function runChatLoop() {
  const maxIterations = 6;
  const tools = getGeminiTools();
  const systemInstruction = { parts: [{ text: SYSTEM_PROMPT }] };

  for (let iter = 0; iter < maxIterations; iter++) {
    const response = await callGeminiAPI({
      contents: conversation,
      tools,
      systemInstruction
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
      appendLog(chatLogEl, 'error', '模型沒有回傳任何 candidate');
      return;
    }

    const parts = candidate.content?.parts || [];

    // 先把文字輸出 log 出來
    for (const part of parts) {
      if (part.text && part.text.trim()) {
        appendLog(chatLogEl, 'think', part.text.trim());
      }
    }

    conversation.push({ role: 'model', parts });

    // 收集這一輪的 function call
    const functionCalls = parts.filter(p => p.functionCall);
    if (functionCalls.length === 0) return;

    const functionResponseParts = [];
    for (const part of functionCalls) {
      const { name, args } = part.functionCall;
      const argText = JSON.stringify(args || {});
      appendLog(chatLogEl, 'call', `${name}(${argText})`);
      try {
        const wrapped = await executeRegisteredTool(name, args || {});
        const resultText = wrapped?.content?.[0]?.text ?? JSON.stringify(wrapped);
        appendLog(chatLogEl, 'result', truncate(resultText));
        let responseObj;
        try { responseObj = JSON.parse(resultText); }
        catch { responseObj = { output: resultText }; }
        functionResponseParts.push({
          functionResponse: {
            name,
            response: { result: responseObj }
          }
        });
      } catch (err) {
        appendLog(chatLogEl, 'error', err.message);
        functionResponseParts.push({
          functionResponse: {
            name,
            response: { error: err.message }
          }
        });
      }
    }
    conversation.push({ role: 'user', parts: functionResponseParts });
  }
  appendLog(chatLogEl, 'error', `超過 ${maxIterations} 輪工具呼叫，強制中止`);
}

async function callGeminiAPI(body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': geminiKey
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
