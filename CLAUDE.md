# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Shape

Demo repo with two layers:
- `src/` is the canonical, hand-edited source — JS split into ~10 focused files, CSS separate, HTML template with `{{STYLES}}` / `{{SCRIPT}}` markers.
- `index.html` at the repo root is the **built artifact** (~1200 lines, JS+CSS inlined) that GitHub Pages serves. **Don't hand-edit it** — it will be overwritten by the next `npm run build`.

`vendor/mcp-b-global.iife.js` (~250KB) is the committed WebMCP polyfill — don't replace with a CDN reference; deploys ship it as-is so the demo works offline.

## Commands

- `npm run build` — runs `scripts/build.mjs`, which concatenates `src/*.css` + `src/*.js` into `index.html` using `src/index.template.html` as the shell.
- `npm run dev` — runs build, then `npx serve .` on port 3000. Always run build before serving so edits in `src/` take effect.
- `python3 -m http.server 8080` — alternative static server after a build.
- No tests, no lint, no typecheck — changes are verified by opening the page in a browser.

## Architecture: the `TOOL_DEFS` single source of truth

All five tools (`search_products`, `get_product`, `add_to_cart`, `view_cart`, `checkout`) are defined exactly once in `src/tools.js` as `TOOL_DEFS`. Four independent call paths all read from this same array — if you add or rename a tool, every path updates automatically:

1. **Native WebMCP runtime** — `registerWebMcpTools()` in `src/webmcp.js` iterates `TOOL_DEFS` and calls `navigator.modelContext.registerTool(def)` for each.
2. **Polyfill fallback** — same registration path; `@mcp-b/global` provides `navigator.modelContext` when the browser lacks it. The polyfill is configured with `nativeModelContextBehavior: 'preserve'` in `src/index.template.html` so it no-ops when Chrome 146+ Canary exposes the native API.
3. **Gemini function calling** — `getGeminiTools()` / `runChatLoop()` in `src/chat.js` map each `TOOL_DEFS` entry to a Gemini `functionDeclarations` entry (name, description, inputSchema → parameters), then loop up to 6 iterations executing tool calls through `executeRegisteredTool()`.
4. **Manual panel + scripted scenarios** — `src/tools.js` (manual buttons) and `src/scenarios.js` (pre-baked scripts) call `executeRegisteredTool()` with a mock client whose `requestUserInteraction(fn)` just runs `fn()` immediately.

Because every tool's `execute` function calls side-effect helpers like `reflectFilterArgsOnUI()`, `flashElement()`, `renderCart()`, and `window.confirm`, the live DOM stays in sync regardless of which path invoked the tool.

## Architecture: how `src/` pieces fit together

The build concatenates `src/*.js` into one `<script>` block at the bottom of `<body>`, so every file shares one global scope. Order (hardcoded in `scripts/build.mjs`):

1. `data.js` — `PRODUCTS` array + `matchRoast` (treats `中淺焙` as matching a `淺焙` filter — preserve this when editing search logic).
2. `state.js` — `CART_KEY`, cart state, DOM element refs (`statusEl`, `gridEl`, `cartEl`, `queryEl`, `originEl`, `roastEl`, …), `saveCart`, `escapeHtml`, `formatPrice`, origin `<option>` hydration.
3. `cart.js` — pure cart/search logic: `searchProducts`, `getProduct`, `addToCart`, `viewCart`, `removeFromCart`, `clearCart`.
4. `render.js` — `renderProducts`, `renderCart`.
5. `ui.js` — user-driven event wiring (filter inputs, product cards, cart buttons), `performCheckout`, `flashElement`, `reflectFilterArgsOnUI`, `sleep`, `truncate`, `appendLog` (shared by scenarios + chat), `showOutput`.
6. `tools.js` — `TOOL_DEFS` + `executeRegisteredTool` + `unwrapToolResult` + manual-tool button wiring.
7. `scenarios.js` — `SCENARIOS` scripts + `runScenario` + event wiring for scenario buttons.
8. `chat.js` — Gemini API key/model storage, chat input UI, `runChatLoop`, `callGeminiAPI`.
9. `webmcp.js` — `registerWebMcpTools` + `waitForWebMcp` polyfill-ready polling.
10. `init.js` — the only file with top-level side effects at the real "start": `renderProducts()`, `renderCart()`, `updateKeyStatus()`, `waitForWebMcp()`.

This order is important because `state.js` grabs DOM refs that the HTML must already define, and `init.js` calls functions that must already be declared. Every other file only *defines* functions and attaches listeners — safe to concatenate in any order among themselves, but the listed order matches how a reader would naturally traverse the code.

## Architecture: state

- `PRODUCTS` is in-memory, 8 hardcoded coffee beans.
- Cart state persists in `localStorage` under `webmcp-demo-cart` (`CART_KEY`, `src/state.js`). `saveCart()` is called from every mutating helper.
- Gemini API key and selected model live in `localStorage` under `API_KEY_STORAGE` and `MODEL_STORAGE` (`src/chat.js`). Calls go directly from the browser to `generativelanguage.googleapis.com` with an `x-goog-api-key` header — no proxy server. Do not add one without discussing.

## Build script gotcha

`scripts/build.mjs` uses `String.prototype.replace` with a **function replacer**, not a string replacement, to inline `{{STYLES}}` and `{{SCRIPT}}`. This matters because the source contains literal `$'` (in `'NT$'` inside `formatPrice`), and the string-replacement form would treat `$'` as the special "substring after the match" pattern and corrupt the output. Keep the replacer as a function.

## Deployment

GitHub Pages, `main` branch root. The public URL is `https://kuro.tw/kuro-roasters-webmcp/` via the `kurotanshi.github.io` custom domain — a subpath. Always use relative paths (`./vendor/...`) for assets: an absolute `/vendor/...` resolves to `kuro.tw/vendor/...` in production and 404s.

Commit both `src/` and the regenerated `index.html`. GitHub Pages serves the prebuilt file, so drift between them would ship broken. If you change any `src/` file, run `npm run build` before committing.

## Editing conventions

- Canonical source is `src/`. Never hand-edit root `index.html` — re-run `npm run build`.
- When the tool surface changes: append to `TOOL_DEFS` in `src/tools.js`, include `inputSchema` in JSON-Schema form (Gemini consumes it as `parameters`), mark read-only tools with `annotations: { readOnlyHint: true }`, and have writes go through `client.requestUserInteraction` so the confirmation flow survives under a real Agent runtime.
- When adding a new JS file to `src/`: also add it to `SCRIPT_FILES` in `scripts/build.mjs` at the right position — otherwise it won't be inlined.
- Comments and UI copy are in Traditional Chinese (zh-TW). Match that voice when editing.
- The whole point of this repo is readable, zero-framework WebMCP source. Don't introduce a bundler, module system, or framework — the build is intentionally a cat-with-markers.
