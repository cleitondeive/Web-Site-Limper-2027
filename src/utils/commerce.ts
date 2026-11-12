import {
  CartItem,
  CatalogSortOption,
  DeliveryCityOption,
  DeliveryType,
  LogisticsDeliveryMode,
  Order,
  OrderDatePreset,
  OrderStatus,
  PaymentMethod,
  Product,
  PromoCoupon,
  PromoKit,
  StoreSettings,
  VolumeFilterOption,
} from '../types/commerce';

export function formatCurrency(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `R$ ${safe.toFixed(2).replace('.', ',')}`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function formatPhone(phone: string): string {
  const digits = normalizePhone(phone).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function isProductPriceVisible(product: Product, settings?: StoreSettings): boolean {
  if (settings?.hideAllPrices) {
    return false;
  }
  return product.showPrice !== false;
}

export function isCatalogAllPricesHidden(
  products: Product[],
  settings?: StoreSettings,
  kits?: PromoKit[]
): boolean {
  if (settings?.hideAllPrices) {
    return true;
  }
  const hasVisibleProduct = products.some(
    (p) => p.status !== 'inactive' && isProductPriceVisible(p, settings)
  );
  const hasVisibleKit = (kits || []).some(
    (k) => k.active && k.showPrice !== false && !settings?.hideAllPrices
  );
  return !hasVisibleProduct && !hasVisibleKit;
}

export function getEffectivePrice(product: Product): number {
  if (
    typeof product.promoPrice === 'number' &&
    product.promoPrice > 0 &&
    product.promoPrice < product.price
  ) {
    return product.promoPrice;
  }
  return product.price;
}

export function getDiscountPercentage(product: Product): number {
  if (
    typeof product.promoPrice === 'number' &&
    product.promoPrice > 0 &&
    product.promoPrice < product.price
  ) {
    return Math.round(((product.price - product.promoPrice) / product.price) * 100);
  }
  return 0;
}

export function getPricePerLiterLabel(product: Product): string | null {
  const effective = getEffectivePrice(product);
  if (effective <= 0) return null;
  const primaryVol = product.volumeLabel.split('|')[0].trim();
  const matchLiters = primaryVol.match(/^(\d+(?:[.,]\d+)?)\s*L$/i);
  if (litersMatchValid(matchLiters)) {
    const liters = parseFloat(matchLiters[1].replace(',', '.'));
    if (liters > 1) {
      const perLiter = effective / liters;
      return `${formatCurrency(perLiter)}/L`;
    }
  }
  return null;
}

function litersMatchValid(match: RegExpMatchArray | null): match is RegExpMatchArray {
  return Boolean(match && match[1]);
}

export interface ProductInstallmentMeta {
  count: number;
  noInterest: boolean;
  installmentValue: number;
  label: string;
}

export function getProductInstallmentMeta(
  product: Product,
  settings?: StoreSettings
): ProductInstallmentMeta {
  const rawCount =
    product.installmentsCount ?? settings?.defaultInstallmentsCount ?? 3;
  const count = Math.max(1, Math.min(12, Math.round(rawCount || 3)));
  const noInterest =
    product.installmentsNoInterest ??
    settings?.defaultInstallmentsNoInterest ??
    true;
  const effectivePrice = getEffectivePrice(product);
  const installmentValue =
    count > 0 ? Math.round((effectivePrice / count) * 100) / 100 : effectivePrice;

  const label =
    count > 1
      ? `${count}x ${formatCurrency(installmentValue)} ${noInterest ? 's/ juros' : 'no cartão'}`
      : `À vista ${formatCurrency(effectivePrice)}`;

  return {
    count,
    noInterest,
    installmentValue,
    label,
  };
}

export function isOrderQuoteOnly(order: Order): boolean {
  if (order.isQuoteOnly) return true;
  if (order.items.length > 0 && order.items.every((item) => item.priceHidden)) {
    return true;
  }
  return false;
}

export interface CouponEvaluation {
  valid: boolean;
  code: string;
  discountAmount: number;
  label: string;
}

export function evaluateCoupon(
  rawCode: string,
  subtotal: number,
  customCoupons?: PromoCoupon[]
): CouponEvaluation {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code || subtotal <= 0) {
    return { valid: false, code: '', discountAmount: 0, label: '' };
  }

  // If customCoupons from Admin are provided, check them first
  if (customCoupons && customCoupons.length > 0) {
    const matched = customCoupons.find(
      (c) => c.code.trim().toUpperCase() === code && c.active
    );
    if (matched) {
      const minOrder = matched.minOrderValue || 0;
      if (minOrder > 0 && subtotal < minOrder) {
        return {
          valid: false,
          code: matched.code.toUpperCase(),
          discountAmount: 0,
          label: `Adicione mais ${formatCurrency(minOrder - subtotal)} para liberar o cupom ${matched.code.toUpperCase()} (${matched.description}).`,
        };
      }
      const rawDiscount =
        matched.discountType === 'percent'
          ? Math.round(subtotal * (matched.discountValue / 100) * 100) / 100
          : matched.discountValue;
      const discount = Math.min(subtotal, Math.max(0, rawDiscount));
      return {
        valid: true,
        code: matched.code.toUpperCase(),
        discountAmount: discount,
        label: `${matched.description} aplicado!`,
      };
    }

    const inactiveMatch = customCoupons.find(
      (c) => c.code.trim().toUpperCase() === code && !c.active
    );
    if (inactiveMatch) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        label: `O cupom ${code} está temporariamente inativo.`,
      };
    }
  }

  if (code === 'LIMPER10') {
    const discount = Math.round(subtotal * 0.1 * 100) / 100;
    return {
      valid: true,
      code: 'LIMPER10',
      discountAmount: discount,
      label: '10% OFF Clube Limper MT aplicado!',
    };
  }

  if (code === 'BEMVINDO') {
    const discount = Math.round(subtotal * 0.05 * 100) / 100;
    return {
      valid: true,
      code: 'BEMVINDO',
      discountAmount: discount,
      label: '5% OFF Primeira Compra aplicado!',
    };
  }

  if (code === 'ATACADO5L') {
    if (subtotal < 120) {
      return {
        valid: false,
        code: 'ATACADO5L',
        discountAmount: 0,
        label: `Adicione mais ${formatCurrency(120 - subtotal)} para liberar R$ 15,00 OFF no cupom ATACADO5L.`,
      };
    }
    return {
      valid: true,
      code: 'ATACADO5L',
      discountAmount: 15,
      label: 'R$ 15,00 OFF Lote Atacado 5L aplicado!',
    };
  }

  const availableCodes =
    customCoupons && customCoupons.filter((c) => c.active).length > 0
      ? customCoupons
          .filter((c) => c.active)
          .map((c) => c.code.toUpperCase())
          .join(', ')
      : 'LIMPER10, BEMVINDO ou ATACADO5L';

  return {
    valid: false,
    code,
    discountAmount: 0,
    label: `Cupom inválido. Experimente: ${availableCodes}.`,
  };
}

