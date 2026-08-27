import { defineStore } from 'pinia';
import { markRaw } from 'vue';
import { ORIGINS, PRODUCT_IDS, getProduct, searchProducts, formatPrice } from '../data.js';
import { useCartStore } from './cart.js';
import { useFilterStore } from './filter.js';
import { useFlashStore } from './flash.js';

// WebMCP tool 定義 store。
// 同一份 TOOL_DEFS 會被多條路徑讀到：
// 1. webmcp store 透過 document.modelContext.registerTool（原生 / polyfill）
// 2. chat store 的 getGeminiTools() 轉成 Gemini functionDeclarations
// 3. 模擬腳本與手動觸發面板，透過 executeRegisteredTool 本機執行
export const useToolsStore = defineStore('tools', () => {
  const cart   = useCartStore();
  const filter = useFilterStore();
  const flash  = useFlashStore();

  function normalizeInput(input) {
    const value = input ?? {};
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError('tool input must be an object');
    }
    return value;
  }

  function assertOnlyKeys(input, allowedKeys) {
    const unknown = Object.keys(input).find(key => !allowedKeys.includes(key));
    if (unknown) throw new TypeError(`unknown input property: ${unknown}`);
  }

  function parseProductId(value) {
    if (!Number.isInteger(value)) throw new RangeError('id must be an integer');
    if (!PRODUCT_IDS.includes(value)) throw new RangeError(`id must be one of: ${PRODUCT_IDS.join(', ')}`);
    return value;
  }

  function parseQuantity(value = 1) {
    if (!Number.isInteger(value) || value < 1 || value > 99) {
      throw new RangeError('quantity must be an integer between 1 and 99');
    }
    return value;
  }

  function parseSearchInput(input) {
    const args = normalizeInput(input);
    assertOnlyKeys(args, ['query', 'origin', 'roast', 'maxPrice']);
    if (args.query !== undefined && (typeof args.query !== 'string' || args.query.length > 100)) {
      throw new TypeError('query must be a string up to 100 characters');
    }
    if (args.origin !== undefined && !ORIGINS.includes(args.origin)) {
      throw new RangeError(`origin must be one of: ${ORIGINS.join(', ')}`);
    }
    if (args.roast !== undefined && !['淺焙', '中焙', '深焙'].includes(args.roast)) {
      throw new RangeError('roast must be 淺焙, 中焙, or 深焙');
    }
    if (args.maxPrice !== undefined && (
      typeof args.maxPrice !== 'number'
      || !Number.isFinite(args.maxPrice)
      || args.maxPrice < 0
      || args.maxPrice > 100000
    )) {
      throw new RangeError('maxPrice must be a finite number between 0 and 100000');
    }
    return args;
  }

  function parseProductInput(input, { quantity = false } = {}) {
    const args = normalizeInput(input);
    assertOnlyKeys(args, quantity ? ['id', 'quantity'] : ['id']);
    return {
      id: parseProductId(args.id),
      ...(quantity ? { quantity: parseQuantity(args.quantity) } : {})
    };
  }

  function parseEmptyInput(input) {
    const args = normalizeInput(input);
    assertOnlyKeys(args, []);
    return args;
  }

  function checkSignal(options) {
    options?.signal?.throwIfAborted?.();
  }

  const TOOL_DEFS = markRaw([
    {
      name: 'search_products',
      title: '搜尋咖啡豆',
      description: '搜尋咖啡豆。可用關鍵字（比對 name 與 flavor）、產地、烘焙度、價格上限過濾。執行後頁面篩選條件會跟著更新。',
      inputSchema: {
        type: 'object',
        properties: {
          query:    { type: 'string', maxLength: 100, description: '搜尋關鍵字，會比對名稱與風味描述' },
          origin:   { type: 'string', enum: ORIGINS, description: '咖啡豆產地' },
          roast:    { type: 'string', enum: ['淺焙', '中焙', '深焙'], description: '烘焙度' },
          maxPrice: { type: 'number', minimum: 0, maximum: 100000, description: '價格上限（TWD）' }
        },
        additionalProperties: false
      },
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: false
      },
      execute: async (input, options) => {
        checkSignal(options);
        const args = parseSearchInput(input);
        if (filter.applyArgs(args)) flash.flash('filter');
        return searchProducts(args);
      }
    },
    {
      name: 'get_product',
      title: '查看咖啡豆',
      description: '依 id 取得單一咖啡豆的完整資訊（產地、烘焙度、風味、價格）。',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', enum: PRODUCT_IDS, description: '商品 id' }
        },
        required: ['id'],
        additionalProperties: false
      },
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: false
      },
      execute: async (input, options) => {
        checkSignal(options);
        const { id } = parseProductInput(input);
        return getProduct(id);
      }
    },
    {
      name: 'add_to_cart',
      title: '加入購物車',
      description: '立即把指定商品與數量加入購物車，並更新使用者目前看到的購物車。',
      inputSchema: {
        type: 'object',
        properties: {
          id:       { type: 'integer', enum: PRODUCT_IDS, description: '商品 id' },
          quantity: { type: 'integer', minimum: 1, maximum: 99, description: '數量，預設 1' }
        },
        required: ['id'],
        additionalProperties: false
      },
      annotations: {
        readOnlyHint: false,
        untrustedContentHint: false
      },
      execute: async (input, options) => {
        checkSignal(options);
        const { id, quantity } = parseProductInput(input, { quantity: true });
        const result = cart.addToCart(id, quantity);
        flash.flash('cart');
        return result;
      }
    },
    {
      name: 'view_cart',
      title: '查看購物車',
      description: '取得目前購物車內容、商品數、合計金額。',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: false
      },
      execute: async (input, options) => {
        checkSignal(options);
        parseEmptyInput(input);
        flash.flash('cart');
        return cart.viewCart();
      }
    },
    {
      name: 'place_order',
      title: '送出訂單',
      description: '立即把目前購物車內容送出成為一張模擬訂單；成功後會清空購物車。',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: {
        readOnlyHint: false,
        untrustedContentHint: false
      },
      execute: async (input, options) => {
        checkSignal(options);
        parseEmptyInput(input);
        const snapshot = cart.viewCart();
        if (snapshot.items.length === 0) {
          return { status: 'empty' };
        }
        const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();
        cart.clearCart();
        return { status: 'placed', orderId, ...snapshot };
      }
    }
  ]);

  function confirmLocalExecution(name, input) {
    if (name === 'add_to_cart') {
      const { id, quantity } = parseProductInput(input, { quantity: true });
      const product = getProduct(id);
      return window.confirm(
        `模擬 Agent 想把「${product.name}」×${quantity}（${formatPrice(product.price * quantity)}）加入購物車，確定嗎？`
      );
    }
    if (name === 'place_order') {
      const snapshot = cart.viewCart();
      if (snapshot.items.length === 0) return true;
      return window.confirm(
        `模擬 Agent 準備送出訂單，總金額 ${formatPrice(snapshot.total)}，確定嗎？`
      );
    }
    return true;
  }

  // 情境、手動面板與 Gemini 模擬器不經過瀏覽器 agent 的安全審查，
  // 所以只在這條本機路徑自行確認寫入；原生 WebMCP 交給瀏覽器處理。
  async function executeRegisteredTool(name, input, { confirmWrites = true } = {}) {
    const def = TOOL_DEFS.find(t => t.name === name);
    if (!def) throw new Error(`unknown tool: ${name}`);
    if (confirmWrites && !confirmLocalExecution(name, input ?? {})) {
      return { status: 'cancelled' };
    }
    return def.execute(input ?? {});
  }

  return { TOOL_DEFS, executeRegisteredTool };
});
