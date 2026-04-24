// WebMCP 註冊：Chrome 146+ Canary 原生就有 navigator.modelContext，其他瀏覽器靠 @mcp-b/global polyfill 補上
function registerWebMcpTools() {
  if (!('modelContext' in navigator)) {
    statusEl.className = 'status none';
    statusTextEl.textContent = 'navigator.modelContext 不可用';
    return;
  }
  for (const def of TOOL_DEFS) {
    navigator.modelContext.registerTool({
      name: def.name,
      description: def.description,
      inputSchema: def.inputSchema,
      annotations: def.annotations,
      execute: def.execute
    });
  }
  // @mcp-b/global 實際把自己包成 BrowserMcpServer 掛在 navigator.modelContext，
  // 真正的 WebMCP 實作放在 .native slot。polyfill 會在那層打 __isWebMCPPolyfill marker，
  // 所以要穿過一層才能辨識是 polyfill 還是瀏覽器原生
  const impl = navigator.modelContext;
  const isPolyfill = Boolean(impl?.native?.__isWebMCPPolyfill);
  statusEl.className = isPolyfill ? 'status polyfill' : 'status native';
  statusTextEl.textContent = isPolyfill
    ? `以 @mcp-b/global polyfill 啟用，已註冊 ${TOOL_DEFS.length} 個 tool`
    : `navigator.modelContext 原生可用，已註冊 ${TOOL_DEFS.length} 個 tool`;
}

// polyfill IIFE 在 <head> 載入，但 autoInitialize 有時要幾十毫秒才把 navigator.modelContext 掛上，所以輪詢幾次
function waitForWebMcp(tries = 20) {
  if ('modelContext' in navigator) {
    registerWebMcpTools();
  } else if (tries > 0) {
    setTimeout(() => waitForWebMcp(tries - 1), 50);
  } else {
    statusEl.className = 'status none';
    statusTextEl.textContent = 'navigator.modelContext 不可用（polyfill 載入失敗？）';
  }
}
