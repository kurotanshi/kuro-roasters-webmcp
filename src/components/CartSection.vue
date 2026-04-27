<script setup>
import { storeToRefs } from 'pinia';
import { formatPrice } from '../data.js';
import { useCartStore }   from '../stores/cart.js';
import { useFlashStore }  from '../stores/flash.js';
import { useOutputStore } from '../stores/output.js';

const cartStore = useCartStore();
const { cart, total } = storeToRefs(cartStore);

const flashStore = useFlashStore();
const { active: flashActive } = storeToRefs(flashStore);

const outputStore = useOutputStore();

function clickRemove(id) {
  cartStore.removeFromCart(id);
}

function clickClear() {
  if (window.confirm('清空購物車？')) cartStore.clearCart();
}

function clickCheckout() {
  if (cart.value.length === 0) {
    outputStore.show({ status: 'empty', message: '購物車是空的' });
    return;
  }
  const snapshot = cartStore.viewCart();
  if (!window.confirm(`確定以 ${formatPrice(snapshot.total)} 結帳嗎？`)) {
    outputStore.show({ status: 'cancelled' });
    return;
  }
  const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();
  cartStore.clearCart();
  outputStore.show({ status: 'placed', orderId, ...snapshot });
}
</script>

<template>
  <section>
    <h2>購物車</h2>
    <div class="cart" :class="{ 'highlight-flash': flashActive.cart }">
      <div v-if="cart.length === 0" class="cart-empty">購物車是空的</div>
      <template v-else>
        <div
          v-for="item in cart"
          :key="item.id"
          class="cart-item"
        >
          <div>
            <div>{{ item.name }}</div>
            <div style="font-size:0.8125rem;color:var(--muted)">
              {{ formatPrice(item.price) }} × {{ item.quantity }}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span>{{ formatPrice(item.price * item.quantity) }}</span>
            <button class="danger small" @click="clickRemove(item.id)">移除</button>
          </div>
        </div>
        <div class="cart-total">
          <span>合計</span>
          <span>{{ formatPrice(total) }}</span>
        </div>
        <div class="cart-actions">
          <button class="ghost small" @click="clickClear">清空</button>
          <button @click="clickCheckout">結帳</button>
        </div>
      </template>
    </div>
  </section>
</template>
