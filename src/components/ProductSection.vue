<script setup>
import { storeToRefs } from 'pinia';
import { ORIGINS, formatPrice } from '../data.js';
import { useFilterStore } from '../stores/filter.js';
import { useFlashStore }  from '../stores/flash.js';
import { useCartStore }   from '../stores/cart.js';
import { useOutputStore } from '../stores/output.js';

// storeToRefs：把 store 的 state / getters 解構成 ref 但保留 reactivity；
// actions（function）可以直接從 store 解構，不需要 storeToRefs。
const filterStore = useFilterStore();
const { filter, filtered } = storeToRefs(filterStore);

const flashStore = useFlashStore();
const { active: flashActive } = storeToRefs(flashStore);

const cartStore = useCartStore();
const outputStore = useOutputStore();

// 商品卡片的「加入購物車」按鈕：直接走 cart store，不經 tool 流程（這是使用者親手點的）
function add(id) {
  const result = cartStore.addToCart(id, 1);
  outputStore.show(result);
}
</script>

<template>
  <section>
    <h2>咖啡豆清單</h2>
    <div class="filter-bar" :class="{ 'highlight-flash': flashActive.filter }">
      <input
        v-model="filter.query"
        type="text"
        placeholder="搜尋名稱或風味…"
        autocomplete="off"
      />
      <select v-model="filter.origin">
        <option value="">所有產地</option>
        <option v-for="o in ORIGINS" :key="o" :value="o">{{ o }}</option>
      </select>
      <select v-model="filter.roast">
        <option value="">所有烘焙度</option>
        <option value="淺焙">淺焙</option>
        <option value="中焙">中焙</option>
        <option value="深焙">深焙</option>
      </select>
      <input
        v-model.number="filter.maxPrice"
        type="number"
        min="0"
        max="100000"
        aria-label="最高價格（TWD）"
        placeholder="最高價格（TWD）"
      />
    </div>
    <div class="product-grid">
      <div
        v-if="filtered.length === 0"
        style="grid-column:1/-1;text-align:center;color:var(--muted);padding:2rem"
      >
        沒有符合條件的商品
      </div>
      <div
        v-for="p in filtered"
        :key="p.id"
        class="product-card"
      >
        <div class="name">{{ p.name }}</div>
        <div class="meta">
          <span class="tag">{{ p.origin }}</span>
          <span class="tag">{{ p.roast }}</span>
        </div>
        <div class="flavor">{{ p.flavor }}</div>
        <div class="price-row">
          <span class="price">{{ formatPrice(p.price) }}</span>
          <button class="small" @click="add(p.id)">加入購物車</button>
        </div>
      </div>
    </div>
  </section>
</template>
