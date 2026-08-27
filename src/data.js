// 商品資料（demo 不連後端，8 筆寫死）+ 純資料 helper。完全沒有 Vue 依賴。
export const PRODUCTS = [
  { id: 1,  name: '耶加雪菲 水洗',   origin: '衣索比亞',   roast: '淺焙',  price: 480,  flavor: '茉莉、檸檬、紅茶尾韻' },
  { id: 2,  name: '耶加雪菲 日曬',   origin: '衣索比亞',   roast: '中淺焙', price: 520,  flavor: '草莓、藍莓、發酵感' },
  { id: 3,  name: '安提瓜 瓜吉花神', origin: '瓜地馬拉',   roast: '中焙',   price: 450,  flavor: '可可、堅果、焦糖' },
  { id: 4,  name: '涅里 AA 頂級',    origin: '肯亞',       roast: '中焙',   price: 580,  flavor: '黑醋栗、番茄、明亮酸' },
  { id: 5,  name: '娜玲瓏莊園',      origin: '哥倫比亞',   roast: '中焙',   price: 420,  flavor: '橘子、蜂蜜、巧克力' },
  { id: 6,  name: '喜拉朵',          origin: '巴西',       roast: '深焙',   price: 380,  flavor: '核桃、黑糖、低酸' },
  { id: 7,  name: '翡翠莊園 藝伎',   origin: '巴拿馬',     roast: '淺焙',   price: 1200, flavor: '茉莉、佛手柑、白桃' },
  { id: 8,  name: '曼特寧 G1',       origin: '印尼',       roast: '深焙',   price: 450,  flavor: '木質、黑巧克力、濃厚 body' }
];

export const PRODUCT_IDS = PRODUCTS.map(p => p.id);
export const ORIGINS = [...new Set(PRODUCTS.map(p => p.origin))].sort();

// 把「中淺焙」歸到「淺焙」filter 時同時包含
function matchRoast(product, roast) {
  if (!roast) return true;
  if (roast === '淺焙') return product.roast === '淺焙' || product.roast === '中淺焙';
  return product.roast === roast;
}

export function searchProducts({ query, origin, roast, maxPrice } = {}) {
  const q = (query || '').trim().toLowerCase();
  return PRODUCTS.filter(p => {
    if (q && !(`${p.name} ${p.flavor}`.toLowerCase().includes(q))) return false;
    if (origin && p.origin !== origin) return false;
    if (!matchRoast(p, roast)) return false;
    if (maxPrice != null && p.price > Number(maxPrice)) return false;
    return true;
  });
}

export function getProduct(id) {
  const p = PRODUCTS.find(x => x.id === Number(id));
  if (!p) throw new Error(`product ${id} not found`);
  return p;
}

export function formatPrice(n) {
  return 'NT$' + n.toLocaleString('zh-TW');
}
