import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addToCart,
  buildKitCartProduct,
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  calculateCartTotals,
  calculateKitPricing,
  evaluateCoupon,
  filterOrdersByCriteria,
  filterOrdersByPhone,
  filterProducts,
  formatCurrency,
  formatPhone,
  getAdjacentOrderStatus,
  getDiscountPercentage,
  getEffectivePrice,
  getOrderStageMeta,
  getPricePerLiterLabel,
  isProductPriceVisible,
  mergeOrderIntoCart,
  summarizeOrdersPeriod,
  transitionOrderStatus,
  updateCartQuantity,
  validateCheckoutInput,
} from './commerce';
import {
  INITIAL_KITS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_STORE_SETTINGS,
} from '../data/initialCatalog';

test('formatCurrency and formatPhone format Brazilian values accurately', () => {
  assert.equal(formatCurrency(97.5), 'R$ 97,50');
  assert.equal(formatCurrency(1042), 'R$ 1042,00');
  assert.equal(formatPhone('65999999999'), '(65) 99999-9999');
});

test('getEffectivePrice and getDiscountPercentage compute promotional De/Por values', () => {
  const promoProduct = INITIAL_PRODUCTS[0]; // 26.90 -> 21.90
  assert.equal(getEffectivePrice(promoProduct), 21.90);
  assert.equal(getDiscountPercentage(promoProduct), 19);

  const regularProduct = INITIAL_PRODUCTS.find((p) => p.promoPrice === null)!;
  assert.equal(getEffectivePrice(regularProduct), regularProduct.price);
  assert.equal(getDiscountPercentage(regularProduct), 0);
});

test('getPricePerLiterLabel computes economy per liter for multi-liter gallons', () => {
  const gallonProduct = INITIAL_PRODUCTS.find((p) => p.id === 'prod-pes-1')!; // 5L at 45.00
  assert.equal(getPricePerLiterLabel(gallonProduct), 'R$ 9,00/L');
});

test('calculateKitPricing and buildKitCartProduct match the exact Kit promotional price in the Cart', () => {
  const kitCasa = INITIAL_KITS[0]; // Kit Casa Perfumada (R$ 67,70)
  const pricing = calculateKitPricing(kitCasa, INITIAL_PRODUCTS);

  assert.equal(pricing.regularTotal, 91.70);
  assert.equal(pricing.finalKitPrice, 67.70);
  assert.equal(pricing.savingsAmount, 24.00);
  assert.equal(pricing.totalUnitsCount, 3);

  const kitProduct = buildKitCartProduct(kitCasa, INITIAL_PRODUCTS);
  const cart = addToCart([], kitProduct, 1);
  const totals = calculateCartTotals(
    cart,
    'pickup',
    'Centro Norte',
    INITIAL_STORE_SETTINGS
  );

  assert.equal(totals.subtotal, 67.70);
  assert.equal(totals.savings, 24.00);
  assert.equal(totals.total, 67.70);
});

test('getOrderStageMeta differentiates Store Pickup vs Delivery tracking stages', () => {
  const pickupReady = getOrderStageMeta('ready_or_out', 'pickup');
  assert.ok(pickupReady.cleaningStageTitle.includes('Pronto no Balcão Limper MT'));
  assert.equal(pickupReady.stepShortTitle, '3. Pronto na Loja!');

  const deliveryReady = getOrderStageMeta('ready_or_out', 'delivery');
  assert.ok(deliveryReady.cleaningStageTitle.includes('Saiu para Entrega'));
  assert.equal(deliveryReady.stepShortTitle, '3. Saiu p/ Entrega');
});

