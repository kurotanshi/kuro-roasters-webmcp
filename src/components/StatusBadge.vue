<script setup>
// WebMCP 註冊狀態小膠囊。直接吃 store 回傳的 status reactive 物件。
defineProps({
  status: { type: Object, required: true }
});
</script>

<template>
  <div class="status" :class="status.kind">
    <span class="dot"></span>
    <span>{{ status.text }}</span>
  </div>
</template>
