import { defineStore } from 'pinia';
import { ref } from 'vue';

// 「手動觸發 Tool」面板下方的 <pre> 共用 output。
// 任何元件（ToolPanel 自己、ProductSection 加入購物車、CartSection 結帳）都可以 useOutputStore().show(...)
export const useOutputStore = defineStore('output', () => {
  const text = ref('還沒有輸出，按上面任一顆按鈕試試看。');

  function show(data) {
    text.value = JSON.stringify(data, null, 2);
  }

  return { text, show };
});
