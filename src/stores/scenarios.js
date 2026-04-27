import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useToolsStore } from './tools.js';
import { useCartStore } from './cart.js';
import { useFilterStore } from './filter.js';
import { useAgentLogStore } from './logs.js';

// 模擬 Agent 操作 store：寫死的腳本，給不想貼 API key 的讀者體驗 tool call 流程。
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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const truncate = (text, max = 240) => text.length <= max ? text : text.slice(0, max) + '…';

export const useScenariosStore = defineStore('scenarios', () => {
  const tools  = useToolsStore();
  const cart   = useCartStore();
  const filter = useFilterStore();
  const log    = useAgentLogStore();

  const running = ref(false);

  async function run(scenarioId) {
    if (running.value) return;
    if (scenarioId === 'reset') {
      cart.clearCart();
      filter.reset();
      log.clear();
      log.append('user', '重置畫面與購物車');
      log.append('result', '完成');
      return;
    }
    const steps = SCENARIOS[scenarioId];
    if (!steps) return;

    running.value = true;
    log.clear();

    try {
      for (const step of steps) {
        if (step.type === 'user') {
          log.append('user', step.text);
          await sleep(700);
        } else if (step.type === 'think') {
          log.append('think', step.text);
          await sleep(600);
        } else if (step.type === 'call') {
          const argText = step.args && Object.keys(step.args).length > 0
            ? `${step.tool}(${JSON.stringify(step.args)})`
            : `${step.tool}()`;
          log.append('call', argText);
          try {
            const wrapped = await tools.executeRegisteredTool(step.tool, step.args || {});
            const result = tools.unwrapToolResult(wrapped);
            log.append('result', truncate(JSON.stringify(result)));
          } catch (err) {
            log.append('error', err.message);
            break;
          }
          await sleep(600);
        }
      }
    } finally {
      running.value = false;
    }
  }

  return { running, run };
});
