// 模組層共享的狀態、DOM 參照與小型 util。
// 全站 JS 最終會被 build 成同一支 <script>，所以這些 const/let 都是 global scope。
const CART_KEY = 'webmcp-demo-cart';
let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
let lastFilter = {};

const statusEl = document.getElementById('status');
const statusTextEl = document.getElementById('status-text');
const gridEl = document.getElementById('product-grid');
const cartEl = document.getElementById('cart');
const outputEl = document.getElementById('output');
const queryEl = document.getElementById('filter-query');
const originEl = document.getElementById('filter-origin');
const roastEl = document.getElementById('filter-roast');

// 從 PRODUCTS 抽出產地，填到 <select> 選項裡
[...new Set(PRODUCTS.map(p => p.origin))].sort().forEach(origin => {
  const opt = document.createElement('option');
  opt.value = origin;
  opt.textContent = origin;
  originEl.appendChild(opt);
});

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatPrice(n) {
  return 'NT$' + n.toLocaleString('zh-TW');
}
