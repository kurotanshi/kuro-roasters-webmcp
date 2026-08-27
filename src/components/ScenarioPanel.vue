<script setup>
import { storeToRefs } from 'pinia';
import AgentLogList from './AgentLogList.vue';
import { useScenariosStore } from '../stores/scenarios.js';
import { useAgentLogStore }  from '../stores/logs.js';

const scenariosStore = useScenariosStore();
const { running } = storeToRefs(scenariosStore);

const logStore = useAgentLogStore();
const { lines } = storeToRefs(logStore);
</script>

<template>
  <section>
    <h2>模擬 Agent 操作</h2>
    <div class="agent-panel">
      <p class="hint" style="margin-top:0">
        按下情境按鈕，畫面會照一段「使用者說話 → Agent 思考 → 呼叫 tool → 畫面更新」的腳本跑過一遍，
        搜尋條件、購物車會自己動，遇到寫入類 tool 還會跳確認視窗。
        這是本頁直接執行相同工具定義的模擬；真正的 WebMCP 呼叫則由瀏覽器 Agent 發起並進行安全審查。
      </p>
      <div class="scenario-row">
        <button :disabled="running" @click="scenariosStore.run('light-roast')">
          🎬 情境 A：找 500 元以下的淺焙豆並加入購物車
        </button>
        <button :disabled="running" @click="scenariosStore.run('gesha-order')">
          🎬 情境 B：買一款藝伎並結帳
        </button>
      </div>
      <div class="scenario-row">
        <button class="ghost" :disabled="running" @click="scenariosStore.run('reset')">
          重置畫面狀態
        </button>
      </div>
      <AgentLogList :lines="lines" empty-text="尚未執行，選上面任一個情境開始" />
    </div>
  </section>
</template>
