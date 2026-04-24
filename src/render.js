// 把 PRODUCTS / cart 的狀態繪到畫面上。
function renderProducts() {
  const filter = {
    query: queryEl.value.trim() || undefined,
    origin: originEl.value || undefined,
    roast: roastEl.value || undefined
  };
  lastFilter = filter;
  const results = searchProducts(filter);
  gridEl.innerHTML = '';
  if (results.length === 0) {
    gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:2rem">沒有符合條件的商品</div>';
    return;
  }
  for (const p of results) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="name">${escapeHtml(p.name)}</div>
      <div class="meta">
        <span class="tag">${escapeHtml(p.origin)}</span>
        <span class="tag">${escapeHtml(p.roast)}</span>
      </div>
      <div class="flavor">${escapeHtml(p.flavor)}</div>
      <div class="price-row">
        <span class="price">${formatPrice(p.price)}</span>
        <button class="small" data-add="${p.id}">加入購物車</button>
      </div>
    `;
    gridEl.appendChild(card);
  }
}

function renderCart() {
  if (cart.length === 0) {
    cartEl.innerHTML = '<div class="cart-empty">購物車是空的</div>';
    return;
  }
  const total = cart.reduce((s, item) => s + item.price * item.quantity, 0);
  cartEl.innerHTML = `
    ${cart.map(item => `
      <div class="cart-item">
        <div>
          <div>${escapeHtml(item.name)}</div>
          <div style="font-size:0.8125rem;color:var(--muted)">
            ${formatPrice(item.price)} × ${item.quantity}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem">
          <span>${formatPrice(item.price * item.quantity)}</span>
          <button class="danger small" data-remove="${item.id}">移除</button>
        </div>
      </div>
    `).join('')}
    <div class="cart-total">
      <span>合計</span>
      <span>${formatPrice(total)}</span>
    </div>
    <div class="cart-actions">
      <button class="ghost small" id="cart-clear">清空</button>
      <button id="cart-checkout">結帳</button>
    </div>
  `;
}
