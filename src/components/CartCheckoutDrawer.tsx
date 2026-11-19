import React, { useEffect, useRef, useState } from 'react';
import {
  Bike,
  Building2,
  Check,
  Copy,
  CreditCard,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Printer,
  QrCode,
  Search,
  ShoppingBag,
  Store,
  TicketPercent,
  Trash2,
  Truck,
  User,
  X,
} from 'lucide-react';
import {
  CartItem,
  CustomerProfile,
  DeliveryCityOption,
  DeliveryType,
  LogisticsDeliveryMode,
  Order,
  PaymentMethod,
  PromoCoupon,
  StoreSettings,
} from '../types/commerce';
import {
  buildLogisticsWhatsAppConsultUrl,
  buildPixPayload,
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  calculateCartTotals,
  evaluateLogisticsEligibility,
  formatCurrency,
  formatLogisticsModeLabel,
  formatPaymentMethodLabel,
  formatPhone,
  getEffectivePrice,
  getLogisticsSettings,
  isOrderQuoteOnly,
  isProductPriceVisible,
  matchCustomerPhoneExact,
  normalizePhone,
  validateCheckoutInput,
} from '../utils/commerce';
import {
  DocumentKind,
  detectDocumentType,
  formatCep,
  formatDocumentByType,
  isValidDocument,
  lookupCepAddress,
  onlyDigits,
} from '../utils/brInputMasks';
import { ProductImageWithFallback } from './CategoryIcon';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  cart: CartItem[];
  coupons?: PromoCoupon[];
  initialCouponCode?: string;
  settings: StoreSettings;
  customerProfile: CustomerProfile;
  existingOrders: Order[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, newQty: number) => void;
  onClearCart: () => void;
  onSaveCustomerProfile: (profile: CustomerProfile) => void;
  onCompleteOrder: (newOrder: Order) => void;
}

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  isOpen,
  cart,
  coupons = [],
  initialCouponCode = '',
  settings,
  customerProfile,
  existingOrders,
  onClose,
  onUpdateQuantity,
  onClearCart,
  onSaveCustomerProfile,
  onCompleteOrder,
}) => {
  const initialDocType: DocumentKind =
    customerProfile.documentType || detectDocumentType(customerProfile.cpfCnpj);

  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [customerName, setCustomerName] = useState(customerProfile.name || '');
  const [customerPhone, setCustomerPhone] = useState(
    customerProfile.phone ? formatPhone(customerProfile.phone) : ''
  );
  const [documentType, setDocumentType] = useState<DocumentKind>(initialDocType);
  const [customerDocument, setCustomerDocument] = useState(
    customerProfile.cpfCnpj
      ? formatDocumentByType(customerProfile.cpfCnpj, initialDocType)
      : ''
  );
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [cep, setCep] = useState(formatCep(customerProfile.cep || ''));
  const [street, setStreet] = useState(customerProfile.street || '');
  const [number, setNumber] = useState(customerProfile.number || '');
  const [neighborhood, setNeighborhood] = useState(
    customerProfile.neighborhood || settings.neighborhoodFees[0]?.name || 'Centro'
  );
  const [city, setCity] = useState<DeliveryCityOption>(
    customerProfile.city || 'Várzea Grande'
  );
  const [interiorCityName, setInteriorCityName] = useState(
    customerProfile.interiorCityName || ''
  );
  const [logisticsVehicle, setLogisticsVehicle] = useState<'moto_limper' | 'truck'>(
    'moto_limper'
  );
  const [reference, setReference] = useState(customerProfile.reference || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('quote');
  const [cardSubType, setCardSubType] = useState<'credit' | 'debit'>('credit');
  const [cashChangeFor, setCashChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [couponInput, setCouponInput] = useState(initialCouponCode || '');
  const [appliedCoupon, setAppliedCoupon] = useState(initialCouponCode || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [cepStatus, setCepStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });
  const lastFetchedCepRef = useRef<string>('');
  const numberInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialCouponCode) {
      setCouponInput(initialCouponCode);
      setAppliedCoupon(initialCouponCode);
    }
  }, [initialCouponCode]);

  useEffect(() => {
    if (!isOpen) return;
    const nextDocType: DocumentKind =
      customerProfile.documentType || detectDocumentType(customerProfile.cpfCnpj);
    setCustomerName(customerProfile.name || '');
    setCustomerPhone(customerProfile.phone ? formatPhone(customerProfile.phone) : '');
    setDocumentType(nextDocType);
    setCustomerDocument(
      customerProfile.cpfCnpj
        ? formatDocumentByType(customerProfile.cpfCnpj, nextDocType)
        : ''
    );
    setCep(formatCep(customerProfile.cep || ''));
    setStreet(customerProfile.street || '');
    setNumber(customerProfile.number || '');
    setNeighborhood(
      customerProfile.neighborhood || settings.neighborhoodFees[0]?.name || 'Centro'
    );
    setCity(customerProfile.city || 'Várzea Grande');
    setInteriorCityName(customerProfile.interiorCityName || '');
    setReference(customerProfile.reference || '');
    setCepStatus({ type: 'idle' });
    lastFetchedCepRef.current = onlyDigits(customerProfile.cep || '');
  }, [isOpen, customerProfile, settings.neighborhoodFees]);

  const totals = calculateCartTotals(
    cart,
    deliveryType,
    neighborhood,
    settings,
    appliedCoupon,
    coupons
  );

  const logistics = getLogisticsSettings(settings);
  const effectiveLogisticsMode: LogisticsDeliveryMode =
    deliveryType === 'pickup'
      ? 'pickup'
      : city === 'Interior de MT'
      ? 'interior_mt'
      : logisticsVehicle;
  const logisticsEval = evaluateLogisticsEligibility({
    settings,
    subtotal: totals.subtotal,
    isQuoteOnly: totals.isQuoteOnly,
    deliveryType,
    city,
    vehicle: logisticsVehicle,
  });
  const interiorSupportWhatsAppUrl = buildLogisticsWhatsAppConsultUrl(
    settings.whatsappNumber,
    interiorCityName
  );

  React.useEffect(() => {
    if (totals.isQuoteOnly) {
      setPaymentMethod((prev) => (prev === 'pix' || prev === 'card' || prev === 'cash' ? prev : 'quote'));
    } else {
      setPaymentMethod((prev) => (prev === 'quote' ? 'pix' : prev));
    }
  }, [totals.isQuoteOnly]);

  if (!isOpen) return null;
  const pixPayload = buildPixPayload(
    settings.pixKey,
    settings.pixBeneficiary,
    totals.total,
    'LMPPEDIDO'
  );

  const freeShippingProgressPct =
    settings.freeShippingThreshold > 0
      ? Math.min(100, Math.round((totals.subtotal / settings.freeShippingThreshold) * 100))
      : 100;

  const handlePhoneBlur = () => {
    const clean = normalizePhone(customerPhone);
    if (
      customerProfile.isRegistered &&
      clean.length >= 10 &&
      matchCustomerPhoneExact(customerProfile.phone, clean)
    ) {
      const lastOrderWithAddress = existingOrders.find((o) =>
        matchCustomerPhoneExact(o.customerPhone, clean)
      );
      if (lastOrderWithAddress) {
        if (!customerName.trim()) {
          setCustomerName(lastOrderWithAddress.customerName);
        }
        if (lastOrderWithAddress.address && !street.trim()) {
          if (lastOrderWithAddress.address.cep) {
            setCep(formatCep(lastOrderWithAddress.address.cep));
          }
          setStreet(lastOrderWithAddress.address.street);
          setNumber(lastOrderWithAddress.address.number);
          setNeighborhood(lastOrderWithAddress.address.neighborhood);
          setCity(lastOrderWithAddress.address.city);
          setInteriorCityName(lastOrderWithAddress.address.interiorCityName || '');
          setReference(lastOrderWithAddress.address.reference || '');
        }
      }
    }
  };

  const runCheckoutCepLookup = async (rawCepValue: string, force = false) => {
    const digits = onlyDigits(rawCepValue);
    if (digits.length !== 8) {
      if (force) {
        setCepStatus({
          type: 'error',
          message: 'Digite os 8 dígitos do CEP para carregar seu endereço.',
        });
      }
      return;
    }
    if (!force && lastFetchedCepRef.current === digits) return;
    lastFetchedCepRef.current = digits;

    setCepStatus({ type: 'loading', message: 'Carregando endereço pelo CEP...' });
    const result = await lookupCepAddress(digits);
    if (result.found) {
      setCep(result.cep);
      if (result.street) setStreet(result.street);
      if (result.neighborhood) setNeighborhood(result.neighborhood);
      setCity(result.deliveryCityOption);
      setInteriorCityName(result.interiorCityName);
      setCepStatus({
        type: 'success',
        message: `Endereço carregado (${result.cep}): ${
          result.street ? `${result.street}, ` : ''
        }${result.neighborhood ? `${result.neighborhood} · ` : ''}${result.cityName}/${result.uf}`,
      });
      setTimeout(() => numberInputRef.current?.focus(), 60);
    } else {
      setCepStatus({
        type: 'error',
        message: 'CEP não encontrado automaticamente. Confira ou preencha abaixo.',
      });
    }
  };

  const handleCheckoutCepChange = (rawVal: string) => {
    const masked = formatCep(rawVal);
    setCep(masked);
    const digits = onlyDigits(masked);
    if (digits.length === 8) {
      void runCheckoutCepLookup(digits);
    } else {
      lastFetchedCepRef.current = '';
      if (cepStatus.type !== 'idle') setCepStatus({ type: 'idle' });
    }
  };

  const handleCheckoutDocTypeSwitch = (nextType: DocumentKind) => {
    setDocumentType(nextType);
    setCustomerDocument((prev) => formatDocumentByType(prev, nextType));
  };

  const checkoutDocDigits = onlyDigits(customerDocument);
  const expectedCheckoutDocLen = documentType === 'cnpj' ? 14 : 11;
  const isCheckoutDocComplete = checkoutDocDigits.length === expectedCheckoutDocLen;
  const isCheckoutDocValid =
    isCheckoutDocComplete && isValidDocument(customerDocument, documentType);

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
      customerDocument,
      customerDocumentType: documentType,
      deliveryType,
      cep,
      city,
      interiorCityName,
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
    const isInteriorMt = deliveryType === 'delivery' && city === 'Interior de MT';
    const orderDeliveryFee = isInteriorMt ? 0 : totals.deliveryFee;
    const orderTotal = isInteriorMt
      ? Math.max(0, Math.round((totals.subtotal - totals.couponDiscount) * 100) / 100)
      : totals.total;
    const formattedDocument =
      checkoutDocDigits.length > 0
        ? formatDocumentByType(customerDocument, documentType)
        : undefined;
    const formattedCep = onlyDigits(cep).length === 8 ? formatCep(cep) : undefined;

    const newOrder: Order = {
      id: `#LMP-${nextOrderNumber}`,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim(),
      customerPhone: normalizePhone(customerPhone),
      customerDocument: formattedDocument,
      customerDocumentType: formattedDocument ? documentType : undefined,
      pickupCode:
        deliveryType === 'pickup'
          ? `BALCÃO-${nextOrderNumber}`
          : `PIN-${nextOrderNumber}`,
      estimatedTime:
        deliveryType === 'pickup'
          ? 'Separação Expressa: pronto em ~15 min no Balcão Limper MT (Av. Couto Magalhães, 2820)'
          : isInteriorMt
          ? `Consulta de rota/frete via WhatsApp para ${interiorCityName.trim() || 'Mato Grosso'}`
          : logisticsVehicle === 'moto_limper'
          ? 'Entrega via Moto Limper (pequenos itens) com conferência expressa'
          : 'Entrega via Caminhão Limper com galões conferidos e lacrados',
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
          kitItems: item.product.kitItems?.length
            ? item.product.kitItems
            : undefined,
        };
      }),
      subtotal: totals.subtotal,
      deliveryFee: orderDeliveryFee,
      couponCode: totals.appliedCouponCode || undefined,
      discountAmount: totals.couponDiscount > 0 ? totals.couponDiscount : undefined,
      total: orderTotal,
      deliveryType,
      logisticsMode: effectiveLogisticsMode,
      address:
        deliveryType === 'delivery'
          ? {
              cep: formattedCep,
              street: street.trim(),
              number: number.trim(),
              neighborhood: neighborhood.trim(),
              city,
              interiorCityName: isInteriorMt ? interiorCityName.trim() : undefined,
              reference: reference.trim() || undefined,
            }
          : undefined,
      paymentMethod: totals.isQuoteOnly && paymentMethod === 'cash' ? 'quote' : paymentMethod,
      cardSubType: paymentMethod === 'card' ? cardSubType : undefined,
      cashChangeFor:
        !totals.isQuoteOnly && paymentMethod === 'cash' && cashChangeFor.trim()
          ? Number(cashChangeFor.replace(',', '.'))
          : null,
      status: 'pending_separation',
      notes: notes.trim() || undefined,
      isQuoteOnly: totals.isQuoteOnly,
    };

    onSaveCustomerProfile({
      ...customerProfile,
      name: customerName.trim(),
      phone: normalizePhone(customerPhone),
      documentType,
      cpfCnpj: formattedDocument || customerProfile.cpfCnpj,
      cep: formattedCep || customerProfile.cep,
      street: street.trim(),
      number: number.trim(),
      neighborhood: neighborhood.trim(),
      city,
      interiorCityName: isInteriorMt ? interiorCityName.trim() : undefined,
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
              {totals.isQuoteOnly
                ? step === 'cart'
                  ? `Minha Lista Sem Valor (${totals.itemCount})`
                  : 'Enviar Lista Personalizada'
                : step === 'cart'
                ? `Seu Carrinho (${totals.itemCount})`
                : 'Finalizar Pedido'}
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

        {/* Visual Animated Free Shipping Progress Bar OR Quote Mode Banner */}
        {cart.length > 0 &&
          (totals.isQuoteOnly ? (
            <div className="px-5 py-3 bg-[#FFFBEB] border-b border-[#FDE68A] text-xs text-zinc-800 flex items-center justify-between gap-2">
              <span>
                <strong>Lista de Orçamento Sem Valor:</strong> preencha seu nome e WhatsApp na próxima etapa para gerar o{' '}
                <strong>Nº do Pedido</strong> e enviar sua lista personalizada.
              </span>
              <span className="px-2 py-0.5 rounded bg-[#E3262E] text-white font-mono text-[10px] font-extrabold shrink-0">
                WHATSAPP
              </span>
            </div>
          ) : (
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
              {totals.hasHiddenPriceItems && (
                <p className="text-[11px] font-semibold text-[#B45309]">
                  Pedido misto: os itens com valor já somam abaixo e os itens &ldquo;Sem valor&rdquo; serão cotados no WhatsApp.
                </p>
              )}
            </div>
          ))}

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
                const isKitCombo =
                  product.unit === 'Kit' || product.id.startsWith('kit-');
                const hasPromoDiscount =
                  visible &&
                  typeof product.promoPrice === 'number' &&
                  product.promoPrice < product.price;
                const itemSavings = hasPromoDiscount
                  ? Math.round((product.price - unitPrice) * quantity * 100) / 100
                  : 0;

                return (
                  <div
                    key={product.id}
                    className={`flex items-start gap-3.5 p-3 rounded-2xl border transition-colors ${
                      isKitCombo
                        ? 'bg-[#FFFBEB]/70 border-[#FDE68A]'
                        : 'bg-white border-zinc-200/80'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-xl bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200">
                      <ProductImageWithFallback
                        src={product.imageUrl}
                        alt={product.title}
                        volumeLabel={product.volumeLabel}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        {isKitCombo && (
                          <span className="px-2 py-0.5 rounded bg-[#E3262E] text-white font-mono text-[9px] font-extrabold uppercase">
                            COMBO PROMOCIONAL FECHADO
                          </span>
                        )}
                        <span className="text-[10px] font-mono font-bold text-zinc-500">
                          {product.volumeLabel}
                        </span>
                      </div>

                      <h4 className="text-sm font-extrabold text-zinc-900 leading-snug">
                        {product.title}
                      </h4>

                      {isKitCombo && product.kitItems && product.kitItems.length > 0 ? (
                        <div className="mt-1.5 p-2 rounded-xl bg-white/90 border border-[#FDE68A] space-y-1">
                          <span className="block text-[9px] font-mono font-extrabold uppercase tracking-wider text-[#B45309]">
                            Itens inclusos neste kit ({product.kitItems.length}):
                          </span>
                          {product.kitItems.map((sub, subIdx) => (
                            <div
                              key={`${product.id}-sub-${sub.productId}-${subIdx}`}
                              className="flex items-center justify-between gap-2 text-[11px] text-zinc-800"
                            >
                              <span className="truncate">
                                <strong className="font-mono text-[#E3262E]">
                                  {sub.quantity * quantity}x
                                </strong>{' '}
                                {sub.title}
                              </span>
                              <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                                {sub.volumeLabel}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        isKitCombo &&
                        product.dilutionHint && (
                          <p className="text-[11px] text-zinc-600 leading-snug mt-0.5">
                            {product.dilutionHint}
                          </p>
                        )
                      )}

                      <div className="flex flex-wrap items-baseline gap-2 mt-1.5">
                        {hasPromoDiscount && (
                          <span className="text-[11px] text-zinc-400 line-through font-mono tabular-nums">
                            De {formatCurrency(product.price * quantity)}
                          </span>
                        )}
                        <span className="text-sm font-mono font-extrabold text-zinc-950 tabular-nums">
                          {visible ? formatCurrency(unitPrice * quantity) : 'Sem valor · Sob consulta'}
                        </span>
                        {itemSavings > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-extrabold tabular-nums">
                            Economia -{formatCurrency(itemSavings)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center bg-[#FAFAFA] border border-zinc-200 rounded-xl p-1 gap-1.5 shrink-0 self-center">
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

              {/* Interactive Coupon & Wholesale Voucher Box (Only when priced items exist) */}
              {!totals.isQuoteOnly && (
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
                    {(coupons.filter((c) => c.active).length > 0
                      ? coupons
                          .filter((c) => c.active)
                          .map((c) => ({
                            code: c.code.toUpperCase(),
                            desc:
                              c.discountType === 'percent'
                                ? `${c.discountValue}% OFF`
                                : `-${formatCurrency(c.discountValue)}${
                                    c.minOrderValue && c.minOrderValue > 0
                                      ? ` (>R$ ${c.minOrderValue})`
                                      : ''
                                  }`,
                          }))
                      : [
                          { code: 'LIMPER10', desc: '10% OFF' },
                          { code: 'BEMVINDO', desc: '5% OFF' },
                          { code: 'ATACADO5L', desc: '-R$ 15 (>R$ 120)' },
                        ]
                    ).map((c) => (
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
              )}
              {/* Limper MT Logistics Overview Card inside Cart */}
              <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-extrabold text-zinc-950">
                    <Truck className="w-4 h-4 text-[#E3262E] shrink-0" />
                    <span>Logística de Entrega Limper MT</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-[#B45309]">
                    VG · Cuiabá · MT
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 font-extrabold text-zinc-900 text-[11px]">
                      <Bike className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
                      <span>Moto Limper (Itens Pequenos)</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                      Para itens que cabem na moto:
                    </p>
                    <div className="text-[10px] font-mono font-bold text-zinc-800 space-y-0.5 pt-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="whitespace-nowrap">Várzea Grande:</span>
                        <span className="text-[#E3262E] whitespace-nowrap">Acima de {formatCurrency(logistics.motoVgMin)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="whitespace-nowrap">Cuiabá-MT:</span>
                        <span className="text-[#E3262E] whitespace-nowrap">Acima de {formatCurrency(logistics.motoCbaMin)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 font-extrabold text-zinc-900 text-[11px]">
                      <Truck className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                      <span>Entrega de Caminhão</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                      Galões 5L, caixas e cargas maiores:
                    </p>
                    <div className="text-[10px] font-mono font-bold text-zinc-800 space-y-0.5 pt-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="whitespace-nowrap">Várzea Grande:</span>
                        <span className="text-zinc-950 whitespace-nowrap">Acima de {formatCurrency(logistics.truckVgMin)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="whitespace-nowrap">Cuiabá-MT:</span>
                        <span className="text-zinc-950 whitespace-nowrap">Acima de {formatCurrency(logistics.truckCbaMin)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Free Balcão Pickup Card in Cart Step 1 */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                    deliveryType === 'pickup'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                      : 'bg-white border-emerald-200 text-zinc-900'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Store className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-[11px] text-emerald-950 flex flex-wrap items-center gap-1.5">
                        <span>Retirada no Balcão Grátis</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white font-mono text-[9px]">
                          15 MIN · SEM MÍNIMO
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-600 leading-snug mt-0.5">
                        Retire grátis sem fila na Av. Couto Magalhães, 2820 - Centro Norte, VG.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDeliveryType((prev) => (prev === 'pickup' ? 'delivery' : 'pickup'))
                    }
                    className={`px-2.5 py-1.5 rounded-lg font-extrabold text-[10px] shrink-0 cursor-pointer transition-colors ${
                      deliveryType === 'pickup'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {deliveryType === 'pickup' ? 'Selecionado ✓' : 'Retirar Grátis'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-amber-200/70 text-[11px]">
                  <span className="text-zinc-700 leading-snug">
                    <strong>Restante de MT:</strong> consulta de frete via suporte WhatsApp.
                  </span>
                  <a
                    href={interiorSupportWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-extrabold text-[10px] shrink-0"
                  >
                    Consultar MT
                  </a>
                </div>
              </div>
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
              <div className="space-y-2.5">
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
                      inputMode="numeric"
                      maxLength={15}
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                      onBlur={handlePhoneBlur}
                      placeholder="(65) 99999-9999"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm font-mono tabular-nums focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="checkout-name"
                      className="block text-xs font-semibold text-zinc-700 mb-1"
                    >
                      {documentType === 'cnpj'
                        ? 'Razão Social / Empresa *'
                        : 'Nome Completo ou Empresa *'}
                    </label>
                    <input
                      id="checkout-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={
                        documentType === 'cnpj'
                          ? 'Ex: Condomínio Solar / Empresa'
                          : 'Ex: João Silva'
                      }
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                    />
                  </div>
                </div>

                {/* CPF ou CNPJ com Máscara */}
                <div className="p-2.5 rounded-xl bg-[#FAFAFA] border border-zinc-200 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="checkout-document"
                      className="text-xs font-semibold text-zinc-700"
                    >
                      {documentType === 'cnpj'
                        ? 'CNPJ para Nota / Pedido (Opcional)'
                        : 'CPF para Nota / Pedido (Opcional)'}
                    </label>
                    <div
                      role="group"
                      aria-label="Tipo de documento no pedido"
                      className="inline-flex rounded-lg bg-white p-0.5 border border-zinc-200"
                    >
                      <button
                        type="button"
                        onClick={() => handleCheckoutDocTypeSwitch('cpf')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                          documentType === 'cpf'
                            ? 'bg-zinc-950 text-[#FFBE00]'
                            : 'text-zinc-600 hover:text-zinc-950'
                        }`}
                      >
                        <User className="w-2.5 h-2.5" />
                        <span>CPF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCheckoutDocTypeSwitch('cnpj')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                          documentType === 'cnpj'
                            ? 'bg-zinc-950 text-[#FFBE00]'
                            : 'text-zinc-600 hover:text-zinc-950'
                        }`}
                      >
                        <Building2 className="w-2.5 h-2.5" />
                        <span>CNPJ</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      id="checkout-document"
                      type="text"
                      inputMode="numeric"
                      maxLength={documentType === 'cnpj' ? 18 : 14}
                      value={customerDocument}
                      onChange={(e) =>
                        setCustomerDocument(
                          formatDocumentByType(e.target.value, documentType)
                        )
                      }
                      placeholder={
                        documentType === 'cnpj'
                          ? '00.000.000/0000-00'
                          : '000.000.000-00'
                      }
                      className={`flex-1 px-3 py-2 bg-white border rounded-lg text-xs font-mono tabular-nums focus:outline-none ${
                        isCheckoutDocComplete
                          ? isCheckoutDocValid
                            ? 'border-emerald-500'
                            : 'border-rose-400'
                          : 'border-zinc-300 focus:border-[#FFBE00]'
                      }`}
                    />
                    {checkoutDocDigits.length > 0 && (
                      <span
                        className={`text-[10px] font-bold shrink-0 ${
                          isCheckoutDocComplete
                            ? isCheckoutDocValid
                              ? 'text-emerald-700'
                              : 'text-rose-600'
                            : 'text-zinc-500'
                        }`}
                      >
                        {isCheckoutDocComplete
                          ? isCheckoutDocValid
                            ? `${documentType.toUpperCase()} válido`
                            : `${documentType.toUpperCase()} inválido`
                          : `${checkoutDocDigits.length}/${expectedCheckoutDocLen} dígitos`}
                      </span>
                    )}
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
                  <div className="space-y-3 bg-[#FAFAFA] p-3.5 rounded-xl border border-zinc-200">
                    {/* 1º CEP FIRST -> Carrega Rua, Bairro e Cidade automaticamente */}
                    <div className="p-3 rounded-xl bg-white border border-amber-300/90 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="checkout-cep"
                          className="text-xs font-extrabold text-zinc-900 flex items-center gap-1.5"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#E3262E]" />
                          <span>1º Informe seu CEP (Carrega o endereço automático)</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          id="checkout-cep"
                          type="text"
                          inputMode="numeric"
                          maxLength={9}
                          value={cep}
                          onChange={(e) => handleCheckoutCepChange(e.target.value)}
                          placeholder="00000-000"
                          className="flex-1 px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-lg text-sm font-mono font-bold tabular-nums focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void runCheckoutCepLookup(cep, true)}
                          disabled={cepStatus.type === 'loading'}
                          className="px-3.5 py-2 bg-[#FFBE00] hover:bg-[#F59E0B] disabled:opacity-70 text-zinc-950 font-extrabold text-xs rounded-lg inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {cepStatus.type === 'loading' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {cepStatus.type === 'loading' ? 'Buscando...' : 'Buscar CEP'}
                          </span>
                        </button>
                      </div>
                      {cepStatus.type !== 'idle' && cepStatus.message && (
                        <p
                          role="status"
                          className={`text-[11px] font-semibold leading-snug ${
                            cepStatus.type === 'success'
                              ? 'text-emerald-700'
                              : cepStatus.type === 'error'
                              ? 'text-rose-600'
                              : 'text-zinc-600'
                          }`}
                        >
                          {cepStatus.message}
                        </p>
                      )}
                    </div>

                    {/* Endereço (Carregado pelo CEP + editável) */}
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
                          ref={numberInputRef}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label
                          htmlFor="checkout-neighborhood"
                          className="block text-xs font-semibold text-zinc-700 mb-1"
                        >
                          Bairro / Região *
                        </label>
                        <input
                          id="checkout-neighborhood"
                          type="text"
                          list="checkout-neighborhood-list"
                          required
                          value={neighborhood}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNeighborhood(val);
                            const matched = settings.neighborhoodFees.find(
                              (n) => n.name.toLowerCase() === val.trim().toLowerCase()
                            );
                            if (matched) setCity(matched.city);
                          }}
                          placeholder="Ex: Centro Norte, Coxipó..."
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs"
                        />
                        <datalist id="checkout-neighborhood-list">
                          {settings.neighborhoodFees.map((nb) => (
                            <option key={nb.id} value={nb.name}>
                              {nb.name} ({nb.city})
                            </option>
                          ))}
                        </datalist>
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
                          placeholder="Ex: Próximo ao supermercado"
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    {/* City Region & Logistics Mode Selector */}
                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-bold text-zinc-800">
                        Cidade / Região de Entrega *
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: 'Várzea Grande' as DeliveryCityOption, label: 'Várzea Grande' },
                            { id: 'Cuiabá' as DeliveryCityOption, label: 'Cuiabá - MT' },
                            { id: 'Interior de MT' as DeliveryCityOption, label: 'Outras Cidades MT' },
                          ]
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setCity(opt.id);
                              if (
                                opt.id === 'Várzea Grande' &&
                                !settings.neighborhoodFees.some(
                                  (n) => n.city === 'Várzea Grande' && n.name === neighborhood
                                ) &&
                                !neighborhood.trim()
                              ) {
                                setNeighborhood('Centro Norte');
                              } else if (
                                opt.id === 'Cuiabá' &&
                                !settings.neighborhoodFees.some(
                                  (n) => n.city === 'Cuiabá' && n.name === neighborhood
                                ) &&
                                !neighborhood.trim()
                              ) {
                                setNeighborhood('Centro');
                              }
                            }}
                            className={`py-2 px-2 rounded-lg border text-[11px] font-extrabold text-center transition-colors cursor-pointer ${
                              city === opt.id
                                ? 'bg-[#FFBE00] border-[#F59E0B] text-zinc-950'
                                : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {city === 'Interior de MT' ? (
                      <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2 text-xs">
                        <div className="font-extrabold text-zinc-950 flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4 text-[#1DA851]" />
                          <span>Restante de Mato Grosso · Consulta via Suporte WhatsApp</span>
                        </div>
                        <p className="text-[11px] text-zinc-700 leading-relaxed">
                          {logistics.interiorMtNote}
                        </p>
                        <div>
                          <label
                            htmlFor="checkout-interior-city"
                            className="block text-xs font-semibold text-zinc-800 mb-1"
                          >
                            Sua Cidade em Mato Grosso *
                          </label>
                          <input
                            id="checkout-interior-city"
                            type="text"
                            required
                            value={interiorCityName}
                            onChange={(e) => setInteriorCityName(e.target.value)}
                            placeholder="Ex: Sinop, Sorriso, Rondonópolis, Tangará da Serra"
                            className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs"
                          />
                        </div>
                        <a
                          href={interiorSupportWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-extrabold text-[11px]"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-zinc-950" />
                          <span>Consultar Frete no WhatsApp com Suporte</span>
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="block text-xs font-bold text-zinc-800">
                          Escolha o Transporte ({city} - MT):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setLogisticsVehicle('moto_limper')}
                            className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                              logisticsVehicle === 'moto_limper'
                                ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950 shadow-2xs'
                                : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 font-extrabold text-xs">
                              <span className="inline-flex items-center gap-1.5">
                                <Bike className="w-3.5 h-3.5 text-[#E3262E]" />
                                Moto Limper
                              </span>
                              <span className="font-mono text-[10.5px] text-[#E3262E] whitespace-nowrap">
                                Acima {formatCurrency(
                                  city === 'Várzea Grande'
                                    ? logistics.motoVgMin
                                    : logistics.motoCbaMin
                                )}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                              Pequenos itens que cabem na moto
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setLogisticsVehicle('truck')}
                            className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                              logisticsVehicle === 'truck'
                                ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950 shadow-2xs'
                                : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 font-extrabold text-xs">
                              <span className="inline-flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-[#D97706]" />
                                Caminhão Limper
                              </span>
                              <span className="font-mono text-[10.5px] text-zinc-900 whitespace-nowrap">
                                Acima {formatCurrency(
                                  city === 'Várzea Grande'
                                    ? logistics.truckVgMin
                                    : logistics.truckCbaMin
                                )}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                              Galões 5L, fardos e volumes maiores
                            </p>
                          </button>
                        </div>

                        <div
                          className={`p-2.5 rounded-xl border text-[11px] leading-snug ${
                            logisticsEval.meetsMinimum
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}
                        >
                          <strong className="block">{logisticsEval.headline}</strong>
                          <span>{logisticsEval.detail}</span>
                        </div>
                      </div>
                    )}
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
                  {totals.isQuoteOnly
                    ? '3. Pagamento (A combinar ou preferência)'
                    : '3. Forma de Pagamento'}
                </h3>

                {totals.isQuoteOnly ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('quote')}
                        className={`p-2.5 rounded-xl border text-center transition-colors cursor-pointer ${
                          paymentMethod === 'quote'
                            ? 'bg-[#FFFBEB] text-zinc-950 border-[#FFBE00] font-bold'
                            : 'bg-[#FAFAFA] text-zinc-700 border-zinc-200'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4 mx-auto mb-1 text-[#1DA851]" />
                        <span className="block text-[11px] font-bold">A Combinar</span>
                      </button>

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
                        <span className="block text-[11px] font-bold">Pref. PIX</span>
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
                        <span className="block text-[11px] font-bold">Pref. Cartão</span>
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
                        <span className="block text-[11px] font-bold">Dinheiro</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-600 bg-[#FAFAFA] border border-zinc-200 rounded-xl p-2.5">
                      Como esta lista está no <strong>Modo Sem Valor</strong>, nossa equipe enviará o orçamento completo no seu WhatsApp com o número do seu pedido para você aprovar antes do pagamento.
                    </p>
                  </div>
                ) : (
                  <>
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
                  </>
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
            {totals.isQuoteOnly ? (
              <div className="space-y-1 text-xs text-zinc-600">
                <div className="flex justify-between">
                  <span>Itens Selecionados</span>
                  <span className="font-mono font-bold text-zinc-900 tabular-nums">
                    {totals.itemCount} unidade(s)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Modalidade</span>
                  <span className="font-bold text-zinc-900">
                    {deliveryType === 'pickup'
                      ? 'Retirada no Balcão (Grátis · 15min)'
                      : city === 'Interior de MT'
                      ? `Restante de MT (${interiorCityName.trim() || 'Consultar WhatsApp'})`
                      : `${logisticsVehicle === 'moto_limper' ? 'Moto Limper' : 'Caminhão'} (${city})`}
                  </span>
                </div>
                <div className="pt-2 border-t border-zinc-200 flex justify-between items-baseline text-sm font-extrabold text-zinc-900">
                  <span>Valor Total</span>
                  <span className="font-mono text-sm text-[#E3262E]">
                    Sem valor · Orçamento no WhatsApp
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-xs text-zinc-600">
                <div className="flex justify-between">
                  <span>
                    {totals.hasHiddenPriceItems
                      ? 'Subtotal (itens com valor)'
                      : `Subtotal (${totals.itemCount} itens)`}
                  </span>
                  <span className="font-mono font-bold text-zinc-900 tabular-nums">
                    {formatCurrency(totals.subtotal)}
                  </span>
                </div>
                {totals.hasHiddenPriceItems && (
                  <div className="flex justify-between text-[#B45309] font-semibold">
                    <span>Itens sem valor na lista</span>
                    <span className="font-mono font-bold">Sob consulta no WhatsApp</span>
                  </div>
                )}
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
                      : city === 'Interior de MT'
                      ? `Entrega Interior MT (${interiorCityName.trim() || 'Suporte WhatsApp'})`
                      : `${logisticsVehicle === 'moto_limper' ? 'Moto Limper' : 'Caminhão'} (${neighborhood})`}
                  </span>
                  <span className="font-mono font-bold text-zinc-900 tabular-nums">
                    {city === 'Interior de MT' && deliveryType === 'delivery'
                      ? 'Consultar WhatsApp'
                      : totals.deliveryFee === 0
                      ? 'Grátis'
                      : formatCurrency(totals.deliveryFee)}
                  </span>
                </div>
                <div className="pt-2 border-t border-zinc-200 flex justify-between items-baseline text-base font-extrabold text-zinc-900">
                  <span>
                    {totals.hasHiddenPriceItems ? 'Total dos Itens c/ Valor' : 'Total do Pedido'}
                  </span>
                  <span className="font-mono text-xl tabular-nums">
                    {formatCurrency(
                      deliveryType === 'delivery' && city === 'Interior de MT'
                        ? Math.max(0, Math.round((totals.subtotal - totals.couponDiscount) * 100) / 100)
                        : totals.total
                    )}
                  </span>
                </div>
              </div>
            )}

            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3.5 px-4 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-sm rounded-xl transition-transform active:scale-98 cursor-pointer shadow-xs"
              >
                {totals.isQuoteOnly
                  ? 'Informar Nome & Enviar Lista no WhatsApp'
                  : 'Avançar para Entrega e Pagamento'}
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
                  <span>
                    {totals.isQuoteOnly
                      ? 'Gerar Nº do Pedido & Enviar Lista'
                      : 'Finalizar Pedido via WhatsApp'}
                  </span>
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

  const quoteOnly = isOrderQuoteOnly(order);
  const hasMixedHiddenItems = !quoteOnly && order.items.some((item) => item.priceHidden);
  const formattedMessage = buildWhatsAppOrderMessage(order, settings.storeAddress);
  const whatsappUrl = buildWhatsAppOrderUrl(
    settings.whatsappNumber,
    order,
    settings.storeAddress
  );

  const createdDate = new Date(order.createdAt);
  const formattedDate = Number.isNaN(createdDate.getTime())
    ? ''
    : `${createdDate.toLocaleDateString('pt-BR')} · ${createdDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
  const totalUnits = order.items.reduce((acc, i) => acc + i.quantity, 0);

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
      className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0 print:block"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-zinc-300 shadow-2xl space-y-4 my-auto print:shadow-none print:border-0 print:max-w-full print:p-4">
        {/* Printable Comanda Header */}
        <div className="flex items-start justify-between border-b border-dashed border-zinc-300 pb-3">
          <div>
            <p className="text-[11px] font-mono uppercase text-zinc-500">
              COMANDA DE SEPARAÇÃO · LIMPER MT
            </p>
            <h2
              id="order-confirmed-title"
              className="font-mono text-xl font-extrabold text-zinc-900 mt-0.5"
            >
              Pedido {order.id}
            </h2>
            {formattedDate && (
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                {formattedDate}
                {order.pickupCode ? ` · Cód: ${order.pickupCode}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar comanda de pedido"
            className="p-1 text-zinc-400 hover:text-zinc-700 no-print cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer & Logistics Metadata */}
        <div className="text-xs font-mono space-y-1 text-zinc-900 border-b border-dashed border-zinc-300 pb-3">
          <div>CLIENTE: {order.customerName}</div>
          {order.customerDocument && order.customerDocument.trim() && (
            <div>
              {order.customerDocumentType === 'cnpj' ||
              onlyDigits(order.customerDocument).length > 11
                ? 'CNPJ'
                : 'CPF'}
              : {order.customerDocument}
            </div>
          )}
          <div>WHATSAPP: {formatPhone(order.customerPhone)}</div>
          <div>
            TIPO:{' '}
            {order.deliveryType === 'delivery'
              ? 'ENTREGA DELIVERY'
              : 'RETIRADA NO BALCÃO (AV. COUTO MAGALHÃES, 2820)'}
          </div>
          {order.deliveryType === 'delivery' && order.logisticsMode && (
            <div>
              LOGÍSTICA:{' '}
              {formatLogisticsModeLabel(
                order.logisticsMode,
                order.address?.interiorCityName
              )}
            </div>
          )}
          {order.deliveryType === 'delivery' && order.address && (
            <div>
              ENDEREÇO: {order.address.street}, {order.address.number} -{' '}
              {order.address.neighborhood} (
              {order.address.city === 'Interior de MT'
                ? `${order.address.interiorCityName || 'Interior'} - MT`
                : `${order.address.city}/MT`}
              ){order.address.cep ? ` · CEP ${formatCep(order.address.cep)}` : ''}
              {order.address.reference ? ` · Ref: ${order.address.reference}` : ''}
            </div>
          )}
          <div>PAGAMENTO: {formatPaymentMethodLabel(order)}</div>
          {order.notes && order.notes.trim() && (
            <div>OBS.: {order.notes.trim()}</div>
          )}
        </div>

        {/* Inventory Checklist */}
        <div className="space-y-2 border-b border-dashed border-zinc-300 pb-3 max-h-60 overflow-y-auto print:max-h-none print:overflow-visible">
          <div className="text-xs font-mono font-bold text-zinc-900">
            CHECKLIST DE ESTOQUE ({totalUnits} unid.):
          </div>
          {order.items.map((item, idx) => (
            <div key={`${item.productId}-${idx}`} className="space-y-1">
              <div className="flex items-start justify-between gap-3 text-xs font-mono text-zinc-900">
                <span className="leading-snug font-semibold">
                  [ ] {item.quantity}x {item.title} ({item.volumeLabel})
                </span>
                <span className="tabular-nums shrink-0 font-bold">
                  {quoteOnly || item.priceHidden
                    ? 'Sob consulta'
                    : formatCurrency(item.subtotal)}
                </span>
              </div>
              {item.kitItems && item.kitItems.length > 0 && (
                <div className="pl-4 ml-1 border-l-2 border-dashed border-zinc-300 space-y-0.5 text-[11px] font-mono text-zinc-700">
                  <div className="text-[10px] uppercase font-bold text-zinc-500">
                    Itens inclusos no kit (separar):
                  </div>
                  {item.kitItems.map((sub, subIdx) => (
                    <div
                      key={`${item.productId}-sub-${sub.productId}-${subIdx}`}
                      className="leading-snug"
                    >
                      [ ] {sub.quantity * item.quantity}x {sub.title} ({sub.volumeLabel})
                      {item.quantity > 1 ? ` · ${sub.quantity}x/kit` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Totals / Mode Footer */}
        <div className="space-y-1 font-mono text-zinc-900">
          {!quoteOnly && order.couponCode && order.discountAmount && order.discountAmount > 0 && (
            <div className="flex justify-between text-xs text-zinc-600">
              <span>CUPOM ({order.couponCode}):</span>
              <span className="tabular-nums">-{formatCurrency(order.discountAmount)}</span>
            </div>
          )}
          {!quoteOnly && order.deliveryType === 'delivery' && (
            <div className="flex justify-between text-xs text-zinc-600">
              <span>TAXA ENTREGA:</span>
              <span className="tabular-nums">
                {order.logisticsMode === 'interior_mt'
                  ? 'Consultar WhatsApp'
                  : order.deliveryFee === 0
                  ? 'Grátis'
                  : formatCurrency(order.deliveryFee)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-baseline text-sm font-extrabold text-zinc-900 pt-0.5">
            <span>{quoteOnly ? 'MODO DO PEDIDO:' : 'TOTAL A CONFERIR:'}</span>
            <span className="tabular-nums text-right">
              {quoteOnly
                ? 'LISTA S/ VALOR (WHATSAPP)'
                : formatCurrency(order.total)}
            </span>
          </div>
          {hasMixedHiddenItems && (
            <p className="text-[11px] text-[#B45309] font-semibold pt-1">
              * Contém item(ns) sem valor nesta lista para cotação via WhatsApp.
            </p>
          )}
        </div>

        {/* Action Buttons (Hidden when printing) */}
        <div className="pt-2 space-y-2.5 no-print">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 text-center shadow-xs"
          >
            <MessageCircle className="w-5 h-5 fill-zinc-950" />
            <span>
              {quoteOnly
                ? 'Enviar Comanda no WhatsApp'
                : 'Enviar Pedido no WhatsApp Agora'}
            </span>
          </a>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="py-2.5 px-3 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Comanda</span>
            </button>

            <button
              type="button"
              onClick={handleCopyMessage}
              className="py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedMsg ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>Lista Copiada</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Comanda</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
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
