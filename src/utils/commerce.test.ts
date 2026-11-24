import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  ALL_ADMIN_TABS,
  DEFAULT_ADMIN_USERS,
  DEFAULT_BACKUP_SCHEDULE_CONFIG,
  DEFAULT_HIGHLIGHT_BADGE_COLOR,
  DEFAULT_PROMO_BADGE_COLOR,
  PROMO_BADGE_COLOR_PRESETS,
  addToCart,
  appendSecurityAuditEvent,
  appendSiteBackupSnapshot,
  auditCatalogHealth,
  auditCustomerTrackingIsolation,
  authenticateAdminUser,
  autoRepairCatalogIntegrity,
  buildKitCartProduct,
  buildLogisticsWhatsAppConsultUrl,
  buildSecurityAuditCsv,
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  calculateCartTotals,
  calculateKitPricing,
  canAdminUserAccessTab,
  canonicalBrazilPhone,
  computePayloadChecksum,
  createSecurityAuditEvent,
  createSiteBackupSnapshot,
  deleteCustomerAddress,
  deriveFrequentlyBoughtProducts,
  duplicateMultipleProducts,
  duplicateProductItem,
  emptyProductTrash,
  evaluateCoupon,
  evaluateDueScheduledBackup,
  evaluateLogisticsEligibility,
  filterOrdersByCriteria,
  filterOrdersByPhone,
  filterProducts,
  filterSecurityAuditEvents,
  filterSiteBackupsByDate,
  findOrderForPrivateLookup,
  formatAdminActorLabel,
  formatAdminDashboardDateTime,
  formatBackupByteSize,
  formatBrDateFromYmd,
  formatCurrency,
  formatLogisticsModeLabel,
  formatPageNumberLabel,
  formatPhone,
  generateAutoSku,
  generateNextOrderNumber,
  getAdjacentOrderStatus,
  getContrastTextColor,
  getCustomerAddresses,
  getCustomerLatestActiveOrder,
  getCustomerOrderCardStatusLabel,
  getDiscountPercentage,
  getEffectiveAllowedTabs,
  getEffectivePrice,
  getKanbanPeriodLabel,
  getLogisticsMinimumOrderValue,
  getLogisticsSettings,
  getNextScheduledBackupInfo,
  getOrderStageMeta,
  getOrdersForCustomer,
  getPricePerLiterLabel,
  getProductInstallmentMeta,
  getTimeOfDayGreeting,
  getUserInitials,
  isCatalogAllPricesHidden,
  isCustomerLoggedIn,
  isOrderQuoteOnly,
  isProductPriceVisible,
  maskPhoneForPrivacy,
  matchCustomerPhoneExact,
  matchesOrderCodeExact,
  mergeOrderIntoCart,
  moveProductStep,
  moveProductsToTrash,
  normalizeAdminUsername,
  normalizeHexColor,
  normalizeScheduleTime,
  paginateItems,
  parseImportedSiteBackupJson,
  permanentlyDeleteFromTrash,
  reorderProductsById,
  resolveCustomerVisibleOrders,
  resolveProductBadgeStyle,
  restoreProductFromTrash,
  sanitizeTargetForAuditLog,
  setDefaultCustomerAddress,
  sortAndDedupeScheduleTimes,
  summarizeOrdersPeriod,
  summarizeSecurityLogDates,
  summarizeSiteBackupDates,
  transitionOrderStatus,
  updateCartQuantity,
  upsertCustomerAddress,
  validateAdminUserDraft,
  validateBackupScheduleConfig,
  validateBannerDraft,
  validateCategoryDraft,
  validateCheckoutInput,
  validateCouponDraft,
  validateKitDraft,
  validateProductDraft,
  validateStoreSettingsDraft,
  verifySiteBackupIntegrity,
} from './commerce';
import {
  detectDocumentType,
  formatCep,
  formatCnpj,
  formatCpf,
  formatDocumentByType,
  isValidCnpj,
  isValidCpf,
  lookupLocalMtCep,
  mapViaCepResponse,
} from './brInputMasks';
import {
  INITIAL_BANNERS,
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
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
  assert.equal(
    formatLogisticsModeLabel(undefined, undefined, 'delivery'),
    'Entrega Delivery Limper MT'
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

test('Brazilian masks format CEP, CPF, and CNPJ cleanly and validate check digits', () => {
  assert.equal(formatCep('78110400'), '78110-400');
  assert.equal(formatCep('78080-000abc99'), '78080-000');
  assert.equal(formatCpf('01210640180'), '012.106.401-80');
  assert.equal(formatCnpj('11222333000181'), '11.222.333/0001-81');
  assert.equal(detectDocumentType('11222333000181'), 'cnpj');
  assert.equal(detectDocumentType('01210640180'), 'cpf');
  assert.equal(formatDocumentByType('01210640180', 'cpf'), '012.106.401-80');
  assert.equal(formatDocumentByType('11222333000181', 'cnpj'), '11.222.333/0001-81');

  assert.equal(isValidCpf('012.106.401-80'), true);
  assert.equal(isValidCpf('111.111.111-11'), false);
  assert.equal(isValidCpf('012.106.401-89'), false);

  assert.equal(isValidCnpj('11.222.333/0001-81'), true);
  assert.equal(isValidCnpj('00.000.000/0000-00'), false);
  assert.equal(isValidCnpj('11.222.333/0001-99'), false);
});

test('CEP lookup maps ViaCEP and local Mato Grosso CEPs into full address fields', () => {
  const viaVg = mapViaCepResponse('78110400', {
    cep: '78110-400',
    logradouro: 'Avenida Couto Magalhães',
    bairro: 'Centro Norte',
    localidade: 'Várzea Grande',
    uf: 'MT',
  });
  assert.equal(viaVg.found, true);
  assert.equal(viaVg.cep, '78110-400');
  assert.equal(viaVg.street, 'Avenida Couto Magalhães');
  assert.equal(viaVg.neighborhood, 'Centro Norte');
  assert.equal(viaVg.deliveryCityOption, 'Várzea Grande');
  assert.equal(viaVg.interiorCityName, '');

  const viaInterior = mapViaCepResponse('78550000', {
    cep: '78550-000',
    logradouro: 'Avenida das Embaúbas',
    bairro: 'Setor Comercial',
    localidade: 'Sinop',
    uf: 'MT',
  });
  assert.equal(viaInterior.found, true);
  assert.equal(viaInterior.deliveryCityOption, 'Interior de MT');
  assert.equal(viaInterior.interiorCityName, 'Sinop');

  const viaNotFound = mapViaCepResponse('99999999', { erro: true });
  assert.equal(viaNotFound.found, false);

  const localFallback = lookupLocalMtCep('78080000');
  assert.equal(localFallback.found, true);
  assert.equal(localFallback.street, 'Av. Fernando Corrêa da Costa');
  assert.equal(localFallback.neighborhood, 'Coxipó');
  assert.equal(localFallback.deliveryCityOption, 'Cuiabá');
});

test('validateCheckoutInput checks CPF/CNPJ and partial CEP while WhatsApp comanda prints both when provided', () => {
  const badCpf = validateCheckoutInput({
    customerName: 'João Silva',
    customerPhone: '65999999999',
    customerDocument: '111.111.111-11',
    customerDocumentType: 'cpf',
    deliveryType: 'pickup',
    street: '',
    number: '',
    neighborhood: '',
    paymentMethod: 'quote',
    total: 0,
  });
  assert.ok(badCpf && badCpf.includes('CPF'));

  const badCep = validateCheckoutInput({
    customerName: 'Empresa Limpa MT',
    customerPhone: '65999999999',
    customerDocument: '11.222.333/0001-81',
    customerDocumentType: 'cnpj',
    deliveryType: 'delivery',
    cep: '78110-4',
    street: 'Av. Couto Magalhães',
    number: '2820',
    neighborhood: 'Centro Norte',
    city: 'Várzea Grande',
    paymentMethod: 'quote',
    total: 0,
  });
  assert.ok(badCep && badCep.includes('CEP'));

  const validDocOrder = {
    ...INITIAL_ORDERS[0],
    customerDocument: '11.222.333/0001-81',
    customerDocumentType: 'cnpj' as const,
    address: {
      cep: '78110-400',
      street: 'Av. Couto Magalhães',
      number: '2820',
      neighborhood: 'Centro Norte',
      city: 'Várzea Grande' as const,
    },
    deliveryType: 'delivery' as const,
  };
  const comanda = buildWhatsAppOrderMessage(validDocOrder);
  assert.ok(comanda.includes('CNPJ: 11.222.333/0001-81'));
  assert.ok(comanda.includes('CEP 78110-400'));
});

test('Customer Area address helpers manage multiple addresses and keep primary address synced', () => {
  const baseProfile = {
    name: 'João Silva',
    phone: '65999999999',
    cep: '78110-400',
    street: 'Av. Couto Magalhães',
    number: '120',
    neighborhood: 'Centro Norte',
    city: 'Várzea Grande' as const,
    reference: 'Perto do Banco',
    isRegistered: true,
  };

  // Synthesizes primary address when addresses array is empty
  const initialAddrs = getCustomerAddresses(baseProfile);
  assert.equal(initialAddrs.length, 1);
  assert.equal(initialAddrs[0].isDefault, true);
  assert.equal(initialAddrs[0].cep, '78110-400');

  // Adding a second address marked as default syncs profile primary fields
  const withSecond = upsertCustomerAddress(baseProfile, {
    label: 'Empresa Coxipó',
    cep: '78080000',
    street: 'Av. Fernando Corrêa da Costa',
    number: '450',
    neighborhood: 'Coxipó',
    city: 'Cuiabá',
    reference: 'Galpão 2',
    isDefault: true,
  });

  assert.equal(withSecond.addresses?.length, 2);
  assert.equal(withSecond.cep, '78080-000');
  assert.equal(withSecond.city, 'Cuiabá');
  assert.equal(withSecond.neighborhood, 'Coxipó');
  assert.equal(withSecond.addresses?.filter((a) => a.isDefault).length, 1);

  // Switching default back to the first address updates profile primary address
  const firstId = withSecond.addresses![0].id;
  const switchedBack = setDefaultCustomerAddress(withSecond, firstId);
  assert.equal(switchedBack.cep, '78110-400');
  assert.equal(switchedBack.city, 'Várzea Grande');

  // Deleting an address removes it and promotes remaining address to default
  const secondId = switchedBack.addresses![1].id;
  const afterDelete = deleteCustomerAddress(switchedBack, secondId);
  assert.equal(afterDelete.addresses?.length, 1);
  assert.equal(afterDelete.addresses?.[0].isDefault, true);
});

test('getOrdersForCustomer and deriveFrequentlyBoughtProducts rank previously ordered products accurately', () => {
  const joaoOrders = getOrdersForCustomer(INITIAL_ORDERS, '(65) 99999-9999');
  assert.equal(joaoOrders.length, 2);
  assert.ok(
    new Date(joaoOrders[0].createdAt).getTime() >=
      new Date(joaoOrders[1].createdAt).getTime()
  );

  const frequent = deriveFrequentlyBoughtProducts(
    INITIAL_ORDERS,
    INITIAL_PRODUCTS,
    '65999999999'
  );
  assert.ok(frequent.length >= 3);
  assert.ok(frequent[0].orderCount >= 1);
  assert.ok(frequent[0].totalUnits >= 1);

  // Empty or unmatched phone returns no orders/products
  assert.equal(getOrdersForCustomer(INITIAL_ORDERS, '').length, 0);
  assert.equal(
    deriveFrequentlyBoughtProducts(INITIAL_ORDERS, INITIAL_PRODUCTS, '65900000000')
      .length,
    0
  );
});

test('getCustomerLatestActiveOrder returns active order only when customer is logged in and has non-completed order', () => {
  // Anonymous / logged-out visitors must not see other customers active orders on Home
  assert.equal(
    getCustomerLatestActiveOrder(INITIAL_ORDERS, { isRegistered: false, phone: '' }),
    undefined
  );
  assert.equal(
    getCustomerLatestActiveOrder(INITIAL_ORDERS, {
      isRegistered: false,
      phone: '(65) 99999-9999',
    }),
    undefined
  );

  // Logged-in customer with an in-progress order sees ONLY their own active order
  const joaoActive = getCustomerLatestActiveOrder(INITIAL_ORDERS, {
    isRegistered: true,
    phone: '(65) 99999-9999',
  });
  assert.equal(joaoActive?.id, '#LMP-1042');
  assert.notEqual(joaoActive?.status, 'completed');

  // Logged-in customer whose orders are all completed sees nothing on Home
  const completedOnlyOrders = INITIAL_ORDERS.filter(
    (o) => o.id === '#LMP-1035'
  );
  assert.equal(
    getCustomerLatestActiveOrder(completedOnlyOrders, {
      isRegistered: true,
      phone: '(65) 99999-9999',
    }),
    undefined
  );
});

test('isCustomerLoggedIn and getCustomerOrderCardStatusLabel format authentication state and concise card status labels', () => {
  assert.equal(isCustomerLoggedIn(undefined), false);
  assert.equal(
    isCustomerLoggedIn({ isRegistered: false, name: 'João', phone: '65999999999' }),
    false
  );
  assert.equal(
    isCustomerLoggedIn({ isRegistered: true, name: '', phone: '' }),
    false
  );
  assert.equal(
    isCustomerLoggedIn({ isRegistered: true, name: 'João Silva', phone: '' }),
    true
  );
  assert.equal(
    isCustomerLoggedIn({ isRegistered: true, name: '', phone: '(65) 99999-9999' }),
    true
  );

  assert.equal(
    getCustomerOrderCardStatusLabel({ status: 'completed', deliveryType: 'pickup' }),
    'Pedido retirado'
  );
  assert.equal(
    getCustomerOrderCardStatusLabel({ status: 'completed', deliveryType: 'delivery' }),
    'Pedido entregue'
  );
  assert.equal(
    getCustomerOrderCardStatusLabel({ status: 'separating', deliveryType: 'pickup' }),
    'Separando galões'
  );
  assert.equal(
    getCustomerOrderCardStatusLabel({ status: 'ready_or_out', deliveryType: 'pickup' }),
    'Pronto para retirada'
  );
  assert.equal(
    getCustomerOrderCardStatusLabel({ status: 'ready_or_out', deliveryType: 'delivery' }),
    'Saiu para entrega'
  );
});

test('Customer privacy and order isolation enforce exact ownership and block store-wide order exposure', () => {
  // Canonical Brazil phone matching strips +55/55 safely and blocks partial substrings
  assert.equal(canonicalBrazilPhone('+55 (65) 99999-9999'), '65999999999');
  assert.equal(matchCustomerPhoneExact('5565999999999', '(65) 99999-9999'), true);
  assert.equal(matchCustomerPhoneExact('65999999999', '99999999'), false);
  assert.equal(maskPhoneForPrivacy('(65) 99999-9999'), '(65) •••••-9999');

  // Private guest lookup requires BOTH matching order code AND exact matching WhatsApp
  assert.equal(matchesOrderCodeExact('#LMP-1042', 'lmp-1042'), true);
  assert.equal(matchesOrderCodeExact('#LMP-1042', '1042'), true);
  assert.equal(matchesOrderCodeExact('#LMP-1042', '10'), false);

  const verified = findOrderForPrivateLookup(INITIAL_ORDERS, '1042', '(65) 99999-9999');
  assert.equal(verified?.id, '#LMP-1042');
  // Wrong phone for that order returns null
  assert.equal(
    findOrderForPrivateLookup(INITIAL_ORDERS, '1042', '(65) 99244-1122'),
    null
  );
  // Missing/short code returns null
  assert.equal(
    findOrderForPrivateLookup(INITIAL_ORDERS, '', '(65) 99999-9999'),
    null
  );

  // Logged-out visitor sees ZERO store orders unless verified or placed in current session
  assert.equal(
    resolveCustomerVisibleOrders({
      orders: INITIAL_ORDERS,
      customerProfile: { isRegistered: false, name: '', phone: '' },
    }).length,
    0
  );

  // Guest with verified single-order lookup sees ONLY that single order (not João's other order)
  const guestVerified = resolveCustomerVisibleOrders({
    orders: INITIAL_ORDERS,
    customerProfile: { isRegistered: false, name: '', phone: '' },
    verifiedLookup: { orderId: '#LMP-1042', phone: '(65) 99999-9999' },
  });
  assert.deepEqual(
    guestVerified.map((o) => o.id),
    ['#LMP-1042']
  );

  // Guest who placed a new order in current session sees ONLY that session order
  const guestSession = resolveCustomerVisibleOrders({
    orders: INITIAL_ORDERS,
    customerProfile: { isRegistered: false, name: '', phone: '' },
    sessionOrderIds: ['#LMP-1041'],
  });
  assert.deepEqual(
    guestSession.map((o) => o.id),
    ['#LMP-1041']
  );

  // Logged-in customer sees ONLY their own orders and never other customers' orders
  const loggedInJoao = resolveCustomerVisibleOrders({
    orders: INITIAL_ORDERS,
    customerProfile: {
      isRegistered: true,
      name: 'João Silva',
      phone: '(65) 99999-9999',
    },
  });
  assert.deepEqual(
    loggedInJoao.map((o) => o.id),
    ['#LMP-1042', '#LMP-1035']
  );
});

test('duplicateProductItem and duplicateMultipleProducts clone products with unique SKUs right below source', () => {
  const sample = INITIAL_PRODUCTS.slice(0, 3);
  const firstSource = sample[0];

  const firstDup = duplicateProductItem(sample, firstSource.id, 1000);
  assert.equal(firstDup.nextProducts.length, 4);
  assert.ok(firstDup.duplicatedProduct !== null);
  assert.equal(firstDup.insertedIndex, 1);
  assert.equal(firstDup.nextProducts[1].id, firstDup.duplicatedProduct?.id);
  assert.notEqual(firstDup.duplicatedProduct?.id, firstSource.id);
  assert.equal(firstDup.duplicatedProduct?.sku, `${firstSource.sku}-COPIA`);
  assert.equal(firstDup.duplicatedProduct?.title, `${firstSource.title} (Cópia)`);
  assert.equal(firstDup.duplicatedProduct?.price, firstSource.price);

  // Duplicating the same source again produces unique numbered SKU and title
  const secondDup = duplicateProductItem(firstDup.nextProducts, firstSource.id, 2000);
  assert.equal(secondDup.nextProducts.length, 5);
  assert.equal(secondDup.duplicatedProduct?.sku, `${firstSource.sku}-COPIA-2`);
  assert.equal(secondDup.duplicatedProduct?.title, `${firstSource.title} (Cópia 2)`);

  // Batch duplicate clones all selected products cleanly
  const batchRes = duplicateMultipleProducts(sample, [sample[0].id, sample[2].id], 3000);
  assert.equal(batchRes.duplicatedProducts.length, 2);
  assert.equal(batchRes.nextProducts.length, 5);
  assert.equal(batchRes.nextProducts[1].sku, `${sample[0].sku}-COPIA`);
  assert.equal(batchRes.nextProducts[4].sku, `${sample[2].sku}-COPIA`);
});

test('paginateItems splits catalog every 30 products and formats zero-padded page labels', () => {
  assert.equal(ADMIN_PRODUCTS_PAGE_SIZE, 30);
  assert.equal(formatPageNumberLabel(1), '01');
  assert.equal(formatPageNumberLabel(2), '02');
  assert.equal(formatPageNumberLabel(12), '12');

  // Exactly 30 initial products fit on page 01
  assert.equal(INITIAL_PRODUCTS.length, 30);
  const pageExact30 = paginateItems(INITIAL_PRODUCTS, 1, ADMIN_PRODUCTS_PAGE_SIZE);
  assert.equal(pageExact30.totalPages, 1);
  assert.equal(pageExact30.pageItems.length, 30);
  assert.equal(pageExact30.startIndex, 1);
  assert.equal(pageExact30.endIndex, 30);

  // Adding a 31st product (e.g. via Duplicate) creates page 02 (items 31..31)
  const thirtyOne = duplicateProductItem(INITIAL_PRODUCTS, INITIAL_PRODUCTS[0].id, 999).nextProducts;
  assert.equal(thirtyOne.length, 31);

  const page1 = paginateItems(thirtyOne, 1, ADMIN_PRODUCTS_PAGE_SIZE);
  assert.equal(page1.totalPages, 2);
  assert.equal(page1.safePage, 1);
  assert.equal(page1.pageItems.length, 30);
  assert.equal(page1.startIndex, 1);
  assert.equal(page1.endIndex, 30);

  const page2 = paginateItems(thirtyOne, 2, ADMIN_PRODUCTS_PAGE_SIZE);
  assert.equal(page2.safePage, 2);
  assert.equal(page2.pageItems.length, 1);
  assert.equal(page2.startIndex, 31);
  assert.equal(page2.endIndex, 31);

  // Out-of-bounds page clamps cleanly
  const clamped = paginateItems(thirtyOne, 99, ADMIN_PRODUCTS_PAGE_SIZE);
  assert.equal(clamped.safePage, 2);

  // Empty array safely reports 0-0
  const empty = paginateItems([], 3, ADMIN_PRODUCTS_PAGE_SIZE);
  assert.equal(empty.totalPages, 1);
  assert.equal(empty.safePage, 1);
  assert.equal(empty.startIndex, 0);
  assert.equal(empty.endIndex, 0);
  assert.equal(empty.pageItems.length, 0);
});

test('reorderProductsById and moveProductStep move items up, down, to top/bottom, and across filtered subsets', () => {
  const list = INITIAL_PRODUCTS.slice(0, 4);
  const ids = list.map((p) => p.id); // [A, B, C, D]

  // Dragging A (0) before C (2) -> [B, A, C, D]
  const draggedBefore = reorderProductsById(list, ids[0], ids[2], 'before');
  assert.deepEqual(
    draggedBefore.map((p) => p.id),
    [ids[1], ids[0], ids[2], ids[3]]
  );

  // Dragging D (3) after A (0) -> [A, D, B, C]
  const draggedAfter = reorderProductsById(list, ids[3], ids[0], 'after');
  assert.deepEqual(
    draggedAfter.map((p) => p.id),
    [ids[0], ids[3], ids[1], ids[2]]
  );

  // Step down / up / top / bottom
  const movedDown = moveProductStep(list, ids[0], 'down');
  assert.deepEqual(
    movedDown.map((p) => p.id),
    [ids[1], ids[0], ids[2], ids[3]]
  );

  const movedUp = moveProductStep(movedDown, ids[0], 'up');
  assert.deepEqual(
    movedUp.map((p) => p.id),
    ids
  );

  const movedTop = moveProductStep(list, ids[3], 'top');
  assert.deepEqual(
    movedTop.map((p) => p.id),
    [ids[3], ids[0], ids[1], ids[2]]
  );

  // Moving among filtered subset [A, C] swaps C right before A even though B is between them
  const movedSubsetUp = moveProductStep(list, ids[2], 'up', [ids[0], ids[2]]);
  assert.deepEqual(
    movedSubsetUp.map((p) => p.id),
    [ids[2], ids[0], ids[1], ids[3]]
  );
});

test('getKanbanPeriodLabel and local-date today filter isolate current local day orders accurately', () => {
  assert.equal(formatBrDateFromYmd('2026-11-18'), '18/11/2026');
  assert.equal(
    getKanbanPeriodLabel('today', { todayYmd: '2026-11-18' }),
    'Hoje (18/11/2026)'
  );
  assert.equal(
    getKanbanPeriodLabel('custom', { startDate: '2026-11-09', endDate: '2026-11-09' }),
    '09/11/2026'
  );
  assert.equal(
    getKanbanPeriodLabel('custom', { startDate: '2026-11-04', endDate: '2026-11-09' }),
    '04/11/2026 a 09/11/2026'
  );

  // Local calendar date matching for live browser day boundaries
  const localNow = new Date(2026, 10, 18, 22, 30, 0); // Nov 18, 2026 22:30 local
  const localTodayOrder = {
    ...INITIAL_ORDERS[0],
    id: '#LMP-TODAY',
    createdAt: new Date(2026, 10, 18, 22, 15, 0).toISOString(),
  };
  const localYesterdayOrder = {
    ...INITIAL_ORDERS[1],
    id: '#LMP-YEST',
    createdAt: new Date(2026, 10, 17, 16, 0, 0).toISOString(),
  };

  const todayOnly = filterOrdersByCriteria([localTodayOrder, localYesterdayOrder], {
    datePreset: 'today',
    referenceNow: localNow,
    useLocalDate: true,
  });
  assert.deepEqual(
    todayOnly.map((o) => o.id),
    ['#LMP-TODAY']
  );

  const yesterdayOnly = filterOrdersByCriteria([localTodayOrder, localYesterdayOrder], {
    datePreset: 'yesterday',
    referenceNow: localNow,
    useLocalDate: true,
  });
  assert.deepEqual(
    yesterdayOnly.map((o) => o.id),
    ['#LMP-YEST']
  );
});

test('security audit event creation masks customer phone numbers for LGPD and bounds list size', () => {
  assert.equal(sanitizeTargetForAuditLog('65999112233'), '(65) •••••-2233');
  assert.equal(sanitizeTargetForAuditLog('(65) 99911-2233'), '(65) •••••-2233');
  assert.equal(sanitizeTargetForAuditLog('Usuário: admin'), 'Usuário: admin');

  const ev1 = createSecurityAuditEvent(
    {
      category: 'tracking_access',
      outcome: 'blocked',
      actorLabel: 'Visitante',
      rawTarget: '65999112233',
      orderId: '#LMP-1042',
      summary: 'Consulta bloqueada',
      detail: 'WhatsApp não confere.',
    },
    1700000000000
  );
  assert.equal(ev1.maskedTarget, '(65) •••••-2233');
  assert.equal(ev1.outcome, 'blocked');
  assert.equal(ev1.orderId, '#LMP-1042');

  let logs = appendSecurityAuditEvent([], {
    category: 'admin_auth',
    outcome: 'allowed',
    actorLabel: 'Gestor',
    rawTarget: 'admin',
    summary: 'Login autorizado',
    detail: 'Ok',
  }, 2, 1700000001000);

  logs = appendSecurityAuditEvent(logs, {
    category: 'tracking_access',
    outcome: 'blocked',
    actorLabel: 'Visitante',
    rawTarget: '65988776655',
    summary: 'Bloqueio 2',
    detail: 'Falha',
  }, 2, 1700000002000);

  logs = appendSecurityAuditEvent(logs, {
    category: 'customer_auth',
    outcome: 'info',
    actorLabel: 'Maria',
    rawTarget: '65999112233',
    summary: 'Logout',
    detail: 'Sessão encerrada',
  }, 2, 1700000003000);

  assert.equal(logs.length, 2);
  assert.equal(logs[0].summary, 'Logout');
  assert.equal(logs[1].summary, 'Bloqueio 2');

  const blockedOnly = filterSecurityAuditEvents(logs, { outcome: 'blocked' });
  assert.equal(blockedOnly.length, 1);
  assert.equal(blockedOnly[0].maskedTarget, '(65) •••••-6655');

  const searchFiltered = filterSecurityAuditEvents(logs, { searchQuery: 'maria' });
  assert.equal(searchFiltered.length, 1);
  assert.equal(searchFiltered[0].category, 'customer_auth');

  const csv = buildSecurityAuditCsv(logs);
  assert.ok(csv.includes('Data_Hora;Categoria;Resultado'));
  assert.ok(csv.includes('(65) •••••-2233'));
});

test('auditCustomerTrackingIsolation verifies zero anonymous exposure and zero cross-customer leaks', () => {
  const report = auditCustomerTrackingIsolation(INITIAL_ORDERS, {
    customerProfile: null,
    sessionOrderIds: [],
    verifiedLookup: null,
  });

  assert.equal(report.isFullyIsolated, true);
  assert.equal(report.guestUnverifiedVisibleCount, 0);
  assert.equal(report.totalCrossCustomerLeaks, 0);
  assert.equal(report.ordersMissingPhoneCount, 0);
  assert.equal(report.activeSessionMode, 'anonymous_locked');
  assert.equal(report.activeSessionVisibleOrderIds.length, 0);
  assert.ok(report.customerChecks.length >= 2);
  assert.ok(report.customerChecks.every((c) => c.isolated && c.crossCustomerLeakCount === 0));

  // Verify verified guest lookup exposes strictly that 1 matched order
  const targetOrder = INITIAL_ORDERS[0];
  const guestReport = auditCustomerTrackingIsolation(INITIAL_ORDERS, {
    customerProfile: null,
    sessionOrderIds: [],
    verifiedLookup: {
      orderId: targetOrder.id,
      phone: targetOrder.customerPhone,
    },
  });
  assert.equal(guestReport.activeSessionMode, 'verified_guest');
  assert.deepEqual(guestReport.activeSessionVisibleOrderIds, [targetOrder.id]);
});

test('promotional badge color helpers normalize HEX values, compute WCAG contrast text, and resolve presets cleanly', () => {
  assert.ok(PROMO_BADGE_COLOR_PRESETS.length >= 8);
  assert.equal(normalizeHexColor('#e3262e'), '#E3262E');
  assert.equal(normalizeHexColor('0f766e'), '#0F766E');
  assert.equal(normalizeHexColor('#abc'), '#AABBCC');
  assert.equal(normalizeHexColor('invalid-color', '#15803D'), '#15803D');

  // Auto-contrast text: dark text on bright yellow/light colors, white text on saturated/dark colors
  assert.equal(getContrastTextColor(DEFAULT_PROMO_BADGE_COLOR), '#18181B');
  assert.equal(getContrastTextColor('#FDE047'), '#18181B');
  assert.equal(getContrastTextColor(DEFAULT_HIGHLIGHT_BADGE_COLOR), '#FFFFFF');
  assert.equal(getContrastTextColor('#E3262E'), '#FFFFFF');
  assert.equal(getContrastTextColor('#18181B'), '#FFFFFF');
  assert.equal(getContrastTextColor('#15803D'), '#FFFFFF');

  // Resolve defaults and custom colors
  const defaultPromo = resolveProductBadgeStyle(undefined, 'promo');
  assert.equal(defaultPromo.backgroundColor, DEFAULT_PROMO_BADGE_COLOR);
  assert.equal(defaultPromo.color, '#18181B');
  assert.equal(defaultPromo.isCustom, false);
  assert.equal(defaultPromo.presetName, 'Amarelo Oferta');

  const redPromo = resolveProductBadgeStyle('#e3262e', 'promo');
  assert.equal(redPromo.backgroundColor, '#E3262E');
  assert.equal(redPromo.color, '#FFFFFF');
  assert.equal(redPromo.isCustom, true);
  assert.equal(redPromo.presetName, 'Vermelho Limper');

  const customTeal = resolveProductBadgeStyle('#0F766E', 'highlight');
  assert.equal(customTeal.backgroundColor, '#0F766E');
  assert.equal(customTeal.color, '#FFFFFF');
  assert.equal(customTeal.isCustom, true);
  assert.equal(customTeal.presetName, 'Cor personalizada');
});

test('authenticateAdminUser supports default Master, legacy limper alias, leveled users, and blocks inactive accounts', () => {
  const users = [
    ...DEFAULT_ADMIN_USERS,
    {
      id: 'adm-op-1',
      name: 'Carla Operação',
      username: 'carla',
      password: 'op123',
      role: 'operator' as const,
      allowedTabs: ['kanban' as const, 'products' as const],
      active: true,
      createdAt: '2026-11-19T08:00:00.000Z',
    },
    {
      id: 'adm-susp-1',
      name: 'Bruno Suspenso',
      username: 'bruno',
      password: 'op123',
      role: 'viewer' as const,
      allowedTabs: ['kanban' as const],
      active: false,
      createdAt: '2026-11-19T08:00:00.000Z',
    },
  ];

  const masterAuth = authenticateAdminUser(users, 'admin', 'limper123');
  assert.equal(masterAuth.ok, true);
  if (masterAuth.ok) assert.equal(masterAuth.user.role, 'master');

  const legacyAliasAuth = authenticateAdminUser(users, 'limper', 'limper123');
  assert.equal(legacyAliasAuth.ok, true);
  if (legacyAliasAuth.ok) assert.equal(legacyAliasAuth.user.username, 'admin');

  const opAuth = authenticateAdminUser(users, '@CARLA', 'op123');
  assert.equal(opAuth.ok, true);
  if (opAuth.ok) assert.equal(opAuth.user.id, 'adm-op-1');

  const suspendedAuth = authenticateAdminUser(users, 'bruno', 'op123');
  assert.equal(suspendedAuth.ok, false);
  if (!suspendedAuth.ok) {
    assert.equal(suspendedAuth.reason, 'inactive_account');
    assert.equal(suspendedAuth.matchedUser?.username, 'bruno');
  }

  const wrongPass = authenticateAdminUser(users, 'carla', 'wrong');
  assert.equal(wrongPass.ok, false);
  if (!wrongPass.ok) assert.equal(wrongPass.reason, 'invalid_credentials');
});

test('RBAC tab permissions grant Master full access and strictly lock non-Master users out of Usuários & Acessos', () => {
  const masterUser = DEFAULT_ADMIN_USERS[0];
  assert.deepEqual(getEffectiveAllowedTabs(masterUser), ALL_ADMIN_TABS);
  assert.equal(canAdminUserAccessTab(masterUser, 'users'), true);
  assert.equal(canAdminUserAccessTab(masterUser, 'security'), true);

  // Even if 'users' is manually injected into a non-Master user's allowedTabs, access stays blocked
  const operatorTampered = {
    role: 'operator' as const,
    allowedTabs: ['kanban' as const, 'products' as const, 'users' as const],
  };
  assert.deepEqual(getEffectiveAllowedTabs(operatorTampered), ['kanban', 'products']);
  assert.equal(canAdminUserAccessTab(operatorTampered, 'kanban'), true);
  assert.equal(canAdminUserAccessTab(operatorTampered, 'products'), true);
  assert.equal(canAdminUserAccessTab(operatorTampered, 'users'), false);
  assert.equal(canAdminUserAccessTab(operatorTampered, 'settings'), false);
});

test('validateAdminUserDraft enforces unique usernames, module selection, photo URLs, and last active Master protection', () => {
  assert.equal(normalizeAdminUsername(' @Carla Souza! '), 'carla.souza');

  const dupCheck = validateAdminUserDraft(
    {
      name: 'Outro Admin',
      username: 'admin',
      password: 'secret',
      role: 'master',
      allowedTabs: ALL_ADMIN_TABS,
      active: true,
    },
    DEFAULT_ADMIN_USERS
  );
  assert.equal(dupCheck.valid, false);
  assert.ok(dupCheck.error?.includes('já está em uso'));

  const noTabsNonMaster = validateAdminUserDraft(
    {
      name: 'Sem Telas',
      username: 'sem.telas',
      password: 'secret',
      role: 'operator',
      allowedTabs: ['users'],
      active: true,
    },
    DEFAULT_ADMIN_USERS
  );
  assert.equal(noTabsNonMaster.valid, false);

  // Cannot demote or deactivate the sole active Master
  const demoteLastMaster = validateAdminUserDraft(
    {
      name: 'Administrador Master',
      username: 'admin',
      password: 'limper123',
      role: 'manager',
      allowedTabs: ['kanban'],
      active: true,
    },
    DEFAULT_ADMIN_USERS,
    'admin-master-1'
  );
  assert.equal(demoteLastMaster.valid, false);
  assert.ok(demoteLastMaster.error?.includes('pelo menos 1 usuário Master ativo'));

  // Valid creation of a second Master with uploaded data:image photo
  const secondMasterValid = validateAdminUserDraft(
    {
      name: 'Diretora Ana',
      username: 'ana.master',
      password: 'master456',
      role: 'master',
      allowedTabs: ALL_ADMIN_TABS,
      active: true,
      avatarUrl: 'data:image/png;base64,iVBORw0KGgo=',
    },
    DEFAULT_ADMIN_USERS
  );
  assert.equal(secondMasterValid.valid, true);

  // Invalid avatar URL protocol rejected
  const badAvatar = validateAdminUserDraft(
    {
      name: 'Foto Inválida',
      username: 'foto.err',
      password: 'secret',
      role: 'catalog',
      allowedTabs: ['products'],
      active: true,
      avatarUrl: 'ftp://invalid.local/img.png',
    },
    DEFAULT_ADMIN_USERS
  );
  assert.equal(badAvatar.valid, false);
});

test('dashboard greeting, live date/time formatting, initials, and per-user security log filtering work accurately', () => {
  assert.equal(getUserInitials('Carla Operação Souza'), 'CS');
  assert.equal(getUserInitials('Admin'), 'AD');
  assert.equal(formatAdminActorLabel({ name: 'Carla', username: 'carla' }), 'Carla (@carla)');

  assert.equal(getTimeOfDayGreeting(new Date(2026, 10, 19, 8, 30, 0)), 'Bom dia');
  assert.equal(getTimeOfDayGreeting(new Date(2026, 10, 19, 14, 15, 0)), 'Boa tarde');
  assert.equal(getTimeOfDayGreeting(new Date(2026, 10, 19, 20, 45, 0)), 'Boa noite');

  const dt = formatAdminDashboardDateTime(new Date(2026, 10, 19, 14, 5, 9));
  assert.equal(dt.greeting, 'Boa tarde');
  assert.equal(dt.timeWithSeconds, '14:05:09');
  assert.equal(dt.timeShort, '14:05');
  assert.ok(dt.shortDate.includes('19/11/2026'));

  // Per-user audit log filtering
  let logs = appendSecurityAuditEvent(
    [],
    {
      category: 'user_management',
      outcome: 'allowed',
      actorLabel: 'Administrador Master (@admin)',
      actorUsername: 'admin',
      actorRole: 'master',
      rawTarget: '@carla',
      summary: 'Novo usuário Operador criado: Carla (@carla)',
      detail: 'Acesso liberado para Kanban e Produtos.',
    },
    50,
    1700000001000
  );
  logs = appendSecurityAuditEvent(
    logs,
    {
      category: 'order_security',
      outcome: 'info',
      actorLabel: 'Carla (@carla)',
      actorUsername: 'carla',
      actorRole: 'operator',
      rawTarget: '65999999999',
      orderId: '#LMP-1042',
      summary: 'Pedido movido para Separando',
      detail: 'Separação iniciada.',
    },
    50,
    1700000002000
  );

  const carlaLogs = filterSecurityAuditEvents(logs, { actorUsername: 'carla' });
  // Matches both actions performed by carla AND user_management actions targeting @carla
  assert.equal(carlaLogs.length, 2);

  const userMgmtLogs = filterSecurityAuditEvents(logs, { category: 'user_management' });
  assert.equal(userMgmtLogs.length, 1);
  assert.equal(userMgmtLogs[0].actorUsername, 'admin');
});

test('filterSecurityAuditEvents filters by specific calendar date and quick presets, and summarizeSecurityLogDates groups local days', () => {
  const refNow = new Date(2026, 10, 19, 15, 0, 0); // 19/11/2026 15:00 local
  const todayTs = new Date(2026, 10, 19, 10, 30, 0).getTime();
  const todayTs2 = new Date(2026, 10, 19, 14, 15, 0).getTime();
  const yesterdayTs = new Date(2026, 10, 18, 17, 45, 0).getTime();
  const fiveDaysAgoTs = new Date(2026, 10, 14, 9, 0, 0).getTime();
  const twentyDaysAgoTs = new Date(2026, 9, 30, 11, 0, 0).getTime();

  let logs = appendSecurityAuditEvent(
    [],
    {
      category: 'admin_auth',
      outcome: 'allowed',
      actorLabel: 'Administrador Master (@admin)',
      actorUsername: 'admin',
      actorRole: 'master',
      rawTarget: '@admin',
      summary: 'Login de outubro',
      detail: 'Evento antigo.',
    },
    50,
    twentyDaysAgoTs
  );
  logs = appendSecurityAuditEvent(
    logs,
    {
      category: 'catalog_policy',
      outcome: 'info',
      actorLabel: 'Carla (@carla)',
      actorUsername: 'carla',
      actorRole: 'catalog',
      rawTarget: 'QMP-101',
      summary: 'Produto editado há 5 dias',
      detail: 'Alteração de foto.',
    },
    50,
    fiveDaysAgoTs
  );
  logs = appendSecurityAuditEvent(
    logs,
    {
      category: 'order_security',
      outcome: 'info',
      actorLabel: 'Carla (@carla)',
      actorUsername: 'carla',
      actorRole: 'operator',
      rawTarget: '65999999999',
      orderId: '#LMP-1042',
      summary: 'Pedido separado ontem',
      detail: 'Kanban atualizado.',
    },
    50,
    yesterdayTs
  );
  logs = appendSecurityAuditEvent(
    logs,
    {
      category: 'site_backup',
      outcome: 'allowed',
      actorLabel: 'Administrador Master (@admin)',
      actorUsername: 'admin',
      actorRole: 'master',
      rawTarget: '19/11/2026',
      summary: 'Backup criado hoje cedo',
      detail: 'Snapshot completo salvo.',
    },
    50,
    todayTs
  );
  logs = appendSecurityAuditEvent(
    logs,
    {
      category: 'admin_auth',
      outcome: 'allowed',
      actorLabel: 'Administrador Master (@admin)',
      actorUsername: 'admin',
      actorRole: 'master',
      rawTarget: '@admin',
      summary: 'Login de hoje à tarde',
      detail: 'Sessão Master ativa.',
    },
    50,
    todayTs2
  );

  // Today preset
  const todayLogs = filterSecurityAuditEvents(logs, {
    datePreset: 'today',
    referenceNow: refNow,
  });
  assert.equal(todayLogs.length, 2);
  assert.ok(todayLogs.every((e) => e.summary.includes('hoje')));

  // Yesterday preset
  const yesterdayLogs = filterSecurityAuditEvents(logs, {
    datePreset: 'yesterday',
    referenceNow: refNow,
  });
  assert.equal(yesterdayLogs.length, 1);
  assert.equal(yesterdayLogs[0].summary, 'Pedido separado ontem');

  // Last 7 days preset (today + yesterday + 5 days ago = 4 events; excludes Oct 30)
  const last7Logs = filterSecurityAuditEvents(logs, {
    datePreset: 'last7',
    referenceNow: refNow,
  });
  assert.equal(last7Logs.length, 4);

  // Specific date chosen from calendar picker
  const oct30Logs = filterSecurityAuditEvents(logs, {
    datePreset: 'specific',
    specificDate: '2026-10-30',
    referenceNow: refNow,
  });
  assert.equal(oct30Logs.length, 1);
  assert.equal(oct30Logs[0].summary, 'Login de outubro');

  // Specific date with no recorded events returns empty array
  const emptyDayLogs = filterSecurityAuditEvents(logs, {
    datePreset: 'specific',
    specificDate: '2026-01-01',
    referenceNow: refNow,
  });
  assert.equal(emptyDayLogs.length, 0);

  // Date summary groups distinct dates newest-first with counts
  const dateSummaries = summarizeSecurityLogDates(logs);
  assert.equal(dateSummaries.length, 4);
  assert.deepEqual(dateSummaries[0], {
    dateKey: '2026-11-19',
    label: '19/11/2026',
    count: 2,
  });
  assert.deepEqual(dateSummaries[1], {
    dateKey: '2026-11-18',
    label: '18/11/2026',
    count: 1,
  });
});

test('Site Backup Vault engine creates immutable dated snapshots, filters by date, caps archive, and validates JSON imports safely', () => {
  assert.equal(formatBackupByteSize(512), '512 B');
  assert.equal(formatBackupByteSize(2048), '2,0 KB');
  assert.equal(formatBackupByteSize(1572864), '1,50 MB');

  const mutableProducts = INITIAL_PRODUCTS.slice(0, 3).map((p) => ({ ...p }));
  const basePayload = {
    categories: INITIAL_CATEGORIES,
    products: mutableProducts,
    kits: INITIAL_KITS,
    coupons: [],
    banners: INITIAL_BANNERS,
    orders: INITIAL_ORDERS,
    settings: INITIAL_STORE_SETTINGS,
    adminUsers: DEFAULT_ADMIN_USERS,
    securityLogs: [],
  };

  const nov19Ms = new Date(2026, 10, 19, 14, 0, 0).getTime();
  const nov18Ms = new Date(2026, 10, 18, 18, 0, 0).getTime();

  const snap1 = createSiteBackupSnapshot(
    {
      payload: basePayload,
      label: 'Backup Pré-Campanha',
      trigger: 'manual',
      createdBy: 'Administrador Master (@admin)',
      createdByUsername: 'admin',
    },
    nov19Ms
  );

  // Mutating live products after creating backup must NOT mutate snapshot payload
  mutableProducts[0].title = 'TITULO ALTERADO DEPOIS';
  assert.notEqual(snap1.payload.products[0].title, 'TITULO ALTERADO DEPOIS');
  assert.equal(snap1.dateKey, '2026-11-19');
  assert.equal(snap1.summary.productsCount, 3);
  assert.equal(snap1.summary.ordersCount, INITIAL_ORDERS.length);
  assert.ok(snap1.summary.sizeBytes > 100);

  const snap2 = createSiteBackupSnapshot(
    {
      payload: basePayload,
      label: 'Fechamento Dia 18',
      trigger: 'pre_restore',
      createdBy: 'Administrador Master (@admin)',
      createdByUsername: 'admin',
    },
    nov18Ms
  );

  // Append & cap test
  let archive = appendSiteBackupSnapshot([], snap2, 2);
  archive = appendSiteBackupSnapshot(archive, snap1, 2);
  assert.equal(archive.length, 2);
  assert.equal(archive[0].id, snap1.id);

  // Filter backups by date & search query
  const onlyNov18 = filterSiteBackupsByDate(archive, { specificDate: '2026-11-18' });
  assert.equal(onlyNov18.length, 1);
  assert.equal(onlyNov18[0].label, 'Fechamento Dia 18');

  const searchCampanha = filterSiteBackupsByDate(archive, { searchQuery: 'pré-campanha' });
  assert.equal(searchCampanha.length, 1);
  assert.equal(searchCampanha[0].id, snap1.id);

  const backupDates = summarizeSiteBackupDates(archive);
  assert.deepEqual(
    backupDates.map((d) => d.dateKey),
    ['2026-11-19', '2026-11-18']
  );

  // Import valid exported snapshot JSON preserves original dateKey
  const exportedJson = JSON.stringify(snap2);
  const importedOk = parseImportedSiteBackupJson(
    exportedJson,
    { label: 'Administrador Master (@admin)', username: 'admin' },
    nov19Ms
  );
  assert.equal(importedOk.ok, true);
  if (importedOk.ok) {
    assert.equal(importedOk.snapshot.dateKey, '2026-11-18');
    assert.equal(importedOk.snapshot.trigger, 'imported');
    assert.ok(importedOk.snapshot.label.includes('Fechamento Dia 18'));
  }

  // Import payload without active Master safely restores DEFAULT_ADMIN_USERS to prevent lockout
  const noMasterJson = JSON.stringify({
    ...basePayload,
    adminUsers: [],
  });
  const importedSafeMaster = parseImportedSiteBackupJson(
    noMasterJson,
    { label: 'Master', username: 'admin' },
    nov19Ms
  );
  assert.equal(importedSafeMaster.ok, true);
  if (importedSafeMaster.ok) {
    assert.ok(
      importedSafeMaster.snapshot.payload.adminUsers.some(
        (u) => u.role === 'master' && u.active
      )
    );
  }

  // Invalid JSON or missing required fields rejected cleanly
  const badJson = parseImportedSiteBackupJson('{broken', { label: 'Master' });
  assert.equal(badJson.ok, false);

  const incompatibleJson = parseImportedSiteBackupJson(
    JSON.stringify({ hello: 'world' }),
    { label: 'Master' }
  );
  assert.equal(incompatibleJson.ok, false);
});

test('generateNextOrderNumber prevents #LMP order ID collisions and CRUD validators reject invalid drafts', () => {
  // Collision-free order numbering even with gaps or high numbers
  assert.equal(
    generateNextOrderNumber([{ id: '#LMP-1043' }, { id: '#LMP-1099' }, { id: '#LMP-1045' }]),
    1100
  );
  assert.equal(generateNextOrderNumber([]), 1044);

  // Product validator: duplicate SKU and promo >= regular price rejected
  const dupSku = validateProductDraft(
    {
      title: 'Detergente Teste',
      sku: INITIAL_PRODUCTS[0].sku.toLowerCase(),
      price: 30,
      promoPrice: 25,
      categoryId: 'cat-casa',
    },
    INITIAL_PRODUCTS
  );
  assert.equal(dupSku.valid, false);
  assert.ok(dupSku.error?.includes('SKU'));

  const badPromo = validateProductDraft(
    {
      title: 'Detergente Teste',
      sku: 'QMP-999',
      price: 20,
      promoPrice: 25,
      categoryId: 'cat-casa',
    },
    INITIAL_PRODUCTS
  );
  assert.equal(badPromo.valid, false);
  assert.ok(badPromo.error?.includes('menor'));

  const okProduct = validateProductDraft(
    {
      title: 'Detergente Neutro 5L',
      sku: 'QMP-999',
      price: 30,
      promoPrice: 24.9,
      categoryId: 'cat-casa',
      installmentsCount: 3,
    },
    INITIAL_PRODUCTS
  );
  assert.equal(okProduct.valid, true);

  // Kit validator rejects empty or ghost product items
  assert.equal(
    validateKitDraft({ title: 'Kit Vazio', promoPrice: 50, items: [] }, INITIAL_PRODUCTS).valid,
    false
  );
  assert.equal(
    validateKitDraft(
      { title: 'Kit Fantasma', promoPrice: 50, items: [{ productId: 'does-not-exist', quantity: 1 }] },
      INITIAL_PRODUCTS
    ).valid,
    false
  );

  // Coupon validator rejects duplicate code and >100% discount
  assert.equal(
    validateCouponDraft(
      { code: INITIAL_COUPONS[0].code, discountType: 'percent', discountValue: 10, minOrderValue: 0 },
      INITIAL_COUPONS
    ).valid,
    false
  );
  assert.equal(
    validateCouponDraft(
      { code: 'SUPER200', discountType: 'percent', discountValue: 120, minOrderValue: 0 },
      INITIAL_COUPONS
    ).valid,
    false
  );

  // Category & Banner & Store settings validators
  assert.equal(
    validateCategoryDraft({ name: INITIAL_CATEGORIES[0].name }, INITIAL_CATEGORIES).valid,
    false
  );
  assert.equal(validateBannerDraft({ title: 'A' }).valid, false);
  assert.equal(
    validateStoreSettingsDraft({ ...INITIAL_STORE_SETTINGS, defaultDeliveryFee: -5 }).valid,
    false
  );
});

test('auditCatalogHealth detects real registration anomalies and autoRepairCatalogIntegrity fixes them cleanly', () => {
  // Baseline initial catalog has zero critical/fixable issues
  const cleanReport = auditCatalogHealth({
    categories: INITIAL_CATEGORIES,
    products: INITIAL_PRODUCTS,
    kits: INITIAL_KITS,
    coupons: INITIAL_COUPONS,
    banners: INITIAL_BANNERS,
    adminUsers: DEFAULT_ADMIN_USERS,
    siteBackups: [],
  });
  assert.equal(cleanReport.criticalCount, 0);
  assert.equal(cleanReport.autoFixableCount, 0);

  // Inject real defects: duplicate SKU, orphaned category, promo >= price, ghost kit ref, duplicate coupon + >100%
  const brokenProducts = [
    { ...INITIAL_PRODUCTS[0], sku: 'QMP-DUP', categoryId: 'cat-deleted', promoPrice: 999 },
    { ...INITIAL_PRODUCTS[1], sku: 'QMP-DUP' },
  ];
  const brokenKits = [
    { ...INITIAL_KITS[0], items: [{ productId: brokenProducts[0].id, quantity: 1 }, { productId: 'ghost-prod', quantity: 2 }] },
  ];
  const brokenCoupons = [
    { ...INITIAL_COUPONS[0], code: 'DUP10', discountType: 'percent' as const, discountValue: 150 },
    { ...INITIAL_COUPONS[1], code: 'DUP10', discountType: 'percent' as const, discountValue: 10 },
  ];
  const brokenBanners = [
    { ...INITIAL_BANNERS[0], featuredProductIds: [brokenProducts[0].id, 'ghost-prod'] },
  ];

  const dirtyReport = auditCatalogHealth({
    categories: INITIAL_CATEGORIES,
    products: brokenProducts,
    kits: brokenKits,
    coupons: brokenCoupons,
    banners: brokenBanners,
    adminUsers: DEFAULT_ADMIN_USERS,
    siteBackups: [],
  });
  assert.ok(dirtyReport.criticalCount >= 2);
  assert.ok(dirtyReport.autoFixableCount >= 4);

  const repaired = autoRepairCatalogIntegrity({
    categories: INITIAL_CATEGORIES,
    products: brokenProducts,
    kits: brokenKits,
    coupons: brokenCoupons,
    banners: brokenBanners,
  });
  assert.ok(repaired.fixesApplied.length >= 4);

  const postRepairReport = auditCatalogHealth({
    categories: INITIAL_CATEGORIES,
    products: repaired.products,
    kits: repaired.kits,
    coupons: repaired.coupons,
    banners: repaired.banners,
    adminUsers: DEFAULT_ADMIN_USERS,
    siteBackups: [],
  });
  assert.equal(postRepairReport.criticalCount, 0);
  assert.equal(postRepairReport.autoFixableCount, 0);
});

test('generateAutoSku produces unique AAA-000 codes for products and kits and validates kit SKUs', () => {
  const skuRegex = /^[A-Z]{3}-\d{3}$/;
  const existingSkus = INITIAL_PRODUCTS.map((p) => p.sku);

  // Sequential product SKU avoids collisions with existing catalog
  const prodSeq = generateAutoSku({
    kind: 'product',
    existingSkus,
    mode: 'sequential',
  });
  assert.match(prodSeq, skuRegex);
  assert.ok(prodSeq.startsWith('QMP-'));
  assert.ok(!existingSkus.includes(prodSeq));

  // Random product SKU avoids currentSku so repeated clicks always produce a fresh code
  const prodRand = generateAutoSku({
    kind: 'product',
    existingSkus,
    currentSku: prodSeq,
    mode: 'random',
    rng: () => 0.42,
  });
  assert.match(prodRand, skuRegex);
  assert.notEqual(prodRand, prodSeq);
  assert.ok(!existingSkus.includes(prodRand));

  // Preserves custom valid 3-letter prefix if typed by admin
  const customPrefix = generateAutoSku({
    kind: 'product',
    existingSkus: ['LMP-101'],
    preferredPrefix: 'lmp-101',
    mode: 'sequential',
  });
  assert.equal(customPrefix, 'LMP-102');

  // Kit SKU defaults to KIT-NNN
  const kitSku1 = generateAutoSku({
    kind: 'kit',
    existingSkus,
    mode: 'sequential',
  });
  assert.equal(kitSku1, 'KIT-101');
  assert.match(kitSku1, skuRegex);

  const kitSku2 = generateAutoSku({
    kind: 'kit',
    existingSkus: [...existingSkus, kitSku1],
    currentSku: kitSku1,
    mode: 'random',
    rng: () => 0.25,
  });
  assert.match(kitSku2, skuRegex);
  assert.ok(kitSku2.startsWith('KIT-'));
  assert.notEqual(kitSku2, kitSku1);

  // validateKitDraft rejects duplicate kit or product SKUs
  const dupProductSkuRes = validateKitDraft(
    {
      title: 'Kit Teste',
      sku: INITIAL_PRODUCTS[0].sku,
      promoPrice: 59.9,
      items: [{ productId: INITIAL_PRODUCTS[0].id, quantity: 1 }],
    },
    INITIAL_PRODUCTS,
    INITIAL_KITS
  );
  assert.equal(dupProductSkuRes.valid, false);

  const dupKitSkuRes = validateKitDraft(
    {
      title: 'Kit Teste 2',
      sku: 'KIT-101',
      promoPrice: 59.9,
      items: [{ productId: INITIAL_PRODUCTS[0].id, quantity: 1 }],
    },
    INITIAL_PRODUCTS,
    [{ ...INITIAL_KITS[0], sku: 'KIT-101' }]
  );
  assert.equal(dupKitSkuRes.valid, false);

  // buildKitCartProduct uses explicit kit.sku when defined
  const kitWithSku = { ...INITIAL_KITS[0], sku: 'KIT-250' };
  const builtProduct = buildKitCartProduct(kitWithSku, INITIAL_PRODUCTS);
  assert.equal(builtProduct.sku, 'KIT-250');
});

test('moveProductsToTrash, restoreProductFromTrash, permanentlyDeleteFromTrash and emptyProductTrash manage soft deletion safely', () => {
  const sample = INITIAL_PRODUCTS.slice(0, 5);
  const targetA = sample[0];
  const targetB = sample[2];

  // 1. Soft-delete single product moves it to trash with metadata & original index
  const del1 = moveProductsToTrash(
    sample,
    [],
    [targetA.id],
    'Administrador Master (@admin)',
    '2026-11-24T15:50:00.000Z'
  );
  assert.equal(del1.nextProducts.length, 4);
  assert.equal(del1.nextTrash.length, 1);
  assert.equal(del1.movedEntries.length, 1);
  assert.equal(del1.nextTrash[0].product.id, targetA.id);
  assert.equal(del1.nextTrash[0].originalIndex, 0);
  assert.equal(del1.nextTrash[0].deletedBy, 'Administrador Master (@admin)');

  // 2. Soft-delete another product prepends to trash
  const del2 = moveProductsToTrash(
    del1.nextProducts,
    del1.nextTrash,
    [targetB.id],
    'Operador (@op)',
    '2026-11-24T15:55:00.000Z'
  );
  assert.equal(del2.nextProducts.length, 3);
  assert.equal(del2.nextTrash.length, 2);
  assert.equal(del2.nextTrash[0].product.id, targetB.id);

  // 3. Restoring targetA puts it back at originalIndex 0 without modifying SKU/category
  const restoredA = restoreProductFromTrash(
    del2.nextProducts,
    del2.nextTrash,
    targetA.id,
    INITIAL_CATEGORIES
  );
  assert.equal(restoredA.restoredProduct?.id, targetA.id);
  assert.equal(restoredA.nextProducts[0].id, targetA.id);
  assert.equal(restoredA.nextTrash.length, 1);
  assert.equal(restoredA.skuReassigned, false);
  assert.equal(restoredA.categoryReassigned, false);

  // 4. Restoring when SKU is now taken and original category was removed auto-repairs both
  const productsWithCollision = [
    ...restoredA.nextProducts,
    { ...restoredA.nextProducts[0], id: 'prod-collider', sku: targetB.sku },
  ];
  const remainingCategories = INITIAL_CATEGORIES.filter(
    (c) => c.id !== targetB.categoryId
  );
  const restoredB = restoreProductFromTrash(
    productsWithCollision,
    restoredA.nextTrash,
    targetB.id,
    remainingCategories
  );
  assert.ok(restoredB.restoredProduct !== null);
  assert.equal(restoredB.skuReassigned, true);
  assert.match(restoredB.restoredProduct!.sku, /^[A-Z]{3}-\d{3}$/);
  assert.notEqual(restoredB.restoredProduct!.sku, targetB.sku);
  assert.equal(restoredB.categoryReassigned, true);
  assert.equal(restoredB.restoredProduct!.categoryId, remainingCategories[0].id);
  assert.equal(restoredB.nextTrash.length, 0);

  // 5. Permanent delete single item and empty trash
  const delBoth = moveProductsToTrash(
    sample,
    [],
    [targetA.id, targetB.id],
    'Administrador Master (@admin)'
  );
  assert.equal(delBoth.nextTrash.length, 2);

  const perm1 = permanentlyDeleteFromTrash(delBoth.nextTrash, targetA.id);
  assert.equal(perm1.removedEntry?.product.id, targetA.id);
  assert.equal(perm1.nextTrash.length, 1);

  const emptied = emptyProductTrash(perm1.nextTrash);
  assert.equal(emptied.removedCount, 1);
  assert.equal(emptied.nextTrash.length, 0);
});

test('computePayloadChecksum and verifySiteBackupIntegrity validate intact snapshots and detect tampering', () => {
  const basePayload = {
    categories: INITIAL_CATEGORIES,
    products: INITIAL_PRODUCTS,
    kits: INITIAL_KITS,
    coupons: INITIAL_COUPONS,
    banners: INITIAL_BANNERS,
    orders: INITIAL_ORDERS,
    settings: INITIAL_STORE_SETTINGS,
    adminUsers: DEFAULT_ADMIN_USERS,
    securityLogs: [],
  };

  const snap = createSiteBackupSnapshot({
    payload: basePayload,
    trigger: 'auto_scheduled',
    createdBy: 'Agendador Automático',
  });
  assert.ok(snap.checksum && /^[0-9A-F]{8}$/.test(snap.checksum));

  // Intact snapshot passes integrity check
  const okCheck = verifySiteBackupIntegrity(snap);
  assert.equal(okCheck.valid, true);
  assert.equal(okCheck.computedChecksum, snap.checksum);
  assert.equal(okCheck.issues.length, 0);

  // Security logs alone do not alter business-data checksum (prevents redundant exit backups)
  const checksumWithLogs = computePayloadChecksum({
    ...basePayload,
    securityLogs: [
      createSecurityAuditEvent({
        category: 'site_backup',
        outcome: 'info',
        actorLabel: 'Sistema',
        summary: 'Teste',
        detail: 'Log apenas',
      }),
    ],
  });
  assert.equal(checksumWithLogs, snap.checksum);

  // Tampering with a product price breaks checksum integrity check
  const tamperedSnap = {
    ...snap,
    payload: {
      ...snap.payload,
      products: snap.payload.products.map((p, idx) =>
        idx === 0 ? { ...p, price: p.price + 10 } : p
      ),
    },
  };
  const failCheck = verifySiteBackupIntegrity(tamperedSnap);
  assert.equal(failCheck.valid, false);
  assert.ok(failCheck.issues.some((i) => i.includes('divergente')));
});

test('Scheduled backup engine normalizes times, validates config, evaluates exact/catch-up slots, and computes next run', () => {
  assert.equal(normalizeScheduleTime('9:05'), '09:05');
  assert.equal(normalizeScheduleTime('23:59'), '23:59');
  assert.equal(normalizeScheduleTime('24:00'), null);
  assert.equal(normalizeScheduleTime('abc'), null);

  assert.deepEqual(sortAndDedupeScheduleTimes(['18:00', '9:00', '18:00', 'invalid', '12:30']), [
    '09:00',
    '12:30',
    '18:00',
  ]);

  assert.equal(
    validateBackupScheduleConfig({
      ...DEFAULT_BACKUP_SCHEDULE_CONFIG,
      enabled: true,
      times: [],
    }).valid,
    false
  );
  assert.equal(
    validateBackupScheduleConfig({
      ...DEFAULT_BACKUP_SCHEDULE_CONFIG,
      enabled: true,
      daysOfWeek: [],
    }).valid,
    false
  );
  assert.equal(
    validateBackupScheduleConfig({
      ...DEFAULT_BACKUP_SCHEDULE_CONFIG,
      enabled: true,
      times: ['09:00', '18:00'],
      daysOfWeek: [1, 2, 3, 4, 5],
      maxRetention: 20,
    }).valid,
    true
  );

  // Construct local date Tuesday 2026-11-24 at 09:01 (day 2)
  const tue0901 = new Date(2026, 10, 24, 9, 1, 0, 0).getTime();
  const cfg = {
    ...DEFAULT_BACKUP_SCHEDULE_CONFIG,
    enabled: true,
    times: ['09:00', '18:00'],
    daysOfWeek: [2, 4], // Tue, Thu
    runMissedOnReopen: true,
  };

  // Exact scheduled window triggers without catch-up flag
  const dueExact = evaluateDueScheduledBackup(cfg, tue0901, []);
  assert.equal(dueExact.isDue, true);
  assert.equal(dueExact.slotTime, '09:00');
  assert.equal(dueExact.slotKey, '2026-11-24@09:00');
  assert.equal(dueExact.isCatchUp, false);

  // Already executed slot does NOT fire again
  const alreadyDone = evaluateDueScheduledBackup(
    { ...cfg, lastExecutedSlotKey: '2026-11-24@09:00' },
    tue0901,
    []
  );
  assert.equal(alreadyDone.isDue, false);

  // Missed slot at 11:30 triggers catch-up when runMissedOnReopen=true, skips when false
  const tue1130 = new Date(2026, 10, 24, 11, 30, 0, 0).getTime();
  const dueCatchUp = evaluateDueScheduledBackup(cfg, tue1130, []);
  assert.equal(dueCatchUp.isDue, true);
  assert.equal(dueCatchUp.slotTime, '09:00');
  assert.equal(dueCatchUp.isCatchUp, true);

  const skipCatchUp = evaluateDueScheduledBackup(
    { ...cfg, runMissedOnReopen: false },
    tue1130,
    []
  );
  assert.equal(skipCatchUp.isDue, false);

  // Non-scheduled weekday (Wednesday = 3) never fires
  const wed0900 = new Date(2026, 10, 25, 9, 0, 0, 0).getTime();
  assert.equal(evaluateDueScheduledBackup(cfg, wed0900, []).isDue, false);

  // Next scheduled info finds same-day 18:00 from 11:30
  const nextSameDay = getNextScheduledBackupInfo(cfg, tue1130);
  assert.equal(nextSameDay?.nextDateKey, '2026-11-24');
  assert.equal(nextSameDay?.nextTime, '18:00');
  assert.ok(nextSameDay?.label.startsWith('Hoje às 18:00'));

  // From Tue 19:00, skips Wed and finds Thu 09:00
  const tue1900 = new Date(2026, 10, 24, 19, 0, 0, 0).getTime();
  const nextThu = getNextScheduledBackupInfo(cfg, tue1900);
  assert.equal(nextThu?.nextDateKey, '2026-11-26');
  assert.equal(nextThu?.nextTime, '09:00');
});