export function addToCart(cart: CartItem[], product: Product, qty = 1): CartItem[] {
  if (product.status !== 'active' || qty <= 0) return cart;
  const existingIndex = cart.findIndex((item) => item.product.id === product.id);
  if (existingIndex > -1) {
    return cart.map((item, idx) =>
      idx === existingIndex ? { ...item, quantity: item.quantity + qty } : item
    );
  }
  return [...cart, { product, quantity: qty }];
}

export function updateCartQuantity(
  cart: CartItem[],
  productId: string,
  newQuantity: number
): CartItem[] {
  if (newQuantity <= 0) {
    return cart.filter((item) => item.product.id !== productId);
  }
  return cart.map((item) =>
    item.product.id === productId ? { ...item, quantity: newQuantity } : item
  );
}

export interface KitPricingBreakdown {
  resolvedEntries: { product: Product; quantity: number }[];
  regularTotal: number;
  listPriceTotal: number;
  finalKitPrice: number;
  savingsAmount: number;
  discountPct: number;
  totalUnitsCount: number;
}

export function calculateKitPricing(
  kit: PromoKit,
  catalogProducts: Product[]
): KitPricingBreakdown {
  const resolvedEntries = kit.items
    .map((item) => {
      const product = catalogProducts.find((p) => p.id === item.productId);
      return product ? { product, quantity: Math.max(1, item.quantity) } : null;
    })
    .filter(
      (entry): entry is { product: Product; quantity: number } => Boolean(entry)
    );

  const regularTotalRaw = resolvedEntries.reduce(
    (acc, entry) => acc + getEffectivePrice(entry.product) * entry.quantity,
    0
  );
  const listPriceTotalRaw = resolvedEntries.reduce(
    (acc, entry) => acc + entry.product.price * entry.quantity,
    0
  );

  const regularTotal = Math.round(regularTotalRaw * 100) / 100;
  const listPriceTotal = Math.round(listPriceTotalRaw * 100) / 100;
  const finalKitPrice =
    kit.promoPrice > 0 ? Math.round(kit.promoPrice * 100) / 100 : regularTotal;
  const savingsAmount = Math.max(
    0,
    Math.round((regularTotal - finalKitPrice) * 100) / 100
  );
  const discountPct =
    regularTotal > 0 ? Math.round((savingsAmount / regularTotal) * 100) : 0;
  const totalUnitsCount = resolvedEntries.reduce(
    (acc, entry) => acc + entry.quantity,
    0
  );

  return {
    resolvedEntries,
    regularTotal,
    listPriceTotal,
    finalKitPrice,
    savingsAmount,
    discountPct,
    totalUnitsCount,
  };
}

export function buildKitCartProduct(
  kit: PromoKit,
  catalogProducts: Product[]
): Product {
  const breakdown = calculateKitPricing(kit, catalogProducts);
  const itemsLabel = breakdown.resolvedEntries
    .map((e) => `${e.quantity}x ${e.product.title} (${e.product.volumeLabel})`)
    .join(' + ');

  return {
    id: kit.id,
    sku: `KIT-${kit.id.replace(/^kit-/i, '').toUpperCase()}`,
    title: kit.title,
    description: itemsLabel
      ? `Itens inclusos no Kit: ${itemsLabel}`
      : kit.description,
    categoryId: 'cat-casa',
    price: breakdown.regularTotal > 0 ? breakdown.regularTotal : breakdown.finalKitPrice,
    promoPrice:
      breakdown.finalKitPrice < breakdown.regularTotal
        ? breakdown.finalKitPrice
        : null,
    showPrice: kit.showPrice !== false,
    unit: 'Kit',
    volumeLabel: `Combo (${breakdown.totalUnitsCount} unid.)`,
    status: kit.active ? 'active' : 'inactive',
    imageUrl: kit.imageUrl,
    featured: true,
    badgeLabel: kit.badge,
    dilutionHint: itemsLabel || kit.description,
    kitItems: breakdown.resolvedEntries.map((entry) => ({
      productId: entry.product.id,
      sku: entry.product.sku,
      title: entry.product.title,
      volumeLabel: entry.product.volumeLabel,
      quantity: entry.quantity,
    })),
  };
}

export function mergeOrderIntoCart(
  currentCart: CartItem[],
  order: Order,
  catalogProducts: Product[],
  kits?: PromoKit[]
): { updatedCart: CartItem[]; addedCount: number } {
  let updated = [...currentCart];
  let addedCount = 0;

  for (const orderItem of order.items) {
    const matchedProduct = catalogProducts.find(
      (p) => p.id === orderItem.productId && p.status === 'active'
    );
    if (matchedProduct) {
      updated = addToCart(updated, matchedProduct, orderItem.quantity);
      addedCount += orderItem.quantity;
      continue;
    }

    if (kits && kits.length > 0) {
      const matchedKit = kits.find(
        (k) => k.id === orderItem.productId && k.active
      );
      if (matchedKit) {
        const kitProduct = buildKitCartProduct(matchedKit, catalogProducts);
        updated = addToCart(updated, kitProduct, orderItem.quantity);
        addedCount += orderItem.quantity;
      }
    }
  }

  return { updatedCart: updated, addedCount };
}

