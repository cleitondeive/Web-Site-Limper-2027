import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addToCart,
  buildKitCartProduct,
  buildLogisticsWhatsAppConsultUrl,
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  calculateCartTotals,
  calculateKitPricing,
  evaluateCoupon,
  evaluateLogisticsEligibility,
  filterOrdersByCriteria,
  filterOrdersByPhone,
  filterProducts,
  formatCurrency,
  formatLogisticsModeLabel,
  formatPhone,
  getAdjacentOrderStatus,
  getDiscountPercentage,
  getEffectivePrice,
  getLogisticsMinimumOrderValue,
  getLogisticsSettings,
  getOrderStageMeta,
  getPricePerLiterLabel,
  getProductInstallmentMeta,
  isCatalogAllPricesHidden,
  isOrderQuoteOnly,
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

  const defaultKitProduct = buildKitCartProduct(kitCasa, INITIAL_PRODUCTS);
  assert.equal(defaultKitProduct.showPrice, false);
  assert.equal(defaultKitProduct.kitItems?.length, 3);
  assert.equal(defaultKitProduct.kitItems?.[0].title, 'Água para Lençol Bambu 500mL');
  assert.equal(defaultKitProduct.kitItems?.[1].title, 'Álcool Perfumado Lavanda 5L');

  const pricedKitProduct = buildKitCartProduct({ ...kitCasa, showPrice: true }, INITIAL_PRODUCTS);
  const cart = addToCart([], pricedKitProduct, 1);
  const pricedSettings = { ...INITIAL_STORE_SETTINGS, hideAllPrices: false };
  const totals = calculateCartTotals(
    cart,
    'pickup',
    'Centro Norte',
    pricedSettings
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

test('isProductPriceVisible and isCatalogAllPricesHidden support selective per-product pricing while defaulting catalog to hidden', () => {
  assert.equal(INITIAL_STORE_SETTINGS.hideAllPrices, false);
  assert.equal(
    INITIAL_PRODUCTS.every((p) => p.showPrice === false),
    true
  );
  assert.equal(
    isCatalogAllPricesHidden(INITIAL_PRODUCTS, INITIAL_STORE_SETTINGS, INITIAL_KITS),
    true
  );

  // Enabling price on just ONE product shows ONLY that product and unlocks storefront pricing state
  const onlyFirstPriced = INITIAL_PRODUCTS.map((p, idx) =>
    idx === 0 ? { ...p, showPrice: true } : p
  );
  assert.equal(isProductPriceVisible(onlyFirstPriced[0], INITIAL_STORE_SETTINGS), true);
  assert.equal(isProductPriceVisible(onlyFirstPriced[1], INITIAL_STORE_SETTINGS), false);
  assert.equal(
    isCatalogAllPricesHidden(onlyFirstPriced, INITIAL_STORE_SETTINGS, INITIAL_KITS),
    false
  );

  // Explicit global override hides even products with showPrice: true
  const forcedHideSettings = { ...INITIAL_STORE_SETTINGS, hideAllPrices: true };
  assert.equal(isProductPriceVisible(onlyFirstPriced[0], forcedHideSettings), false);
  assert.equal(
    isCatalogAllPricesHidden(onlyFirstPriced, forcedHideSettings, INITIAL_KITS),
    true
  );
});

test('getProductInstallmentMeta computes configurable installments and respects store defaults', () => {
  const baseProd = INITIAL_PRODUCTS[0]; // promo 21.90
  const defaultMeta = getProductInstallmentMeta(baseProd, INITIAL_STORE_SETTINGS);
  assert.equal(defaultMeta.count, 3);
  assert.equal(defaultMeta.noInterest, true);
  assert.equal(defaultMeta.installmentValue, 7.3);
  assert.equal(defaultMeta.label, '3x R$ 7,30 s/ juros');

  const customMeta = getProductInstallmentMeta(
    { ...baseProd, installmentsCount: 6, installmentsNoInterest: false },
    INITIAL_STORE_SETTINGS
  );
  assert.equal(customMeta.count, 6);
  assert.equal(customMeta.noInterest, false);
  assert.equal(customMeta.installmentValue, 3.65);
  assert.equal(customMeta.label, '6x R$ 3,65 no cartão');

  const cashMeta = getProductInstallmentMeta(
    { ...baseProd, installmentsCount: 1 },
    INITIAL_STORE_SETTINGS
  );
  assert.equal(cashMeta.count, 1);
  assert.equal(cashMeta.label, 'À vista R$ 21,90');
});

test('cart operations add, increment, remove, and compute quote-only, priced, and mixed cart totals', () => {
  const pricedSettings = { ...INITIAL_STORE_SETTINGS, hideAllPrices: false };
  const p1 = { ...INITIAL_PRODUCTS.find((p) => p.id === 'prod-lav-1')!, showPrice: true }; // Amaciante Concentrado 1L (promo 17.00)
  const p2 = { ...INITIAL_PRODUCTS.find((p) => p.id === 'prod-pes-1')!, showPrice: true }; // Limpa Piso 5L (promo 45.00)
  const pHidden = { ...INITIAL_PRODUCTS.find((p) => p.id === 'prod-casa-1')!, showPrice: false };

  let cart = addToCart([], p1, 2);
  cart = addToCart(cart, p2, 1);

  assert.equal(cart.length, 2);
  assert.equal(cart[0].quantity, 2);

  // Default catalog products have showPrice: false (quote-only mode)
  const defaultQuoteCart = addToCart([], INITIAL_PRODUCTS[0], 2);
  const quoteTotals = calculateCartTotals(
    defaultQuoteCart,
    'delivery',
    'Centro',
    INITIAL_STORE_SETTINGS
  );
  assert.equal(quoteTotals.isQuoteOnly, true);
  assert.equal(quoteTotals.hasHiddenPriceItems, true);
  assert.equal(quoteTotals.itemCount, 2);
  assert.equal(quoteTotals.subtotal, 0);
  assert.equal(quoteTotals.total, 0);
  assert.equal(quoteTotals.freeShippingRemaining, 0);

  const totalsDelivery = calculateCartTotals(cart, 'delivery', 'Centro', pricedSettings);
  assert.equal(totalsDelivery.isQuoteOnly, false);
  assert.equal(totalsDelivery.hasHiddenPriceItems, false);
  assert.equal(totalsDelivery.itemCount, 3);
  assert.equal(totalsDelivery.subtotal, 79.00);
  assert.equal(totalsDelivery.deliveryFee, 10.00);
  assert.equal(totalsDelivery.total, 89.00);

  // Mixed cart: 1 priced product (p1 x2 = 34.00) + 1 unpriced product (pHidden x1)
  const mixedCart = addToCart(addToCart([], p1, 2), pHidden, 1);
  const mixedTotals = calculateCartTotals(mixedCart, 'pickup', 'Centro Norte', pricedSettings);
  assert.equal(mixedTotals.isQuoteOnly, false);
  assert.equal(mixedTotals.hasHiddenPriceItems, true);
  assert.equal(mixedTotals.subtotal, 34.00);
  assert.equal(mixedTotals.total, 34.00);

  const totalsWithCoupon = calculateCartTotals(
    cart,
    'pickup',
    'Centro',
    pricedSettings,
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
  assert.ok(message.includes('*COMANDA DE SEPARAÇÃO · LIMPER MT*'));
  assert.ok(message.includes('*Pedido #LMP-1042*'));
  assert.ok(message.includes('CLIENTE: João Silva'));
  assert.ok(message.includes('CHECKLIST DE ESTOQUE:'));
  assert.ok(message.includes('[ ] 2x Amaciante Concentrado Carícia 1L (1L)'));
  assert.ok(message.includes('R$ 34,00'));
  assert.ok(message.includes('SUBTOTAL: R$ 97,50'));
  assert.ok(message.includes('PAGAMENTO: PIX (Comprovante em anexo)'));

  const url = buildWhatsAppOrderUrl('5565999887766', order);
  assert.ok(url.startsWith('https://wa.me/5565999887766?text='));
});

test('buildWhatsAppOrderMessage formats quote-only order as personalized WhatsApp comanda without prices', () => {
  const quoteOrder = {
    id: '#LMP-1099',
    createdAt: '2026-11-12T14:30:00.000Z',
    customerName: 'Maria Souza',
    customerPhone: '65998765432',
    items: [
      {
        productId: 'prod-pes-1',
        sku: 'QMP-101',
        title: 'Limpa Piso Pesado 5L',
        volumeLabel: '5L',
        unitPrice: 0,
        quantity: 2,
        subtotal: 0,
        priceHidden: true,
      },
    ],
    subtotal: 0,
    deliveryFee: 0,
    total: 0,
    deliveryType: 'delivery' as const,
    address: {
      street: 'Av. Filinto Müller',
      number: '500',
      neighborhood: 'Jardim Aeroporto',
      city: 'Várzea Grande' as const,
    },
    pickupCode: 'LMP-909',
    estimatedTime: 'A combinar',
    paymentMethod: 'quote' as const,
    notes: 'Entregar após as 14h',
    status: 'pending_separation' as const,
    isQuoteOnly: true,
  };

  assert.equal(isOrderQuoteOnly(quoteOrder), true);
  const msg = buildWhatsAppOrderMessage(quoteOrder);
  assert.ok(msg.includes('*COMANDA DE SEPARAÇÃO · LIMPER MT*'));
  assert.ok(msg.includes('*Pedido #LMP-1099*'));
  assert.ok(msg.includes('CLIENTE: Maria Souza'));
  assert.ok(msg.includes('WHATSAPP: (65) 99876-5432'));
  assert.ok(msg.includes('TIPO: ENTREGA DELIVERY'));
  assert.ok(msg.includes('[ ] 2x Limpa Piso Pesado 5L (5L) [Ref: QMP-101] — Sob consulta'));
  assert.ok(msg.includes('*MODO DO PEDIDO: LISTA S/ VALOR (WHATSAPP)*'));
  assert.ok(msg.includes('Jardim Aeroporto'));
  assert.ok(!msg.includes('R$ 0,00'));
});

test('buildWhatsAppOrderMessage formats mixed carts showing prices only on priced items and Sob consulta on hidden items', () => {
  const mixedOrder = {
    id: '#LMP-1105',
    createdAt: '2026-11-12T15:00:00.000Z',
    customerName: 'Carlos Eduardo',
    customerPhone: '65999112233',
    items: [
      {
        productId: 'prod-casa-3',
        sku: 'QMP-101',
        title: 'Água para Lençol Bambu 500mL',
        volumeLabel: '500mL',
        unitPrice: 21.9,
        quantity: 1,
        subtotal: 21.9,
        priceHidden: false,
      },
      {
        productId: 'prod-pes-1',
        sku: 'QMP-102',
        title: 'Limpa Piso Pesado 5L',
        volumeLabel: '5L',
        unitPrice: 0,
        quantity: 2,
        subtotal: 0,
        priceHidden: true,
      },
    ],
    subtotal: 21.9,
    deliveryFee: 0,
    total: 21.9,
    deliveryType: 'pickup' as const,
    pickupCode: 'LMP-105',
    estimatedTime: 'Retirada em 15 minutos',
    paymentMethod: 'pix' as const,
    status: 'pending_separation' as const,
    isQuoteOnly: false,
  };

  const msg = buildWhatsAppOrderMessage(mixedOrder);
  assert.ok(msg.includes('[ ] 1x Água para Lençol Bambu 500mL (500mL) [Ref: QMP-101] — R$ 21,90'));
  assert.ok(msg.includes('[ ] 2x Limpa Piso Pesado 5L (5L) [Ref: QMP-102] — Sob consulta'));
  assert.ok(msg.includes('SUBTOTAL (ITENS C/ VALOR): R$ 21,90'));
  assert.ok(msg.includes('*TOTAL A CONFERIR: R$ 21,90*'));
  assert.ok(msg.includes('OBS. VALORES: Contém item(ns) sem valor'));
});

test('buildWhatsAppOrderMessage expands kitItems into itemized picking checklist for employees', () => {
  const kitProduct = buildKitCartProduct(INITIAL_KITS[0], INITIAL_PRODUCTS);
  const kitOrder = {
    id: '#LMP-1110',
    createdAt: '2026-11-12T15:30:00.000Z',
    customerName: 'Ana Paula',
    customerPhone: '65999445566',
    items: [
      {
        productId: kitProduct.id,
        sku: kitProduct.sku,
        title: kitProduct.title,
        volumeLabel: kitProduct.volumeLabel,
        unitPrice: 0,
        quantity: 2,
        subtotal: 0,
        priceHidden: true,
        kitItems: kitProduct.kitItems,
      },
    ],
    subtotal: 0,
    deliveryFee: 0,
    total: 0,
    deliveryType: 'pickup' as const,
    pickupCode: 'BALCÃO-1110',
    estimatedTime: 'Retirada em 15 minutos',
    paymentMethod: 'quote' as const,
    status: 'pending_separation' as const,
    isQuoteOnly: true,
  };

  const msg = buildWhatsAppOrderMessage(kitOrder);
  assert.ok(msg.includes('[ ] 2x Combo Casa & Aromas (3 Produtos) (Combo (3 unid.)) [Ref: KIT-CASA] — Sob consulta'));
  assert.ok(msg.includes('Itens inclusos no kit (separar):'));
  assert.ok(msg.includes('- [ ] 2x Água para Lençol Bambu 500mL (500mL) (1x/kit)'));
  assert.ok(msg.includes('- [ ] 2x Álcool Perfumado Lavanda 5L (5L) (1x/kit)'));
  assert.ok(msg.includes('- [ ] 2x Desengordurante Quimi 90 5L | 1L (5L | 1L) (1x/kit)'));
  assert.ok(!msg.includes('R$ 0,00'));
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

  const missingInteriorCity = validateCheckoutInput({
    customerName: 'Fazenda Santa Luzia',
    customerPhone: '65999999999',
    deliveryType: 'delivery',
    city: 'Interior de MT',
    interiorCityName: '',
    street: 'Av. Brasil',
    number: '100',
    neighborhood: 'Centro',
    paymentMethod: 'quote',
    total: 0,
  });
  assert.ok(missingInteriorCity !== null);
});

test('Limper MT logistics rules enforce Moto Limper and Caminhão minimums by city and Interior MT consult', () => {
  const defaults = getLogisticsSettings(INITIAL_STORE_SETTINGS);
  assert.equal(defaults.motoVgMin, 50);
  assert.equal(defaults.motoCbaMin, 100);
  assert.equal(defaults.truckVgMin, 150);
  assert.equal(defaults.truckCbaMin, 200);

  assert.equal(
    getLogisticsMinimumOrderValue(INITIAL_STORE_SETTINGS, 'moto_limper', 'Várzea Grande'),
    50
  );
  assert.equal(
    getLogisticsMinimumOrderValue(INITIAL_STORE_SETTINGS, 'moto_limper', 'Cuiabá'),
    100
  );
  assert.equal(
    getLogisticsMinimumOrderValue(INITIAL_STORE_SETTINGS, 'truck', 'Várzea Grande'),
    150
  );
  assert.equal(
    getLogisticsMinimumOrderValue(INITIAL_STORE_SETTINGS, 'truck', 'Cuiabá'),
    200
  );
  assert.equal(
    getLogisticsMinimumOrderValue(INITIAL_STORE_SETTINGS, 'truck', 'Interior de MT'),
    null
  );

  // Priced cart below Moto Limper Cuiabá minimum (R$ 100,00)
  const motoCbaShort = evaluateLogisticsEligibility({
    settings: INITIAL_STORE_SETTINGS,
    subtotal: 75,
    isQuoteOnly: false,
    deliveryType: 'delivery',
    city: 'Cuiabá',
    vehicle: 'moto_limper',
  });
  assert.equal(motoCbaShort.meetsMinimum, false);
  assert.equal(motoCbaShort.remainingToMinimum, 25);

  // Custom admin override changes minimums immediately
  const customSettings = {
    ...INITIAL_STORE_SETTINGS,
    motoLimperVgMin: 60,
    truckCbaMin: 250,
  };
  const truckCbaOk = evaluateLogisticsEligibility({
    settings: customSettings,
    subtotal: 260,
    isQuoteOnly: false,
    deliveryType: 'delivery',
    city: 'Cuiabá',
    vehicle: 'truck',
  });
  assert.equal(truckCbaOk.meetsMinimum, true);
  assert.equal(truckCbaOk.minRequired, 250);

  // Interior de MT triggers WhatsApp consultation
  const interiorRes = evaluateLogisticsEligibility({
    settings: INITIAL_STORE_SETTINGS,
    subtotal: 0,
    isQuoteOnly: true,
    deliveryType: 'delivery',
    city: 'Interior de MT',
    vehicle: 'truck',
  });
  assert.equal(interiorRes.mode, 'interior_mt');
  assert.equal(interiorRes.requiresWhatsAppConsult, true);

  assert.equal(
    formatLogisticsModeLabel('moto_limper'),
    'Moto Limper (Pequenos itens que cabem na moto)'
  );
  assert.equal(
    formatLogisticsModeLabel('interior_mt', 'Sinop'),
    'Interior de MT (Sinop)'
  );

  const consultUrl = buildLogisticsWhatsAppConsultUrl('556530296824', 'Sorriso');
  assert.ok(consultUrl.startsWith('https://wa.me/556530296824?text='));
  assert.ok(decodeURIComponent(consultUrl).includes('Sorriso - MT'));

  // WhatsApp Comanda includes logistics line for delivery & Interior MT freight note
  const interiorOrder = {
    id: '#LMP-1150',
    createdAt: '2026-11-12T16:00:00.000Z',
    customerName: 'Agropecuária Norte',
    customerPhone: '66999881122',
    items: [
      {
        productId: 'prod-pes-1',
        sku: 'QMP-101',
        title: 'Limpa Piso Pesado 5L',
        volumeLabel: '5L',
        unitPrice: 0,
        quantity: 4,
        subtotal: 0,
        priceHidden: true,
      },
    ],
    subtotal: 0,
    deliveryFee: 0,
    total: 0,
    deliveryType: 'delivery' as const,
    logisticsMode: 'interior_mt' as const,
    address: {
      street: 'Av. das Embaúbas',
      number: '850',
      neighborhood: 'Centro',
      city: 'Interior de MT' as const,
      interiorCityName: 'Sinop',
    },
    pickupCode: 'LMP-150',
    estimatedTime: 'A consultar',
    paymentMethod: 'quote' as const,
    status: 'pending_separation' as const,
    isQuoteOnly: true,
  };

  const interiorMsg = buildWhatsAppOrderMessage(interiorOrder);
  assert.ok(interiorMsg.includes('LOGÍSTICA: Interior de MT (Sinop)'));
  assert.ok(interiorMsg.includes('Sinop - MT'));
  assert.ok(interiorMsg.includes('FRETE / ROTA: Consultar suporte Limper MT via WhatsApp (Restante de MT).'));

  const pricedInteriorMsg = buildWhatsAppOrderMessage({
    ...interiorOrder,
    isQuoteOnly: false,
    subtotal: 200,
    total: 200,
    paymentMethod: 'pix',
    items: [
      {
        ...interiorOrder.items[0],
        unitPrice: 50,
        subtotal: 200,
        priceHidden: false,
      },
    ],
  });
  assert.ok(
    pricedInteriorMsg.includes('TAXA ENTREGA: A consultar com suporte via WhatsApp (Interior de MT)')
  );
});

