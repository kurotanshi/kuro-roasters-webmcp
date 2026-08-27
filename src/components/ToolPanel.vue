<script setup>
import { storeToRefs } from 'pinia';
import { useToolsStore }  from '../stores/tools.js';
import { useOutputStore } from '../stores/output.js';

const toolsStore = useToolsStore();

const outputStore = useOutputStore();
const { text: output } = storeToRefs(outputStore);

// 手動觸發 Tool：給想單獨看 input/output 格式的讀者
async function manualTool(name) {
  try {
    let input = {};
    if (name === 'search_products') {
      const query = prompt('關鍵字（可留空）：');
      input = query ? { query } : {};
    } else if (name === 'get_product') {
      const id = prompt('商品 id（1-8）：');
      if (id == null) return;
      input = { id: Number(id) };
    } else if (name === 'add_to_cart') {
      const id = prompt('商品 id（1-8）：');
      if (id == null) return;
      const qty = prompt('數量（預設 1）：') || '1';
      input = { id: Number(id), quantity: Number(qty) };
    }
    const result = await toolsStore.executeRegisteredTool(name, input);
    outputStore.show(result);
  } catch (err) {
    outputStore.show({ error: err.message });
  }
}
</script>

<template>
  <section>
    <h2>手動觸發 Tool</h2>
    <p class="hint">如果想一次呼叫一個 tool 看 input / output 格式，用下面的按鈕。這跟 Agent 實際呼叫的資料結構一致。</p>
    <div class="tool-grid">
      <button class="ghost" @click="manualTool('search_products')">search_products</button>
      <button class="ghost" @click="manualTool('get_product')">get_product</button>
      <button class="ghost" @click="manualTool('add_to_cart')">add_to_cart</button>
      <button class="ghost" @click="manualTool('view_cart')">view_cart</button>
      <button class="ghost" @click="manualTool('place_order')">place_order</button>
    </div>
    <pre>{{ output }}</pre>
  </section>
</template>
