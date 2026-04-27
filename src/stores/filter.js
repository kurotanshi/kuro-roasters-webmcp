import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import { searchProducts } from '../data.js';

// 商品篩選 store：reactive filter 物件 + computed 結果列表。
// tool 呼叫進來改 filter 也好、使用者打字也好，畫面都自動跟著動。
export const useFilterStore = defineStore('filter', () => {
  const filter = reactive({ query: '', origin: '', roast: '' });

  const filtered = computed(() => searchProducts({
    query: filter.query || undefined,
    origin: filter.origin || undefined,
    roast: filter.roast || undefined
  }));

  // tool 執行時把 args 反映到 UI 篩選欄。回傳是否真的有變更，給呼叫端決定要不要 flash
  function applyArgs(args) {
    if (!args) return false;
    let changed = false;
    if ('query' in args)  { filter.query  = args.query  || ''; changed = true; }
    if ('origin' in args) { filter.origin = args.origin || ''; changed = true; }
    if ('roast' in args)  { filter.roast  = args.roast  || ''; changed = true; }
    return changed;
  }

  function reset() {
    filter.query = '';
    filter.origin = '';
    filter.roast = '';
  }

  return { filter, filtered, applyArgs, reset };
});