export interface NormalizedLogisticsSettings {
  motoVgMin: number;
  motoCbaMin: number;
  truckVgMin: number;
  truckCbaMin: number;
  interiorMtNote: string;
}

export function getLogisticsSettings(
  settings?: Partial<StoreSettings>
): NormalizedLogisticsSettings {
  const safeMin = (val: unknown, fallback: number): number => {
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
      return val;
    }
    return fallback;
  };

  return {
    motoVgMin: safeMin(settings?.motoLimperVgMin, 50),
    motoCbaMin: safeMin(settings?.motoLimperCbaMin, 100),
    truckVgMin: safeMin(settings?.truckVgMin, 150),
    truckCbaMin: safeMin(settings?.truckCbaMin, 200),
    interiorMtNote:
      (settings?.interiorMtNote || '').trim() ||
      'Para as demais cidades de Mato Grosso, consulte rotas e frete direto com nosso suporte via WhatsApp.',
  };
}

export function getLogisticsMinimumOrderValue(
  settings: Partial<StoreSettings> | undefined,
  vehicle: 'moto_limper' | 'truck',
  city: DeliveryCityOption
): number | null {
  if (city === 'Interior de MT') return null;
  const log = getLogisticsSettings(settings);
  if (vehicle === 'moto_limper') {
    return city === 'Várzea Grande' ? log.motoVgMin : log.motoCbaMin;
  }
  return city === 'Várzea Grande' ? log.truckVgMin : log.truckCbaMin;
}

export interface LogisticsEligibilityResult {
  mode: LogisticsDeliveryMode;
  minRequired: number | null;
  meetsMinimum: boolean;
  remainingToMinimum: number;
  requiresWhatsAppConsult: boolean;
  headline: string;
  detail: string;
}

export function evaluateLogisticsEligibility(params: {
  settings?: Partial<StoreSettings>;
  subtotal: number;
  isQuoteOnly: boolean;
  deliveryType: DeliveryType;
  city: DeliveryCityOption;
  vehicle: 'moto_limper' | 'truck';
}): LogisticsEligibilityResult {
  const { settings, subtotal, isQuoteOnly, deliveryType, city, vehicle } = params;
  if (deliveryType === 'pickup') {
    return {
      mode: 'pickup',
      minRequired: 0,
      meetsMinimum: true,
      remainingToMinimum: 0,
      requiresWhatsAppConsult: false,
      headline: 'Retirada no Balcão Limper MT (Grátis)',
      detail: 'Sem valor mínimo · Separação expressa em ~15 min na Av. Couto Magalhães, 2820.',
    };
  }

  if (city === 'Interior de MT') {
    const log = getLogisticsSettings(settings);
    return {
      mode: 'interior_mt',
      minRequired: null,
      meetsMinimum: true,
      remainingToMinimum: 0,
      requiresWhatsAppConsult: true,
      headline: 'Restante de Mato Grosso · Consulta via WhatsApp',
      detail: log.interiorMtNote,
    };
  }

  const minRequired = getLogisticsMinimumOrderValue(settings, vehicle, city) ?? 0;
  const vehicleName =
    vehicle === 'moto_limper'
      ? 'Moto Limper (pequenos itens que cabem na moto)'
      : 'Entrega de Caminhão Limper';

  if (isQuoteOnly) {
    return {
      mode: vehicle,
      minRequired,
      meetsMinimum: true,
      remainingToMinimum: 0,
      requiresWhatsAppConsult: false,
      headline: `${vehicleName} · ${city} - MT`,
      detail: `Pedido mínimo de ${formatCurrency(minRequired)} para ${city} - MT (suporte valida os valores e confirma a rota no WhatsApp).`,
    };
  }

  const remaining = Math.max(0, Math.round((minRequired - subtotal) * 100) / 100);
  const meetsMinimum = remaining <= 0;

  return {
    mode: vehicle,
    minRequired,
    meetsMinimum,
    remainingToMinimum: remaining,
    requiresWhatsAppConsult: false,
    headline: meetsMinimum
      ? `${vehicleName} liberada para ${city} - MT!`
      : `Faltam ${formatCurrency(remaining)} para atingir o mínimo (${formatCurrency(minRequired)})`,
    detail: meetsMinimum
      ? `Seu pedido de ${formatCurrency(subtotal)} atinge o valor mínimo de ${formatCurrency(minRequired)} para ${city} - MT.`
      : `Para ${vehicleName} em ${city} - MT, pedidos acima de ${formatCurrency(minRequired)} (ou retire grátis no balcão).`,
  };
}

export function formatLogisticsModeLabel(
  mode?: LogisticsDeliveryMode,
  interiorCityName?: string
): string {
  if (mode === 'moto_limper') {
    return 'Moto Limper (Pequenos itens que cabem na moto)';
  }
  if (mode === 'truck') {
    return 'Entrega de Caminhão Limper (Volumes / Galões)';
  }
  if (mode === 'interior_mt') {
    return `Interior de MT (${interiorCityName?.trim() || 'Consultar frete via WhatsApp'})`;
  }
  return 'Retirada no Balcão (Av. Couto Magalhães, 2820)';
}

