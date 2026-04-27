import { defineStore } from 'pinia';
import { reactive, nextTick } from 'vue';
import { useTimeoutFn } from '@vueuse/core';

// 觸發短暫的視覺 highlight（搭配 .highlight-flash CSS 動畫）。
// useTimeoutFn 自動處理 timer cancel：再次 start 會清掉前一個 pending 的 callback，
// 不會像手寫 setTimeout 那樣在連續觸發時被舊 timer 提早關掉動畫。
export const useFlashStore = defineStore('flash', () => {
  const active = reactive({ filter: false, cart: false });

  const closeFilter = useTimeoutFn(() => { active.filter = false; }, 900, { immediate: false });
  const closeCart   = useTimeoutFn(() => { active.cart   = false; }, 900, { immediate: false });
  const closers = { filter: closeFilter, cart: closeCart };

  function flash(key) {
    closers[key].stop();          // 取消前一輪殘留的 timer
    active[key] = false;
    nextTick(() => {              // 強制走一輪 false → true，動畫才會重播
      active[key] = true;
      closers[key].start();
    });
  }

  return { active, flash };
});
