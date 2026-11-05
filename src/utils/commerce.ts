import {
  CartItem,
  CatalogSortOption,
  DeliveryType,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
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
  if (matchLiters) {
    const liters = parseFloat(matchLiters[1].replace(',', '.'));
    if (liters > 1) {
      const perLiter = effective / liters;
      return `${formatCurrency(perLiter)}/L`;
    }
  }
  return null;
}

export interface CouponEvaluation {
  valid: boolean;
  code: string;
  discountAmount: number;
  label: string;
}

export function evaluateCoupon(rawCode: string, subtotal: number): CouponEvaluation {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code || subtotal <= 0) {
    return { valid: false, code: '', discountAmount: 0, label: '' };
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

  return {
    valid: false,
    code,
    discountAmount: 0,
    label: 'Cupom inválido. Experimente LIMPER10, BEMVINDO ou ATACADO5L.',
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

export function mergeOrderIntoCart(
  currentCart: CartItem[],
  order: Order,
  catalogProducts: Product[]
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
    }
  }

  return { updatedCart: updated, addedCount };
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
  couponCode?: string
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
} {
  let itemCount = 0;
  let subtotal = 0;
  let savings = 0;
  let hasHiddenPriceItems = Boolean(settings.hideAllPrices);

  for (const item of cart) {
    const visible = isProductPriceVisible(item.product, settings);
    if (!visible) {
      hasHiddenPriceItems = true;
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

  const couponEval = evaluateCoupon(couponCode || '', subtotal);
  const couponDiscount = couponEval.valid ? couponEval.discountAmount : 0;

  const deliveryFee = calculateDeliveryFee(subtotal, deliveryType, neighborhoodName, settings);
  const total = Math.max(0, Math.round((subtotal - couponDiscount + deliveryFee) * 100) / 100);
  const freeShippingRemaining =
    settings.freeShippingThreshold > 0
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
  if (order.paymentMethod === 'pix') {
    return 'PIX (Comprovante em anexo)';
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
  const lines: string[] = [
    '🧼 *NOVO PEDIDO - LIMPER MT* 🧼',
    `*Pedido:* ${order.id}`,
    `*Cliente:* ${order.customerName}`,
    `*Telefone:* ${formatPhone(order.customerPhone)}`,
    '',
    '📋 *ITENS PARA SEPARAÇÃO:*',
  ];

  for (const item of order.items) {
    const priceSuffix = item.priceHidden ? 'Valor sob consulta' : formatCurrency(item.subtotal);
    lines.push(
      `• ${item.quantity}x ${item.title} ${item.volumeLabel} - ${priceSuffix}`
    );
  }

  lines.push('');
  lines.push(`💰 *Subtotal:* ${formatCurrency(order.subtotal)}`);
  if (order.couponCode && order.discountAmount && order.discountAmount > 0) {
    lines.push(`🎟️ *Cupom (${order.couponCode}):* -${formatCurrency(order.discountAmount)}`);
  }
  if (order.deliveryType === 'delivery') {
    lines.push(
      `🚚 *Taxa de Entrega:* ${order.deliveryFee === 0 ? 'Grátis' : formatCurrency(order.deliveryFee)}`
    );
  }
  lines.push(`💵 *Total do Pedido:* ${formatCurrency(order.total)}`);
  lines.push(
    `📍 *Tipo:* ${order.deliveryType === 'delivery' ? 'Entrega Delivery' : 'Retirada Expressa no Balcão (Limper MT)'}`
  );

  if (order.deliveryType === 'delivery' && order.address) {
    const refPart = order.address.reference ? ` (${order.address.reference})` : '';
    lines.push(
      `🏠 *Endereço:* ${order.address.street}, ${order.address.number} - Bairro ${order.address.neighborhood}, ${order.address.city}/MT${refPart}`
    );
  } else if (storeAddress) {
    lines.push(`🏪 *Local de Retirada:* ${storeAddress}`);
  }

  lines.push(`💳 *Forma de Pagamento:* ${formatPaymentMethodLabel(order)}`);
  if (order.notes && order.notes.trim()) {
    lines.push(`📝 *Observações:* ${order.notes.trim()}`);
  }
  lines.push('');
  lines.push('⏱️ _Aguardando confirmação e separação da loja._');

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
