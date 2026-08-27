<script setup>
import { storeToRefs } from 'pinia';
import AgentLogList from './AgentLogList.vue';
import { useChatStore }    from '../stores/chat.js';
import { useChatLogStore } from '../stores/logs.js';

const chatStore = useChatStore();
const {
  pendingKey, model, inputText, configOpen,
  canSend, keyStatus
} = storeToRefs(chatStore);

const logStore = useChatLogStore();
const { lines } = storeToRefs(logStore);
</script>

<template>
  <section>
    <h2>Gemini function calling 模擬器（需要 API Key）</h2>
    <div class="chat-panel">
      <!-- @toggle 那行靠 Vue 模板編譯器把 `configOpen = X` 自動翻成 `configOpen.value = X`
           （configOpen 是上面 storeToRefs 解構出來的 ref）。 -->
      <details
        :open="configOpen"
        @toggle="configOpen = $event.target.open"
      >
        <summary>設定 API Key 與模型</summary>
        <div class="form-row" style="margin-top:0.75rem">
          <input
            v-model="pendingKey"
            type="password"
            placeholder="AIzaSy..."
            autocomplete="off"
          />
          <select v-model="model">
            <option value="gemini-3.7-flash">Gemini 3.7 Flash（最新穩定版）</option>
            <option value="gemini-3.6-flash">Gemini 3.6 Flash（穩定版）</option>
          </select>
        </div>
        <div class="form-row">
          <button class="small" @click="chatStore.saveKey">套用</button>
          <button class="ghost small danger" @click="chatStore.clearKey">清除金鑰</button>
          <span
            class="hint"
            style="align-self:center"
            :style="{ color: keyStatus.color }"
          >{{ keyStatus.text }}</span>
        </div>
        <div class="warn-banner">
          可以到 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a> 申請一把免費的 Gemini API key。
          金鑰只留在目前分頁的記憶體，重新整理即清除。請求會從瀏覽器直接送到
          <code>generativelanguage.googleapis.com</code>，不經過這個站的伺服器。
        </div>
      </details>

      <AgentLogList
        :lines="lines"
        empty-text="設定好 API key 後，試試看跟它說「幫我找衣索比亞的豆子」之類的需求"
      />

      <div class="chat-input-row">
        <input
          v-model="inputText"
          type="text"
          placeholder="想請 Agent 幫你做什麼？"
          autocomplete="off"
          :disabled="!canSend"
          @keydown.enter.prevent="chatStore.send"
        />
        <button :disabled="!canSend" @click="chatStore.send">送出</button>
      </div>
      <div class="chat-meta-row">
        <p class="hint">這是把相同工具定義轉成 Gemini function declarations 後在本頁直接執行的模擬，不是瀏覽器 Site tools；寫入操作仍會先跳確認視窗。</p>
        <button class="ghost small" @click="chatStore.reset">清空對話</button>
      </div>
    </div>
  </section>
</template>
