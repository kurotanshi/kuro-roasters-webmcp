// 使用者直接操作 UI 的事件處理 + 共用的小輔助函式。
[queryEl, originEl, roastEl].forEach(el => {
  el.addEventListener('input', renderProducts);
  el.addEventListener('change', renderProducts);
});

gridEl.addEventListener('click', e => {
  const addId = e.target.getAttribute('data-add');
  if (addId) {
    const result = addToCart(addId, 1);
    showOutput(result);
  }
});

cartEl.addEventListener('click', e => {
  const removeId = e.target.getAttribute('data-remove');
  if (removeId) removeFromCart(removeId);
  if (e.target.id === 'cart-clear') {
    if (confirm('清空購物車？')) clearCart();
  }
  if (e.target.id === 'cart-checkout') {
    const result = performCheckout();
    showOutput(result);
  }
});

function performCheckout() {
  if (cart.length === 0) {
    return { status: 'empty', message: '購物車是空的' };
  }
  const snapshot = viewCart();
  if (!confirm(`確定以 ${formatPrice(snapshot.total)} 結帳嗎？`)) {
    return { status: 'cancelled' };
  }
  const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();
  clearCart();
  return { status: 'placed', orderId, ...snapshot };
}

function showOutput(data) {
  outputEl.textContent = JSON.stringify(data, null, 2);
}

// Tool UI 反饋輔助：tool 執行完在畫面上做視覺提示
function flashElement(el) {
  if (!el) return;
  el.classList.remove('highlight-flash');
  void el.offsetWidth; // 強制重繪觸發動畫
  el.classList.add('highlight-flash');
}

function reflectFilterArgsOnUI(args) {
  if (!args) return;
  let changed = false;
  if ('query' in args)  { queryEl.value  = args.query  || ''; changed = true; }
  if ('origin' in args) { originEl.value = args.origin || ''; changed = true; }
  if ('roast' in args)  { roastEl.value  = args.roast  || ''; changed = true; }
  if (changed) {
    renderProducts();
    flashElement(document.querySelector('.filter-bar'));
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function truncate(text, max = 240) {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

// 共用 log 元件：scenarios.js 與 chat.js 都會呼叫
function appendLog(el, type, text) {
  const empty = el.querySelector('.agent-log-empty');
  if (empty) empty.remove();
  const line = document.createElement('div');
  line.className = `agent-log-line ${type}`;
  const labels = { user: '使用者', think: 'Agent', call: 'Tool Call', result: 'Result', error: 'Error' };
  line.innerHTML = '<span class="label"></span><span class="content"></span>';
  line.querySelector('.label').textContent = labels[type] || type;
  line.querySelector('.content').textContent = text;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}