export function buildLogisticsWhatsAppConsultUrl(
  whatsappNumber: string,
  cityName?: string
): string {
  const cleanPhone = normalizePhone(whatsappNumber) || '556530296824';
  const cityText = cityName?.trim()
    ? `para a cidade de ${cityName.trim()} - MT`
    : 'para outra cidade do estado de Mato Grosso';
  const msg = `Olá, equipe Limper MT! Gostaria de consultar a rota de entrega e frete (Caminhão / Transportadora) ${cityText}.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

export function calculateDeliveryFee(
  subtotal: number,
  deliveryType: DeliveryType,
  neighborhoodName: string,
  settings: StoreSettings
): number {
  if (deliveryType === 'pickup' || subtotal <= 0) {
    return 0;
  }
  if (settings.freeShippingThreshold > 0 && subtotal >= settings.freeShippingThreshold) {
    return 0;
  }
  const matched = settings.neighborhoodFees.find(
    (n) => n.name.toLowerCase() === neighborhoodName.trim().toLowerCase()
  );
  return matched ? matched.fee : settings.defaultDeliveryFee;
}

export function calculateCartTotals(
  cart: CartItem[],
  deliveryType: DeliveryType,
  neighborhoodName: string,
  settings: StoreSettings,
  couponCode?: string,
  customCoupons?: PromoCoupon[]
): {
  itemCount: number;
  subtotal: number;
  savings: number;
  couponDiscount: number;
  appliedCouponCode: string;
  couponMessage: string;
  deliveryFee: number;
  total: number;
  freeShippingRemaining: number;
  hasHiddenPriceItems: boolean;
  isQuoteOnly: boolean;
} {
  let itemCount = 0;
  let subtotal = 0;
  let savings = 0;
  let hasHiddenPriceItems = Boolean(settings.hideAllPrices);
  let visibleItemsCount = 0;

  for (const item of cart) {
    const visible = isProductPriceVisible(item.product, settings);
    if (!visible) {
      hasHiddenPriceItems = true;
    } else {
      visibleItemsCount += 1;
    }
    const effective = getEffectivePrice(item.product);
    itemCount += item.quantity;
    if (visible) {
      subtotal += effective * item.quantity;
      if (effective < item.product.price) {
        savings += (item.product.price - effective) * item.quantity;
      }
    }
  }

  subtotal = Math.round(subtotal * 100) / 100;
  savings = Math.round(savings * 100) / 100;
  const isQuoteOnly = cart.length > 0 && visibleItemsCount === 0;

  const couponEval = isQuoteOnly
    ? { valid: false, code: '', discountAmount: 0, label: '' }
    : evaluateCoupon(couponCode || '', subtotal, customCoupons);
  const couponDiscount = couponEval.valid ? couponEval.discountAmount : 0;

  const deliveryFee = calculateDeliveryFee(subtotal, deliveryType, neighborhoodName, settings);
  const total = Math.max(0, Math.round((subtotal - couponDiscount + deliveryFee) * 100) / 100);

  const freeShippingRemaining =
    !isQuoteOnly && settings.freeShippingThreshold > 0
      ? Math.max(0, Math.round((settings.freeShippingThreshold - subtotal) * 100) / 100)
      : 0;

  return {
    itemCount,
    subtotal,
    savings,
    couponDiscount,
    appliedCouponCode: couponEval.valid ? couponEval.code : '',
    couponMessage: couponEval.label,
    deliveryFee,
    total,
    freeShippingRemaining,
    hasHiddenPriceItems,
    isQuoteOnly,
  };
}

export function matchesVolumeFilter(product: Product, volumeFilter?: VolumeFilterOption): boolean {
  if (!volumeFilter || volumeFilter === 'all') return true;
  const vol = product.volumeLabel.toUpperCase();
  if (volumeFilter === '5L') {
    return vol.includes('5L') || vol.includes('3,5L');
  }
  if (volumeFilter === '2L_1L') {
    return vol.includes('2L') || vol.includes('1L');
  }
  if (volumeFilter === 'small') {
    return vol.includes('ML') || vol.includes('UNID');
  }
  return true;
}

export function filterProducts(
  products: Product[],
  options: {
    categoryId?: string | null;
    searchQuery?: string;
    onlyOffers?: boolean;
    includeInactive?: boolean;
    volumeFilter?: VolumeFilterOption;
    sortBy?: CatalogSortOption;
  }
): Product[] {
  const query = (options.searchQuery || '').trim().toLowerCase();

  const filtered = products.filter((product) => {
    if (!options.includeInactive && product.status === 'inactive') {
      return false;
    }
    if (options.categoryId && options.categoryId !== 'all' && product.categoryId !== options.categoryId) {
      return false;
    }
    if (options.onlyOffers && getDiscountPercentage(product) <= 0) {
      return false;
    }
    if (!matchesVolumeFilter(product, options.volumeFilter)) {
      return false;
    }
    if (query) {
      const haystack = `${product.title} ${product.description} ${product.sku} ${product.volumeLabel}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });

  if (!options.sortBy || options.sortBy === 'featured') {
    return [...filtered].sort((a, b) => {
      const aFeat = a.featured ? 1 : 0;
      const bFeat = b.featured ? 1 : 0;
      if (aFeat !== bFeat) return bFeat - aFeat;
      return 0;
    });
  }

  return [...filtered].sort((a, b) => {
    if (options.sortBy === 'price_asc') {
      return getEffectivePrice(a) - getEffectivePrice(b);
    }
    if (options.sortBy === 'price_desc') {
      return getEffectivePrice(b) - getEffectivePrice(a);
    }
    if (options.sortBy === 'discount_desc') {
      return getDiscountPercentage(b) - getDiscountPercentage(a);
    }
    if (options.sortBy === 'name_asc') {
      return a.title.localeCompare(b.title, 'pt-BR');
    }
    return 0;
  });
}

export function filterOrdersByPhone(orders: Order[], phoneQuery: string): Order[] {
  const digits = normalizePhone(phoneQuery);
  if (!digits) return orders;
  return orders.filter((order) => normalizePhone(order.customerPhone).includes(digits));
}

