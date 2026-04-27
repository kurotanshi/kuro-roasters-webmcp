<script setup>
// scenarios / chat 共用的 log 顯示元件。父層傳 lines 進來，empty 狀態自己顯示。
defineProps({
  lines: { type: Array, required: true },
  emptyText: { type: String, required: true }
});

const LABELS = {
  user:   '使用者',
  think:  'Agent',
  call:   'Tool Call',
  result: 'Result',
  error:  'Error'
};
</script>

<template>
  <div class="agent-log">
    <div v-if="lines.length === 0" class="agent-log-empty">{{ emptyText }}</div>
    <div
      v-for="line in lines"
      :key="line.id"
      class="agent-log-line"
      :class="line.type"
    >
      <span class="label">{{ LABELS[line.type] || line.type }}</span>
      <span class="content">{{ line.text }}</span>
    </div>
  </div>
</template>