test('getAdjacentOrderStatus and transitionOrderStatus support backward stage reversal for human error recovery', () => {
  // Forward sequence
  assert.equal(getAdjacentOrderStatus('pending_separation', 'next'), 'separating');
  assert.equal(getAdjacentOrderStatus('separating', 'next'), 'ready_or_out');
  assert.equal(getAdjacentOrderStatus('ready_or_out', 'next'), 'completed');
  assert.equal(getAdjacentOrderStatus('completed', 'next'), null);

  // Backward sequence (including stepping back from Stage 4 completed!)
  assert.equal(getAdjacentOrderStatus('completed', 'prev'), 'ready_or_out');
  assert.equal(getAdjacentOrderStatus('ready_or_out', 'prev'), 'separating');
  assert.equal(getAdjacentOrderStatus('separating', 'prev'), 'pending_separation');
  assert.equal(getAdjacentOrderStatus('pending_separation', 'prev'), null);

  // Audit history recording on backward transition (newest entry is prepended at index 0)
  const completedOrder = INITIAL_ORDERS.find((o) => o.status === 'completed')!;
  const revertedOrder = transitionOrderStatus(
    completedOrder,
    'ready_or_out',
    'Retorno p/ etapa anterior (Correção de erro humano)',
    '2026-11-09T18:00:00.000Z'
  );
  assert.equal(revertedOrder.status, 'ready_or_out');
  assert.ok((revertedOrder.statusHistory?.length || 0) >= 2);
  const latestLog = revertedOrder.statusHistory![0];
  assert.equal(latestLog.fromStatus, 'completed');
  assert.equal(latestLog.toStatus, 'ready_or_out');
  assert.ok(latestLog.reason?.includes('Correção de erro humano'));
});

test('filterOrdersByCriteria and summarizeOrdersPeriod filter Kanban and History by date and modality', () => {
  const refNow = new Date('2026-11-09T18:00:00.000Z');

  // Filter today (2026-11-09)
  const todayOrders = filterOrdersByCriteria(INITIAL_ORDERS, {
    datePreset: 'today',
    referenceNow: refNow,
  });
  assert.equal(todayOrders.length, 2); // #LMP-1041 and #LMP-1043 on 2026-11-09

  // Filter specific historical date (2026-11-04 -> #LMP-1039)
  const nov04Orders = filterOrdersByCriteria(INITIAL_ORDERS, {
    datePreset: 'custom',
    startDate: '2026-11-04',
    endDate: '2026-11-04',
    referenceNow: refNow,
  });
  assert.equal(nov04Orders.length, 1);
  assert.equal(nov04Orders[0].id, '#LMP-1039');

  // Summarize period metrics
  const summary = summarizeOrdersPeriod(INITIAL_ORDERS);
  assert.equal(summary.totalOrders, 5);
  assert.equal(summary.pickupCount, 3);
  assert.equal(summary.deliveryCount, 2);
  assert.equal(summary.completedCount, 2);
  assert.equal(summary.activeCount, 3);
});

test('evaluateCoupon and calculateCartTotals apply promotional coupon codes and custom Admin coupons accurately', () => {
  const eval10 = evaluateCoupon('limper10', 100);
  assert.equal(eval10.valid, true);
  assert.equal(eval10.discountAmount, 10);

  const evalAtacadoLow = evaluateCoupon('ATACADO5L', 80);
  assert.equal(evalAtacadoLow.valid, false);

  const evalAtacadoOk = evaluateCoupon('ATACADO5L', 150);
  assert.equal(evalAtacadoOk.valid, true);
  assert.equal(evalAtacadoOk.discountAmount, 15);

  const customAdminCoupons = [
    {
      id: 'cp-1',
      code: 'QUIMI20',
      description: '20% OFF Especial Quimiprol',
      discountType: 'percent' as const,
      discountValue: 20,
      minOrderValue: 100,
      active: true,
    },
  ];
  const evalCustomOk = evaluateCoupon('quimi20', 200, customAdminCoupons);
  assert.equal(evalCustomOk.valid, true);
  assert.equal(evalCustomOk.discountAmount, 40);
});

test('isProductPriceVisible respects individual product showPrice and global hideAllPrices', () => {
  const prodVisible = { ...INITIAL_PRODUCTS[0], showPrice: true };
  const prodHidden = { ...INITIAL_PRODUCTS[0], showPrice: false };

  assert.equal(isProductPriceVisible(prodVisible, INITIAL_STORE_SETTINGS), true);
  assert.equal(isProductPriceVisible(prodHidden, INITIAL_STORE_SETTINGS), false);
  assert.equal(
    isProductPriceVisible(prodVisible, { ...INITIAL_STORE_SETTINGS, hideAllPrices: true }),
    false
  );
});