export interface CheckoutValidationInput {
  customerName: string;
  customerPhone: string;
  deliveryType: DeliveryType;
  city?: DeliveryCityOption;
  interiorCityName?: string;
  street: string;
  number: string;
  neighborhood: string;
  paymentMethod: PaymentMethod;
  cashChangeFor?: string;
  total: number;
}

export function validateCheckoutInput(input: CheckoutValidationInput): string | null {
  if (!input.customerName || input.customerName.trim().length < 3) {
    return 'Informe seu nome completo para identificação do pedido.';
  }
  const phoneDigits = normalizePhone(input.customerPhone);
  if (phoneDigits.length < 10) {
    return 'Informe um número de WhatsApp válido com DDD (ex: 65 99999-9999).';
  }
  if (input.deliveryType === 'delivery') {
    if (input.city === 'Interior de MT' && (!input.interiorCityName || input.interiorCityName.trim().length < 2)) {
      return 'Informe o nome da sua cidade em Mato Grosso para consulta de entrega via WhatsApp.';
    }
    if (!input.street.trim() || !input.number.trim() || !input.neighborhood.trim()) {
      return 'Preencha Rua/Av., Número e Bairro para a entrega delivery.';
    }
  }
  if (input.paymentMethod === 'cash' && input.cashChangeFor && input.cashChangeFor.trim() !== '') {
    const parsed = Number(input.cashChangeFor.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < input.total) {
      return `O valor para troco deve ser igual ou maior que o total (${formatCurrency(input.total)}).`;
    }
  }
  return null;
}

export function formatPaymentMethodLabel(order: Order): string {
  if (order.paymentMethod === 'quote') {
    return 'A combinar após envio do orçamento no WhatsApp';
  }
  if (order.paymentMethod === 'pix') {
    return isOrderQuoteOnly(order)
      ? 'Preferência: PIX (após confirmação do orçamento)'
      : 'PIX (Comprovante em anexo)';
  }
  if (order.paymentMethod === 'card') {
    const sub = order.cardSubType === 'debit' ? 'Débito' : 'Crédito';
    return `Cartão de ${sub} (Maquininha na entrega/retirada)`;
  }
  if (order.cashChangeFor && order.cashChangeFor > order.total) {
    return `Dinheiro (Troco para ${formatCurrency(order.cashChangeFor)})`;
  }
  return 'Dinheiro (Sem necessidade de troco)';
}

