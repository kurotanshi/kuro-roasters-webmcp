import { defineStore } from 'pinia';
import { getProduct, searchProducts, formatPrice } from '../data.js';
import { useCartStore } from './cart.js';
import { useFilterStore } from './filter.js';
import { useFlashStore } from './flash.js';

// WebMCP tool 定義 store。
// 同一份 TOOL_DEFS 會被四條路徑讀到：
// 1. webmcp store 透過 navigator.modelContext.registerTool（原生）
// 2. @mcp-b/global polyfill（同樣透過 navigator.modelContext）
// 3. chat store 的 getGeminiTools() 轉成 Gemini functionDeclarations
// 4. 模擬腳本與手動觸發面板，直接 call executeRegisteredTool
export const useToolsStore = defineStore('tools', () => {
  const cart   = useCartStore();
  const filter = useFilterStore();
  const flash  = useFlashStore();

  const TOOL_DEFS = [
    {
      name: 'search_products',
      description: '搜尋咖啡豆。可用關鍵字（比對 name 與 flavor）、產地、烘焙度、價格上限過濾。執行後頁面篩選條件會跟著更新。',
      inputSchema: {
        type: 'object',
        properties: {
          query:    { type: 'string', description: '搜尋關鍵字，會比對名稱與風味描述' },
          origin:   { type: 'string', description: '產地，例如：衣索比亞、肯亞、巴拿馬' },
          roast:    { type: 'string', enum: ['淺焙', '中焙', '深焙'], description: '烘焙度' },
          maxPrice: { type: 'number', description: '價格上限（TWD）' }
        }
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const args = input || {};
        if (filter.applyArgs(args)) flash.flash('filter');
        const results = searchProducts(args);
        return { content: [{ type: 'text', text: JSON.stringify(results) }] };
      }
    },
    {
      name: 'get_product',
      description: '依 id 取得單一咖啡豆的完整資訊（產地、烘焙度、風味、價格）。',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'number', description: '商品 id' } },
        required: ['id']
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        try {
          return { content: [{ type: 'text', text: JSON.stringify(getProduct(input.id)) }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }] };
        }
      }
    },
    {
      name: 'add_to_cart',
      description: '把指定商品加入購物車。會跳出確認視窗讓使用者核准後才真的加入，使用者取消會回傳 cancelled。',
      inputSchema: {
        type: 'object',
        properties: {
          id:       { type: 'number', description: '商品 id' },
          quantity: { type: 'number', description: '數量，預設 1', minimum: 1 }
        },
        required: ['id']
      },
      execute: async (input, client) => {
        const product = (() => { try { return getProduct(input.id); } catch { return null; } })();
        if (!product) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'product not found' }) }] };
        }
        const qty = input.quantity || 1;
        const confirmed = await client.requestUserInteraction(async () => {
          return window.confirm(
            `Agent 想把「${product.name}」×${qty}（${formatPrice(product.price * qty)}）加入購物車，確定嗎？`
          );
        });
        if (!confirmed) {
          return { content: [{ type: 'text', text: JSON.stringify({ status: 'cancelled' }) }] };
        }
        const result = cart.addToCart(input.id, qty);
        flash.flash('cart');
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }
    },
    {
      name: 'view_cart',
      description: '取得目前購物車內容、商品數、合計金額。',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => {
        flash.flash('cart');
        return { content: [{ type: 'text', text: JSON.stringify(cart.viewCart()) }] };
      }
    },
    {
      name: 'checkout',
      description: '結帳，送出購物車所有項目成為一張訂單。會跳出確認視窗顯示總金額，使用者取消會回傳 cancelled。',
      inputSchema: { type: 'object', properties: {} },
      execute: async (input, client) => {
        const snapshot = cart.viewCart();
        if (snapshot.items.length === 0) {
          return { content: [{ type: 'text', text: JSON.stringify({ status: 'empty' }) }] };
        }
        const confirmed = await client.requestUserInteraction(async () => {
          return window.confirm(
            `Agent 準備送出訂單，總金額 ${formatPrice(snapshot.total)}，確定結帳嗎？`
          );
        });
        if (!confirmed) {
          return { content: [{ type: 'text', text: JSON.stringify({ status: 'cancelled' }) }] };
        }
        const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();
        cart.clearCart();
        return {
          content: [{ type: 'text', text: JSON.stringify({ status: 'placed', orderId, ...snapshot }) }]
        };
      }
    }
  ];

  // 不靠 navigator.modelContext 的內部呼叫路徑：手動面板、模擬腳本、Gemini loop 都走這裡。
  // mockClient 給 requestUserInteraction 一個最小實作，真實 Agent runtime 會包更多 UI。
  async function executeRegisteredTool(name, input) {
    const def = TOOL_DEFS.find(t => t.name === name);
    if (!def) throw new Error(`unknown tool: ${name}`);
    const mockClient = {
      requestUserInteraction: async (fn) => await fn()
    };
    return await def.execute(input || {}, mockClient);
  }

  function unwrapToolResult(wrapped) {
    if (wrapped?.content?.[0]?.text !== undefined) {
      try { return JSON.parse(wrapped.content[0].text); }
      catch { return wrapped.content[0].text; }
    }
    return wrapped;
  }

  return { TOOL_DEFS, executeRegisteredTool, unwrapToolResult };
});
