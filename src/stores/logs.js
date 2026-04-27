import { defineStore } from 'pinia';
import { ref } from 'vue';

// scenarios / chat 各自需要一份 log。Pinia 允許用同一個 setup function 註冊兩個獨立 store，
// 各自吃自己的 state instance。
function logSetup() {
  const lines = ref([]);
  let nextId = 0;

  function append(type, text) {
    lines.value.push({ id: ++nextId, type, text });
  }

  function clear() {
    lines.value = [];
  }

  return { lines, append, clear };
}

export const useAgentLogStore = defineStore('agentLog', logSetup);
export const useChatLogStore  = defineStore('chatLog',  logSetup);
