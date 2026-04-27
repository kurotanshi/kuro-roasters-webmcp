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
    <h2>真的跟 Agent 對話（需要 Gemini API Key）</h2>
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
            <option value="gemini-2.5-flash">Gemini 2.5 Flash（便宜快速，有免費額度）</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro（更聰明）</option>
          </select>
        </div>
        <div class="form-row">
          <button class="small" @click="chatStore.saveKey">儲存</button>
          <button class="ghost small danger" @click="chatStore.clearKey">清除金鑰</button>
          <span
            class="hint"
            style="align-self:center"
            :style="{ color: keyStatus.color }"
          >{{ keyStatus.text }}</span>
        </div>
        <div class="warn-banner">
          可以到 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a> 申請一把免費的 Gemini API key。
          金鑰只會存在你自己瀏覽器的 <code>localStorage</code>，從瀏覽器直接打
          <code>generativelanguage.googleapis.com</code>，不經過這個站的伺服器。
          公開電腦請用完後按「清除金鑰」。
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
        <p class="hint">Agent 會透過這頁註冊的 5 個 WebMCP tool 實際操作畫面，加入購物車或結帳仍會跳確認視窗。</p>
        <button class="ghost small" @click="chatStore.reset">清空對話</button>
      </div>
    </div>
  </section>
</template>
