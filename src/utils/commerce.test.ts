import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addToCart,
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  calculateCartTotals,
  evaluateCoupon,
  filterOrdersByPhone,
  filterProducts,
  formatCurrency,
  formatPhone,
  getDiscountPercentage,
  getEffectivePrice,
  getPricePerLiterLabel,
  isProductPriceVisible,
  mergeOrderIntoCart,
  updateCartQuantity,
  validateCheckoutInput,
} from './commerce';
import { INITIAL_ORDERS, INITIAL_PRODUCTS, INITIAL_STORE_SETTINGS } from '../data/initialCatalog';

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
  const pastOrder = INITIAL_ORDERS[0]; // #LMP-1042
  const { updatedCart, addedCount } = mergeOrderIntoCart([], pastOrder, INITIAL_PRODUCTS);
  assert.equal(updatedCart.length, 3);
  assert.equal(addedCount, 4);
});

test('buildWhatsAppOrderMessage and URL encode all required order fields accurately', () => {
  const order = INITIAL_ORDERS[0]; // #LMP-1042
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
