// 純資料層操作：商品查詢 + 購物車 CRUD。
// 這些函式會被 UI 事件、手動按鈕、tools.js 的 execute 都呼叫。
function searchProducts({ query, origin, roast, maxPrice } = {}) {
  const q = (query || '').trim().toLowerCase();
  return PRODUCTS.filter(p => {
    if (q && !(`${p.name} ${p.flavor}`.toLowerCase().includes(q))) return false;
    if (origin && p.origin !== origin) return false;
    if (!matchRoast(p, roast)) return false;
    if (maxPrice != null && p.price > Number(maxPrice)) return false;
    return true;
  });
}

function getProduct(id) {
  const p = PRODUCTS.find(x => x.id === Number(id));
  if (!p) throw new Error(`product ${id} not found`);
  return p;
}

function addToCart(id, quantity = 1) {
  const product = getProduct(id);
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, quantity: qty });
  }
  saveCart();
  renderCart();
  return { added: { id: product.id, name: product.name, quantity: qty }, cart };
}

function viewCart() {
  const total = cart.reduce((s, item) => s + item.price * item.quantity, 0);
  return { items: cart, total, itemCount: cart.reduce((s, item) => s + item.quantity, 0) };
}

function removeFromCart(id) {
  const idx = cart.findIndex(item => item.id === Number(id));
  if (idx === -1) throw new Error(`cart item ${id} not found`);
  const [removed] = cart.splice(idx, 1);
  saveCart();
  renderCart();
  return removed;
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
}
