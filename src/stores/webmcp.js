import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { useToolsStore } from './tools.js';

// WebMCP 註冊 store：原生 navigator.modelContext 優先，沒有再退到 @mcp-b/global polyfill。
export const useWebMcpStore = defineStore('webmcp', () => {
  const tools = useToolsStore();
  // status.kind ∈ {'detecting' | 'native' | 'polyfill' | 'none'}，模板用 :class 直接掛
  const status = reactive({ kind: 'detecting', text: '偵測中…' });

  function register() {
    if (!('modelContext' in navigator)) {
      status.kind = 'none';
      status.text = 'navigator.modelContext 不可用';
      return;
    }
    for (const def of tools.TOOL_DEFS) {
      navigator.modelContext.registerTool({
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema,
        annotations: def.annotations,
        execute: def.execute
      });
    }
    // @mcp-b/global 會把自己包成 BrowserMcpServer 掛在 navigator.modelContext，
    // 真正的 WebMCP 實作放在 .native slot；polyfill 在那層打 __isWebMCPPolyfill marker。
    const impl = navigator.modelContext;
    const isPolyfill = Boolean(impl?.native?.__isWebMCPPolyfill);
    status.kind = isPolyfill ? 'polyfill' : 'native';
    status.text = isPolyfill
      ? `以 @mcp-b/global polyfill 啟用，已註冊 ${tools.TOOL_DEFS.length} 個 tool`
      : `navigator.modelContext 原生可用，已註冊 ${tools.TOOL_DEFS.length} 個 tool`;
  }

  // polyfill IIFE 在 <head> 載入，但 autoInitialize 有時要幾十毫秒才把 navigator.modelContext 掛上
  function waitFor(tries = 20) {
    if ('modelContext' in navigator) {
      register();
    } else if (tries > 0) {
      setTimeout(() => waitFor(tries - 1), 50);
    } else {
      status.kind = 'none';
      status.text = 'navigator.modelContext 不可用（polyfill 載入失敗？）';
    }
  }

  return { status, waitFor };
});