export function buildWhatsAppOrderMessage(order: Order, storeAddress?: string): string {
  const quoteOnly = isOrderQuoteOnly(order);
  const hasMixedHiddenItems = !quoteOnly && order.items.some((item) => item.priceHidden);
  const divider = '----------------------------------------';

  const createdDate = new Date(order.createdAt);
  const formattedDate = Number.isNaN(createdDate.getTime())
    ? ''
    : `${createdDate.toLocaleDateString('pt-BR')} ${createdDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
  const totalUnits = order.items.reduce((acc, i) => acc + i.quantity, 0);

  const lines: string[] = [
    '*COMANDA DE SEPARAÇÃO · LIMPER MT*',
    `*Pedido ${order.id}*${formattedDate ? ` · ${formattedDate}` : ''}`,
    divider,
    `CLIENTE: ${order.customerName}`,
    `WHATSAPP: ${formatPhone(order.customerPhone)}`,
    `TIPO: ${
      order.deliveryType === 'delivery'
        ? 'ENTREGA DELIVERY'
        : 'RETIRADA NO BALCÃO (AV. COUTO MAGALHÃES, 2820)'
    }`,
  ];

  if (order.deliveryType === 'delivery' && order.logisticsMode) {
    lines.push(
      `LOGÍSTICA: ${formatLogisticsModeLabel(order.logisticsMode, order.address?.interiorCityName)}`
    );
  }

  if (order.deliveryType === 'delivery' && order.address) {
    const refPart = order.address.reference ? ` (${order.address.reference})` : '';
    const cityDisplay =
      order.address.city === 'Interior de MT'
        ? `${order.address.interiorCityName || 'Interior'} - MT`
        : `${order.address.city}/MT`;
    lines.push(
      `ENDEREÇO: ${order.address.street}, ${order.address.number} - ${order.address.neighborhood} (${cityDisplay})${refPart}`
    );
  } else if (storeAddress) {
    lines.push(`LOCAL RETIRADA: ${storeAddress}`);
  }

  lines.push(`PAGAMENTO: ${formatPaymentMethodLabel(order)}`);
  if (order.pickupCode) {
    lines.push(`CÓD. ATENDIMENTO: ${order.pickupCode}`);
  }
  if (order.notes && order.notes.trim()) {
    lines.push(`OBS.: ${order.notes.trim()}`);
  }

  lines.push(divider);
  lines.push('*CHECKLIST DE ESTOQUE:*');

  for (const item of order.items) {
    const skuPart = item.sku ? ` [Ref: ${item.sku}]` : '';
    const valuePart =
      quoteOnly || item.priceHidden ? 'Sob consulta' : formatCurrency(item.subtotal);
    lines.push(
      `[ ] ${item.quantity}x ${item.title} (${item.volumeLabel})${skuPart} — ${valuePart}`
    );
    if (item.kitItems && item.kitItems.length > 0) {
      lines.push('    Itens inclusos no kit (separar):');
      for (const kitSub of item.kitItems) {
        const totalSubQty = kitSub.quantity * item.quantity;
        const subSku = kitSub.sku ? ` [Ref: ${kitSub.sku}]` : '';
        const perKitNote = item.quantity > 1 ? ` (${kitSub.quantity}x/kit)` : '';
        lines.push(
          `    - [ ] ${totalSubQty}x ${kitSub.title} (${kitSub.volumeLabel})${perKitNote}${subSku}`
        );
      }
    }
  }

  lines.push(divider);

  if (quoteOnly) {
    lines.push(`ITENS NA LISTA: ${totalUnits} unid. (${order.items.length} produto(s))`);
    lines.push('*MODO DO PEDIDO: LISTA S/ VALOR (WHATSAPP)*');
    if (order.logisticsMode === 'interior_mt') {
      lines.push('FRETE / ROTA: Consultar suporte Limper MT via WhatsApp (Restante de MT).');
    }
    lines.push('STATUS: Aguardando orçamento e confirmação da equipe Limper MT.');
  } else {
    lines.push(
      `${hasMixedHiddenItems ? 'SUBTOTAL (ITENS C/ VALOR)' : 'SUBTOTAL'}: ${formatCurrency(order.subtotal)}`
    );
    if (order.couponCode && order.discountAmount && order.discountAmount > 0) {
      lines.push(`CUPOM (${order.couponCode}): -${formatCurrency(order.discountAmount)}`);
    }
    if (order.deliveryType === 'delivery') {
      if (order.logisticsMode === 'interior_mt') {
        lines.push('TAXA ENTREGA: A consultar com suporte via WhatsApp (Interior de MT)');
      } else {
        lines.push(
          `TAXA ENTREGA: ${order.deliveryFee === 0 ? 'Grátis' : formatCurrency(order.deliveryFee)}`
        );
      }
    }
    lines.push(`*TOTAL A CONFERIR: ${formatCurrency(order.total)}*`);
    if (hasMixedHiddenItems) {
      lines.push('OBS. VALORES: Contém item(ns) sem valor (Sob consulta com a equipe).');
    }
  }

  return lines.join('\n');
}

export function buildWhatsAppOrderUrl(
  whatsappNumber: string,
  order: Order,
  storeAddress?: string
): string {
  const cleanPhone = normalizePhone(whatsappNumber) || '5565999887766';
  const message = buildWhatsAppOrderMessage(order, storeAddress);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function buildPixPayload(pixKey: string, beneficiary: string, amount: number, txId: string): string {
  const cleanKey = pixKey.trim();
  const cleanName = beneficiary.slice(0, 25).toUpperCase();
  const formattedAmount = Math.max(0, amount).toFixed(2);
  const cleanTx = txId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15) || 'LIMPERMT';
  return `00020126360014BR.GOV.BCB.PIX0114${cleanKey}520400005303986540${formattedAmount.length}${formattedAmount}5802BR59${String(cleanName.length).padStart(2, '0')}${cleanName}6006CUIABA62070503${cleanTx}6304ABCD`;
}

export const ORDER_STATUS_META: Record<
  OrderStatus,
  {
    label: string;
    shortLabel: string;
    step: number;
    cleaningStageTitle: string;
    cleaningStageDesc: string;
  }
> = {
  pending_separation: {
    label: 'Novos / Para Separar',
    shortLabel: 'Pedido Recebido',
    step: 1,
    cleaningStageTitle: '1. Pedido Recebido na Central',
    cleaningStageDesc: 'Pedido registrado! Aguardando início da conferência de galões e lotes.',
  },
  separating: {
    label: 'Separando Galões & Lotes',
    shortLabel: 'Separando Galões no Estoque',
    step: 2,
    cleaningStageTitle: '2. Conferência & Separação de Galões',
    cleaningStageDesc: 'Nossa equipe está separando seus galões Quimiprol e conferindo lacres anti-vazamento.',
  },
  ready_or_out: {
    label: 'Pronto no Balcão / Saiu p/ Entrega',
    shortLabel: 'Pronto p/ Retirada / Em Rota',
    step: 3,
    cleaningStageTitle: '3. Pronto no Balcão Express / Saiu p/ Entrega',
    cleaningStageDesc: 'Produtos lacrados! Dirija-se ao Balcão Express (sem fila) ou aguarde o entregador.',
  },
  completed: {
    label: 'Entregue / Retirado',
    shortLabel: 'Pedido Concluído',
    step: 4,
    cleaningStageTitle: '4. Pedido Entregue / Retirado',
    cleaningStageDesc: 'Pedido finalizado com sucesso. Use o botão abaixo para recomprar em 1 clique!',
  },
};

export interface OrderStageContextualMeta {
  step: number;
  shortLabel: string;
  stageTitle: string;
  stageDesc: string;
  cleaningStageTitle: string;
  cleaningStageDesc: string;
  stepShortTitle: string;
  stepSubLabel: string;
  specialistLabel: string;
  etaBadge: string;
  stepCards: {
    status: OrderStatus;
    shortTitle: string;
    subLabel: string;
  }[];
}

export function getOrderStageMeta(
  status: OrderStatus,
  deliveryType: DeliveryType
): OrderStageContextualMeta {
  const baseStep = ORDER_STATUS_META[status]?.step || 1;

  if (deliveryType === 'pickup') {
    const pickupSteps: {
      status: OrderStatus;
      shortTitle: string;
      subLabel: string;
    }[] = [
      {
        status: 'pending_separation',
        shortTitle: '1. Pedido Recebido',
        subLabel: 'Fila Balcão Express',
      },
      {
        status: 'separating',
        shortTitle: '2. Separando Galões',
        subLabel: 'Conferência & Lacres',
      },
      {
        status: 'ready_or_out',
        shortTitle: '3. Pronto na Loja!',
        subLabel: 'Pode Vir Buscar s/ Fila',
      },
      {
        status: 'completed',
        shortTitle: '4. Retirado na Loja',
        subLabel: 'Entregue no Balcão/Carro',
      },
    ];

    if (status === 'pending_separation') {
      const title = '1. Pedido Recebido para Retirada na Loja (15min)';
      const desc =
        'Seu pedido entrou na fila prioritária do Balcão Limper MT (Av. Couto Magalhães, 2820).';
      return {
        step: 1,
        shortLabel: 'Recebido no Balcão',
        stageTitle: title,
        stageDesc: desc,
        cleaningStageTitle: title,
        cleaningStageDesc: desc,
        stepShortTitle: pickupSteps[0].shortTitle,
        stepSubLabel: pickupSteps[0].subLabel,
        specialistLabel: 'Balcão Express 15min · Av. Couto Magalhães, 2820',
        etaBadge: 'Pronto em ~15 min',
        stepCards: pickupSteps,
      };
    }
    if (status === 'separating') {
      const title = '2. Separando Seus Galões para Você Buscar na Loja';
      const desc =
        'Nossa equipe está separando seus produtos Quimiprol e conferindo os lacres para você retirar sem fila.';
      return {
        step: 2,
        shortLabel: 'Separando p/ Retirada',
        stageTitle: title,
        stageDesc: desc,
        cleaningStageTitle: title,
        cleaningStageDesc: desc,
        stepShortTitle: pickupSteps[1].shortTitle,
        stepSubLabel: pickupSteps[1].subLabel,
        specialistLabel: 'Conferente do Balcão: Marcos V. (Quimiprol)',
        etaBadge: 'Pronto em ~8 min',
        stepCards: pickupSteps,
      };
    }
    if (status === 'ready_or_out') {
      const title = '3. Pronto no Balcão Limper MT! Pode Vir Buscar sem Fila';
      const desc =
        'Seus galões já estão separados e lacrados! Dirija-se à Av. Couto Magalhães, 2820, informe sua senha e carregue direto no porta-malas.';
      return {
        step: 3,
        shortLabel: 'Pronto p/ Buscar na Loja!',
        stageTitle: title,
        stageDesc: desc,
        cleaningStageTitle: title,
        cleaningStageDesc: desc,
        stepShortTitle: pickupSteps[2].shortTitle,
        stepSubLabel: pickupSteps[2].subLabel,
        specialistLabel: 'Pronto no Balcão Express · Estacionamento Fácil em Frente',
        etaBadge: 'Pronto p/ Retirar Agora!',
        stepCards: pickupSteps,
      };
    }
    const title = '4. Pedido Retirado pelo Cliente na Loja Física';
    const desc =
      'Retirada concluída no Balcão Express da Av. Couto Magalhães, 2820. Precisa repor o estoque? Refaça o pedido em 1 clique!';
    return {
      step: 4,
      shortLabel: 'Retirado na Loja',
      stageTitle: title,
      stageDesc: desc,
      cleaningStageTitle: title,
      cleaningStageDesc: desc,
      stepShortTitle: pickupSteps[3].shortTitle,
      stepSubLabel: pickupSteps[3].subLabel,
      specialistLabel: 'Retirada Confirmada no Balcão Limper MT',
      etaBadge: 'Retirado c/ Sucesso',
      stepCards: pickupSteps,
    };
  }

  // Delivery mode
  const deliverySteps: {
    status: OrderStatus;
    shortTitle: string;
    subLabel: string;
  }[] = [
    {
      status: 'pending_separation',
      shortTitle: '1. Pedido Confirmado',
      subLabel: 'Recebido na Central',
    },
    {
      status: 'separating',
      shortTitle: '2. Separando Galões',
      subLabel: 'Conferência & Lacres',
    },
    {
      status: 'ready_or_out',
      shortTitle: '3. Saiu p/ Entrega',
      subLabel: 'Entregador a Caminho',
    },
    {
      status: 'completed',
      shortTitle: '4. Pedido Entregue',
      subLabel: 'Recebido no Endereço',
    },
  ];

  if (status === 'pending_separation') {
    const title = '1. Pedido Confirmado para Entrega Delivery';
    const desc =
      'Pedido registrado na expedição! Aguardando início da conferência de galões e lotes.';
    return {
      step: 1,
      shortLabel: 'Pedido Confirmado',
      stageTitle: title,
      stageDesc: desc,
      cleaningStageTitle: title,
      cleaningStageDesc: desc,
      stepShortTitle: deliverySteps[0].shortTitle,
      stepSubLabel: deliverySteps[0].subLabel,
      specialistLabel: 'Expedição Delivery · Av. Couto Magalhães, 2820',
      etaBadge: 'Saída em ~15 min',
      stepCards: deliverySteps,
    };
  }
  if (status === 'separating') {
    const title = '2. Conferência & Separação de Galões Quimiprol';
    const desc =
      'Nossa equipe está separando seus galões e aplicando lacres anti-vazamento para o transporte.';
    return {
      step: 2,
      shortLabel: 'Separando Galões no Estoque',
      stageTitle: title,
      stageDesc: desc,
      cleaningStageTitle: title,
      cleaningStageDesc: desc,
      stepShortTitle: deliverySteps[1].shortTitle,
      stepSubLabel: deliverySteps[1].subLabel,
      specialistLabel: 'Conferente Técnico: Marcos V. (Lacre de Fábrica)',
      etaBadge: 'Expedição em ~10 min',
      stepCards: deliverySteps,
    };
  }
  if (status === 'ready_or_out') {
    const title = '3. Pedido Saiu para Entrega no Seu Endereço';
    const desc =
      'O entregador parceiro Limper Express já saiu da Av. Couto Magalhães, 2820 em direção ao seu endereço.';
    return {
      step: 3,
      shortLabel: 'Saiu para Entrega!',
      stageTitle: title,
      stageDesc: desc,
      cleaningStageTitle: title,
      cleaningStageDesc: desc,
      stepShortTitle: deliverySteps[2].shortTitle,
      stepSubLabel: deliverySteps[2].subLabel,
      specialistLabel: 'Motorista Limper Express em Rota · Galões Lacrados',
      etaBadge: 'Chegada em ~15–25 min',
      stepCards: deliverySteps,
    };
  }
  const title = '4. Pedido Entregue com Sucesso no Endereço';
  const desc =
    'Entrega confirmada! Quando precisar repor seus produtos Quimiprol, use o botão abaixo para recomprar em 1 clique.';
  return {
    step: baseStep,
    shortLabel: 'Entregue no Endereço',
    stageTitle: title,
    stageDesc: desc,
    cleaningStageTitle: title,
    cleaningStageDesc: desc,
    stepShortTitle: deliverySteps[3].shortTitle,
    stepSubLabel: deliverySteps[3].subLabel,
    specialistLabel: 'Entrega Confirmada · Garantia Quimiprol',
    etaBadge: 'Entregue c/ Sucesso',
    stepCards: deliverySteps,
  };
}

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  'pending_separation',
  'separating',
  'ready_or_out',
  'completed',
];

export function getAdjacentOrderStatus(
  currentStatus: OrderStatus,
  direction: 'prev' | 'next'
): OrderStatus | null {
  const idx = ORDER_STATUS_SEQUENCE.indexOf(currentStatus);
  if (idx === -1) return null;
  if (direction === 'prev') {
    return idx > 0 ? ORDER_STATUS_SEQUENCE[idx - 1] : null;
  }
  return idx < ORDER_STATUS_SEQUENCE.length - 1
    ? ORDER_STATUS_SEQUENCE[idx + 1]
    : null;
}

export function transitionOrderStatus(
  order: Order,
  nextStatus: OrderStatus,
  reason?: string,
  nowIso: string = new Date().toISOString()
): Order {
  if (order.status === nextStatus) return order;
  const fromIdx = ORDER_STATUS_SEQUENCE.indexOf(order.status);
  const toIdx = ORDER_STATUS_SEQUENCE.indexOf(nextStatus);
  const defaultReason =
    toIdx < fromIdx
      ? 'Retorno de etapa (correção operacional)'
      : 'Avanço operacional de etapa';

  const newEntry = {
    fromStatus: order.status,
    toStatus: nextStatus,
    changedAt: nowIso,
    reason: reason || defaultReason,
  };

  return {
    ...order,
    status: nextStatus,
    statusHistory: [newEntry, ...(order.statusHistory || [])],
  };
}

export function toDateKeyYmd(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function filterOrdersByCriteria(
  orders: Order[],
  criteria: {
    searchQuery?: string;
    datePreset?: OrderDatePreset;
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    deliveryType?: 'all' | DeliveryType;
    statusFilter?: 'all' | 'active' | OrderStatus;
    referenceNow?: Date;
  }
): Order[] {
  const rawQuery = (criteria.searchQuery || '').trim().toLowerCase();
  const phoneDigits = normalizePhone(rawQuery);
  const preset = criteria.datePreset || 'all';
  const refNow = criteria.referenceNow || new Date();
  const todayYmd = toDateKeyYmd(refNow);

  const yesterdayDate = new Date(refNow.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayYmd = toDateKeyYmd(yesterdayDate);

  const last7Cutoff = new Date(refNow.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last7Ymd = toDateKeyYmd(last7Cutoff);

  const last30Cutoff = new Date(refNow.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last30Ymd = toDateKeyYmd(last30Cutoff);

  return orders.filter((order) => {
    // 1. Modality filter
    if (
      criteria.deliveryType &&
      criteria.deliveryType !== 'all' &&
      order.deliveryType !== criteria.deliveryType
    ) {
      return false;
    }

    // 2. Status filter
    if (criteria.statusFilter && criteria.statusFilter !== 'all') {
      if (criteria.statusFilter === 'active') {
        if (order.status === 'completed') return false;
      } else if (order.status !== criteria.statusFilter) {
        return false;
      }
    }

    // 3. Search query filter
    if (rawQuery) {
      const matchesId = order.id.toLowerCase().includes(rawQuery);
      const matchesName = order.customerName.toLowerCase().includes(rawQuery);
      const matchesCode = (order.pickupCode || '').toLowerCase().includes(rawQuery);
      const matchesPhone =
        phoneDigits.length >= 3 &&
        normalizePhone(order.customerPhone).includes(phoneDigits);
      const matchesItem = order.items.some((i) =>
        i.title.toLowerCase().includes(rawQuery)
      );
      if (!matchesId && !matchesName && !matchesCode && !matchesPhone && !matchesItem) {
        return false;
      }
    }

    // 4. Date / Period filter
    const orderYmd = toDateKeyYmd(order.createdAt);
    if (!orderYmd) return true;

    if (preset === 'today') {
      return orderYmd === todayYmd;
    }
    if (preset === 'yesterday') {
      return orderYmd === yesterdayYmd;
    }
    if (preset === 'last_7_days') {
      return orderYmd >= last7Ymd && orderYmd <= todayYmd;
    }
    if (preset === 'last_30_days') {
      return orderYmd >= last30Ymd && orderYmd <= todayYmd;
    }
    if (preset === 'custom') {
      if (criteria.startDate && orderYmd < criteria.startDate) {
        return false;
      }
      if (criteria.endDate && orderYmd > criteria.endDate) {
        return false;
      }
    }

    return true;
  });
}

export function summarizeOrdersPeriod(orders: Order[]): {
  totalOrders: number;
  totalRevenue: number;
  pickupCount: number;
  deliveryCount: number;
  activeCount: number;
  completedCount: number;
  averageTicket: number;
} {
  const totalOrders = orders.length;
  const totalRevenue =
    Math.round(orders.reduce((acc, o) => acc + o.total, 0) * 100) / 100;
  const pickupCount = orders.filter((o) => o.deliveryType === 'pickup').length;
  const deliveryCount = orders.filter((o) => o.deliveryType === 'delivery').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const activeCount = totalOrders - completedCount;
  const averageTicket =
    totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

  return {
    totalOrders,
    totalRevenue,
    pickupCount,
    deliveryCount,
    activeCount,
    completedCount,
    averageTicket,
  };
}

