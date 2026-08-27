import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { PRODUCTS } from '../src/data.js';
import { useCartStore } from '../src/stores/cart.js';
import { toGeminiTools } from '../src/stores/chat.js';
import { useFilterStore } from '../src/stores/filter.js';
import { useToolsStore } from '../src/stores/tools.js';

setActivePinia(createPinia());

const cart = useCartStore();
const filter = useFilterStore();
const tools = useToolsStore();
const run = (name, input = {}) => tools.executeRegisteredTool(name, input, { confirmWrites: false });

cart.clearCart();

assert.deepEqual(
  tools.TOOL_DEFS.map(tool => tool.name),
  ['search_products', 'get_product', 'add_to_cart', 'view_cart', 'place_order']
);
for (const tool of tools.TOOL_DEFS) {
  assert.ok(tool.title);
  assert.equal(tool.inputSchema.additionalProperties, false);
  assert.equal(typeof tool.annotations.readOnlyHint, 'boolean');
  assert.equal(typeof tool.annotations.untrustedContentHint, 'boolean');
}
const productIds = PRODUCTS.map(product => product.id);
for (const name of ['get_product', 'add_to_cart']) {
  const tool = tools.TOOL_DEFS.find(tool => tool.name === name);
  assert.deepEqual(tool.inputSchema.properties.id.enum, productIds);
}

const geminiDeclarations = toGeminiTools(tools.TOOL_DEFS)[0].functionDeclarations;
assert.equal(geminiDeclarations.length, 5);
assert.equal(geminiDeclarations[0].parameters, undefined);
assert.equal(geminiDeclarations[0].parametersJsonSchema.additionalProperties, false);

const products = await run('search_products', { origin: '衣索比亞' });
assert.equal(products.length, 2);
const budgetProducts = await run('search_products', { maxPrice: 500 });
assert.ok(budgetProducts.every(product => product.price <= 500));
assert.deepEqual(filter.filtered.map(product => product.id), budgetProducts.map(product => product.id));
assert.deepEqual(filter.filter, { query: '', origin: '', roast: '', maxPrice: 500 });
assert.equal((await run('get_product', { id: 1 })).name, '耶加雪菲 水洗');
await assert.rejects(run('get_product', { id: '1' }), /id must be an integer/);
await assert.rejects(run('get_product', { id: Math.max(...productIds) + 1 }), /id must be one of/);
await assert.rejects(run('add_to_cart', { id: 1, quantity: 100 }), /quantity must be an integer/);

await run('add_to_cart', { id: 1, quantity: 2 });
assert.deepEqual(await run('view_cart'), {
  items: [{ id: 1, name: '耶加雪菲 水洗', price: 480, quantity: 2 }],
  total: 960,
  itemCount: 2
});

const order = await run('place_order');
assert.equal(order.status, 'placed');
assert.match(order.orderId, /^ORD-/);
assert.equal((await run('view_cart')).itemCount, 0);

console.log('smoke: 5 tool contracts and cart flow passed');
