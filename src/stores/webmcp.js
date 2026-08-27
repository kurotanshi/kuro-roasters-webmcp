import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { useToolsStore } from './tools.js';

// WebMCP 註冊 store：document.modelContext 是目前標準入口。
export const useWebMcpStore = defineStore('webmcp', () => {
  const tools = useToolsStore();
  // status.kind ∈ {'detecting' | 'ready' | 'none'}，模板用 :class 直接掛
  const status = reactive({ kind: 'detecting', text: '偵測中…' });
  let registrationController;

  async function register() {
    cleanup();
    const context = document.modelContext;
    if (!context || typeof context.registerTool !== 'function') {
      status.kind = 'none';
      status.text = 'document.modelContext 不可用';
      return false;
    }

    const controller = new AbortController();
    registrationController = controller;
    status.kind = 'detecting';
    status.text = '正在註冊 WebMCP tools…';

    try {
      await Promise.all(tools.TOOL_DEFS.map(def => context.registerTool({
        name: def.name,
        title: def.title,
        description: def.description,
        inputSchema: def.inputSchema,
        annotations: def.annotations,
        execute: def.execute
      }, { signal: controller.signal })));

      if (registrationController !== controller) return false;
      status.kind = 'ready';
      status.text = `document.modelContext 已註冊 ${tools.TOOL_DEFS.length} 個 tool`;
      return true;
    } catch (err) {
      if (registrationController !== controller) return false;
      controller.abort();
      registrationController = undefined;
      status.kind = 'none';
      status.text = `WebMCP 註冊失敗：${err?.message || String(err)}`;
      return false;
    }
  }

  function cleanup() {
    registrationController?.abort();
    registrationController = undefined;
  }

  return { status, register, cleanup };
});
