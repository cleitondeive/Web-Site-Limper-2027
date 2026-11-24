import {
  AdminAppTab,
  AdminRoleLevel,
  AdminUser,
  BackupReminderConfig,
  BackupReminderEvaluation,
  BackupScheduleConfig,
  CartItem,
  CatalogSortOption,
  Category,
  CustomerAddress,
  CustomerPrivacyPrefs,
  CustomerProfile,
  CustomerSegment,
  DeletedProductEntry,
  DeliveryCityOption,
  DeliveryType,
  LogisticsDeliveryMode,
  Order,
  OrderDatePreset,
  OrderStatus,
  PaymentMethod,
  Product,
  PromoBanner,
  PromoCoupon,
  PromoKit,
  SecurityAuditEvent,
  SecurityEventCategory,
  SecurityEventOutcome,
  SecurityLogDatePreset,
  SiteBackupIntegrityResult,
  SiteBackupPayload,
  SiteBackupSnapshot,
  SiteBackupTrigger,
  CreateSecurityAuditEventInput,
  CustomerIsolationAuditReport,
  CustomerIsolationScopeCheck,
  StoreSettings,
  VolumeFilterOption,
} from '../types/commerce';
import {
  DocumentKind,
  formatCep,
  isValidDocument,
  onlyDigits,
} from './brInputMasks';

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
    sku: kit.sku?.trim()
      ? kit.sku.trim().toUpperCase()
      : `KIT-${kit.id.replace(/^kit-/i, '').toUpperCase()}`,
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
  interiorCityName?: string,
  deliveryType?: DeliveryType
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
  if (mode === 'pickup' || deliveryType === 'pickup') {
    return 'Retirada no Balcão (Av. Couto Magalhães, 2820)';
  }
  if (deliveryType === 'delivery') {
    return 'Entrega Delivery Limper MT';
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
  customerDocument?: string;
  customerDocumentType?: DocumentKind;
  deliveryType: DeliveryType;
  cep?: string;
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
  if (input.customerDocument && onlyDigits(input.customerDocument).length > 0) {
    const docType: DocumentKind = input.customerDocumentType || 'cpf';
    if (!isValidDocument(input.customerDocument, docType)) {
      return docType === 'cnpj'
        ? 'O CNPJ informado está incompleto ou inválido (verifique os 14 dígitos).'
        : 'O CPF informado está incompleto ou inválido (verifique os 11 dígitos).';
    }
  }
  if (input.deliveryType === 'delivery') {
    if (input.cep && onlyDigits(input.cep).length > 0 && onlyDigits(input.cep).length < 8) {
      return 'Informe os 8 dígitos do CEP (ex: 78110-400) ou deixe em branco.';
    }
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
    ...(order.customerDocument && order.customerDocument.trim()
      ? [
          `${
            order.customerDocumentType === 'cnpj' ||
            onlyDigits(order.customerDocument).length > 11
              ? 'CNPJ'
              : 'CPF'
          }: ${order.customerDocument.trim()}`,
        ]
      : []),
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
    const cepPart = order.address.cep ? ` · CEP ${formatCep(order.address.cep)}` : '';
    const cityDisplay =
      order.address.city === 'Interior de MT'
        ? `${order.address.interiorCityName || 'Interior'} - MT`
        : `${order.address.city}/MT`;
    lines.push(
      `ENDEREÇO: ${order.address.street}, ${order.address.number} - ${order.address.neighborhood} (${cityDisplay})${cepPart}${refPart}`
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

export function toDateKeyYmd(
  isoOrDate: string | Date,
  useLocal: boolean = false
): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = useLocal ? d.getFullYear() : d.getUTCFullYear();
  const mm = String((useLocal ? d.getMonth() : d.getUTCMonth()) + 1).padStart(2, '0');
  const dd = String(useLocal ? d.getDate() : d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatBrDateFromYmd(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '';
  const [yyyy, mm, dd] = ymd.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

export function getKanbanPeriodLabel(
  preset: OrderDatePreset,
  options?: {
    startDate?: string;
    endDate?: string;
    todayYmd?: string;
  }
): string {
  const todayStr = options?.todayYmd ? formatBrDateFromYmd(options.todayYmd) : '';
  if (preset === 'today') {
    return todayStr ? `Hoje (${todayStr})` : 'Hoje';
  }
  if (preset === 'yesterday') return 'Ontem';
  if (preset === 'last_7_days') return 'Últimos 7 Dias';
  if (preset === 'last_30_days') return 'Últimos 30 Dias';
  if (preset === 'custom') {
    const startBr = options?.startDate ? formatBrDateFromYmd(options.startDate) : '';
    const endBr = options?.endDate ? formatBrDateFromYmd(options.endDate) : '';
    if (startBr && endBr && startBr === endBr) return startBr;
    if (startBr && endBr) return `${startBr} a ${endBr}`;
    if (startBr) return `A partir de ${startBr}`;
    if (endBr) return `Até ${endBr}`;
    return 'Data Específica';
  }
  return 'Todas as Datas';
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
    useLocalDate?: boolean;
  }
): Order[] {
  const rawQuery = (criteria.searchQuery || '').trim().toLowerCase();
  const phoneDigits = normalizePhone(rawQuery);
  const preset = criteria.datePreset || 'all';
  const useLocal = Boolean(criteria.useLocalDate);
  const refNow = criteria.referenceNow || new Date();
  const todayYmd = toDateKeyYmd(refNow, useLocal);

  const yesterdayDate = new Date(refNow.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayYmd = toDateKeyYmd(yesterdayDate, useLocal);

  const last7Cutoff = new Date(refNow.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last7Ymd = toDateKeyYmd(last7Cutoff, useLocal);

  const last30Cutoff = new Date(refNow.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last30Ymd = toDateKeyYmd(last30Cutoff, useLocal);

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
    const orderYmd = toDateKeyYmd(order.createdAt, useLocal);
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

export const DEFAULT_CUSTOMER_PRIVACY: CustomerPrivacyPrefs = {
  offersOptIn: true,
  whatsappOptIn: true,
  emailOptIn: true,
  phoneOptIn: false,
  restockRemindersOptIn: true,
};

export const CUSTOMER_SEGMENT_LABELS: Record<CustomerSegment, string> = {
  residencial: 'Residencial / Casa',
  condominio: 'Condomínio',
  clinica: 'Clínica / Consultório',
  lavajato: 'Lava-Jato / Automotivo',
  empresa: 'Empresa / Comércio',
};

export function getCustomerAddresses(profile: CustomerProfile): CustomerAddress[] {
  const existing = Array.isArray(profile.addresses) ? profile.addresses : [];
  if (existing.length > 0) {
    const hasDefault = existing.some((a) => a.isDefault);
    return existing.map((addr, idx) => ({
      ...addr,
      cep: formatCep(addr.cep || ''),
      isDefault: hasDefault ? Boolean(addr.isDefault) : idx === 0,
    }));
  }

  if (profile.street?.trim() || profile.cep?.trim()) {
    return [
      {
        id: 'addr-primary',
        label: 'Principal',
        cep: formatCep(profile.cep || '78110-400'),
        street: profile.street || 'Av. Couto Magalhães',
        number: profile.number || '',
        neighborhood: profile.neighborhood || 'Centro Norte',
        city: profile.city || 'Várzea Grande',
        interiorCityName: profile.interiorCityName || '',
        reference: profile.reference || '',
        isDefault: true,
      },
    ];
  }

  return [];
}

export function syncProfilePrimaryAddress(
  profile: CustomerProfile,
  addresses: CustomerAddress[]
): CustomerProfile {
  if (addresses.length === 0) {
    return {
      ...profile,
      addresses: [],
    };
  }

  const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
  const normalizedAddresses = addresses.map((a) => ({
    ...a,
    cep: formatCep(a.cep || ''),
    isDefault: a.id === defaultAddr.id,
  }));

  return {
    ...profile,
    cep: defaultAddr.cep,
    street: defaultAddr.street,
    number: defaultAddr.number,
    neighborhood: defaultAddr.neighborhood,
    city: defaultAddr.city,
    interiorCityName:
      defaultAddr.city === 'Interior de MT'
        ? defaultAddr.interiorCityName || ''
        : '',
    reference: defaultAddr.reference || '',
    addresses: normalizedAddresses,
  };
}

export function upsertCustomerAddress(
  profile: CustomerProfile,
  input: Omit<CustomerAddress, 'id'> & { id?: string }
): CustomerProfile {
  const current = getCustomerAddresses(profile);
  const nextId =
    input.id || `addr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const normalizedInput: CustomerAddress = {
    ...input,
    id: nextId,
    label: (input.label || 'Endereço').trim(),
    cep: formatCep(input.cep || ''),
    street: input.street.trim(),
    number: input.number.trim(),
    neighborhood: input.neighborhood.trim(),
    interiorCityName:
      input.city === 'Interior de MT' ? (input.interiorCityName || '').trim() : '',
    reference: (input.reference || '').trim(),
  };

  const exists = current.some((a) => a.id === nextId);
  let nextList: CustomerAddress[];
  if (exists) {
    nextList = current.map((a) => (a.id === nextId ? normalizedInput : a));
  } else {
    nextList = [...current, normalizedInput];
  }

  if (normalizedInput.isDefault || current.length === 0) {
    nextList = nextList.map((a) => ({
      ...a,
      isDefault: a.id === nextId,
    }));
  }

  return syncProfilePrimaryAddress(profile, nextList);
}

export function setDefaultCustomerAddress(
  profile: CustomerProfile,
  addressId: string
): CustomerProfile {
  const current = getCustomerAddresses(profile);
  if (!current.some((a) => a.id === addressId)) return profile;
  const nextList = current.map((a) => ({
    ...a,
    isDefault: a.id === addressId,
  }));
  return syncProfilePrimaryAddress(profile, nextList);
}

export function deleteCustomerAddress(
  profile: CustomerProfile,
  addressId: string
): CustomerProfile {
  const current = getCustomerAddresses(profile);
  const nextList = current.filter((a) => a.id !== addressId);
  return syncProfilePrimaryAddress(profile, nextList);
}

export function canonicalBrazilPhone(phone?: string): string {
  const digits = normalizePhone(phone || '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits.slice(2);
  }
  return digits;
}

export function matchCustomerPhoneExact(phoneA?: string, phoneB?: string): boolean {
  const a = canonicalBrazilPhone(phoneA);
  const b = canonicalBrazilPhone(phoneB);
  return a.length >= 10 && b.length >= 10 && a === b;
}

export function normalizeOrderCode(code: string): string {
  return (code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function matchesOrderCodeExact(orderId: string, query: string): boolean {
  const normOrder = normalizeOrderCode(orderId);
  const normQuery = normalizeOrderCode(query);
  if (!normOrder || !normQuery) return false;
  if (normOrder === normQuery) return true;
  // Allow numeric suffix lookup (e.g. "1042" matching "#LMP-1042") only for 4+ digits
  if (/^\d{4,}$/.test(normQuery) && `LMP${normQuery}` === normOrder) {
    return true;
  }
  return false;
}

export function findOrderForPrivateLookup(
  orders: Order[],
  orderCodeQuery: string,
  phoneQuery: string
): Order | null {
  const cleanCode = normalizeOrderCode(orderCodeQuery);
  const cleanPhone = canonicalBrazilPhone(phoneQuery);
  if (cleanCode.length < 4 || cleanPhone.length < 10) return null;

  const matched = orders.find(
    (o) =>
      matchesOrderCodeExact(o.id, cleanCode) &&
      matchCustomerPhoneExact(o.customerPhone, cleanPhone)
  );
  return matched || null;
}

export function maskPhoneForPrivacy(phone?: string): string {
  const digits = canonicalBrazilPhone(phone);
  if (digits.length < 10) return '•••';
  return `(${digits.slice(0, 2)}) •••••-${digits.slice(-4)}`;
}

export function getOrdersForCustomer(
  orders: Order[],
  customerPhone?: string
): Order[] {
  const matched = orders.filter((o) =>
    matchCustomerPhoneExact(o.customerPhone, customerPhone)
  );

  return [...matched].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface CustomerOrderScopeParams {
  orders: Order[];
  customerProfile?: Pick<
    CustomerProfile,
    'isRegistered' | 'name' | 'phone'
  > | null;
  sessionOrderIds?: string[];
  verifiedLookup?: { orderId: string; phone: string } | null;
}

export function resolveCustomerVisibleOrders({
  orders,
  customerProfile,
  sessionOrderIds = [],
  verifiedLookup = null,
}: CustomerOrderScopeParams): Order[] {
  const sessionSet = new Set(sessionOrderIds);
  const loggedIn = isCustomerLoggedIn(customerProfile);

  const scoped = orders.filter((order) => {
    if (sessionSet.has(order.id)) return true;
    if (loggedIn && customerProfile?.phone) {
      return matchCustomerPhoneExact(order.customerPhone, customerProfile.phone);
    }
    if (!loggedIn && verifiedLookup) {
      return (
        order.id === verifiedLookup.orderId &&
        matchCustomerPhoneExact(order.customerPhone, verifiedLookup.phone)
      );
    }
    return false;
  });

  return [...scoped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function isCustomerLoggedIn(
  customerProfile?: Pick<CustomerProfile, 'isRegistered' | 'name' | 'phone'> | null
): boolean {
  if (!customerProfile?.isRegistered) return false;
  return (
    customerProfile.name.trim().length > 0 ||
    normalizePhone(customerProfile.phone).length >= 8
  );
}

export function getCustomerOrderCardStatusLabel(
  order: Pick<Order, 'status' | 'deliveryType'>
): string {
  if (order.status === 'completed') {
    return order.deliveryType === 'pickup' ? 'Pedido retirado' : 'Pedido entregue';
  }
  if (order.status === 'ready_or_out') {
    return order.deliveryType === 'pickup'
      ? 'Pronto para retirada'
      : 'Saiu para entrega';
  }
  if (order.status === 'separating') {
    return 'Separando galões';
  }
  return order.deliveryType === 'pickup'
    ? 'Recebido no balcão'
    : 'Pedido confirmado';
}

export function getCustomerLatestActiveOrder(
  orders: Order[],
  customerProfile?: Pick<CustomerProfile, 'isRegistered' | 'phone'> | null
): Order | undefined {
  if (!customerProfile?.isRegistered) return undefined;
  const customerOrders = getOrdersForCustomer(orders, customerProfile.phone);
  return customerOrders.find((o) => o.status !== 'completed');
}

export interface FrequentlyBoughtProduct {
  product: Product;
  orderCount: number;
  totalUnits: number;
  lastOrderedAt: string;
}

export function deriveFrequentlyBoughtProducts(
  orders: Order[],
  catalogProducts: Product[],
  customerPhone?: string
): FrequentlyBoughtProduct[] {
  const customerOrders = getOrdersForCustomer(orders, customerPhone);
  if (customerOrders.length === 0) return [];

  const statsMap = new Map<
    string,
    { orderCount: number; totalUnits: number; lastOrderedAt: string }
  >();

  for (const order of customerOrders) {
    const seenInOrder = new Set<string>();
    for (const item of order.items) {
      const targetIds =
        item.kitItems && item.kitItems.length > 0
          ? item.kitItems.map((k) => ({
              id: k.productId,
              qty: k.quantity * item.quantity,
            }))
          : [{ id: item.productId, qty: item.quantity }];

      for (const entry of targetIds) {
        const existing = statsMap.get(entry.id) || {
          orderCount: 0,
          totalUnits: 0,
          lastOrderedAt: order.createdAt,
        };
        if (!seenInOrder.has(entry.id)) {
          existing.orderCount += 1;
          seenInOrder.add(entry.id);
        }
        existing.totalUnits += entry.qty;
        if (
          new Date(order.createdAt).getTime() >
          new Date(existing.lastOrderedAt).getTime()
        ) {
          existing.lastOrderedAt = order.createdAt;
        }
        statsMap.set(entry.id, existing);
      }
    }
  }

  const results: FrequentlyBoughtProduct[] = [];
  for (const [productId, stat] of statsMap.entries()) {
    const product = catalogProducts.find(
      (p) => p.id === productId && p.status !== 'inactive'
    );
    if (product) {
      results.push({
        product,
        orderCount: stat.orderCount,
        totalUnits: stat.totalUnits,
        lastOrderedAt: stat.lastOrderedAt,
      });
    }
  }

  return results.sort((a, b) => {
    if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
    return b.totalUnits - a.totalUnits;
  });
}

export const ADMIN_PRODUCTS_PAGE_SIZE = 30;

export function formatPageNumberLabel(pageNumber: number): string {
  return String(Math.max(1, Math.floor(pageNumber))).padStart(2, '0');
}

export interface PaginatedResult<T> {
  pageItems: T[];
  safePage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  pageSize: number;
}

export function paginateItems<T>(
  items: T[],
  requestedPage: number,
  pageSize: number = ADMIN_PRODUCTS_PAGE_SIZE
): PaginatedResult<T> {
  const safeSize = Math.max(1, Math.floor(pageSize));
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
  const safePage = Math.min(
    totalPages,
    Math.max(1, Math.floor(Number.isFinite(requestedPage) ? requestedPage : 1))
  );

  if (totalItems === 0) {
    return {
      pageItems: [],
      safePage: 1,
      totalPages: 1,
      startIndex: 0,
      endIndex: 0,
      totalItems: 0,
      pageSize: safeSize,
    };
  }

  const sliceStart = (safePage - 1) * safeSize;
  const sliceEnd = Math.min(totalItems, sliceStart + safeSize);

  return {
    pageItems: items.slice(sliceStart, sliceEnd),
    safePage,
    totalPages,
    startIndex: sliceStart + 1,
    endIndex: sliceEnd,
    totalItems,
    pageSize: safeSize,
  };
}

function buildUniqueDuplicateSku(sourceSku: string, existingProducts: Product[]): string {
  const usedSkus = new Set(existingProducts.map((p) => p.sku.trim().toUpperCase()));
  const baseSku =
    sourceSku.trim().replace(/-COPIA(?:-\d+)?$/i, '') || 'QMP';
  const primaryCandidate = `${baseSku}-COPIA`;
  if (!usedSkus.has(primaryCandidate.toUpperCase())) {
    return primaryCandidate;
  }
  let counter = 2;
  while (usedSkus.has(`${baseSku}-COPIA-${counter}`.toUpperCase())) {
    counter += 1;
  }
  return `${baseSku}-COPIA-${counter}`;
}

function buildUniqueDuplicateTitle(sourceTitle: string, existingProducts: Product[]): string {
  const usedTitles = new Set(existingProducts.map((p) => p.title.trim().toLowerCase()));
  const baseTitle =
    sourceTitle.trim().replace(/\s+\(Cópia(?:\s+\d+)?\)$/i, '') || 'Produto';
  const firstCandidate = `${baseTitle} (Cópia)`;
  if (!usedTitles.has(firstCandidate.toLowerCase())) {
    return firstCandidate;
  }
  let counter = 2;
  while (usedTitles.has(`${baseTitle} (Cópia ${counter})`.toLowerCase())) {
    counter += 1;
  }
  return `${baseTitle} (Cópia ${counter})`;
}

export function duplicateProductItem(
  products: Product[],
  sourceId: string,
  nowMs: number = Date.now()
): { nextProducts: Product[]; duplicatedProduct: Product | null; insertedIndex: number } {
  const sourceIndex = products.findIndex((p) => p.id === sourceId);
  if (sourceIndex === -1) {
    return { nextProducts: products, duplicatedProduct: null, insertedIndex: -1 };
  }

  const source = products[sourceIndex];
  const existingIds = new Set(products.map((p) => p.id));
  let suffix = 0;
  let uniqueId = `prod-dup-${nowMs}`;
  while (existingIds.has(uniqueId)) {
    suffix += 1;
    uniqueId = `prod-dup-${nowMs}-${suffix}`;
  }

  const duplicatedProduct: Product = {
    ...source,
    id: uniqueId,
    sku: buildUniqueDuplicateSku(source.sku, products),
    title: buildUniqueDuplicateTitle(source.title, products),
    kitItems: source.kitItems ? source.kitItems.map((item) => ({ ...item })) : undefined,
  };

  const nextProducts = [
    ...products.slice(0, sourceIndex + 1),
    duplicatedProduct,
    ...products.slice(sourceIndex + 1),
  ];

  return {
    nextProducts,
    duplicatedProduct,
    insertedIndex: sourceIndex + 1,
  };
}

export function duplicateMultipleProducts(
  products: Product[],
  sourceIds: string[],
  nowMs: number = Date.now()
): { nextProducts: Product[]; duplicatedProducts: Product[] } {
  const idSet = new Set(sourceIds);
  if (idSet.size === 0) {
    return { nextProducts: products, duplicatedProducts: [] };
  }

  let working = [...products];
  const duplicatedProducts: Product[] = [];
  let tick = 0;

  for (const original of products) {
    if (!idSet.has(original.id)) continue;
    const res = duplicateProductItem(working, original.id, nowMs + tick);
    tick += 1;
    if (res.duplicatedProduct) {
      working = res.nextProducts;
      duplicatedProducts.push(res.duplicatedProduct);
    }
  }

  return { nextProducts: working, duplicatedProducts };
}

export function reorderProductsById(
  products: Product[],
  draggedId: string,
  targetId: string,
  position: 'before' | 'after' = 'before'
): Product[] {
  if (!draggedId || !targetId || draggedId === targetId) return products;
  const fromIndex = products.findIndex((p) => p.id === draggedId);
  if (fromIndex === -1) return products;
  if (!products.some((p) => p.id === targetId)) return products;

  const draggedItem = products[fromIndex];
  const withoutDragged = [
    ...products.slice(0, fromIndex),
    ...products.slice(fromIndex + 1),
  ];
  const targetIndexInRemaining = withoutDragged.findIndex((p) => p.id === targetId);
  if (targetIndexInRemaining === -1) return products;

  const insertAt =
    position === 'after' ? targetIndexInRemaining + 1 : targetIndexInRemaining;

  return [
    ...withoutDragged.slice(0, insertAt),
    draggedItem,
    ...withoutDragged.slice(insertAt),
  ];
}

export function moveProductStep(
  products: Product[],
  productId: string,
  direction: 'up' | 'down' | 'top' | 'bottom',
  visibleSubsetIds?: string[]
): Product[] {
  const currentIdx = products.findIndex((p) => p.id === productId);
  if (currentIdx === -1) return products;

  if (direction === 'top') {
    if (currentIdx === 0) return products;
    const item = products[currentIdx];
    return [item, ...products.slice(0, currentIdx), ...products.slice(currentIdx + 1)];
  }

  if (direction === 'bottom') {
    if (currentIdx === products.length - 1) return products;
    const item = products[currentIdx];
    return [...products.slice(0, currentIdx), ...products.slice(currentIdx + 1), item];
  }

  if (visibleSubsetIds && visibleSubsetIds.length > 1) {
    const visiblePos = visibleSubsetIds.indexOf(productId);
    if (visiblePos !== -1) {
      const neighborPos = direction === 'up' ? visiblePos - 1 : visiblePos + 1;
      if (neighborPos < 0 || neighborPos >= visibleSubsetIds.length) {
        return products;
      }
      const neighborId = visibleSubsetIds[neighborPos];
      return reorderProductsById(
        products,
        productId,
        neighborId,
        direction === 'up' ? 'before' : 'after'
      );
    }
  }

  const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
  if (targetIdx < 0 || targetIdx >= products.length) {
    return products;
  }

  const next = [...products];
  const [moved] = next.splice(currentIdx, 1);
  next.splice(targetIdx, 0, moved);
  return next;
}

export const MAX_SECURITY_AUDIT_LOGS = 200;

export const SECURITY_CATEGORY_LABELS: Record<SecurityEventCategory, string> = {
  tracking_access: 'Rastreio de Pedido',
  customer_auth: 'Conta & Sessão Cliente',
  admin_auth: 'Acesso Administrativo',
  order_security: 'Custódia de Pedidos',
  catalog_policy: 'Política de Catálogo',
  user_management: 'Usuários & Permissões',
  site_backup: 'Backup & Restauração',
};

export const SECURITY_OUTCOME_META: Record<
  SecurityEventOutcome,
  { label: string }
> = {
  allowed: { label: 'Autorizado' },
  blocked: { label: 'Bloqueado' },
  info: { label: 'Registro' },
};

export function sanitizeTargetForAuditLog(rawTarget?: string): string {
  const cleaned = (rawTarget || '').trim();
  if (!cleaned) return 'Sessão não identificada';
  const digits = normalizePhone(cleaned);
  const looksLikePhone =
    digits.length >= 10 && /^[+\d()\s.-]+$/.test(cleaned);
  if (looksLikePhone) {
    return maskPhoneForPrivacy(digits);
  }
  return cleaned.slice(0, 60);
}

export function createSecurityAuditEvent(
  input: CreateSecurityAuditEventInput,
  nowMs: number = Date.now()
): SecurityAuditEvent {
  const timestamp = input.timestamp || new Date(nowMs).toISOString();
  const suffix = Math.random().toString(36).slice(2, 6);
  const cleanUsername = input.actorUsername
    ? input.actorUsername.trim().toLowerCase().replace(/^@/, '').slice(0, 40)
    : undefined;
  return {
    id: `sec-${nowMs}-${suffix}`,
    timestamp,
    category: input.category,
    outcome: input.outcome,
    actorLabel: (input.actorLabel || 'Sistema').trim().slice(0, 60),
    actorUsername: cleanUsername || undefined,
    actorRole: input.actorRole,
    maskedTarget: sanitizeTargetForAuditLog(input.rawTarget),
    orderId: input.orderId ? input.orderId.trim().slice(0, 32) : undefined,
    summary: input.summary.trim(),
    detail: input.detail.trim(),
  };
}

export function appendSecurityAuditEvent(
  events: SecurityAuditEvent[],
  input: CreateSecurityAuditEventInput,
  maxEntries: number = MAX_SECURITY_AUDIT_LOGS,
  nowMs: number = Date.now()
): SecurityAuditEvent[] {
  const entry = createSecurityAuditEvent(input, nowMs);
  const safeCap = Math.max(1, maxEntries);
  return [entry, ...events].slice(0, safeCap);
}

export function filterSecurityAuditEvents(
  events: SecurityAuditEvent[],
  filters: {
    searchQuery?: string;
    category?: 'all' | SecurityEventCategory;
    outcome?: 'all' | SecurityEventOutcome;
    actorUsername?: string;
    datePreset?: SecurityLogDatePreset;
    specificDate?: string; // YYYY-MM-DD
    referenceNow?: Date;
  }
): SecurityAuditEvent[] {
  const q = (filters.searchQuery || '').trim().toLowerCase();
  const category = filters.category || 'all';
  const outcome = filters.outcome || 'all';
  const actorFilter = (filters.actorUsername || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
  const specificDate = (filters.specificDate || '').trim();
  const datePreset: SecurityLogDatePreset =
    specificDate && (!filters.datePreset || filters.datePreset === 'specific')
      ? 'specific'
      : filters.datePreset || 'all';

  const refNow = filters.referenceNow || new Date();
  const todayKey = toDateKeyYmd(refNow, true);
  const yesterdayDate = new Date(refNow.getTime());
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = toDateKeyYmd(yesterdayDate, true);
  const sevenDaysAgo = new Date(refNow.getTime());
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysKey = toDateKeyYmd(sevenDaysAgo, true);

  return events.filter((ev) => {
    if (category !== 'all' && ev.category !== category) return false;
    if (outcome !== 'all' && ev.outcome !== outcome) return false;

    if (datePreset !== 'all') {
      const evDate = new Date(ev.timestamp);
      if (Number.isNaN(evDate.getTime())) return false;
      const evKey = toDateKeyYmd(evDate, true);
      if (datePreset === 'today' && evKey !== todayKey) return false;
      if (datePreset === 'yesterday' && evKey !== yesterdayKey) return false;
      if (datePreset === 'last7' && (evKey < sevenDaysKey || evKey > todayKey)) {
        return false;
      }
      if (datePreset === 'specific' && specificDate && evKey !== specificDate) {
        return false;
      }
    }

    if (actorFilter && actorFilter !== 'all') {
      const evUser = (ev.actorUsername || '').toLowerCase();
      const evActor = ev.actorLabel.toLowerCase();
      const evTarget = ev.maskedTarget.toLowerCase();
      const matchesActor =
        evUser === actorFilter ||
        evActor.includes(`@${actorFilter}`) ||
        evActor === actorFilter ||
        evTarget.includes(`@${actorFilter}`) ||
        evTarget.includes(`usuário: ${actorFilter}`);
      if (!matchesActor) return false;
    }
    if (!q) return true;
    return (
      ev.summary.toLowerCase().includes(q) ||
      ev.detail.toLowerCase().includes(q) ||
      ev.actorLabel.toLowerCase().includes(q) ||
      (ev.actorUsername || '').toLowerCase().includes(q) ||
      ev.maskedTarget.toLowerCase().includes(q) ||
      (ev.orderId || '').toLowerCase().includes(q)
    );
  });
}

export interface SecurityLogDateSummary {
  dateKey: string; // YYYY-MM-DD
  label: string; // DD/MM/YYYY
  count: number;
}

export function summarizeSecurityLogDates(
  events: SecurityAuditEvent[],
  maxDates: number = 10
): SecurityLogDateSummary[] {
  const counts = new Map<string, number>();
  for (const ev of events) {
    const dt = new Date(ev.timestamp);
    if (Number.isNaN(dt.getTime())) continue;
    const key = toDateKeyYmd(dt, true);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, maxDates)
    .map(([dateKey, count]) => ({
      dateKey,
      label: formatBrDateFromYmd(dateKey),
      count,
    }));
}

export function auditCustomerTrackingIsolation(
  orders: Order[],
  context?: {
    customerProfile?: Pick<
      CustomerProfile,
      'isRegistered' | 'name' | 'phone'
    > | null;
    sessionOrderIds?: string[];
    verifiedLookup?: { orderId: string; phone: string } | null;
  },
  nowMs: number = Date.now()
): CustomerIsolationAuditReport {
  const guestUnverifiedVisible = resolveCustomerVisibleOrders({
    orders,
    customerProfile: null,
    sessionOrderIds: [],
    verifiedLookup: null,
  });

  const customerGroups = new Map<
    string,
    { customerName: string; rawPhone: string; orderIds: string[] }
  >();
  let ordersMissingPhoneCount = 0;

  for (const order of orders) {
    const canon = canonicalBrazilPhone(order.customerPhone);
    if (canon.length < 10) {
      ordersMissingPhoneCount += 1;
      continue;
    }
    const existing = customerGroups.get(canon);
    if (existing) {
      existing.orderIds.push(order.id);
    } else {
      customerGroups.set(canon, {
        customerName: order.customerName || 'Cliente',
        rawPhone: order.customerPhone,
        orderIds: [order.id],
      });
    }
  }

  const customerChecks: CustomerIsolationScopeCheck[] = [];
  let totalCrossCustomerLeaks = 0;

  for (const [canonPhone, group] of customerGroups.entries()) {
    const simulatedVisible = resolveCustomerVisibleOrders({
      orders,
      customerProfile: {
        isRegistered: true,
        name: group.customerName,
        phone: group.rawPhone,
      },
      sessionOrderIds: [],
      verifiedLookup: null,
    });

    const expectedSet = new Set(group.orderIds);
    const visibleIds = simulatedVisible.map((o) => o.id);
    const crossLeaks = visibleIds.filter((id) => !expectedSet.has(id)).length;
    const missingOwn = group.orderIds.filter((id) => !visibleIds.includes(id)).length;
    totalCrossCustomerLeaks += crossLeaks;

    customerChecks.push({
      customerKey: canonPhone,
      customerName: group.customerName,
      maskedPhone: maskPhoneForPrivacy(group.rawPhone),
      expectedOrderIds: group.orderIds,
      visibleOrderIds: visibleIds,
      crossCustomerLeakCount: crossLeaks,
      isolated: crossLeaks === 0 && missingOwn === 0,
    });
  }

  const activeVisible = resolveCustomerVisibleOrders({
    orders,
    customerProfile: context?.customerProfile || null,
    sessionOrderIds: context?.sessionOrderIds || [],
    verifiedLookup: context?.verifiedLookup || null,
  });

  let activeSessionMode: CustomerIsolationAuditReport['activeSessionMode'] =
    'anonymous_locked';
  let activeSessionLabel = 'Visitante não autenticado (0 pedidos expostos)';

  if (isCustomerLoggedIn(context?.customerProfile)) {
    activeSessionMode = 'logged_in_customer';
    activeSessionLabel = `${context?.customerProfile?.name || 'Cliente'} (${maskPhoneForPrivacy(
      context?.customerProfile?.phone
    )})`;
  } else if (context?.verifiedLookup) {
    activeSessionMode = 'verified_guest';
    activeSessionLabel = `Consulta privada (${context.verifiedLookup.orderId} · ${maskPhoneForPrivacy(
      context.verifiedLookup.phone
    )})`;
  } else if ((context?.sessionOrderIds?.length || 0) > 0) {
    activeSessionMode = 'session_checkout';
    activeSessionLabel = `Sessão de compra recente (${context?.sessionOrderIds?.length} pedido(s))`;
  }

  const isFullyIsolated =
    guestUnverifiedVisible.length === 0 &&
    totalCrossCustomerLeaks === 0 &&
    ordersMissingPhoneCount === 0 &&
    customerChecks.every((c) => c.isolated);

  return {
    checkedAt: new Date(nowMs).toISOString(),
    totalOrdersCount: orders.length,
    distinctCustomersCount: customerGroups.size,
    guestUnverifiedVisibleCount: guestUnverifiedVisible.length,
    ordersMissingPhoneCount,
    totalCrossCustomerLeaks,
    isFullyIsolated,
    activeSessionMode,
    activeSessionLabel,
    activeSessionVisibleOrderIds: activeVisible.map((o) => o.id),
    customerChecks,
  };
}

export function buildSecurityAuditCsv(events: SecurityAuditEvent[]): string {
  const headers = [
    'Data_Hora',
    'Categoria',
    'Resultado',
    'Ator',
    'Alvo_Mascarado',
    'Pedido',
    'Resumo',
    'Detalhes',
  ];
  const rows = events.map((ev) => [
    new Date(ev.timestamp).toLocaleString('pt-BR'),
    SECURITY_CATEGORY_LABELS[ev.category] || ev.category,
    SECURITY_OUTCOME_META[ev.outcome]?.label || ev.outcome,
    `"${(ev.actorLabel || '').replace(/"/g, '""')}"`,
    `"${(ev.maskedTarget || '').replace(/"/g, '""')}"`,
    ev.orderId || '',
    `"${(ev.summary || '').replace(/"/g, '""')}"`,
    `"${(ev.detail || '').replace(/"/g, '""')}"`,
  ]);
  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}

export const DEFAULT_PROMO_BADGE_COLOR = '#E5B800';
export const DEFAULT_HIGHLIGHT_BADGE_COLOR = '#FF6B00';

export interface BadgeColorPreset {
  id: string;
  name: string;
  hex: string;
}

export const PROMO_BADGE_COLOR_PRESETS: BadgeColorPreset[] = [
  { id: 'amber', name: 'Amarelo Oferta', hex: '#E5B800' },
  { id: 'orange', name: 'Laranja Destaque', hex: '#FF6B00' },
  { id: 'red', name: 'Vermelho Limper', hex: '#E3262E' },
  { id: 'green', name: 'Verde Economia', hex: '#15803D' },
  { id: 'blue', name: 'Azul Profissional', hex: '#1D4ED8' },
  { id: 'purple', name: 'Roxo Especial', hex: '#7C3AED' },
  { id: 'pink', name: 'Rosa Campanha', hex: '#DB2777' },
  { id: 'black', name: 'Preto Black Friday', hex: '#18181B' },
];

export function normalizeHexColor(
  input: string | undefined | null,
  fallback: string = DEFAULT_PROMO_BADGE_COLOR
): string {
  const safeFallback = /^#[0-9A-F]{6}$/i.test(fallback)
    ? fallback.toUpperCase()
    : DEFAULT_PROMO_BADGE_COLOR;
  if (!input) return safeFallback;
  const trimmed = input.trim().replace(/^#/, '');
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }
  if (/^[0-9A-Fa-f]{3}$/.test(trimmed)) {
    const expanded = trimmed
      .split('')
      .map((ch) => ch + ch)
      .join('');
    return `#${expanded.toUpperCase()}`;
  }
  return safeFallback;
}

export function getContrastTextColor(hexColor: string): '#18181B' | '#FFFFFF' {
  const hex = normalizeHexColor(hexColor, DEFAULT_PROMO_BADGE_COLOR).slice(1);
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return luminance > 0.42 ? '#18181B' : '#FFFFFF';
}

export interface ResolvedProductBadgeStyle {
  backgroundColor: string;
  color: '#18181B' | '#FFFFFF';
  isCustom: boolean;
  presetName: string;
}

export function resolveProductBadgeStyle(
  colorHex: string | undefined | null,
  kind: 'promo' | 'highlight'
): ResolvedProductBadgeStyle {
  const defaultHex =
    kind === 'promo' ? DEFAULT_PROMO_BADGE_COLOR : DEFAULT_HIGHLIGHT_BADGE_COLOR;
  const normalized = normalizeHexColor(colorHex, defaultHex);
  const preset = PROMO_BADGE_COLOR_PRESETS.find((p) => p.hex === normalized);
  return {
    backgroundColor: normalized,
    color: getContrastTextColor(normalized),
    isCustom: normalized !== defaultHex,
    presetName: preset ? preset.name : 'Cor personalizada',
  };
}

// ============================================================================
// ADMIN USER MANAGEMENT, RBAC PERMISSIONS & DASHBOARD CLOCK / GREETING
// ============================================================================

export const ALL_ADMIN_TABS: AdminAppTab[] = [
  'kanban',
  'products',
  'kits',
  'banners',
  'coupons',
  'categories',
  'customers',
  'users',
  'security',
  'settings',
];

export interface AdminTabCatalogEntry {
  id: AdminAppTab;
  label: string;
  shortLabel: string;
  description: string;
  group: 'Operação' | 'Catálogo & Marketing' | 'Governança';
  masterOnly?: boolean;
}

export const ADMIN_TAB_CATALOG: AdminTabCatalogEntry[] = [
  {
    id: 'kanban',
    label: 'Kanban de Separação',
    shortLabel: 'Kanban',
    description: 'Fila de pedidos 15min, lançamento PDV balcão e histórico.',
    group: 'Operação',
  },
  {
    id: 'customers',
    label: 'Clientes & Recompra',
    shortLabel: 'Clientes',
    description: 'Base de clientes, histórico de pedidos e recompra.',
    group: 'Operação',
  },
  {
    id: 'products',
    label: 'Produtos & Fotos',
    shortLabel: 'Produtos',
    description: 'Cadastro, preços, visibilidade, selos e galeria de fotos.',
    group: 'Catálogo & Marketing',
  },
  {
    id: 'kits',
    label: 'Kits & Combos',
    shortLabel: 'Kits',
    description: 'Montagem de kits promocionais e combos de economia.',
    group: 'Catálogo & Marketing',
  },
  {
    id: 'banners',
    label: 'Banners & Promoções',
    shortLabel: 'Banners',
    description: 'Carrossel principal e faixas promocionais da vitrine.',
    group: 'Catálogo & Marketing',
  },
  {
    id: 'coupons',
    label: 'Cupons de Desconto',
    shortLabel: 'Cupons',
    description: 'Códigos promocionais, regras de desconto e validade.',
    group: 'Catálogo & Marketing',
  },
  {
    id: 'categories',
    label: 'Categorias Quimiprol',
    shortLabel: 'Categorias',
    description: 'Linhas de produtos, ícones e organização do menu.',
    group: 'Catálogo & Marketing',
  },
  {
    id: 'security',
    label: 'Acesso & Segurança',
    shortLabel: 'Segurança',
    description: 'Logs de atividades por usuário e auditoria LGPD de rastreio.',
    group: 'Governança',
  },
  {
    id: 'settings',
    label: 'Loja, PIX & Frete',
    shortLabel: 'Loja & Frete',
    description: 'Dados da loja física, chave PIX, horários e bairros de entrega.',
    group: 'Governança',
  },
  {
    id: 'users',
    label: 'Usuários & Acessos',
    shortLabel: 'Usuários',
    description: 'Exclusivo Master: criar usuários Master ou com níveis e permissões.',
    group: 'Governança',
    masterOnly: true,
  },
];

export const ASSIGNABLE_NON_MASTER_TABS: AdminAppTab[] = ADMIN_TAB_CATALOG.filter(
  (t) => !t.masterOnly
).map((t) => t.id);

export interface AdminRoleMeta {
  level: AdminRoleLevel;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  defaultTabs: AdminAppTab[];
}

export const ADMIN_ROLE_META: Record<AdminRoleLevel, AdminRoleMeta> = {
  master: {
    level: 'master',
    label: 'Master (Controle Total)',
    shortLabel: 'Master',
    description:
      'Acesso irrestrito a todas as áreas, logs de auditoria e criação de novos usuários Master ou por nível.',
    badgeClass: 'bg-zinc-950 text-[#FFBE00] border-zinc-950',
    defaultTabs: [...ALL_ADMIN_TABS],
  },
  manager: {
    level: 'manager',
    label: 'Gerente Operacional',
    shortLabel: 'Gerente',
    description:
      'Acompanha operação, catálogo, campanhas, clientes, configurações e relatórios de segurança.',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
    defaultTabs: [
      'kanban',
      'products',
      'kits',
      'banners',
      'coupons',
      'categories',
      'customers',
      'security',
      'settings',
    ],
  },
  operator: {
    level: 'operator',
    label: 'Operador de Separação & Balcão',
    shortLabel: 'Operador',
    description:
      'Focado no Kanban de pedidos 15min, lançamento balcão/telefone e base de clientes.',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    defaultTabs: ['kanban', 'customers'],
  },
  catalog: {
    level: 'catalog',
    label: 'Editor de Catálogo & Ofertas',
    shortLabel: 'Catálogo',
    description:
      'Gerencia produtos, fotos, selos promocionais, kits, banners, cupons e categorias.',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    defaultTabs: ['products', 'kits', 'banners', 'coupons', 'categories'],
  },
  viewer: {
    level: 'viewer',
    label: 'Consulta / Supervisão',
    shortLabel: 'Consulta',
    description:
      'Visualização enxuta dos módulos selecionados (ex: Kanban e Relatórios de Segurança).',
    badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-300',
    defaultTabs: ['kanban', 'security'],
  },
};

export const DEFAULT_ADMIN_USERS: AdminUser[] = [
  {
    id: 'admin-master-1',
    name: 'Administrador Master',
    username: 'admin',
    password: 'limper123',
    role: 'master',
    jobTitle: 'Diretoria · Limper MT',
    email: 'gestao@limpermt.com.br',
    allowedTabs: [...ALL_ADMIN_TABS],
    active: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'Sistema Limper MT',
  },
];

export function normalizeAdminUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32);
}

export function getEffectiveAllowedTabs(
  user: Pick<AdminUser, 'role' | 'allowedTabs'> | null | undefined
): AdminAppTab[] {
  if (!user) return [];
  if (user.role === 'master') {
    return [...ALL_ADMIN_TABS];
  }
  const allowedSet = new Set<AdminAppTab>(
    (user.allowedTabs || []).filter(
      (tab): tab is AdminAppTab =>
        tab !== 'users' && ASSIGNABLE_NON_MASTER_TABS.includes(tab)
    )
  );
  if (allowedSet.size === 0) {
    return ['kanban'];
  }
  return ALL_ADMIN_TABS.filter((tab) => allowedSet.has(tab));
}

export function canAdminUserAccessTab(
  user: Pick<AdminUser, 'role' | 'allowedTabs'> | null | undefined,
  tab: AdminAppTab
): boolean {
  if (!user) return false;
  if (tab === 'users') {
    return user.role === 'master';
  }
  return getEffectiveAllowedTabs(user).includes(tab);
}

export type AdminAuthResult =
  | { ok: true; user: AdminUser }
  | { ok: false; reason: 'invalid_credentials' | 'inactive_account'; matchedUser?: AdminUser };

export function authenticateAdminUser(
  users: AdminUser[],
  rawUsername: string,
  rawPassword: string
): AdminAuthResult {
  const cleanUser = rawUsername.trim().toLowerCase().replace(/^@+/, '');
  const cleanPass = rawPassword.trim();
  if (!cleanUser || !cleanPass) {
    return { ok: false, reason: 'invalid_credentials' };
  }

  let matched = users.find((u) => u.username.toLowerCase() === cleanUser);
  // Preserve legacy "limper" alias mapped to default "admin" if no explicit "limper" account exists
  if (!matched && cleanUser === 'limper') {
    matched = users.find((u) => u.username.toLowerCase() === 'admin');
  }

  if (!matched || matched.password !== cleanPass) {
    return { ok: false, reason: 'invalid_credentials' };
  }

  if (!matched.active) {
    return { ok: false, reason: 'inactive_account', matchedUser: matched };
  }

  return { ok: true, user: matched };
}

export interface AdminUserDraftValidation {
  valid: boolean;
  error?: string;
}

export function validateAdminUserDraft(
  draft: {
    name: string;
    username: string;
    password: string;
    role: AdminRoleLevel;
    allowedTabs: AdminAppTab[];
    active: boolean;
    avatarUrl?: string;
  },
  existingUsers: AdminUser[],
  editingUserId?: string | null
): AdminUserDraftValidation {
  const cleanName = draft.name.trim();
  const cleanUsername = normalizeAdminUsername(draft.username);
  const cleanPass = draft.password.trim();

  if (cleanName.length < 2) {
    return { valid: false, error: 'Informe o nome completo do usuário (mínimo 2 caracteres).' };
  }
  if (cleanUsername.length < 3) {
    return {
      valid: false,
      error: 'Informe um login de acesso válido com pelo menos 3 caracteres (ex: maria.loja).',
    };
  }
  if (cleanPass.length < 4) {
    return { valid: false, error: 'A senha de acesso deve ter pelo menos 4 caracteres.' };
  }

  const duplicate = existingUsers.find(
    (u) => u.username.toLowerCase() === cleanUsername && u.id !== editingUserId
  );
  if (duplicate) {
    return {
      valid: false,
      error: `O login "@${cleanUsername}" já está em uso por ${duplicate.name}. Escolha outro login.`,
    };
  }

  if (draft.role !== 'master') {
    const validNonMasterTabs = (draft.allowedTabs || []).filter(
      (t) => t !== 'users' && ASSIGNABLE_NON_MASTER_TABS.includes(t)
    );
    if (validNonMasterTabs.length === 0) {
      return {
        valid: false,
        error: 'Selecione pelo menos 1 módulo que este usuário poderá visualizar no painel.',
      };
    }
  }

  if (editingUserId) {
    const otherActiveMasters = existingUsers.filter(
      (u) => u.id !== editingUserId && u.role === 'master' && u.active
    );
    const currentIsActiveMaster = draft.role === 'master' && draft.active;
    if (!currentIsActiveMaster && otherActiveMasters.length === 0) {
      return {
        valid: false,
        error:
          'O sistema precisa manter pelo menos 1 usuário Master ativo. Crie outro Master antes de rebaixar ou desativar esta conta.',
      };
    }
  }

  const avatarTrimmed = (draft.avatarUrl || '').trim();
  if (
    avatarTrimmed &&
    !avatarTrimmed.startsWith('data:image/') &&
    !/^https?:\/\//i.test(avatarTrimmed) &&
    !avatarTrimmed.startsWith('/')
  ) {
    return {
      valid: false,
      error: 'O link da imagem deve começar com https://, http:// ou ser enviado do computador.',
    };
  }

  return { valid: true };
}

export function getUserInitials(name: string | undefined | null): string {
  const parts = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'LM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export interface FormattedAdminDateTime {
  greeting: string;
  weekday: string;
  fullDate: string;
  shortDate: string;
  timeWithSeconds: string;
  timeShort: string;
}

export function formatAdminDashboardDateTime(
  date: Date = new Date()
): FormattedAdminDateTime {
  const weekdayRaw = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
  const fullDate = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const shortDate = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeWithSeconds = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const timeShort = timeWithSeconds.slice(0, 5);

  return {
    greeting: getTimeOfDayGreeting(date),
    weekday,
    fullDate,
    shortDate,
    timeWithSeconds,
    timeShort,
  };
}

export function formatAdminActorLabel(
  user: Pick<AdminUser, 'name' | 'username'> | null | undefined
): string {
  if (!user) return 'Gestor Lojista';
  return `${user.name} (@${user.username})`;
}

// ============================================================================
// SITE BACKUP & RESTORE SNAPSHOT ENGINE (MASTER VAULT)
// ============================================================================

export const MAX_STORED_SITE_BACKUPS = 20;

export const SITE_BACKUP_TRIGGER_META: Record<
  SiteBackupTrigger,
  { label: string; badgeClass: string }
> = {
  manual: {
    label: 'Backup Manual',
    badgeClass: 'bg-[#FFFBEB] text-amber-900 border-amber-300',
  },
  auto_daily: {
    label: 'Automático Diário',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  auto_scheduled: {
    label: 'Agendado Automático',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  auto_shutdown: {
    label: 'Proteção ao Fechar Navegador',
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  },
  pre_restore: {
    label: 'Segurança Pré-Restauração',
    badgeClass: 'bg-zinc-900 text-[#FFBE00] border-zinc-900',
  },
  imported: {
    label: 'Importado (.JSON)',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
};

export function computePayloadChecksum(payload: SiteBackupPayload): string {
  // Exclude volatile securityLogs from business-data checksum so log entries alone do not trigger redundant exit backups
  const canonicalPayload = {
    categories: payload.categories || [],
    products: payload.products || [],
    deletedProducts: payload.deletedProducts || [],
    kits: payload.kits || [],
    coupons: payload.coupons || [],
    banners: payload.banners || [],
    orders: payload.orders || [],
    settings: payload.settings || {},
    adminUsers: payload.adminUsers || [],
  };
  const serialized = JSON.stringify(canonicalPayload);
  // Deterministic 32-bit FNV-1a hash (synchronous, zero async overhead during pagehide/beforeunload)
  let hash = 0x811c9dc5;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function verifySiteBackupIntegrity(
  snapshot: SiteBackupSnapshot
): SiteBackupIntegrityResult {
  const issues: string[] = [];
  const payload = snapshot?.payload;
  if (!payload || typeof payload !== 'object') {
    return {
      valid: false,
      expectedChecksum: snapshot?.checksum,
      computedChecksum: '00000000',
      issues: ['Estrutura de dados do backup ausente ou corrompida.'],
    };
  }
  if (!Array.isArray(payload.categories)) issues.push('Lista de categorias inválida.');
  if (!Array.isArray(payload.products)) issues.push('Lista de produtos inválida.');
  if (!Array.isArray(payload.orders)) issues.push('Lista de pedidos inválida.');
  if (!payload.settings || typeof payload.settings !== 'object') {
    issues.push('Configurações da loja ausentes.');
  }
  if (
    !Array.isArray(payload.adminUsers) ||
    !payload.adminUsers.some((u) => u && u.role === 'master' && u.active)
  ) {
    issues.push('Nenhum usuário Master ativo encontrado no snapshot.');
  }

  const computedChecksum = computePayloadChecksum(payload);
  if (snapshot.checksum && snapshot.checksum !== computedChecksum) {
    issues.push(
      `Assinatura de integridade divergente (esperado #${snapshot.checksum}, calculado #${computedChecksum}).`
    );
  }

  return {
    valid: issues.length === 0,
    expectedChecksum: snapshot.checksum,
    computedChecksum,
    issues,
  };
}

export function formatBackupByteSize(bytes: number): string {
  const safe = Math.max(0, Number.isFinite(bytes) ? bytes : 0);
  if (safe < 1024) return `${Math.round(safe)} B`;
  const kb = safe / 1024;
  if (kb < 1024) return `${kb.toFixed(1).replace('.', ',')} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2).replace('.', ',')} MB`;
}

export function createSiteBackupSnapshot(
  params: {
    payload: SiteBackupPayload;
    label?: string;
    trigger?: SiteBackupTrigger;
    createdBy: string;
    createdByUsername?: string;
    scheduleSlotKey?: string;
  },
  nowMs: number = Date.now()
): SiteBackupSnapshot {
  const nowDate = new Date(nowMs);
  const createdAt = nowDate.toISOString();
  const dateKey = toDateKeyYmd(nowDate, true);
  const trigger: SiteBackupTrigger = params.trigger || 'manual';
  const timeShort = `${String(nowDate.getHours()).padStart(2, '0')}:${String(
    nowDate.getMinutes()
  ).padStart(2, '0')}`;
  const defaultLabel =
    trigger === 'pre_restore'
      ? `Ponto de segurança antes de restauração (${formatBrDateFromYmd(dateKey)})`
      : trigger === 'auto_scheduled'
      ? `Backup agendado automático · ${timeShort} (${formatBrDateFromYmd(dateKey)})`
      : trigger === 'auto_shutdown'
      ? `Proteção automática ao encerrar navegador · ${timeShort}`
      : trigger === 'imported'
      ? `Backup importado (${formatBrDateFromYmd(dateKey)})`
      : `Backup completo do site · ${formatBrDateFromYmd(dateKey)}`;

  // Deep-clone payload cleanly so subsequent live edits never mutate stored snapshots
  const clonedPayload = JSON.parse(
    JSON.stringify(params.payload)
  ) as SiteBackupPayload;
  const serializedSize = JSON.stringify(clonedPayload).length;
  const checksum = computePayloadChecksum(clonedPayload);
  const suffix = Math.random().toString(36).slice(2, 6);

  return {
    id: `bkp-${dateKey.replace(/-/g, '')}-${nowMs}-${suffix}`,
    createdAt,
    dateKey,
    label: (params.label || '').trim().slice(0, 90) || defaultLabel,
    trigger,
    createdBy: (params.createdBy || 'Administrador Master').trim().slice(0, 60),
    createdByUsername: params.createdByUsername
      ? params.createdByUsername.trim().toLowerCase().replace(/^@/, '')
      : undefined,
    checksum,
    scheduleSlotKey: params.scheduleSlotKey,
    summary: {
      categoriesCount: clonedPayload.categories.length,
      productsCount: clonedPayload.products.length,
      kitsCount: clonedPayload.kits.length,
      bannersCount: clonedPayload.banners.length,
      couponsCount: clonedPayload.coupons.length,
      ordersCount: clonedPayload.orders.length,
      adminUsersCount: clonedPayload.adminUsers.length,
      securityLogsCount: clonedPayload.securityLogs?.length || 0,
      sizeBytes: serializedSize,
    },
    payload: clonedPayload,
  };
}

export function appendSiteBackupSnapshot(
  backups: SiteBackupSnapshot[],
  snapshot: SiteBackupSnapshot,
  maxEntries: number = MAX_STORED_SITE_BACKUPS
): SiteBackupSnapshot[] {
  const safeCap = Math.max(1, maxEntries);
  return [snapshot, ...backups.filter((b) => b.id !== snapshot.id)].slice(
    0,
    safeCap
  );
}

export function filterSiteBackupsByDate(
  backups: SiteBackupSnapshot[],
  filters: {
    specificDate?: string; // YYYY-MM-DD
    searchQuery?: string;
  }
): SiteBackupSnapshot[] {
  const targetDate = (filters.specificDate || '').trim();
  const q = (filters.searchQuery || '').trim().toLowerCase();

  return backups.filter((b) => {
    if (targetDate && b.dateKey !== targetDate) return false;
    if (!q) return true;
    return (
      b.label.toLowerCase().includes(q) ||
      b.createdBy.toLowerCase().includes(q) ||
      (b.createdByUsername || '').toLowerCase().includes(q) ||
      formatBrDateFromYmd(b.dateKey).includes(q) ||
      b.dateKey.includes(q)
    );
  });
}

export function summarizeSiteBackupDates(
  backups: SiteBackupSnapshot[],
  maxDates: number = 12
): SecurityLogDateSummary[] {
  const counts = new Map<string, number>();
  for (const b of backups) {
    if (!b.dateKey) continue;
    counts.set(b.dateKey, (counts.get(b.dateKey) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, maxDates)
    .map(([dateKey, count]) => ({
      dateKey,
      label: formatBrDateFromYmd(dateKey),
      count,
    }));
}

export function parseImportedSiteBackupJson(
  rawJson: string,
  importedBy: { label: string; username?: string },
  nowMs: number = Date.now()
): { ok: true; snapshot: SiteBackupSnapshot } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'Arquivo JSON inválido para backup do site.' };
    }

    const candidatePayload = (
      parsed.payload && typeof parsed.payload === 'object'
        ? parsed.payload
        : parsed
    ) as Partial<SiteBackupPayload>;

    if (
      !Array.isArray(candidatePayload.categories) ||
      !Array.isArray(candidatePayload.products) ||
      !Array.isArray(candidatePayload.orders) ||
      !candidatePayload.settings ||
      typeof candidatePayload.settings !== 'object'
    ) {
      return {
        ok: false,
        error:
          'Estrutura de backup incompatível. Selecione um arquivo .json exportado pelo Gestor Limper MT.',
      };
    }

    const safeAdminUsers =
      Array.isArray(candidatePayload.adminUsers) &&
      candidatePayload.adminUsers.some((u) => u && u.role === 'master' && u.active)
        ? candidatePayload.adminUsers
        : DEFAULT_ADMIN_USERS;

    const normalizedPayload: SiteBackupPayload = {
      categories: candidatePayload.categories,
      products: candidatePayload.products,
      kits: Array.isArray(candidatePayload.kits) ? candidatePayload.kits : [],
      coupons: Array.isArray(candidatePayload.coupons)
        ? candidatePayload.coupons
        : [],
      banners: Array.isArray(candidatePayload.banners)
        ? candidatePayload.banners
        : [],
      orders: candidatePayload.orders,
      settings: candidatePayload.settings,
      adminUsers: safeAdminUsers,
      securityLogs: Array.isArray(candidatePayload.securityLogs)
        ? candidatePayload.securityLogs
        : [],
    };

    const originalLabel =
      typeof parsed.label === 'string' && parsed.label.trim()
        ? parsed.label.trim()
        : undefined;

    const snapshot = createSiteBackupSnapshot(
      {
        payload: normalizedPayload,
        label: originalLabel
          ? `Importado: ${originalLabel}`
          : undefined,
        trigger: 'imported',
        createdBy: importedBy.label,
        createdByUsername: importedBy.username,
      },
      nowMs
    );

    if (typeof parsed.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dateKey)) {
      snapshot.dateKey = parsed.dateKey;
    }
    if (typeof parsed.createdAt === 'string' && !Number.isNaN(new Date(parsed.createdAt).getTime())) {
      snapshot.createdAt = parsed.createdAt;
    }

    return { ok: true, snapshot };
  } catch {
    return {
      ok: false,
      error: 'Não foi possível ler o arquivo selecionado. Verifique se é um JSON válido.',
    };
  }
}

// ============================================================================
// ORDER NUMBERING, CRUD VALIDATORS & LIVE CATALOG HEALTH DIAGNOSTICS
// ============================================================================

export function generateNextOrderNumber(
  orders: Pick<Order, 'id'>[],
  floorNumber: number = 1043
): number {
  let maxNumber = floorNumber;
  for (const order of orders) {
    const match = String(order.id || '').match(/(\d+)$/);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > maxNumber) {
        maxNumber = parsed;
      }
    }
  }
  return maxNumber + 1;
}

export interface CrudValidationResult {
  valid: boolean;
  error?: string;
}

export function validateProductDraft(
  draft: {
    title: string;
    sku: string;
    price: number;
    promoPrice: number | null;
    categoryId: string;
    installmentsCount?: number;
  },
  existingProducts: Pick<Product, 'id' | 'sku'>[],
  editingProductId?: string | null
): CrudValidationResult {
  if (draft.title.trim().length < 2) {
    return { valid: false, error: 'Informe o título do produto (mínimo 2 caracteres).' };
  }
  if (!draft.categoryId.trim()) {
    return { valid: false, error: 'Selecione uma categoria válida para o produto.' };
  }
  if (!Number.isFinite(draft.price) || draft.price < 0) {
    return { valid: false, error: 'Informe um preço regular válido (zero ou positivo).' };
  }
  if (draft.promoPrice !== null) {
    if (!Number.isFinite(draft.promoPrice) || draft.promoPrice <= 0) {
      return {
        valid: false,
        error: 'O preço promocional deve ser maior que R$ 0,00 (ou deixe o campo em branco).',
      };
    }
    if (draft.price > 0 && draft.promoPrice >= draft.price) {
      return {
        valid: false,
        error: 'O preço promocional precisa ser menor que o preço regular para gerar desconto.',
      };
    }
  }
  const normalizedSku = draft.sku.trim().toUpperCase();
  if (normalizedSku) {
    const duplicate = existingProducts.find(
      (p) =>
        p.id !== editingProductId &&
        p.sku.trim().toUpperCase() === normalizedSku
    );
    if (duplicate) {
      return {
        valid: false,
        error: `Já existe um produto cadastrado com o código SKU "${normalizedSku}". Use um SKU exclusivo.`,
      };
    }
  }
  if (
    draft.installmentsCount !== undefined &&
    (!Number.isFinite(draft.installmentsCount) ||
      draft.installmentsCount < 1 ||
      draft.installmentsCount > 12)
  ) {
    return { valid: false, error: 'O parcelamento deve ficar entre 1x e 12x.' };
  }
  return { valid: true };
}

export interface GenerateAutoSkuOptions {
  kind: 'product' | 'kit';
  existingSkus: string[];
  currentSku?: string;
  preferredPrefix?: string;
  mode?: 'sequential' | 'random';
  rng?: () => number;
}

/**
 * Generates a guaranteed-unique SKU strictly following the 3-letters + hyphen + 3-digits pattern (AAA-000).
 * Defaults to "QMP-NNN" for products and "KIT-NNN" for kits, preserving a valid custom 3-letter prefix if provided.
 */
export function generateAutoSku(options: GenerateAutoSkuOptions): string {
  const defaultPrefix = options.kind === 'kit' ? 'KIT' : 'QMP';
  const fallbackPrefixes =
    options.kind === 'kit'
      ? ['KIT', 'CMB', 'LMP', 'PRO']
      : ['QMP', 'LMP', 'PRO', 'CLN'];

  const extractedCustomPrefix = options.preferredPrefix
    ?.trim()
    .toUpperCase()
    .match(/^([A-Z]{3})(?:-|$)/)?.[1];

  const candidatePrefixes = extractedCustomPrefix
    ? [extractedCustomPrefix, ...fallbackPrefixes.filter((p) => p !== extractedCustomPrefix)]
    : fallbackPrefixes;

  const blocked = new Set<string>();
  for (const raw of options.existingSkus) {
    const clean = raw.trim().toUpperCase();
    if (clean) blocked.add(clean);
  }
  if (options.currentSku?.trim()) {
    blocked.add(options.currentSku.trim().toUpperCase());
  }

  const mode = options.mode ?? 'random';
  const rng = options.rng ?? Math.random;

  for (const prefix of candidatePrefixes) {
    // Prefer 101..999 (clean 3-digit catalog codes like QMP-102 / KIT-101), then 001..100
    const availableNumbers: number[] = [];
    for (let n = 101; n <= 999; n += 1) {
      const code = `${prefix}-${String(n).padStart(3, '0')}`;
      if (!blocked.has(code)) availableNumbers.push(n);
    }
    if (availableNumbers.length === 0) {
      for (let n = 1; n <= 100; n += 1) {
        const code = `${prefix}-${String(n).padStart(3, '0')}`;
        if (!blocked.has(code)) availableNumbers.push(n);
      }
    }
    if (availableNumbers.length > 0) {
      if (mode === 'sequential') {
        return `${prefix}-${String(availableNumbers[0]).padStart(3, '0')}`;
      }
      const randVal = Math.min(0.999999, Math.max(0, rng()));
      const idx = Math.floor(randVal * availableNumbers.length);
      return `${prefix}-${String(availableNumbers[idx]).padStart(3, '0')}`;
    }
  }

  return `${defaultPrefix}-999`;
}

export function validateKitDraft(
  draft: {
    title: string;
    sku?: string;
    promoPrice: number;
    items: { productId: string; quantity: number }[];
  },
  catalogProducts: Pick<Product, 'id' | 'sku'>[],
  existingKits?: Pick<PromoKit, 'id' | 'sku'>[],
  editingKitId?: string | null
): CrudValidationResult {
  if (draft.title.trim().length < 2) {
    return { valid: false, error: 'Informe o nome do kit promocional (mínimo 2 caracteres).' };
  }
  const normalizedSku = draft.sku?.trim().toUpperCase() || '';
  if (normalizedSku) {
    const dupProduct = catalogProducts.find(
      (p) => p.sku && p.sku.trim().toUpperCase() === normalizedSku
    );
    if (dupProduct) {
      return {
        valid: false,
        error: `O código SKU "${normalizedSku}" já está em uso em um produto do catálogo. Clique em "Gerar SKU" para criar um código exclusivo.`,
      };
    }
    const dupKit = (existingKits || []).find(
      (k) =>
        k.id !== editingKitId &&
        k.sku &&
        k.sku.trim().toUpperCase() === normalizedSku
    );
    if (dupKit) {
      return {
        valid: false,
        error: `Já existe um kit cadastrado com o código SKU "${normalizedSku}". Clique em "Gerar SKU" para criar um código exclusivo.`,
      };
    }
  }
  const catalogIds = new Set(catalogProducts.map((p) => p.id));
  const validItems = draft.items.filter(
    (it) => it.quantity > 0 && catalogIds.has(it.productId)
  );
  if (validItems.length === 0) {
    return {
      valid: false,
      error: 'Selecione pelo menos 1 produto válido do catálogo para compor este kit.',
    };
  }
  if (!Number.isFinite(draft.promoPrice) || draft.promoPrice <= 0) {
    return {
      valid: false,
      error: 'Informe um preço promocional válido maior que R$ 0,00 para o kit.',
    };
  }
  return { valid: true };
}

export function validateCouponDraft(
  draft: {
    code: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    minOrderValue: number;
  },
  existingCoupons: Pick<PromoCoupon, 'id' | 'code'>[],
  editingCouponId?: string | null
): CrudValidationResult {
  const cleanCode = draft.code.trim().toUpperCase().replace(/\s+/g, '');
  if (cleanCode.length < 3) {
    return {
      valid: false,
      error: 'O código do cupom deve ter pelo menos 3 caracteres (ex: LIMPER15).',
    };
  }
  const duplicate = existingCoupons.find(
    (c) =>
      c.id !== editingCouponId &&
      c.code.trim().toUpperCase() === cleanCode
  );
  if (duplicate) {
    return {
      valid: false,
      error: `O cupom "${cleanCode}" já existe na loja. Escolha outro código.`,
    };
  }
  if (!Number.isFinite(draft.discountValue) || draft.discountValue <= 0) {
    return {
      valid: false,
      error: 'Informe um valor de desconto maior que zero.',
    };
  }
  if (draft.discountType === 'percent' && draft.discountValue > 100) {
    return {
      valid: false,
      error: 'O desconto em porcentagem não pode ultrapassar 100%.',
    };
  }
  if (!Number.isFinite(draft.minOrderValue) || draft.minOrderValue < 0) {
    return {
      valid: false,
      error: 'O pedido mínimo do cupom não pode ser negativo.',
    };
  }
  return { valid: true };
}

export function validateCategoryDraft(
  draft: { name: string },
  existingCategories: Pick<Category, 'id' | 'name'>[],
  editingCategoryId?: string | null
): CrudValidationResult {
  const cleanName = draft.name.trim();
  if (cleanName.length < 2) {
    return {
      valid: false,
      error: 'Informe o nome completo da categoria (mínimo 2 caracteres).',
    };
  }
  const duplicate = existingCategories.find(
    (c) =>
      c.id !== editingCategoryId &&
      c.name.trim().toLowerCase() === cleanName.toLowerCase()
  );
  if (duplicate) {
    return {
      valid: false,
      error: `Já existe uma categoria chamada "${duplicate.name}".`,
    };
  }
  return { valid: true };
}

export function validateBannerDraft(draft: {
  title: string;
}): CrudValidationResult {
  if (draft.title.trim().length < 2) {
    return {
      valid: false,
      error: 'Informe o título principal da campanha para o banner.',
    };
  }
  return { valid: true };
}

export function validateStoreSettingsDraft(
  settings: StoreSettings
): CrudValidationResult {
  const numericChecks: Array<[number | undefined, string]> = [
    [settings.freeShippingThreshold, 'Valor para frete grátis'],
    [settings.defaultDeliveryFee, 'Taxa padrão de entrega'],
    [settings.motoLimperVgMin, 'Mínimo Moto Limper (VG)'],
    [settings.motoLimperCbaMin, 'Mínimo Moto Limper (Cuiabá)'],
    [settings.truckVgMin, 'Mínimo Caminhão (VG)'],
    [settings.truckCbaMin, 'Mínimo Caminhão (Cuiabá)'],
  ];

  for (const [val, label] of numericChecks) {
    if (val !== undefined && (!Number.isFinite(val) || val < 0)) {
      return {
        valid: false,
        error: `${label} não pode ser negativo.`,
      };
    }
  }
  return { valid: true };
}

export type CatalogHealthSeverity = 'ok' | 'warning' | 'critical';

export interface CatalogHealthCheck {
  id: string;
  label: string;
  severity: CatalogHealthSeverity;
  detail: string;
  autoFixable: boolean;
}

export interface CatalogHealthReport {
  status: CatalogHealthSeverity;
  passedCount: number;
  warningCount: number;
  criticalCount: number;
  autoFixableCount: number;
  checks: CatalogHealthCheck[];
}

export function auditCatalogHealth(data: {
  categories: Category[];
  products: Product[];
  kits: PromoKit[];
  coupons: PromoCoupon[];
  banners: PromoBanner[];
  adminUsers: AdminUser[];
  siteBackups: SiteBackupSnapshot[];
}): CatalogHealthReport {
  const checks: CatalogHealthCheck[] = [];
  const categoryIds = new Set(data.categories.map((c) => c.id));
  const productIds = new Set(data.products.map((p) => p.id));

  // 1. Duplicate SKUs
  const skuCounts = new Map<string, number>();
  for (const p of data.products) {
    const key = p.sku.trim().toUpperCase();
    if (!key) continue;
    skuCounts.set(key, (skuCounts.get(key) || 0) + 1);
  }
  const dupSkus = Array.from(skuCounts.entries()).filter(([, count]) => count > 1);
  checks.push({
    id: 'skus',
    label: 'Códigos SKU Exclusivos',
    severity: dupSkus.length > 0 ? 'critical' : 'ok',
    detail:
      dupSkus.length > 0
        ? `${dupSkus.length} código(s) SKU duplicado(s): ${dupSkus
            .map(([sku]) => sku)
            .slice(0, 3)
            .join(', ')}.`
        : `${data.products.length} produtos com códigos SKU únicos validados.`,
    autoFixable: dupSkus.length > 0,
  });

  // 2. Orphaned Product Categories
  const orphanedProducts = data.products.filter(
    (p) => !categoryIds.has(p.categoryId)
  );
  checks.push({
    id: 'product_categories',
    label: 'Vínculo Produto → Categoria',
    severity: orphanedProducts.length > 0 ? 'critical' : 'ok',
    detail:
      orphanedProducts.length > 0
        ? `${orphanedProducts.length} produto(s) apontam para categoria removida.`
        : `Todos os ${data.products.length} produtos estão vinculados a ${data.categories.length} categoria(s) ativa(s).`,
    autoFixable: orphanedProducts.length > 0 && data.categories.length > 0,
  });

  // 3. Pricing & Promo Consistency
  const invalidPromoProducts = data.products.filter(
    (p) =>
      p.price < 0 ||
      (p.promoPrice != null && (p.promoPrice <= 0 || (p.price > 0 && p.promoPrice >= p.price)))
  );
  checks.push({
    id: 'pricing_integrity',
    label: 'Consistência de Preços De / Por',
    severity: invalidPromoProducts.length > 0 ? 'warning' : 'ok',
    detail:
      invalidPromoProducts.length > 0
        ? `${invalidPromoProducts.length} produto(s) com preço promocional igual ou maior que o regular.`
        : 'Todos os preços regulares e ofertas promocionais estão coerentes.',
    autoFixable: invalidPromoProducts.length > 0,
  });

  // 4. Kits & Banners Product References
  const brokenKitRefs = data.kits.reduce(
    (acc, k) =>
      acc + k.items.filter((it) => !productIds.has(it.productId)).length,
    0
  );
  const brokenBannerRefs = data.banners.reduce(
    (acc, b) =>
      acc + b.featuredProductIds.filter((id) => !productIds.has(id)).length,
    0
  );
  const totalGhostRefs = brokenKitRefs + brokenBannerRefs;
  checks.push({
    id: 'kits_banners_refs',
    label: 'Referências de Kits & Banners',
    severity: totalGhostRefs > 0 ? 'warning' : 'ok',
    detail:
      totalGhostRefs > 0
        ? `${totalGhostRefs} referência(s) a produtos removidos encontrada(s) em kits ou banners.`
        : `${data.kits.length} kit(s) e ${data.banners.length} banner(s) com referências íntegras.`,
    autoFixable: totalGhostRefs > 0,
  });

  // 5. Coupons Integrity
  const couponCodes = new Map<string, number>();
  let badCoupons = 0;
  for (const cp of data.coupons) {
    const key = cp.code.trim().toUpperCase();
    couponCodes.set(key, (couponCodes.get(key) || 0) + 1);
    if (
      cp.discountValue <= 0 ||
      (cp.discountType === 'percent' && cp.discountValue > 100)
    ) {
      badCoupons += 1;
    }
  }
  const dupCoupons = Array.from(couponCodes.values()).filter((c) => c > 1).length;
  checks.push({
    id: 'coupons_integrity',
    label: 'Regras & Códigos de Cupons',
    severity: dupCoupons > 0 || badCoupons > 0 ? 'warning' : 'ok',
    detail:
      dupCoupons > 0 || badCoupons > 0
        ? `Encontrado(s) ${dupCoupons} código(s) duplicado(s) e ${badCoupons} regra(s) de desconto fora do limite.`
        : `${data.coupons.length} cupom(ns) válidos e sem duplicidade.`,
    autoFixable: dupCoupons > 0 || badCoupons > 0,
  });

  // 6. Active Master Account & Site Backup Readiness
  const activeMasters = data.adminUsers.filter(
    (u) => u.role === 'master' && u.active
  ).length;
  checks.push({
    id: 'master_governance',
    label: 'Governança de Conta Master',
    severity: activeMasters === 0 ? 'critical' : 'ok',
    detail:
      activeMasters === 0
        ? 'Nenhuma conta Master ativa encontrada.'
        : `${activeMasters} conta(s) Master ativa(s) protegendo o painel.`,
    autoFixable: false,
  });

  checks.push({
    id: 'backup_readiness',
    label: 'Ponto de Backup Salvo',
    severity: data.siteBackups.length === 0 ? 'warning' : 'ok',
    detail:
      data.siteBackups.length === 0
        ? 'Nenhum ponto de backup criado ainda. Recomendado gerar um backup abaixo.'
        : `${data.siteBackups.length} backup(s) armazenado(s) · último em ${formatBrDateFromYmd(
            data.siteBackups[0].dateKey
          )}.`,
    autoFixable: false,
  });

  const passedCount = checks.filter((c) => c.severity === 'ok').length;
  const warningCount = checks.filter((c) => c.severity === 'warning').length;
  const criticalCount = checks.filter((c) => c.severity === 'critical').length;
  const autoFixableCount = checks.filter((c) => c.autoFixable).length;
  const status: CatalogHealthSeverity =
    criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'ok';

  return {
    status,
    passedCount,
    warningCount,
    criticalCount,
    autoFixableCount,
    checks,
  };
}

export function autoRepairCatalogIntegrity(data: {
  categories: Category[];
  products: Product[];
  kits: PromoKit[];
  coupons: PromoCoupon[];
  banners: PromoBanner[];
}): {
  products: Product[];
  kits: PromoKit[];
  coupons: PromoCoupon[];
  banners: PromoBanner[];
  fixesApplied: string[];
} {
  const fixesApplied: string[] = [];
  const categoryIds = new Set(data.categories.map((c) => c.id));
  const fallbackCategoryId = data.categories[0]?.id || 'cat-casa';

  // 1. Repair product categories, duplicate SKUs, and invalid promo prices
  const seenSkus = new Set<string>();
  let fixedCats = 0;
  let fixedSkus = 0;
  let fixedPromos = 0;

  const nextProducts = data.products.map((p, idx) => {
    let next = { ...p };

    if (!categoryIds.has(next.categoryId)) {
      next.categoryId = fallbackCategoryId;
      fixedCats += 1;
    }

    const baseSku = next.sku.trim().toUpperCase() || `QMP-${idx + 1}`;
    let candidateSku = baseSku;
    if (seenSkus.has(candidateSku)) {
      let n = 2;
      while (seenSkus.has(`${baseSku}-${n}`)) n += 1;
      candidateSku = `${baseSku}-${n}`;
      next.sku = candidateSku;
      fixedSkus += 1;
    }
    seenSkus.add(candidateSku);

    if (next.price < 0) {
      next.price = Math.abs(next.price);
      fixedPromos += 1;
    }
    if (
      next.promoPrice != null &&
      (next.promoPrice <= 0 || (next.price > 0 && next.promoPrice >= next.price))
    ) {
      next.promoPrice = null;
      fixedPromos += 1;
    }

    return next;
  });

  if (fixedCats > 0) {
    fixesApplied.push(`${fixedCats} produto(s) órfão(s) realocado(s) para categoria válida`);
  }
  if (fixedSkus > 0) {
    fixesApplied.push(`${fixedSkus} código(s) SKU duplicado(s) renomeado(s)`);
  }
  if (fixedPromos > 0) {
    fixesApplied.push(`${fixedPromos} preço(s) promocional(is) inconsistente(s) corrigido(s)`);
  }

  const validProductIds = new Set(nextProducts.map((p) => p.id));

  // 2. Clean deleted product references from kits and banners
  let cleanedKitItems = 0;
  const nextKits = data.kits.map((k) => {
    const cleanItems = k.items.filter((it) => validProductIds.has(it.productId));
    cleanedKitItems += k.items.length - cleanItems.length;
    return cleanItems.length === k.items.length ? k : { ...k, items: cleanItems };
  });
  if (cleanedKitItems > 0) {
    fixesApplied.push(`${cleanedKitItems} item(ns) inexistente(s) removido(s) de kits`);
  }

  let cleanedBannerRefs = 0;
  const nextBanners = data.banners.map((b) => {
    const cleanIds = b.featuredProductIds.filter((id) => validProductIds.has(id));
    cleanedBannerRefs += b.featuredProductIds.length - cleanIds.length;
    return cleanIds.length === b.featuredProductIds.length
      ? b
      : { ...b, featuredProductIds: cleanIds };
  });
  if (cleanedBannerRefs > 0) {
    fixesApplied.push(`${cleanedBannerRefs} vínculo(s) obsoleto(s) limpo(s) nos banners`);
  }

  // 3. Deduplicate coupons & clamp invalid percent values
  const seenCoupons = new Set<string>();
  let fixedCoupons = 0;
  const nextCoupons: PromoCoupon[] = [];
  for (const cp of data.coupons) {
    const code = cp.code.trim().toUpperCase();
    if (seenCoupons.has(code)) {
      fixedCoupons += 1;
      continue;
    }
    seenCoupons.add(code);
    let discountValue = cp.discountValue;
    if (discountValue <= 0) {
      discountValue = 5;
      fixedCoupons += 1;
    } else if (cp.discountType === 'percent' && discountValue > 100) {
      discountValue = 100;
      fixedCoupons += 1;
    }
    nextCoupons.push({
      ...cp,
      code,
      discountValue,
      minOrderValue: Math.max(0, cp.minOrderValue || 0),
    });
  }
  if (fixedCoupons > 0) {
    fixesApplied.push(`${fixedCoupons} ajuste(s) de integridade aplicado(s) nos cupons`);
  }

  return {
    products: nextProducts,
    kits: nextKits,
    coupons: nextCoupons,
    banners: nextBanners,
    fixesApplied,
  };
}

// --- PRODUCT TRASH BIN (SOFT DELETE, RESTORE & PERMANENT DELETE) ---

export function moveProductsToTrash(
  products: Product[],
  trash: DeletedProductEntry[],
  productIds: string[],
  deletedBy: string,
  deletedAt: string = new Date().toISOString()
): {
  nextProducts: Product[];
  nextTrash: DeletedProductEntry[];
  movedEntries: DeletedProductEntry[];
} {
  const idSet = new Set(productIds);
  if (idSet.size === 0) {
    return { nextProducts: products, nextTrash: trash, movedEntries: [] };
  }

  const movedEntries: DeletedProductEntry[] = [];
  const nextProducts: Product[] = [];

  products.forEach((product, idx) => {
    if (idSet.has(product.id)) {
      movedEntries.push({
        product,
        deletedAt,
        deletedBy: deletedBy.trim() || 'Administrador',
        originalIndex: idx,
      });
    } else {
      nextProducts.push(product);
    }
  });

  if (movedEntries.length === 0) {
    return { nextProducts: products, nextTrash: trash, movedEntries: [] };
  }

  const movedIdSet = new Set(movedEntries.map((e) => e.product.id));
  const filteredExistingTrash = trash.filter((e) => !movedIdSet.has(e.product.id));
  const nextTrash = [...movedEntries, ...filteredExistingTrash];

  return { nextProducts, nextTrash, movedEntries };
}

export function restoreProductFromTrash(
  products: Product[],
  trash: DeletedProductEntry[],
  productId: string,
  categories: Pick<Category, 'id'>[],
  kitSkus: string[] = []
): {
  nextProducts: Product[];
  nextTrash: DeletedProductEntry[];
  restoredProduct: Product | null;
  skuReassigned: boolean;
  categoryReassigned: boolean;
} {
  const targetEntry = trash.find((e) => e.product.id === productId);
  if (!targetEntry) {
    return {
      nextProducts: products,
      nextTrash: trash,
      restoredProduct: null,
      skuReassigned: false,
      categoryReassigned: false,
    };
  }

  const nextTrash = trash.filter((e) => e.product.id !== productId);
  let restoredProduct: Product = { ...targetEntry.product };
  let categoryReassigned = false;
  let skuReassigned = false;

  // Ensure restored product belongs to an existing category
  const validCatIds = new Set(categories.map((c) => c.id));
  if (categories.length > 0 && !validCatIds.has(restoredProduct.categoryId)) {
    restoredProduct = {
      ...restoredProduct,
      categoryId: categories[0].id,
    };
    categoryReassigned = true;
  }

  // Ensure restored product does not collide with an existing SKU
  const existingSkus = [
    ...products.map((p) => p.sku.trim().toUpperCase()),
    ...kitSkus.map((s) => s.trim().toUpperCase()),
  ].filter(Boolean);
  const existingSkuSet = new Set(existingSkus);
  const currentSkuNorm = restoredProduct.sku.trim().toUpperCase();
  if (!currentSkuNorm || existingSkuSet.has(currentSkuNorm)) {
    restoredProduct = {
      ...restoredProduct,
      sku: generateAutoSku({
        kind: 'product',
        existingSkus,
        preferredPrefix: currentSkuNorm || undefined,
        mode: 'sequential',
      }),
    };
    skuReassigned = true;
  }

  // Re-insert cleanly at original position (clamped to valid bounds)
  const insertAt = Math.min(
    Math.max(0, targetEntry.originalIndex),
    products.length
  );
  const nextProducts = [
    ...products.slice(0, insertAt),
    restoredProduct,
    ...products.slice(insertAt),
  ];

  return {
    nextProducts,
    nextTrash,
    restoredProduct,
    skuReassigned,
    categoryReassigned,
  };
}

export function permanentlyDeleteFromTrash(
  trash: DeletedProductEntry[],
  productId: string
): {
  nextTrash: DeletedProductEntry[];
  removedEntry: DeletedProductEntry | null;
} {
  const removedEntry = trash.find((e) => e.product.id === productId) || null;
  if (!removedEntry) {
    return { nextTrash: trash, removedEntry: null };
  }
  return {
    nextTrash: trash.filter((e) => e.product.id !== productId),
    removedEntry,
  };
}

export function emptyProductTrash(trash: DeletedProductEntry[]): {
  nextTrash: DeletedProductEntry[];
  removedCount: number;
} {
  return {
    nextTrash: [],
    removedCount: trash.length,
  };
}

// ============================================================================
// SCHEDULED AUTOMATIC DATABASE BACKUP ENGINE & UNEXPECTED-CLOSE INTEGRITY
// ============================================================================

export const WEEKDAY_SHORT_LABELS: { day: number; label: string; fullName: string }[] = [
  { day: 0, label: 'Dom', fullName: 'Domingo' },
  { day: 1, label: 'Seg', fullName: 'Segunda-feira' },
  { day: 2, label: 'Ter', fullName: 'Terça-feira' },
  { day: 3, label: 'Qua', fullName: 'Quarta-feira' },
  { day: 4, label: 'Qui', fullName: 'Quinta-feira' },
  { day: 5, label: 'Sex', fullName: 'Sexta-feira' },
  { day: 6, label: 'Sáb', fullName: 'Sábado' },
];

export const DEFAULT_BACKUP_REMINDER_CONFIG: BackupReminderConfig = {
  enabled: true,
  thresholdHours: 24,
  style: 'toast',
};

export const DEFAULT_BACKUP_SCHEDULE_CONFIG: BackupScheduleConfig = {
  enabled: false,
  times: ['09:00', '18:00'],
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  maxRetention: MAX_STORED_SITE_BACKUPS,
  autoBackupOnExit: true,
  runMissedOnReopen: true,
  reminder: DEFAULT_BACKUP_REMINDER_CONFIG,
};

export function normalizeScheduleTime(raw: string): string | null {
  const trimmed = (raw || '').trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hh = Number.parseInt(match[1], 10);
  const mm = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null;
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function sortAndDedupeScheduleTimes(
  times: string[],
  maxSlots: number = 8
): string[] {
  const unique = new Set<string>();
  for (const t of times) {
    const norm = normalizeScheduleTime(t);
    if (norm) unique.add(norm);
  }
  return Array.from(unique).sort().slice(0, maxSlots);
}

export function validateBackupScheduleConfig(
  config: BackupScheduleConfig
): CrudValidationResult {
  const cleanTimes = sortAndDedupeScheduleTimes(config.times || []);
  const cleanDays = Array.from(
    new Set(
      (config.daysOfWeek || []).filter(
        (d) => Number.isInteger(d) && d >= 0 && d <= 6
      )
    )
  ).sort((a, b) => a - b);

  if (config.enabled) {
    if (cleanTimes.length === 0) {
      return {
        valid: false,
        error: 'Adicione pelo menos 1 horário válido (HH:MM) para ativar o agendamento.',
      };
    }
    if (cleanDays.length === 0) {
      return {
        valid: false,
        error: 'Selecione pelo menos 1 dia da semana para executar os backups automáticos.',
      };
    }
  }
  if (
    !Number.isFinite(config.maxRetention) ||
    config.maxRetention < 5 ||
    config.maxRetention > 30
  ) {
    return {
      valid: false,
      error: 'A retenção máxima deve ficar entre 5 e 30 backups armazenados.',
    };
  }
  return { valid: true };
}

export interface DueScheduledBackupResult {
  isDue: boolean;
  slotTime?: string;
  slotKey?: string;
  isCatchUp?: boolean;
}

/**
 * Evaluates whether a scheduled automatic backup should execute right now.
 * Handles both exact scheduled-minute execution and missed-slot catch-up when the browser
 * was closed unexpectedly during a configured time slot.
 */
export function evaluateDueScheduledBackup(
  config: BackupScheduleConfig,
  nowMs: number = Date.now(),
  existingBackups: Pick<SiteBackupSnapshot, 'scheduleSlotKey'>[] = []
): DueScheduledBackupResult {
  if (!config.enabled) return { isDue: false };

  const now = new Date(nowMs);
  const weekday = now.getDay();
  if (!config.daysOfWeek.includes(weekday)) return { isDue: false };

  const sortedTimes = sortAndDedupeScheduleTimes(config.times);
  if (sortedTimes.length === 0) return { isDue: false };

  const dateKey = toDateKeyYmd(now, true);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find the latest scheduled slot today that is <= current time
  let latestDueSlot: { time: string; minutes: number } | null = null;
  for (const time of sortedTimes) {
    const [hh, mm] = time.split(':').map((n) => Number.parseInt(n, 10));
    const slotMinutes = hh * 60 + mm;
    if (slotMinutes <= currentMinutes) {
      latestDueSlot = { time, minutes: slotMinutes };
    }
  }

  if (!latestDueSlot) return { isDue: false };

  const slotKey = `${dateKey}@${latestDueSlot.time}`;
  const alreadyRecordedInConfig = config.lastExecutedSlotKey === slotKey;
  const alreadyStoredInVault = existingBackups.some(
    (b) => b.scheduleSlotKey === slotKey
  );
  if (alreadyRecordedInConfig || alreadyStoredInVault) {
    return { isDue: false };
  }

  const minutesLate = currentMinutes - latestDueSlot.minutes;
  // Exact window: within 0..2 minutes of the scheduled time
  if (minutesLate <= 2) {
    return {
      isDue: true,
      slotTime: latestDueSlot.time,
      slotKey,
      isCatchUp: false,
    };
  }

  // Missed slot while browser was closed: run catch-up immediately if enabled
  if (config.runMissedOnReopen) {
    return {
      isDue: true,
      slotTime: latestDueSlot.time,
      slotKey,
      isCatchUp: true,
    };
  }

  return { isDue: false };
}

export interface NextScheduledBackupInfo {
  nextDateKey: string;
  nextTime: string;
  minutesUntil: number;
  label: string;
}

export function getNextScheduledBackupInfo(
  config: BackupScheduleConfig,
  nowMs: number = Date.now()
): NextScheduledBackupInfo | null {
  if (!config.enabled) return null;
  const sortedTimes = sortAndDedupeScheduleTimes(config.times);
  if (sortedTimes.length === 0 || config.daysOfWeek.length === 0) return null;

  const now = new Date(nowMs);
  const todayKey = toDateKeyYmd(now, true);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowKey = toDateKeyYmd(tomorrow, true);

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidateDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayOffset,
      0,
      0,
      0,
      0
    );
    if (!config.daysOfWeek.includes(candidateDay.getDay())) continue;
    const candidateDateKey = toDateKeyYmd(candidateDay, true);

    for (const time of sortedTimes) {
      const [hh, mm] = time.split(':').map((n) => Number.parseInt(n, 10));
      const slotDate = new Date(
        candidateDay.getFullYear(),
        candidateDay.getMonth(),
        candidateDay.getDate(),
        hh,
        mm,
        0,
        0
      );
      const diffMs = slotDate.getTime() - nowMs;
      const slotKey = `${candidateDateKey}@${time}`;
      if (diffMs > 0 && config.lastExecutedSlotKey !== slotKey) {
        const minutesUntil = Math.max(1, Math.ceil(diffMs / 60000));
        let dayPrefix = `${
          WEEKDAY_SHORT_LABELS[candidateDay.getDay()]?.label || ''
        } (${formatBrDateFromYmd(candidateDateKey).slice(0, 5)})`;
        if (candidateDateKey === todayKey) dayPrefix = 'Hoje';
        else if (candidateDateKey === tomorrowKey) dayPrefix = 'Amanhã';

        const hoursPart = Math.floor(minutesUntil / 60);
        const minsPart = minutesUntil % 60;
        const countdown =
          hoursPart > 0
            ? minsPart > 0
              ? `em ${hoursPart}h ${minsPart}min`
              : `em ${hoursPart}h`
            : `em ${minsPart}min`;

        return {
          nextDateKey: candidateDateKey,
          nextTime: time,
          minutesUntil,
          label: `${dayPrefix} às ${time} (${countdown})`,
        };
      }
    }
  }

  return null;
}