test('cart operations add, increment, remove, and compute delivery + free shipping thresholds', () => {
  const p1 = INITIAL_PRODUCTS.find((p) => p.id === 'prod-lav-1')!; // Amaciante Concentrado 1L (promo 17.00)
  const p2 = INITIAL_PRODUCTS.find((p) => p.id === 'prod-pes-1')!; // Limpa Piso 5L (promo 45.00)

  let cart = addToCart([], p1, 2);
  cart = addToCart(cart, p2, 1);

  assert.equal(cart.length, 2);
  assert.equal(cart[0].quantity, 2);

  const totalsDelivery = calculateCartTotals(cart, 'delivery', 'Centro', INITIAL_STORE_SETTINGS);
  assert.equal(totalsDelivery.itemCount, 3);
  assert.equal(totalsDelivery.subtotal, 79.00);
  assert.equal(totalsDelivery.deliveryFee, 10.00);
  assert.equal(totalsDelivery.total, 89.00);

  const totalsWithCoupon = calculateCartTotals(
    cart,
    'pickup',
    'Centro',
    INITIAL_STORE_SETTINGS,
    'LIMPER10'
  );
  assert.equal(totalsWithCoupon.couponDiscount, 7.9);
  assert.equal(totalsWithCoupon.total, 71.1);

  cart = updateCartQuantity(cart, p1.id, 0);
  assert.equal(cart.length, 1);
});

test('mergeOrderIntoCart reloads items from a past order for 1-click reorder', () => {
  const pastOrder = INITIAL_ORDERS.find((o) => o.id === '#LMP-1042')!;
  const { updatedCart, addedCount } = mergeOrderIntoCart(
    [],
    pastOrder,
    INITIAL_PRODUCTS,
    INITIAL_KITS
  );
  assert.equal(updatedCart.length, 3);
  assert.equal(addedCount, 4);
});

test('buildWhatsAppOrderMessage and URL encode all required order fields accurately', () => {
  const order = INITIAL_ORDERS.find((o) => o.id === '#LMP-1042')!;
  const message = buildWhatsAppOrderMessage(order);
  assert.ok(message.includes('🧼 *NOVO PEDIDO - LIMPER MT* 🧼'));
  assert.ok(message.includes('*Pedido:* #LMP-1042'));
  assert.ok(message.includes('*Cliente:* João Silva'));
  assert.ok(message.includes('2x Amaciante Concentrado Carícia 1L 1L - R$ 34,00'));
  assert.ok(message.includes('💰 *Subtotal:* R$ 97,50'));
  assert.ok(message.includes('💳 *Forma de Pagamento:* PIX (Comprovante em anexo)'));

  const url = buildWhatsAppOrderUrl('5565999887766', order);
  assert.ok(url.startsWith('https://wa.me/5565999887766?text='));
});

test('filterProducts and filterOrdersByPhone filter catalog and customer history', () => {
  const pesadaProducts = filterProducts(INITIAL_PRODUCTS, { categoryId: 'cat-pesada' });
  assert.equal(pesadaProducts.length, 4);

  const sortedByAsc = filterProducts(INITIAL_PRODUCTS, {
    categoryId: 'cat-pesada',
    sortBy: 'price_asc',
  });
  assert.ok(getEffectivePrice(sortedByAsc[0]) <= getEffectivePrice(sortedByAsc[1]));

  const joaoOrders = filterOrdersByPhone(INITIAL_ORDERS, '(65) 99999-9999');
  assert.equal(joaoOrders.length, 2);
});

test('validateCheckoutInput rejects missing fields and validates cash change amount', () => {
  const errName = validateCheckoutInput({
    customerName: 'Jo',
    customerPhone: '65999999999',
    deliveryType: 'pickup',
    street: '',
    number: '',
    neighborhood: '',
    paymentMethod: 'pix',
    total: 50,
  });
  assert.ok(errName !== null);

  const errChange = validateCheckoutInput({
    customerName: 'João Silva',
    customerPhone: '65999999999',
    deliveryType: 'pickup',
    street: '',
    number: '',
    neighborhood: '',
    paymentMethod: 'cash',
    cashChangeFor: '40',
    total: 50,
  });
  assert.ok(errChange !== null);

  const valid = validateCheckoutInput({
    customerName: 'João Silva',
    customerPhone: '65999999999',
    deliveryType: 'delivery',
    street: 'Rua das Palmeiras',
    number: '120',
    neighborhood: 'Centro',
    paymentMethod: 'cash',
    cashChangeFor: '100',
    total: 97.50,
  });
  assert.equal(valid, null);
});
