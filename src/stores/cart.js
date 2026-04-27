import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { getProduct } from '../data.js';

// 購物車 store。useLocalStorage 自動把 cart 同步到 localStorage（不用自己寫 watch）。
export const useCartStore = defineStore('cart', () => {
  const cart = useLocalStorage('webmcp-demo-cart', []);

  const itemCount = computed(() =>
    cart.value.reduce((s, item) => s + item.quantity, 0)
  );
  const total = computed(() =>
    cart.value.reduce((s, item) => s + item.price * item.quantity, 0)
  );

  function addToCart(id, quantity = 1) {
    const product = getProduct(id);
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const existing = cart.value.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.value.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: qty
      });
    }
    return {
      added: { id: product.id, name: product.name, quantity: qty },
      cart: cart.value
    };
  }

  function viewCart() {
    return {
      items: cart.value.map(item => ({ ...item })),
      total: total.value,
      itemCount: itemCount.value
    };
  }

  function removeFromCart(id) {
    const idx = cart.value.findIndex(item => item.id === Number(id));
    if (idx === -1) throw new Error(`cart item ${id} not found`);
    const [removed] = cart.value.splice(idx, 1);
    return removed;
  }

  function clearCart() {
    cart.value = [];
  }

  return { cart, itemCount, total, addToCart, viewCart, removeFromCart, clearCart };
});