export function formatHoursElapsedPtBr(hours: number): string {
  const safeHours = Math.max(0, Number.isFinite(hours) ? hours : 0);
  const wholeHours = Math.floor(safeHours);
  if (wholeHours < 1) {
    const mins = Math.max(1, Math.round(safeHours * 60));
    return `há ${mins} min`;
  }
  if (wholeHours < 24) {
    return wholeHours === 1 ? 'há 1 hora' : `há ${wholeHours} horas`;
  }
  const days = Math.floor(wholeHours / 24);
  const remHours = wholeHours % 24;
  const dayLabel = days === 1 ? '1 dia' : `${days} dias`;
  if (remHours === 0) {
    return `há ${dayLabel}`;
  }
  const hourLabel = remHours === 1 ? '1 hora' : `${remHours} horas`;
  return `há ${dayLabel} e ${hourLabel}`;
}

export function evaluateBackupReminderStatus(
  reminder: BackupReminderConfig | undefined,
  backups: Pick<SiteBackupSnapshot, 'createdAt'>[],
  nowMs: number = Date.now()
): BackupReminderEvaluation {
  const cfg: BackupReminderConfig = {
    ...DEFAULT_BACKUP_REMINDER_CONFIG,
    ...(reminder || {}),
  };
  const thresholdHours =
    Number.isFinite(cfg.thresholdHours) && cfg.thresholdHours >= 1 && cfg.thresholdHours <= 168
      ? Math.round(cfg.thresholdHours)
      : 24;
  const style = cfg.style === 'modal' ? 'modal' : 'toast';

  // Find latest valid backup timestamp
  let latestMs: number | null = null;
  let latestIso: string | null = null;
  for (const b of backups || []) {
    const t = new Date(b.createdAt).getTime();
    if (!Number.isNaN(t) && (latestMs === null || t > latestMs)) {
      latestMs = t;
      latestIso = b.createdAt;
    }
  }

  const hoursSinceLastBackup =
    latestMs !== null ? Math.max(0, (nowMs - latestMs) / 3_600_000) : null;
  const humanElapsedLabel =
    hoursSinceLastBackup !== null
      ? formatHoursElapsedPtBr(hoursSinceLastBackup)
      : 'Nenhum backup realizado ainda';

  if (!cfg.enabled) {
    return {
      shouldNotify: false,
      reason: 'disabled',
      style,
      thresholdHours,
      lastBackupAt: latestIso,
      hoursSinceLastBackup,
      humanElapsedLabel,
    };
  }

  if (cfg.snoozedUntil) {
    const snoozeMs = new Date(cfg.snoozedUntil).getTime();
    if (!Number.isNaN(snoozeMs) && snoozeMs > nowMs) {
      return {
        shouldNotify: false,
        reason: 'snoozed',
        style,
        thresholdHours,
        lastBackupAt: latestIso,
        hoursSinceLastBackup,
        humanElapsedLabel,
      };
    }
  }

  if (hoursSinceLastBackup === null) {
    return {
      shouldNotify: true,
      reason: 'never_backed_up',
      style,
      thresholdHours,
      lastBackupAt: null,
      hoursSinceLastBackup: null,
      humanElapsedLabel,
    };
  }

  if (hoursSinceLastBackup >= thresholdHours) {
    return {
      shouldNotify: true,
      reason: 'overdue',
      style,
      thresholdHours,
      lastBackupAt: latestIso,
      hoursSinceLastBackup,
      humanElapsedLabel,
    };
  }

  return {
    shouldNotify: false,
    reason: 'recent_backup',
    style,
    thresholdHours,
    lastBackupAt: latestIso,
    hoursSinceLastBackup,
    humanElapsedLabel,
  };
}






