import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import { searchProducts } from '../data.js';

// 商品篩選 store：reactive filter 物件 + computed 結果列表。
// tool 呼叫進來改 filter 也好、使用者打字也好，畫面都自動跟著動。
export const useFilterStore = defineStore('filter', () => {
  const filter = reactive({ query: '', origin: '', roast: '', maxPrice: '' });

  const filtered = computed(() => searchProducts({
    query: filter.query || undefined,
    origin: filter.origin || undefined,
    roast: filter.roast || undefined,
    maxPrice: filter.maxPrice === '' ? undefined : filter.maxPrice
  }));

  // tool 執行時把 args 反映到 UI 篩選欄。回傳是否真的有變更，給呼叫端決定要不要 flash
  function applyArgs(args) {
    if (!args) return false;
    const next = {
      query: args.query || '',
      origin: args.origin || '',
      roast: args.roast || '',
      maxPrice: args.maxPrice ?? ''
    };
    const changed = Object.keys(next).some(key => filter[key] !== next[key]);
    Object.assign(filter, next);
    return changed;
  }

  function reset() {
    filter.query = '';
    filter.origin = '';
    filter.roast = '';
    filter.maxPrice = '';
  }

  return { filter, filtered, applyArgs, reset };
});
