// 模擬 Agent 操作：寫死的腳本，給不想貼 API key 的讀者體驗 tool call 會怎麼跑
const scenarioLogEl = document.getElementById('agent-log');
let scenarioRunning = false;

const SCENARIOS = {
  'light-roast': [
    { type: 'user',  text: '幫我找 500 元以下的淺焙咖啡豆，挑一款加入購物車' },
    { type: 'think', text: '用 search_products 過濾看看' },
    { type: 'call',  tool: 'search_products', args: { roast: '淺焙', maxPrice: 500 } },
    { type: 'think', text: '耶加雪菲水洗評價不錯，把它加入購物車' },
    { type: 'call',  tool: 'add_to_cart', args: { id: 1, quantity: 1 } }
  ],
  'gesha-checkout': [
    { type: 'user',  text: '我想試試看藝伎，順便結帳' },
    { type: 'think', text: '先查「藝伎」相關商品' },
    { type: 'call',  tool: 'search_products', args: { query: '藝伎' } },
    { type: 'think', text: '只有翡翠莊園藝伎，加入購物車' },
    { type: 'call',  tool: 'add_to_cart', args: { id: 7, quantity: 1 } },
    { type: 'think', text: '確認購物車內容' },
    { type: 'call',  tool: 'view_cart' },
    { type: 'think', text: '送出結帳' },
    { type: 'call',  tool: 'checkout' }
  ]
};

async function runScenario(scenarioId) {
  if (scenarioRunning) return;
  if (scenarioId === 'reset') {
    clearCart();
    queryEl.value = '';
    originEl.value = '';
    roastEl.value = '';
    renderProducts();
    scenarioLogEl.innerHTML = '';
    appendLog(scenarioLogEl, 'user', '重置畫面與購物車');
    appendLog(scenarioLogEl, 'result', '完成');
    return;
  }
  const steps = SCENARIOS[scenarioId];
  if (!steps) return;

  scenarioRunning = true;
  document.querySelectorAll('[data-scenario]').forEach(b => b.disabled = true);
  scenarioLogEl.innerHTML = '';

  try {
    for (const step of steps) {
      if (step.type === 'user') {
        appendLog(scenarioLogEl, 'user', step.text);
        await sleep(700);
      } else if (step.type === 'think') {
        appendLog(scenarioLogEl, 'think', step.text);
        await sleep(600);
      } else if (step.type === 'call') {
        const argText = step.args && Object.keys(step.args).length > 0
          ? `${step.tool}(${JSON.stringify(step.args)})`
          : `${step.tool}()`;
        appendLog(scenarioLogEl, 'call', argText);
        try {
          const wrapped = await executeRegisteredTool(step.tool, step.args || {});
          const result = unwrapToolResult(wrapped);
          appendLog(scenarioLogEl, 'result', truncate(JSON.stringify(result)));
        } catch (err) {
          appendLog(scenarioLogEl, 'error', err.message);
          break;
        }
        await sleep(600);
      }
    }
  } finally {
    scenarioRunning = false;
    document.querySelectorAll('[data-scenario]').forEach(b => b.disabled = false);
  }
}

document.querySelectorAll('[data-scenario]').forEach(btn => {
  btn.addEventListener('click', () => runScenario(btn.getAttribute('data-scenario')));
});
