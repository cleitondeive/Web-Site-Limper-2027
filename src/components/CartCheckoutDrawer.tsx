import React, { useState } from 'react';
import {
  Check,
  Copy,
  CreditCard,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  Sparkles,
  Store,
  TicketPercent,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  CartItem,
  CustomerProfile,
  DeliveryType,
  Order,
  PaymentMethod,
  Product,
  StoreSettings,
} from '../types/commerce';
import {
  buildPixPayload,
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  calculateCartTotals,
  formatCurrency,
  formatPhone,
  getEffectivePrice,
  isProductPriceVisible,
  normalizePhone,
  validateCheckoutInput,
} from '../utils/commerce';
import { ProductImageWithFallback } from './CategoryIcon';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  cart: CartItem[];
  catalogProducts?: Product[];
  settings: StoreSettings;
  customerProfile: CustomerProfile;
  existingOrders: Order[];
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
  onUpdateQuantity: (productId: string, newQty: number) => void;
  onClearCart: () => void;
  onSaveCustomerProfile: (profile: CustomerProfile) => void;
  onCompleteOrder: (newOrder: Order) => void;
}

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  isOpen,
  cart,
  catalogProducts = [],
  settings,
  customerProfile,
  existingOrders,
  onClose,
  onAddToCart,
  onUpdateQuantity,
  onClearCart,
  onSaveCustomerProfile,
  onCompleteOrder,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [customerName, setCustomerName] = useState(customerProfile.name || '');
  const [customerPhone, setCustomerPhone] = useState(customerProfile.phone || '');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [street, setStreet] = useState(customerProfile.street || '');
  const [number, setNumber] = useState(customerProfile.number || '');
  const [neighborhood, setNeighborhood] = useState(
    customerProfile.neighborhood || settings.neighborhoodFees[0]?.name || 'Centro'
  );
  const [city, setCity] = useState<'Cuiabá' | 'Várzea Grande'>(
    customerProfile.city || 'Várzea Grande'
  );
  const [reference, setReference] = useState(customerProfile.reference || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cardSubType, setCardSubType] = useState<'credit' | 'debit'>('credit');
  const [cashChangeFor, setCashChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  if (!isOpen) return null;

  const totals = calculateCartTotals(
    cart,
    deliveryType,
    neighborhood,
    settings,
    appliedCoupon
  );
  const pixPayload = buildPixPayload(
    settings.pixKey,
    settings.pixBeneficiary,
    totals.total,
    'LMPPEDIDO'
  );

  // Complementary Cross-Sell items not yet in cart
  const cartProductIds = new Set(cart.map((c) => c.product.id));
  const crossSellProducts = catalogProducts
    .filter((p) => p.status === 'active' && !cartProductIds.has(p.id))
    .slice(0, 3);

  const freeShippingProgressPct =
    settings.freeShippingThreshold > 0
      ? Math.min(100, Math.round((totals.subtotal / settings.freeShippingThreshold) * 100))
      : 100;

  const handlePhoneBlur = () => {
    const clean = normalizePhone(customerPhone);
    if (clean.length >= 10) {
      const lastOrderWithAddress = existingOrders.find(
        (o) => normalizePhone(o.customerPhone) === clean
      );
      if (lastOrderWithAddress) {
        if (!customerName.trim()) {
          setCustomerName(lastOrderWithAddress.customerName);
        }
        if (lastOrderWithAddress.address && !street.trim()) {
          setStreet(lastOrderWithAddress.address.street);
          setNumber(lastOrderWithAddress.address.number);
          setNeighborhood(lastOrderWithAddress.address.neighborhood);
          setCity(lastOrderWithAddress.address.city);
          setReference(lastOrderWithAddress.address.reference || '');
        }
      }
    }
  };

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixPayload);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    } catch {
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  const handleFinalizeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validationError = validateCheckoutInput({
      customerName,
      customerPhone,
      deliveryType,
      street,
      number,
      neighborhood,
      paymentMethod,
      cashChangeFor,
      total: totals.total,
    });

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    const nextOrderNumber = 1043 + existingOrders.length;
    const newOrder: Order = {
      id: `#LMP-${nextOrderNumber}`,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim(),
      customerPhone: normalizePhone(customerPhone),
      pickupCode:
        deliveryType === 'pickup'
          ? `EXPRESS-${nextOrderNumber}`
          : `ROTA-${nextOrderNumber}`,
      estimatedTime:
        deliveryType === 'pickup'
          ? 'Separação Expressa: pronto em ~15 min no Balcão Limper MT'
          : 'Entrega programada hoje com galões conferidos e lacrados',
      items: cart.map((item) => {
        const visible = isProductPriceVisible(item.product, settings);
        const unitPrice = visible ? getEffectivePrice(item.product) : 0;
        return {
          productId: item.product.id,
          sku: item.product.sku,
          title: item.product.title,
          volumeLabel: item.product.volumeLabel,
          unitPrice,
          quantity: item.quantity,
          subtotal: Math.round(unitPrice * item.quantity * 100) / 100,
          priceHidden: !visible,
        };
      }),
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      couponCode: totals.appliedCouponCode || undefined,
      discountAmount: totals.couponDiscount > 0 ? totals.couponDiscount : undefined,
      total: totals.total,
      deliveryType,
      address:
        deliveryType === 'delivery'
          ? {
              street: street.trim(),
              number: number.trim(),
              neighborhood: neighborhood.trim(),
              city,
              reference: reference.trim() || undefined,
            }
          : undefined,
      paymentMethod,
      cardSubType: paymentMethod === 'card' ? cardSubType : undefined,
      cashChangeFor:
        paymentMethod === 'cash' && cashChangeFor.trim()
          ? Number(cashChangeFor.replace(',', '.'))
          : null,
      status: 'pending_separation',
      notes: notes.trim() || undefined,
    };

    onSaveCustomerProfile({
      name: customerName.trim(),
      phone: normalizePhone(customerPhone),
      street: street.trim(),
      number: number.trim(),
      neighborhood: neighborhood.trim(),
      city,
      reference: reference.trim(),
    });

    onCompleteOrder(newOrder);
    setStep('cart');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-cart-title"
      className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-xs flex justify-end no-print"
    >
      <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl border-l border-zinc-200">
        {/* Drawer Header (Light & Todimo Yellow Accent) */}
        <div className="px-5 py-4 bg-white text-zinc-900 flex items-center justify-between border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFBE00] text-zinc-950 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h2 id="drawer-cart-title" className="font-display text-lg font-extrabold">
              {step === 'cart' ? `Seu Carrinho (${totals.itemCount})` : 'Finalizar Pedido'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar carrinho"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Animated Free Shipping Progress Bar */}
        {cart.length > 0 && (
          <div className="px-5 py-3 bg-[#FFFBEB] border-b border-[#FDE68A] space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-800">
              {totals.freeShippingRemaining > 0 ? (
                <span>
                  Faltam{' '}
                  <strong className="font-mono text-zinc-950 tabular-nums">
                    {formatCurrency(totals.freeShippingRemaining)}
                  </strong>{' '}
                  para <strong>Frete Delivery Grátis</strong> (ou retire grátis em 15min!)
                </span>
              ) : (
                <span className="font-bold text-emerald-800">
                  Parabéns! Você desbloqueou Frete Delivery Grátis em VG & Cuiabá!
                </span>
              )}
              <span className="font-mono text-[11px] text-[#B45309] font-extrabold shrink-0">
                {freeShippingProgressPct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-amber-200/70 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  freeShippingProgressPct >= 100 ? 'bg-emerald-600' : 'bg-[#FFBE00]'
                }`}
                style={{ width: `${freeShippingProgressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#D97706] mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-display text-lg font-extrabold text-zinc-900 mb-1">
                Seu carrinho está vazio
              </h3>
              <p className="text-sm text-zinc-500 max-w-xs mb-6">
                Adicione produtos das linhas Casa, Lavanderia, Limpeza Pesada ou Automotiva para montar seu pedido.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-sm rounded-xl cursor-pointer"
              >
                Explorar Catálogo
              </button>
            </div>
          ) : step === 'cart' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-100">
                <span>Itens selecionados para separação</span>
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-rose-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar carrinho</span>
                </button>
              </div>

              {cart.map(({ product, quantity }) => {
                const visible = isProductPriceVisible(product, settings);
                const unitPrice = getEffectivePrice(product);
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3.5 py-3 border-b border-zinc-100"
                  >
                    <div className="w-16 h-16 rounded-xl bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200">
                      <ProductImageWithFallback
                        src={product.imageUrl}
                        alt={product.title}
                        volumeLabel={product.volumeLabel}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-zinc-900 truncate">
                        {product.title}
                      </h4>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">
                        {product.volumeLabel} ·{' '}
                        {visible ? `${formatCurrency(unitPrice)} un.` : 'Valor sob consulta'}
                      </div>
                      <div className="text-sm font-mono font-extrabold text-zinc-900 mt-1 tabular-nums">
                        {visible ? formatCurrency(unitPrice * quantity) : 'Cotação no pedido'}
                      </div>
                    </div>

                    <div className="flex items-center bg-[#FAFAFA] border border-zinc-200 rounded-xl p-1 gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                        aria-label={`Diminuir ${product.title}`}
                        className="w-7 h-7 rounded-lg hover:bg-zinc-200 flex items-center justify-center text-zinc-900 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-xs font-extrabold px-1.5 tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                        aria-label={`Aumentar ${product.title}`}
                        className="w-7 h-7 rounded-lg bg-[#FFBE00] text-zinc-950 hover:bg-[#F59E0B] flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Interactive Coupon & Wholesale Voucher Box */}
              <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-zinc-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-900">
                    <TicketPercent className="w-4 h-4 text-[#E3262E]" />
                    <span>Cupom de Desconto Limper MT</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">Clique p/ aplicar em 1 toque</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Ex: LIMPER10 ou ATACADO5L"
                    className="flex-1 px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-mono uppercase focus:border-[#FFBE00] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAppliedCoupon(couponInput)}
                    className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold text-xs rounded-xl cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { code: 'LIMPER10', desc: '10% OFF' },
                    { code: 'BEMVINDO', desc: '5% OFF' },
                    { code: 'ATACADO5L', desc: '-R$ 15 (>R$ 120)' },
                  ].map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCouponInput(c.code);
                        setAppliedCoupon(c.code);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                        appliedCoupon === c.code
                          ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950'
                          : 'bg-white border-zinc-200 text-zinc-700 hover:border-[#FFBE00]'
                      }`}
                    >
                      {c.code} · {c.desc}
                    </button>
                  ))}
                </div>

                {appliedCoupon && totals.couponMessage && (
                  <div
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg ${
                      totals.couponDiscount > 0
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {totals.couponMessage}
                  </div>
                )}
              </div>

              {/* 1-Click Cross-Sell Strip ("Complete sua Limpeza / Leve Junto") */}
              {onAddToCart && crossSellProducts.length > 0 && (
                <div className="pt-2 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-900">
                    <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>Complete seu Pedido em 1 Clique (Leve Junto)</span>
                  </div>
                  <div className="space-y-2">
                    {crossSellProducts.map((item) => (
                      <div
                        key={`cross-${item.id}`}
                        className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#FFFBEB]/60 border border-[#FDE68A] hover:border-[#FFBE00]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-zinc-200 shrink-0">
                            <ProductImageWithFallback
                              src={item.imageUrl}
                              alt={item.title}
                              volumeLabel={item.volumeLabel}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-zinc-900 truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] font-mono font-bold text-[#B45309]">
                              {item.volumeLabel} · {formatCurrency(getEffectivePrice(item))}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onAddToCart(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-[11px] shrink-0 cursor-pointer"
                        >
                          + Levar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handleFinalizeOrder} className="space-y-4">
              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
                >
                  {errorMsg}
                </div>
              )}

              {/* 1. Identificação Ágil */}
              <div className="space-y-2">
                <h3 className="font-display text-sm font-extrabold text-zinc-900">
                  1. Identificação Rápida (Sem Senha)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="checkout-phone"
                      className="block text-xs font-semibold text-zinc-700 mb-1"
                    >
                      WhatsApp com DDD *
                    </label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                      onBlur={handlePhoneBlur}
                      placeholder="(65) 99999-9999"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm font-mono focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="checkout-name"
                      className="block text-xs font-semibold text-zinc-700 mb-1"
                    >
                      Nome Completo ou Empresa *
                    </label>
                    <input
                      id="checkout-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Opção de Entrega */}
              <div className="space-y-3 pt-2 border-t border-zinc-200">
                <h3 className="font-display text-sm font-extrabold text-zinc-900">
                  2. Modalidade de Entrega
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('delivery')}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      deliveryType === 'delivery'
                        ? 'bg-[#FFFBEB] text-zinc-950 border-[#FFBE00] shadow-2xs'
                        : 'bg-[#FAFAFA] text-zinc-700 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-extrabold text-xs mb-1">
                      <Truck className="w-4 h-4 text-[#D97706]" />
                      <span>Entrega Delivery</span>
                    </div>
                    <p className="text-[11px] text-zinc-600">
                      Receba em casa ou empresa
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('pickup')}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      deliveryType === 'pickup'
                        ? 'bg-[#FFFBEB] text-zinc-950 border-[#FFBE00] shadow-2xs'
                        : 'bg-[#FAFAFA] text-zinc-700 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-extrabold text-xs mb-1">
                      <Store className="w-4 h-4 text-[#D97706]" />
                      <span>Retirada no Balcão</span>
                    </div>
                    <p className="text-[11px] text-zinc-600">
                      Grátis · Loja Limper MT
                    </p>
                  </button>
                </div>

                {deliveryType === 'delivery' ? (
                  <div className="space-y-2.5 bg-[#FAFAFA] p-3.5 rounded-xl border border-zinc-200">
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="col-span-2">
                        <label
                          htmlFor="checkout-street"
                          className="block text-xs font-semibold text-zinc-700 mb-1"
                        >
                          Rua / Avenida *
                        </label>
                        <input
                          id="checkout-street"
                          type="text"
                          required
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="Rua das Palmeiras"
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="checkout-number"
                          className="block text-xs font-semibold text-zinc-700 mb-1"
                        >
                          Número *
                        </label>
                        <input
                          id="checkout-number"
                          type="text"
                          required
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                          placeholder="120"
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label
                          htmlFor="checkout-neighborhood"
                          className="block text-xs font-semibold text-zinc-700 mb-1"
                        >
                          Bairro / Região *
                        </label>
                        <select
                          id="checkout-neighborhood"
                          value={neighborhood}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNeighborhood(val);
                            const matched = settings.neighborhoodFees.find(
                              (n) => n.name === val
                            );
                            if (matched) setCity(matched.city);
                          }}
                          className="w-full px-2.5 py-2 bg-white border border-zinc-300 rounded-lg text-xs"
                        >
                          {settings.neighborhoodFees.map((nb) => (
                            <option key={nb.id} value={nb.name}>
                              {nb.name} ({nb.city}) - {formatCurrency(nb.fee)}
                            </option>
                          ))}
                          <option value="Outro Bairro">
                            Outro Bairro ({formatCurrency(settings.defaultDeliveryFee)})
                          </option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="checkout-city"
                          className="block text-xs font-semibold text-zinc-700 mb-1"
                        >
                          Cidade
                        </label>
                        <select
                          id="checkout-city"
                          value={city}
                          onChange={(e) =>
                            setCity(e.target.value as 'Cuiabá' | 'Várzea Grande')
                          }
                          className="w-full px-2.5 py-2 bg-white border border-zinc-300 rounded-lg text-xs"
                        >
                          <option value="Cuiabá">Cuiabá - MT</option>
                          <option value="Várzea Grande">Várzea Grande - MT</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="checkout-reference"
                        className="block text-xs font-semibold text-zinc-700 mb-1"
                      >
                        Ponto de Referência / Complemento
                      </label>
                      <input
                        id="checkout-reference"
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Ex: Próximo ao supermercado, portão branco"
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#FDF6E2] border border-[#F3E3B2] flex items-start gap-2.5 text-xs text-zinc-800">
                    <MapPin className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-zinc-950">
                        Retirada sem custo de frete na Loja Física:
                      </p>
                      <p className="text-zinc-700 mt-0.5">{settings.storeAddress}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Forma de Pagamento */}
              <div className="space-y-3 pt-2 border-t border-zinc-200">
                <h3 className="font-display text-sm font-extrabold text-zinc-900">
                  3. Forma de Pagamento
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-2.5 rounded-xl border text-center transition-colors cursor-pointer ${
                      paymentMethod === 'pix'
                        ? 'bg-[#FFFBEB] text-zinc-950 border-[#FFBE00] font-bold'
                        : 'bg-[#FAFAFA] text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <QrCode className="w-4 h-4 mx-auto mb-1 text-[#D97706]" />
                    <span className="block text-xs font-bold">Chave PIX</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-2.5 rounded-xl border text-center transition-colors cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-[#FFFBEB] text-zinc-950 border-[#FFBE00] font-bold'
                        : 'bg-[#FAFAFA] text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mx-auto mb-1 text-[#D97706]" />
                    <span className="block text-xs font-bold">Cartão</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-2.5 rounded-xl border text-center transition-colors cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'bg-[#FFFBEB] text-zinc-950 border-[#FFBE00] font-bold'
                        : 'bg-[#FAFAFA] text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <span className="block font-mono text-xs font-extrabold text-[#D97706] mb-1">
                      R$
                    </span>
                    <span className="block text-xs font-bold">Dinheiro</span>
                  </button>
                </div>

                {paymentMethod === 'pix' && (
                  <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-zinc-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        aria-label="QR Code PIX da Limper MT"
                        className="w-18 h-18 bg-white p-1.5 rounded-lg border border-zinc-300 shrink-0 flex items-center justify-center"
                      >
                        <svg viewBox="0 0 100 100" className="w-full h-full fill-zinc-900">
                          <rect x="5" y="5" width="28" height="28" />
                          <rect x="10" y="10" width="18" height="18" fill="white" />
                          <rect x="14" y="14" width="10" height="10" />
                          <rect x="67" y="5" width="28" height="28" />
                          <rect x="72" y="10" width="18" height="18" fill="white" />
                          <rect x="76" y="14" width="10" height="10" />
                          <rect x="5" y="67" width="28" height="28" />
                          <rect x="10" y="72" width="18" height="18" fill="white" />
                          <rect x="14" y="76" width="10" height="10" />
                          <rect x="40" y="12" width="8" height="8" />
                          <rect x="52" y="20" width="8" height="16" />
                          <rect x="40" y="40" width="20" height="20" />
                          <rect x="46" y="46" width="8" height="8" fill="#FFBE00" />
                          <rect x="12" y="42" width="16" height="8" />
                          <rect x="68" y="44" width="22" height="8" />
                          <rect x="42" y="68" width="12" height="22" />
                          <rect x="64" y="68" width="26" height="12" />
                          <rect x="74" y="84" width="16" height="10" />
                        </svg>
                      </div>

                      <div className="text-xs space-y-0.5 min-w-0 flex-1">
                        <div className="font-semibold text-zinc-700">
                          Chave PIX ({settings.pixKeyType}):
                        </div>
                        <div className="font-mono text-sm font-extrabold text-zinc-950 truncate">
                          {settings.pixKey}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {settings.pixBeneficiary}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="w-full py-2 px-3 bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#FFBE00] rounded-lg text-xs font-extrabold text-zinc-950 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {copiedPix ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-700" />
                          <span className="text-emerald-800">
                            Código PIX Copiado! Anexe o comprovante no WhatsApp
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-zinc-900" />
                          <span>Copiar Código PIX Copia e Cola</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-zinc-200 space-y-2">
                    <p className="text-xs text-zinc-600">
                      Levamos a maquininha móvel até você (ou pague no balcão da loja):
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCardSubType('credit')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                          cardSubType === 'credit'
                            ? 'bg-[#FFBE00] text-zinc-950 border-[#F59E0B]'
                            : 'bg-white text-zinc-700 border-zinc-300'
                        }`}
                      >
                        Cartão de Crédito
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardSubType('debit')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                          cardSubType === 'debit'
                            ? 'bg-[#FFBE00] text-zinc-950 border-[#F59E0B]'
                            : 'bg-white text-zinc-700 border-zinc-300'
                        }`}
                      >
                        Cartão de Débito
                      </button>
                    </div>
                  </div>
                )}

                {paymentMethod === 'cash' && (
                  <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-zinc-200 space-y-2">
                    <label
                      htmlFor="checkout-change"
                      className="block text-xs font-semibold text-zinc-900"
                    >
                      Precisa de troco para quanto? (Deixe em branco se não precisar)
                    </label>
                    <input
                      id="checkout-change"
                      type="number"
                      step="0.01"
                      value={cashChangeFor}
                      onChange={(e) => setCashChangeFor(e.target.value)}
                      placeholder={`Ex: 150.00 (Total: ${formatCurrency(totals.total)})`}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="checkout-notes"
                  className="block text-xs font-semibold text-zinc-700 mb-1"
                >
                  Observações para Separação (Opcional)
                </label>
                <input
                  id="checkout-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Entregar no período da tarde, ligar ao chegar"
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                />
              </div>
            </form>
          )}
        </div>

        {/* Drawer Footer Totals & Primary CTA */}
        {cart.length > 0 && (
          <div className="p-5 bg-[#FAFAFA] border-t border-zinc-200 space-y-3">
            <div className="space-y-1 text-xs text-zinc-600">
              <div className="flex justify-between">
                <span>Subtotal ({totals.itemCount} itens)</span>
                <span className="font-mono font-bold text-zinc-900 tabular-nums">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>
              {totals.savings > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Economia nas ofertas Quimiprol</span>
                  <span className="font-mono font-bold tabular-nums">
                    -{formatCurrency(totals.savings)}
                  </span>
                </div>
              )}
              {totals.couponDiscount > 0 && (
                <div className="flex justify-between text-[#E3262E] font-bold">
                  <span>Cupom ({totals.appliedCouponCode})</span>
                  <span className="font-mono tabular-nums">
                    -{formatCurrency(totals.couponDiscount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>
                  {deliveryType === 'pickup'
                    ? 'Retirada na Loja Limper MT'
                    : `Taxa de Entrega (${neighborhood})`}
                </span>
                <span className="font-mono font-bold text-zinc-900 tabular-nums">
                  {totals.deliveryFee === 0 ? 'Grátis' : formatCurrency(totals.deliveryFee)}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-200 flex justify-between items-baseline text-base font-extrabold text-zinc-900">
                <span>Total do Pedido</span>
                <span className="font-mono text-xl tabular-nums">
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>

            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3.5 px-4 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-sm rounded-xl transition-transform active:scale-98 cursor-pointer shadow-xs"
              >
                Avançar para Entrega e Pagamento
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="px-4 py-3.5 bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  className="flex-1 py-3.5 px-4 bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-5 h-5 fill-zinc-950" />
                  <span>Finalizar Pedido via WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface OrderConfirmationModalProps {
  order: Order | null;
  settings: StoreSettings;
  onClose: () => void;
  onViewOrders: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  settings,
  onClose,
  onViewOrders,
}) => {
  const [copiedMsg, setCopiedMsg] = useState(false);

  if (!order) return null;

  const formattedMessage = buildWhatsAppOrderMessage(order, settings.storeAddress);
  const whatsappUrl = buildWhatsAppOrderUrl(
    settings.whatsappNumber,
    order,
    settings.storeAddress
  );

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(formattedMessage);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 3000);
    } catch {
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 3000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-confirmed-title"
      className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-xs flex items-center justify-center p-4 no-print"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-zinc-200 shadow-2xl">
        <div className="p-6 bg-[#FFFBEB] border-b border-[#FDE68A] text-zinc-950 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono font-bold text-[#B45309] uppercase tracking-wider">
              PEDIDO REGISTRADO · AGUARDANDO SEPARAÇÃO
            </p>
            <h2 id="order-confirmed-title" className="font-display text-xl font-extrabold mt-1">
              Pedido {order.id} Salvo com Sucesso!
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar confirmação de pedido"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-amber-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
            Seu pedido já está na fila de separação da <strong>Limper MT</strong> e salvo no seu histórico. Clique abaixo para abrir o WhatsApp comercial com a mensagem pronta:
          </p>

          <div className="bg-[#FAFAFA] border border-zinc-200 rounded-xl p-3.5 max-h-56 overflow-y-auto">
            <pre className="text-xs font-mono text-zinc-900 whitespace-pre-wrap leading-relaxed">
              {formattedMessage}
            </pre>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3.5 px-4 bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 text-center shadow-xs"
            >
              <MessageCircle className="w-5 h-5 fill-zinc-950" />
              <span>Enviar Pedido no WhatsApp Agora</span>
            </a>

            <button
              type="button"
              onClick={handleCopyMessage}
              className="py-3.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedMsg ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>Mensagem Copiada</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Resumo</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={onViewOrders}
              className="font-bold text-zinc-900 hover:underline cursor-pointer"
            >
              Ver em Meus Pedidos / Histórico
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              Voltar para a Loja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
