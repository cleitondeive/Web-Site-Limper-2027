import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  FileText,
  History,
  MessageCircle,
  Minus,
  Package,
  Pencil,
  Percent,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Store,
  Trash2,
  Truck,
  Upload,
  User,
  X,
} from 'lucide-react';
import {
  AdminUser,
  Category,
  CreateSecurityAuditEventInput,
  DeliveryType,
  Product,
  PromoKit,
  SellerCustomProduct,
  SellerQuote,
  SellerQuoteDiscountType,
  SellerQuoteItem,
  StoreSettings,
} from '../types/commerce';
import {
  buildSellerQuoteWhatsAppMessage,
  buildSellerQuoteWhatsAppUrl,
  calculateKitPricing,
  calculateSellerQuoteInstallment,
  calculateSellerQuoteTotals,
  formatAdminActorLabel,
  formatBrDateFromYmd,
  formatCurrency,
  formatPhone,
  formatSellerQuotePaymentSummary,
  formatStoreWhatsAppDisplay,
  generateNextQuoteNumber,
  getEffectivePrice,
  normalizePhone,
  normalizeStoreWhatsAppNumber,
  toDateKeyYmd,
  validateSellerQuoteDraft,
} from '../utils/commerce';
import { formatCpfOrCnpjAuto } from '../utils/brInputMasks';
import { optimizeUploadedImage } from '../utils/imageUtils';
import { downloadSellerQuotePdf } from '../utils/sellerQuotePdf';
import { ProductImageWithFallback } from './CategoryIcon';

interface AdminSellerAreaProps {
  currentAdminUser: AdminUser | null;
  products: readonly Product[];
  kits: readonly PromoKit[];
  categories: readonly Category[];
  settings: StoreSettings;
  quotes: SellerQuote[];
  onSaveQuotes: (quotes: SellerQuote[]) => void;
  sellerCustomProducts?: SellerCustomProduct[];
  onSaveSellerCustomProducts?: (items: SellerCustomProduct[]) => void;
  onRecordSecurityEvent: (input: CreateSecurityAuditEventInput) => void;
}

const PAYMENT_TERMS_OPTIONS = [
  'PIX / À Vista',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Boleto Bancário',
  'Dinheiro na Entrega / Retirada',
  'Faturado PJ (15 / 30 dias)',
  'Entrada + Parcelado',
  'A combinar no WhatsApp',
];

const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function getDefaultValidUntilYmd(daysAhead = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return toDateKeyYmd(d, true);
}

export const AdminSellerArea: React.FC<AdminSellerAreaProps> = ({
  currentAdminUser,
  products,
  kits,
  categories,
  settings,
  quotes,
  onSaveQuotes,
  sellerCustomProducts = [],
  onSaveSellerCustomProducts,
  onRecordSecurityEvent,
}) => {
  const isMaster = currentAdminUser?.role === 'master';
  const actorLabel = formatAdminActorLabel(currentAdminUser);

  const [subView, setSubView] = useState<'builder' | 'history'>('builder');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  // Customer & Quote Metadata
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('Várzea Grande - MT');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup');
  const [validUntilDate, setValidUntilDate] = useState<string>(() =>
    getDefaultValidUntilYmd(7)
  );

  // Payment, Installments & Price Visibility
  const [paymentTerms, setPaymentTerms] = useState<string>(PAYMENT_TERMS_OPTIONS[0]);
  const [installmentCount, setInstallmentCount] = useState<number>(1);
  const [customInstallmentInput, setCustomInstallmentInput] = useState<string>('');
  const [installmentInterestFree, setInstallmentInterestFree] = useState<boolean>(true);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [hidePrices, setHidePrices] = useState<boolean>(false);

  // Discount (% or R$) & Freight & Notes
  const [discountType, setDiscountType] = useState<SellerQuoteDiscountType>('percent');
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [deliveryFeeInput, setDeliveryFeeInput] = useState<string>('0');
  const [notes, setNotes] = useState('');

  // WhatsApp destination toggle: 'system' (default: official store WhatsApp) or 'customer'
  const [whatsappTargetMode, setWhatsappTargetMode] = useState<'system' | 'customer'>(
    'system'
  );

  // Catalog Search, Items & Individual Item Editor
  const [items, setItems] = useState<SellerQuoteItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('all');
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customSku, setCustomSku] = useState('');
  const [customVolume, setCustomVolume] = useState('5L');
  const [customQty, setCustomQty] = useState('1');
  const [customUnitPrice, setCustomUnitPrice] = useState('');
  const [customItemNote, setCustomItemNote] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customImageUploading, setCustomImageUploading] = useState(false);
  const [saveToSellerCatalog, setSaveToSellerCatalog] = useState(true);

  // History filters & preview modal
  const [historySearch, setHistorySearch] = useState('');
  const [historySellerFilter, setHistorySellerFilter] = useState('all');
  const [previewModalQuote, setPreviewModalQuote] = useState<SellerQuote | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'info';
    message: string;
  } | null>(null);

  const showFeedback = (message: string, tone: 'success' | 'info' = 'success') => {
    setFeedback({ tone, message });
    window.setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 5500);
  };

  // Scope quotes: Master & Manager see all, Seller sees their own
  const visibleQuotes = useMemo(() => {
    if (isMaster || currentAdminUser?.role === 'manager') {
      return quotes;
    }
    if (!currentAdminUser) return quotes;
    return quotes.filter(
      (q) =>
        q.sellerId === currentAdminUser.id ||
        (q.sellerUsername && q.sellerUsername === currentAdminUser.username)
    );
  }, [quotes, isMaster, currentAdminUser]);

  const filteredHistoryQuotes = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return visibleQuotes.filter((quote) => {
      if (
        historySellerFilter !== 'all' &&
        (quote.sellerUsername || quote.sellerName) !== historySellerFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        quote.id,
        quote.customerName,
        quote.customerCompany || '',
        quote.customerPhone || '',
        quote.sellerName,
        ...quote.items.map((i) => `${i.title} ${i.sku || ''} ${i.itemNote || ''}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [visibleQuotes, historySearch, historySellerFilter]);

  const sellerFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    visibleQuotes.forEach((q) => {
      const key = q.sellerUsername || q.sellerName;
      if (!map.has(key)) {
        map.set(key, q.sellerName);
      }
    });
    return Array.from(map.entries());
  }, [visibleQuotes]);

  const stats = useMemo(() => {
    const totalVolume = visibleQuotes.reduce((acc, q) => acc + (q.total || 0), 0);
    const totalPdf = visibleQuotes.reduce((acc, q) => acc + (q.pdfGeneratedCount || 0), 0);
    const totalWa = visibleQuotes.reduce((acc, q) => acc + (q.whatsappSentCount || 0), 0);
    return {
      count: visibleQuotes.length,
      totalVolume,
      totalPdf,
      totalWa,
    };
  }, [visibleQuotes]);

  const activeSystemWaNumber =
    normalizeStoreWhatsAppNumber(settings.whatsappNumber) || '556530296824';
  const activeSystemWaDisplay =
    formatStoreWhatsAppDisplay(activeSystemWaNumber) || settings.whatsappDisplay;

  const customerNormalizedWa = normalizeStoreWhatsAppNumber(customerPhone);
  const effectiveTargetWaNumber =
    whatsappTargetMode === 'customer' && customerNormalizedWa
      ? customerNormalizedWa
      : activeSystemWaNumber;
  const effectiveTargetWaDisplay =
    whatsappTargetMode === 'customer' && customerNormalizedWa
      ? formatStoreWhatsAppDisplay(customerNormalizedWa)
      : activeSystemWaDisplay;

  React.useEffect(() => {
    if (!previewModalQuote) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewModalQuote(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModalQuote]);

  const parsedDiscountInput = Math.max(
    0,
    Number(discountInput.replace(',', '.')) || 0
  );
  const parsedDeliveryFee = Math.max(
    0,
    Number(deliveryFeeInput.replace(',', '.')) || 0
  );

  const totals = useMemo(
    () =>
      calculateSellerQuoteTotals(
        items,
        parsedDiscountInput,
        parsedDeliveryFee,
        discountType
      ),
    [items, parsedDiscountInput, parsedDeliveryFee, discountType]
  );

  const parsedCustomInstallment =
    customInstallmentInput.trim() !== ''
      ? Number(customInstallmentInput.replace(',', '.'))
      : undefined;

  const installmentSummary = useMemo(
    () =>
      calculateSellerQuoteInstallment(
        totals.total,
        installmentCount,
        parsedCustomInstallment
      ),
    [totals.total, installmentCount, parsedCustomInstallment]
  );

  const livePaymentSummary = useMemo(
    () =>
      formatSellerQuotePaymentSummary({
        paymentTerms,
        installmentCount,
        installmentValue: installmentSummary.isCustomValue
          ? installmentSummary.unitAmount
          : undefined,
        installmentInterestFree,
        paymentNotes: paymentNotes.trim() || undefined,
        hidePrices,
        total: totals.total,
      }),
    [
      paymentTerms,
      installmentCount,
      installmentSummary,
      installmentInterestFree,
      paymentNotes,
      hidePrices,
      totals.total,
    ]
  );

  const nextQuoteIdPreview = useMemo(
    () => editingQuoteId || generateNextQuoteNumber(quotes),
    [editingQuoteId, quotes]
  );

  const productQtyInQuoteMap = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((i) => {
      if (i.productId) {
        map.set(i.productId, (map.get(i.productId) || 0) + i.quantity);
      }
    });
    return map;
  }, [items]);

  const catalogMatches = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();

    const sellerCustomResults =
      catalogCategoryFilter === 'all' || catalogCategoryFilter === '__seller_custom__'
        ? sellerCustomProducts
            .filter((sp) => {
              if (!q) return true;
              return (
                sp.title.toLowerCase().includes(q) ||
                sp.sku.toLowerCase().includes(q) ||
                (sp.volumeLabel || '').toLowerCase().includes(q) ||
                (sp.defaultNote || '').toLowerCase().includes(q)
              );
            })
            .slice(0, 12)
            .map((sp) => ({
              kind: 'seller_custom' as const,
              id: sp.id,
              sku: sp.sku,
              title: sp.title,
              volumeLabel: sp.volumeLabel || 'Unidade',
              categoryName: 'Só Orçamento',
              imageUrl: sp.imageUrl || '',
              defaultNote: sp.defaultNote,
              price: sp.price,
            }))
        : [];

    if (catalogCategoryFilter === '__seller_custom__') {
      return sellerCustomResults;
    }

    const activeProducts = products.filter((p) => p.status !== 'inactive');
    const productResults = activeProducts
      .filter((p) => {
        if (catalogCategoryFilter !== 'all' && p.categoryId !== catalogCategoryFilter) {
          return false;
        }
        if (!q) return true;
        const catName =
          categories.find((c) => c.id === p.categoryId)?.name || '';
        return (
          p.title.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.volumeLabel.toLowerCase().includes(q) ||
          catName.toLowerCase().includes(q)
        );
      })
      .slice(0, 12)
      .map((p) => ({
        kind: 'product' as const,
        id: p.id,
        sku: p.sku,
        title: p.title,
        volumeLabel: p.volumeLabel,
        categoryName: categories.find((c) => c.id === p.categoryId)?.name || '',
        imageUrl: p.imageUrl,
        defaultNote: undefined as string | undefined,
        price: getEffectivePrice(p),
      }));

    const kitResults =
      catalogCategoryFilter === 'all'
        ? kits
            .filter((k) => k.active)
            .filter((k) => {
              if (!q) return false;
              return (
                k.title.toLowerCase().includes(q) ||
                (k.sku || '').toLowerCase().includes(q)
              );
            })
            .slice(0, 4)
            .map((k) => {
              const pricing = calculateKitPricing(k, products as Product[]);
              const firstProdImg = pricing.resolvedEntries[0]?.product.imageUrl;
              return {
                kind: 'kit' as const,
                id: k.id,
                sku: k.sku || 'KIT',
                title: k.title,
                volumeLabel: 'Combo / Kit',
                categoryName: 'Kit Promocional',
                imageUrl: k.imageUrl || firstProdImg || '',
                defaultNote: undefined as string | undefined,
                price: pricing.finalKitPrice,
              };
            })
        : [];

    return [...sellerCustomResults, ...productResults, ...kitResults];
  }, [
    catalogSearch,
    catalogCategoryFilter,
    products,
    kits,
    categories,
    sellerCustomProducts,
  ]);

  const handleAddCatalogEntry = (entry: {
    kind?: 'product' | 'kit' | 'seller_custom';
    id: string;
    sku: string;
    title: string;
    volumeLabel: string;
    imageUrl?: string;
    defaultNote?: string;
    price: number;
  }) => {
    setFormError(null);
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === entry.id);
      if (existingIdx >= 0) {
        return prev.map((item, idx) => {
          if (idx !== existingIdx) return item;
          const nextQty = item.quantity + 1;
          return {
            ...item,
            quantity: nextQty,
            subtotal: Number((nextQty * item.unitPrice).toFixed(2)),
          };
        });
      }
      return [
        ...prev,
        {
          id: `qi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId: entry.id,
          sku: entry.sku,
          title: entry.title,
          volumeLabel: entry.volumeLabel,
          imageUrl: entry.imageUrl || undefined,
          itemNote: entry.defaultNote || undefined,
          catalogPrice: entry.price,
          quantity: 1,
          unitPrice: entry.price,
          subtotal: entry.price,
          isCustom: entry.kind === 'seller_custom',
        },
      ];
    });
  };

  const handleUploadCustomProductImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomImageUploading(true);
    try {
      const optimized = await optimizeUploadedImage(file, {
        maxWidth: 480,
        maxHeight: 480,
        quality: 0.82,
      });
      if (!optimized.ok) {
        setFormError(optimized.error);
      } else {
        setCustomImageUrl(optimized.dataUrl);
      }
    } catch {
      setFormError('Não foi possível processar a imagem enviada. Tente JPG, PNG ou WEBP.');
    } finally {
      setCustomImageUploading(false);
      e.target.value = '';
    }
  };

  const generateNextSellerProductSku = (): string => {
    const maxNum = sellerCustomProducts.reduce((acc, item) => {
      const m = String(item.sku || '').match(/(\d+)$/);
      if (!m) return acc;
      const n = Number(m[1]);
      return Number.isFinite(n) && n > acc ? n : acc;
    }, 0);
    return `ORC-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleOpenCustomProductForm = (prefillTitle = '') => {
    if (prefillTitle.trim()) {
      setCustomTitle(prefillTitle.trim());
    }
    setShowCustomItemForm(true);
    setFormError(null);
  };

  const handleAddCustomItem = () => {
    setFormError(null);
    const title = customTitle.trim();
    const qty = Math.max(1, Math.round(Number(customQty) || 1));
    const unit =
      customUnitPrice.trim() === ''
        ? 0
        : Number(customUnitPrice.replace(',', '.'));
    if (!title) {
      setFormError('Informe o nome do produto para cadastrar no orçamento.');
      return;
    }
    if (!Number.isFinite(unit) || unit < 0) {
      setFormError('Informe um valor unitário válido para o produto.');
      return;
    }

    const cleanUnit = Number(unit.toFixed(2));
    const resolvedSku =
      customSku.trim().toUpperCase() ||
      (saveToSellerCatalog ? generateNextSellerProductSku() : 'AVULSO');
    const cleanVol = customVolume.trim() || undefined;
    const cleanImg = customImageUrl.trim() || undefined;
    const cleanNote = customItemNote.trim() || undefined;

    let linkedCustomProdId: string | undefined;

    if (saveToSellerCatalog && onSaveSellerCustomProducts) {
      const newSellerProduct: SellerCustomProduct = {
        id: `scp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sku: resolvedSku,
        title,
        volumeLabel: cleanVol,
        price: cleanUnit,
        imageUrl: cleanImg,
        defaultNote: cleanNote,
        createdAt: new Date().toISOString(),
        createdBy: currentAdminUser?.name || 'Vendedor',
        createdByUsername: currentAdminUser?.username,
      };
      linkedCustomProdId = newSellerProduct.id;
      onSaveSellerCustomProducts([newSellerProduct, ...sellerCustomProducts]);
      onRecordSecurityEvent({
        category: 'seller_quote',
        outcome: 'info',
        actorLabel,
        actorUsername: currentAdminUser?.username,
        actorRole: currentAdminUser?.role,
        rawTarget: `${resolvedSku} · ${title}`,
        summary: `Produto exclusivo p/ orçamento cadastrado: ${title} (${resolvedSku})`,
        detail: `Salvo exclusivamente na Área do Vendedor (não adicionado ao catálogo global nem à loja). Valor base: ${formatCurrency(
          cleanUnit
        )}.`,
      });
      showFeedback(
        `Produto "${title}" (${resolvedSku}) salvo só para orçamentos e adicionado ao orçamento atual!`
      );
    }

    setItems((prev) => [
      ...prev,
      {
        id: `qi-custom-${Date.now()}`,
        productId: linkedCustomProdId,
        sku: resolvedSku,
        title,
        volumeLabel: cleanVol,
        imageUrl: cleanImg,
        itemNote: cleanNote,
        catalogPrice: cleanUnit,
        quantity: qty,
        unitPrice: cleanUnit,
        subtotal: Number((qty * cleanUnit).toFixed(2)),
        isCustom: true,
      },
    ]);
    setCustomTitle('');
    setCustomSku('');
    setCustomQty('1');
    setCustomUnitPrice('');
    setCustomItemNote('');
    setCustomImageUrl('');
    setShowCustomItemForm(false);
  };

  const handleDeleteSellerCustomProduct = (productId: string) => {
    if (!onSaveSellerCustomProducts) return;
    const target = sellerCustomProducts.find((p) => p.id === productId);
    onSaveSellerCustomProducts(
      sellerCustomProducts.filter((p) => p.id !== productId)
    );
    if (target) {
      onRecordSecurityEvent({
        category: 'seller_quote',
        outcome: 'info',
        actorLabel,
        actorUsername: currentAdminUser?.username,
        actorRole: currentAdminUser?.role,
        rawTarget: `${target.sku} · ${target.title}`,
        summary: `Produto exclusivo p/ orçamento removido: ${target.title}`,
        detail: `Removido da lista exclusiva da Área do Vendedor por ${actorLabel}.`,
      });
      showFeedback(
        `Produto "${target.title}" removido da lista exclusiva de orçamentos.`,
        'info'
      );
    }
  };

  const handleUpdateItemFields = (
    itemId: string,
    patch: Partial<
      Pick<
        SellerQuoteItem,
        'title' | 'sku' | 'volumeLabel' | 'itemNote' | 'quantity' | 'unitPrice'
      >
    >
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const nextQty =
          patch.quantity !== undefined
            ? Math.max(1, Math.round(patch.quantity) || 1)
            : item.quantity;
        const nextUnit =
          patch.unitPrice !== undefined
            ? Math.max(0, Number(patch.unitPrice) || 0)
            : item.unitPrice;
        return {
          ...item,
          ...patch,
          quantity: nextQty,
          unitPrice: nextUnit,
          subtotal: Number((nextQty * nextUnit).toFixed(2)),
        };
      })
    );
  };

  const handleUpdateItemQty = (itemId: string, nextQtyRaw: number) => {
    handleUpdateItemFields(itemId, { quantity: nextQtyRaw });
  };

  const handleUpdateItemPrice = (itemId: string, nextPriceRaw: string) => {
    const parsed = Math.max(0, Number(nextPriceRaw.replace(',', '.')) || 0);
    handleUpdateItemFields(itemId, { unitPrice: parsed });
  };

  const handleApplyItemPercentDiscount = (item: SellerQuoteItem, pct: number) => {
    const base = item.catalogPrice && item.catalogPrice > 0 ? item.catalogPrice : item.unitPrice;
    const discounted = Math.max(0, Math.round(base * (1 - pct / 100) * 100) / 100);
    handleUpdateItemFields(item.id, { unitPrice: discounted });
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    if (editingItemId === itemId) {
      setEditingItemId(null);
    }
  };

  const handleSwitchDiscountType = (nextType: SellerQuoteDiscountType) => {
    if (nextType === discountType) return;
    if (nextType === 'fixed') {
      setDiscountInput(totals.discountAmount > 0 ? String(totals.discountAmount) : '0');
    } else {
      setDiscountInput(totals.discountPercent > 0 ? String(totals.discountPercent) : '0');
    }
    setDiscountType(nextType);
  };

  const resetBuilderForm = () => {
    setEditingQuoteId(null);
    setEditingItemId(null);
    setCustomerName('');
    setCustomerCompany('');
    setCustomerDocument('');
    setCustomerPhone('');
    setCustomerCity('Várzea Grande - MT');
    setDeliveryType('pickup');
    setPaymentTerms(PAYMENT_TERMS_OPTIONS[0]);
    setInstallmentCount(1);
    setCustomInstallmentInput('');
    setInstallmentInterestFree(true);
    setPaymentNotes('');
    setHidePrices(false);
    setValidUntilDate(getDefaultValidUntilYmd(7));
    setDiscountType('percent');
    setDiscountInput('0');
    setDeliveryFeeInput('0');
    setNotes('');
    setItems([]);
    setWhatsappTargetMode('system');
    setFormError(null);
  };

  const buildCurrentQuoteSnapshot = (
    quoteId: string,
    existing?: SellerQuote,
    action: 'draft' | 'pdf' | 'whatsapp' | 'both' = 'draft'
  ): SellerQuote => {
    const nowIso = new Date().toISOString();
    const pdfInc = action === 'pdf' || action === 'both' ? 1 : 0;
    const waInc = action === 'whatsapp' || action === 'both' ? 1 : 0;
    const nextPdfCount = (existing?.pdfGeneratedCount || 0) + pdfInc;
    const nextWaCount = (existing?.whatsappSentCount || 0) + waInc;
    const status: SellerQuote['status'] =
      nextWaCount > 0
        ? 'sent_whatsapp'
        : nextPdfCount > 0
          ? 'pdf_generated'
          : 'draft';

    return {
      id: quoteId,
      createdAt: existing?.createdAt || nowIso,
      validUntilDate: validUntilDate || getDefaultValidUntilYmd(7),
      sellerId: existing?.sellerId || currentAdminUser?.id,
      sellerName: existing?.sellerName || currentAdminUser?.name || 'Vendedor Limper MT',
      sellerUsername: existing?.sellerUsername || currentAdminUser?.username,
      customerName: customerName.trim() || 'Cliente',
      customerCompany: customerCompany.trim() || undefined,
      customerDocument: customerDocument.trim() || undefined,
      customerPhone: customerPhone.trim(),
      customerCity: customerCity.trim() || undefined,
      deliveryType,
      paymentTerms,
      installmentCount,
      installmentValue:
        installmentCount > 1 && installmentSummary.isCustomValue
          ? installmentSummary.unitAmount
          : undefined,
      installmentInterestFree,
      paymentNotes: paymentNotes.trim() || undefined,
      hidePrices,
      items: items.map((i) => ({
        ...i,
        subtotal: Number((i.quantity * i.unitPrice).toFixed(2)),
      })),
      subtotal: totals.subtotal,
      discountType: totals.discountType,
      discountValue: totals.discountValue,
      discountPercent: totals.discountPercent,
      discountAmount: totals.discountAmount,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      notes: notes.trim() || undefined,
      targetWhatsappNumber: effectiveTargetWaNumber,
      targetWhatsappDisplay: effectiveTargetWaDisplay,
      status,
      pdfGeneratedCount: nextPdfCount,
      whatsappSentCount: nextWaCount,
      lastSentAt: waInc > 0 ? nowIso : existing?.lastSentAt,
    };
  };

  const buildAndPersistQuote = (
    action: 'draft' | 'pdf' | 'whatsapp' | 'both'
  ): SellerQuote | null => {
    setFormError(null);
    const validation = validateSellerQuoteDraft({
      customerName,
      items,
      discountType,
      discountValue: parsedDiscountInput,
      deliveryFee: parsedDeliveryFee,
      installmentCount,
    });
    if (!validation.valid) {
      setFormError(validation.error || 'Preencha os campos obrigatórios do orçamento.');
      return null;
    }

    const existing = editingQuoteId
      ? quotes.find((q) => q.id === editingQuoteId)
      : undefined;
    const quoteId = existing?.id || generateNextQuoteNumber(quotes);
    const quote = buildCurrentQuoteSnapshot(quoteId, existing, action);

    const nextQuotes = existing
      ? quotes.map((q) => (q.id === quote.id ? quote : q))
      : [quote, ...quotes];
    onSaveQuotes(nextQuotes);
    setEditingQuoteId(quote.id);
    return quote;
  };

  const openWhatsAppSafeLink = (url: string) => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleDownloadPdfAction = () => {
    const quote = buildAndPersistQuote('pdf');
    if (!quote) return;
    const fileName = downloadSellerQuotePdf(quote, settings);
    onRecordSecurityEvent({
      category: 'seller_quote',
      outcome: 'allowed',
      actorLabel,
      actorUsername: currentAdminUser?.username,
      actorRole: currentAdminUser?.role,
      rawTarget: `${quote.id} · ${quote.customerName}`,
      summary: `PDF de orçamento gerado: ${quote.id}${quote.hidePrices ? ' (Preço Oculto)' : ''}`,
      detail: `Cliente: ${quote.customerName} · ${quote.items.length} item(ns) · ${
        quote.hidePrices ? 'Valores sob consulta' : `Total: ${formatCurrency(quote.total)}`
      } · Arquivo: ${fileName}.`,
    });
    showFeedback(
      `PDF "${fileName}" baixado com sucesso! Orçamento ${quote.id} salvo no histórico.`
    );
  };

  const handleSendWhatsAppAction = () => {
    const quote = buildAndPersistQuote('whatsapp');
    if (!quote) return;
    const waUrl = buildSellerQuoteWhatsAppUrl(
      quote.targetWhatsappNumber,
      quote,
      settings
    );
    openWhatsAppSafeLink(waUrl);
    onRecordSecurityEvent({
      category: 'seller_quote',
      outcome: 'allowed',
      actorLabel,
      actorUsername: currentAdminUser?.username,
      actorRole: currentAdminUser?.role,
      rawTarget: `${quote.id} -> ${quote.targetWhatsappDisplay}`,
      summary: `Orçamento ${quote.id} enviado no WhatsApp (${quote.targetWhatsappDisplay})`,
      detail: `Cliente: ${quote.customerName} · ${
        quote.hidePrices ? 'Modo Preço Oculto (Sob Consulta)' : `Total: ${formatCurrency(quote.total)}`
      } · Destino: ${
        whatsappTargetMode === 'customer'
          ? 'WhatsApp do Cliente'
          : 'WhatsApp Oficial do Sistema'
      }.`,
    });
    showFeedback(
      `Orçamento ${quote.id} pronto e enviado para o WhatsApp ${quote.targetWhatsappDisplay}!`
    );
  };

  const handlePdfAndWhatsAppCombo = () => {
    const quote = buildAndPersistQuote('both');
    if (!quote) return;
    const fileName = downloadSellerQuotePdf(quote, settings);
    const waUrl = buildSellerQuoteWhatsAppUrl(
      quote.targetWhatsappNumber,
      quote,
      settings
    );
    openWhatsAppSafeLink(waUrl);
    onRecordSecurityEvent({
      category: 'seller_quote',
      outcome: 'allowed',
      actorLabel,
      actorUsername: currentAdminUser?.username,
      actorRole: currentAdminUser?.role,
      rawTarget: `${quote.id} -> ${quote.targetWhatsappDisplay}`,
      summary: `Orçamento ${quote.id}: PDF gerado e enviado no WhatsApp`,
      detail: `Cliente: ${quote.customerName} · ${
        quote.hidePrices ? 'Preço Oculto (Sob Consulta)' : `Total: ${formatCurrency(quote.total)}`
      } · PDF: ${fileName} · Destino: ${quote.targetWhatsappDisplay}.`,
    });
    showFeedback(
      `PDF "${fileName}" baixado e WhatsApp (${quote.targetWhatsappDisplay}) aberto para envio!`
    );
  };

  const handleSaveDraftAction = () => {
    const quote = buildAndPersistQuote('draft');
    if (!quote) return;
    onRecordSecurityEvent({
      category: 'seller_quote',
      outcome: 'info',
      actorLabel,
      actorUsername: currentAdminUser?.username,
      actorRole: currentAdminUser?.role,
      rawTarget: `${quote.id} · ${quote.customerName}`,
      summary: `Orçamento salvo no histórico: ${quote.id}`,
      detail: `Cliente: ${quote.customerName} · ${quote.items.length} item(ns) · ${
        quote.hidePrices ? 'Sob Consulta' : `Total: ${formatCurrency(quote.total)}`
      }.`,
    });
    showFeedback(`Orçamento ${quote.id} salvo em Orçamentos Salvos!`, 'info');
  };

  const handleLoadQuoteIntoBuilder = (quote: SellerQuote, asDuplicate = false) => {
    setEditingQuoteId(asDuplicate ? null : quote.id);
    setEditingItemId(null);
    setCustomerName(quote.customerName);
    setCustomerCompany(quote.customerCompany || '');
    setCustomerDocument(quote.customerDocument || '');
    setCustomerPhone(quote.customerPhone || '');
    setCustomerCity(quote.customerCity || 'Várzea Grande - MT');
    setDeliveryType(quote.deliveryType);
    setPaymentTerms(quote.paymentTerms || PAYMENT_TERMS_OPTIONS[0]);
    setInstallmentCount(quote.installmentCount || 1);
    setCustomInstallmentInput(
      quote.installmentValue && quote.installmentValue > 0
        ? String(quote.installmentValue)
        : ''
    );
    setInstallmentInterestFree(quote.installmentInterestFree !== false);
    setPaymentNotes(quote.paymentNotes || '');
    setHidePrices(Boolean(quote.hidePrices));
    setValidUntilDate(
      asDuplicate ? getDefaultValidUntilYmd(7) : quote.validUntilDate
    );
    const loadedDiscType: SellerQuoteDiscountType =
      quote.discountType === 'fixed' ? 'fixed' : 'percent';
    setDiscountType(loadedDiscType);
    setDiscountInput(
      loadedDiscType === 'fixed'
        ? String(quote.discountValue ?? quote.discountAmount ?? 0)
        : String(quote.discountPercent ?? 0)
    );
    setDeliveryFeeInput(String(quote.deliveryFee || 0));
    setNotes(quote.notes || '');
    setItems(quote.items.map((i) => ({ ...i })));
    setWhatsappTargetMode('system');
    setFormError(null);
    setSubView('builder');
    showFeedback(
      asDuplicate
        ? `Cópia baseada no orçamento ${quote.id} carregada para edição.`
        : `Orçamento ${quote.id} carregado para edição.`,
      'info'
    );
  };

  const handleDeleteSavedQuote = (quote: SellerQuote) => {
    const nextQuotes = quotes.filter((q) => q.id !== quote.id);
    onSaveQuotes(nextQuotes);
    if (editingQuoteId === quote.id) {
      setEditingQuoteId(null);
    }
    onRecordSecurityEvent({
      category: 'seller_quote',
      outcome: 'info',
      actorLabel,
      actorUsername: currentAdminUser?.username,
      actorRole: currentAdminUser?.role,
      rawTarget: `${quote.id} · ${quote.customerName}`,
      summary: `Orçamento removido do histórico: ${quote.id}`,
      detail: `Orçamento de ${quote.customerName} excluído por ${actorLabel}.`,
    });
    showFeedback(`Orçamento ${quote.id} excluído do histórico.`, 'info');
  };

  const handleCopyWhatsAppText = async () => {
    const previewQuote = buildCurrentQuoteSnapshot(nextQuoteIdPreview);
    try {
      await navigator.clipboard.writeText(
        buildSellerQuoteWhatsAppMessage(previewQuote, settings)
      );
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      setCopiedSummary(false);
    }
  };

  const directPreviewWhatsAppUrl = useMemo(() => {
    const previewQuote = buildCurrentQuoteSnapshot(nextQuoteIdPreview);
    return buildSellerQuoteWhatsAppUrl(
      effectiveTargetWaNumber,
      previewQuote,
      settings
    );
  }, [
    nextQuoteIdPreview,
    validUntilDate,
    currentAdminUser,
    customerName,
    customerCompany,
    customerDocument,
    customerPhone,
    customerCity,
    deliveryType,
    paymentTerms,
    installmentCount,
    installmentSummary,
    installmentInterestFree,
    paymentNotes,
    hidePrices,
    items,
    totals,
    notes,
    effectiveTargetWaNumber,
    effectiveTargetWaDisplay,
    settings,
  ]);

  return (
    <div id="admin-seller-area" className="space-y-5 no-print">
      {/* Executive Header Banner + Active System WhatsApp Destination */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-zinc-950 text-[#FFBE00] flex items-center justify-center shrink-0 shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase font-extrabold tracking-wider text-emerald-700 block">
                ÁREA DO VENDEDOR · ORÇAMENTOS EM PDF &amp; WHATSAPP
              </span>
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-zinc-950 leading-tight mt-0.5">
                Gerador Profissional de Orçamentos
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">
                Busque produtos com foto, edite itens individualmente, escolha entre <strong>com preço</strong> ou <strong>preço oculto</strong>, configure parcelas e desconto em <strong>% ou R$</strong> e envie em PDF ou WhatsApp.
              </p>
            </div>
          </div>

          {/* Active System WhatsApp Indicator */}
          <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#25D366] text-zinc-950 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 fill-zinc-950/15" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase font-extrabold text-emerald-800 block">
                WhatsApp Cadastrado no Sistema
              </span>
              <div className="flex items-center gap-2">
                <strong
                  data-testid="seller-system-whatsapp"
                  className="font-mono text-sm font-extrabold text-zinc-950"
                >
                  {activeSystemWaDisplay}
                </strong>
                {settings.activeWhatsAppLabel && (
                  <span className="text-[11px] font-semibold text-emerald-800 truncate max-w-[140px]">
                    · {settings.activeWhatsAppLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Compact Seller KPI Strip + Sub-View Switcher */}
        <div className="pt-3 border-t border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSubView('builder')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                subView === 'builder'
                  ? 'bg-zinc-950 text-[#FFBE00]'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>
                {editingQuoteId ? `Editando ${editingQuoteId}` : 'Novo Orçamento'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('history')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                subView === 'history'
                  ? 'bg-zinc-950 text-[#FFBE00]'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Orçamentos Salvos ({visibleQuotes.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-[#FAFAFA] border border-zinc-200">
              <span className="text-zinc-500">PDFs: </span>
              <strong className="font-mono text-zinc-900">{stats.totalPdf}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#FAFAFA] border border-zinc-200">
              <span className="text-zinc-500">Enviados WhatsApp: </span>
              <strong className="font-mono text-emerald-700">{stats.totalWa}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A]">
              <span className="text-amber-900">Volume Orçado: </span>
              <strong className="font-mono text-zinc-950">
                {formatCurrency(stats.totalVolume)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
            feedback.tone === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2
              className={`w-4 h-4 shrink-0 ${
                feedback.tone === 'success' ? 'text-emerald-600' : 'text-amber-600'
              }`}
            />
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Fechar aviso"
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SUBVIEW 1: QUOTE BUILDER */}
      {subView === 'builder' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN (7 cols): Customer + Payment/Installments + Catalog Picker with Photos + Individual Item Edit + Discount (% or R$) + Hidden Price */}
          <div className="xl:col-span-7 space-y-5">
            {/* Step 1: Customer Details, Delivery & Payment/Installments */}
            <section className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#FFBE00] text-zinc-950 font-mono text-xs font-extrabold flex items-center justify-center">
                    1
                  </span>
                  <h2 className="font-display text-base font-extrabold text-zinc-900">
                    Dados do Cliente, Entrega &amp; Pagamento
                  </h2>
                </div>
                {editingQuoteId && (
                  <button
                    type="button"
                    onClick={resetBuilderForm}
                    className="text-xs font-bold text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Iniciar novo orçamento</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="seller-quote-customer-name"
                    className="block text-[11px] font-bold text-zinc-700 mb-1"
                  >
                    Nome do Cliente / Responsável *
                  </label>
                  <input
                    id="seller-quote-customer-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setFormError(null);
                      setCustomerName(e.target.value);
                    }}
                    placeholder="Ex: Maria Oliveira / Síndico Carlos"
                    className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 focus:bg-white focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs font-medium text-zinc-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="seller-quote-customer-company"
                    className="block text-[11px] font-bold text-zinc-700 mb-1"
                  >
                    Empresa / Condomínio (opcional)
                  </label>
                  <input
                    id="seller-quote-customer-company"
                    type="text"
                    value={customerCompany}
                    onChange={(e) => setCustomerCompany(e.target.value)}
                    placeholder="Ex: Condomínio Florais / Lava-Jato Central"
                    className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 focus:bg-white focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="seller-quote-customer-phone"
                    className="block text-[11px] font-bold text-zinc-700 mb-1"
                  >
                    WhatsApp / Telefone do Cliente
                  </label>
                  <input
                    id="seller-quote-customer-phone"
                    type="tel"
                    inputMode="numeric"
                    value={customerPhone}
                    onChange={(e) =>
                      setCustomerPhone(formatPhone(normalizePhone(e.target.value)))
                    }
                    placeholder="(65) 99988-7766"
                    className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 focus:bg-white focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs font-mono font-bold text-zinc-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="seller-quote-customer-doc"
                    className="block text-[11px] font-bold text-zinc-700 mb-1"
                  >
                    CPF ou CNPJ (opcional)
                  </label>
                  <input
                    id="seller-quote-customer-doc"
                    type="text"
                    value={customerDocument}
                    onChange={(e) =>
                      setCustomerDocument(formatCpfOrCnpjAuto(e.target.value))
                    }
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 focus:bg-white focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs font-mono text-zinc-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="seller-quote-city"
                    className="block text-[11px] font-bold text-zinc-700 mb-1"
                  >
                    Cidade / Região
                  </label>
                  <input
                    id="seller-quote-city"
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="Várzea Grande - MT / Cuiabá - MT"
                    className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 focus:bg-white focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="seller-quote-valid-until"
                    className="block text-[11px] font-bold text-zinc-700 mb-1"
                  >
                    Validade do Orçamento
                  </label>
                  <input
                    id="seller-quote-valid-until"
                    type="date"
                    value={validUntilDate}
                    onChange={(e) => setValidUntilDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 focus:bg-white focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs font-mono font-bold text-zinc-900"
                  />
                </div>
              </div>

              {/* Delivery Mode */}
              <div className="pt-1">
                <span className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Modalidade de Entrega
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryType('pickup');
                      setDeliveryFeeInput('0');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      deliveryType === 'pickup'
                        ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950'
                        : 'bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Retirada Balcão</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('delivery')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      deliveryType === 'delivery'
                        ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950'
                        : 'bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Entrega Delivery</span>
                  </button>
                </div>
              </div>

              {/* Payment Method, Installments & Negotiated Installment Value */}
              <div className="p-4 rounded-xl bg-[#FAFAFA] border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold text-zinc-800 uppercase font-mono inline-flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pagamento &amp; Parcelamento</span>
                  </span>
                  <span className="text-[11px] font-bold text-zinc-600 truncate max-w-[260px]">
                    {livePaymentSummary}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label
                      htmlFor="seller-quote-payment"
                      className="block text-[11px] font-bold text-zinc-700 mb-1"
                    >
                      Tipo de Pagamento
                    </label>
                    <select
                      id="seller-quote-payment"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
                    >
                      {PAYMENT_TERMS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor="seller-quote-installments"
                      className="block text-[11px] font-bold text-zinc-700 mb-1"
                    >
                      Parcelas
                    </label>
                    <select
                      id="seller-quote-installments"
                      value={installmentCount}
                      onChange={(e) => {
                        const nextCount = Number(e.target.value) || 1;
                        setInstallmentCount(nextCount);
                        if (nextCount <= 1) {
                          setCustomInstallmentInput('');
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-900 cursor-pointer"
                    >
                      {INSTALLMENT_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n === 1 ? '1x (À vista)' : `${n}x`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor="seller-quote-installment-value"
                      className="block text-[11px] font-bold text-zinc-700 mb-1"
                    >
                      Valor Parcela
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        id="seller-quote-installment-value"
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={installmentCount <= 1 || hidePrices}
                        value={
                          installmentCount <= 1
                            ? ''
                            : customInstallmentInput !== ''
                              ? customInstallmentInput
                              : installmentSummary.unitAmount.toFixed(2)
                        }
                        onChange={(e) => setCustomInstallmentInput(e.target.value)}
                        placeholder={
                          installmentCount <= 1
                            ? 'À vista'
                            : installmentSummary.unitAmount.toFixed(2)
                        }
                        className="w-full px-2.5 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-400"
                      />
                      {installmentSummary.isCustomValue && (
                        <button
                          type="button"
                          onClick={() => setCustomInstallmentInput('')}
                          title="Voltar ao cálculo automático"
                          className="px-2 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-[10px] font-extrabold text-zinc-700 cursor-pointer shrink-0"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {installmentCount > 1 && (
                    <div className="sm:col-span-5">
                      <div className="inline-flex rounded-lg border border-zinc-300 bg-white p-0.5 w-full">
                        <button
                          type="button"
                          onClick={() => setInstallmentInterestFree(true)}
                          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                            installmentInterestFree
                              ? 'bg-zinc-950 text-[#FFBE00]'
                              : 'text-zinc-600 hover:text-zinc-900'
                          }`}
                        >
                          Sem juros
                        </button>
                        <button
                          type="button"
                          onClick={() => setInstallmentInterestFree(false)}
                          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                            !installmentInterestFree
                              ? 'bg-zinc-950 text-[#FFBE00]'
                              : 'text-zinc-600 hover:text-zinc-900'
                          }`}
                        >
                          Negociado
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={installmentCount > 1 ? 'sm:col-span-7' : 'sm:col-span-12'}>
                    <input
                      id="seller-quote-payment-notes"
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Detalhe opcional do pagamento (ex: Entrada 30% + 2x no boleto 30/60d)"
                      className="w-full px-3 py-2 bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs text-zinc-900"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Step 2: Add Products (With Photos!) or Custom Item + Individual Item Edit */}
            <section className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#FFBE00] text-zinc-950 font-mono text-xs font-extrabold flex items-center justify-center">
                    2
                  </span>
                  <h2 className="font-display text-base font-extrabold text-zinc-900">
                    Produtos &amp; Itens do Orçamento
                  </h2>
                </div>
                <button
                  type="button"
                  data-testid="open-seller-custom-product-btn"
                  onClick={() => setShowCustomItemForm((prev) => !prev)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#FDE68A] text-amber-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>
                    {showCustomItemForm
                      ? 'Fechar Cadastro'
                      : '+ Cadastrar Produto p/ Orçamento'}
                  </span>
                </button>
              </div>

              {/* Quote-Only Seller Product Registration Form (Strictly Isolated from Global Catalog) */}
              {showCustomItemForm && (
                <div
                  data-testid="seller-custom-product-form"
                  className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono uppercase font-extrabold text-amber-900 block">
                        Cadastrar Produto Exclusivo para Orçamentos
                      </span>
                      <p className="text-[11px] text-amber-900/80 mt-0.5">
                        Não encontrou no catálogo? Cadastre aqui — este produto fica disponível <strong>somente na Área do Vendedor</strong> e <strong>não aparece na loja nem no cadastro global</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-6">
                      <label
                        htmlFor="seller-custom-prod-title"
                        className="block text-[10px] font-bold text-amber-950 mb-0.5"
                      >
                        Nome do Produto *
                      </label>
                      <input
                        id="seller-custom-prod-title"
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="Ex: Bombona Cloro Ativo 20L"
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label
                        htmlFor="seller-custom-prod-sku"
                        className="block text-[10px] font-bold text-amber-950 mb-0.5"
                      >
                        SKU (opcional)
                      </label>
                      <input
                        id="seller-custom-prod-sku"
                        type="text"
                        value={customSku}
                        onChange={(e) => setCustomSku(e.target.value.toUpperCase())}
                        placeholder="Auto (ORC-001)"
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label
                        htmlFor="seller-custom-prod-volume"
                        className="block text-[10px] font-bold text-amber-950 mb-0.5"
                      >
                        Embalagem / Un.
                      </label>
                      <input
                        id="seller-custom-prod-volume"
                        type="text"
                        value={customVolume}
                        onChange={(e) => setCustomVolume(e.target.value)}
                        placeholder="Ex: 20L, Caixa c/ 12"
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-3">
                      <label
                        htmlFor="seller-custom-prod-price"
                        className="block text-[10px] font-bold text-amber-950 mb-0.5"
                      >
                        Preço Unitário (R$)
                      </label>
                      <input
                        id="seller-custom-prod-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={customUnitPrice}
                        onChange={(e) => setCustomUnitPrice(e.target.value)}
                        placeholder="0,00"
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="seller-custom-prod-qty"
                        className="block text-[10px] font-bold text-amber-950 mb-0.5"
                      >
                        Qtd Inicial
                      </label>
                      <input
                        id="seller-custom-prod-qty"
                        type="number"
                        min="1"
                        value={customQty}
                        onChange={(e) => setCustomQty(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
                      />
                    </div>
                    <div className="sm:col-span-7">
                      <label
                        htmlFor="seller-custom-prod-note"
                        className="block text-[10px] font-bold text-amber-950 mb-0.5"
                      >
                        Observação padrão (opcional)
                      </label>
                      <input
                        id="seller-custom-prod-note"
                        type="text"
                        value={customItemNote}
                        onChange={(e) => setCustomItemNote(e.target.value)}
                        placeholder="Ex: Produto sob encomenda · Prazo de entrega 48h"
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900"
                      />
                    </div>
                  </div>

                  {/* Optional Product Photo Upload or URL */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-0.5">
                    {customImageUrl && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-zinc-300 shrink-0">
                        <ProductImageWithFallback
                          src={customImageUrl}
                          alt="Prévia do produto"
                          variant="thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <label className="px-3 py-2 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5 text-amber-700" />
                      <span>
                        {customImageUploading ? 'Enviando...' : 'Foto do Computador'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadCustomProductImage}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="Ou cole o link (URL) da foto do produto (opcional)"
                      className="flex-1 px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-amber-200/80">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-amber-950 cursor-pointer">
                      <input
                        id="seller-save-to-quote-catalog"
                        type="checkbox"
                        checked={saveToSellerCatalog}
                        onChange={(e) => setSaveToSellerCatalog(e.target.checked)}
                        className="w-4 h-4 accent-zinc-950 cursor-pointer"
                      />
                      <span>
                        Salvar na lista exclusiva de orçamentos (reutilizar depois, sem ir para a loja)
                      </span>
                    </label>

                    <button
                      type="button"
                      data-testid="submit-seller-custom-product-btn"
                      onClick={handleAddCustomItem}
                      className="px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {saveToSellerCatalog
                          ? 'Cadastrar Só p/ Orçamentos & Adicionar'
                          : 'Adicionar Apenas Neste Orçamento'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Catalog Search Bar + Category Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="seller-catalog-search"
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Buscar produto ou kit por nome, SKU (ex: QMP-101) ou embalagem (5L, 500mL)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAFA] border border-zinc-300 focus:bg-white focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs font-medium text-zinc-900"
                  />
                </div>
                <select
                  aria-label="Filtrar catálogo por categoria"
                  value={catalogCategoryFilter}
                  onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                  className="sm:w-56 px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 cursor-pointer"
                >
                  <option value="all">Todas as categorias</option>
                  {sellerCustomProducts.length > 0 && (
                    <option value="__seller_custom__">
                      ★ Só p/ Orçamento ({sellerCustomProducts.length})
                    </option>
                  )}
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Catalog Results WITH PRODUCT IMAGES */}
              <div
                data-testid="seller-catalog-results"
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-0.5"
              >
                {catalogMatches.length === 0 ? (
                  <div className="sm:col-span-2 p-5 rounded-xl bg-[#FAFAFA] border border-dashed border-zinc-300 text-center space-y-2.5">
                    <p className="text-xs font-bold text-zinc-700">
                      Nenhum produto encontrado para &ldquo;{catalogSearch}&rdquo;.
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Você pode cadastrar este produto somente para uso nos seus orçamentos sem alterar o catálogo global da loja.
                    </p>
                    <button
                      type="button"
                      data-testid="empty-search-register-btn"
                      onClick={() => handleOpenCustomProductForm(catalogSearch)}
                      className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {catalogSearch.trim()
                          ? `Cadastrar "${catalogSearch.trim()}" só p/ Orçamentos`
                          : 'Cadastrar Produto só p/ Orçamentos'}
                      </span>
                    </button>
                  </div>
                ) : (
                  catalogMatches.map((entry) => {
                    const inQuoteQty = productQtyInQuoteMap.get(entry.id) || 0;
                    const isSellerOnly = entry.kind === 'seller_custom';
                    return (
                      <div
                        key={`${entry.kind}-${entry.id}`}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors ${
                          inQuoteQty > 0
                            ? 'bg-[#FFFBEB]/80 border-[#FFBE00]'
                            : isSellerOnly
                              ? 'bg-violet-50/50 hover:bg-violet-50 border-violet-200'
                              : 'bg-[#FAFAFA] hover:bg-[#FFFBEB]/60 border-zinc-200 hover:border-amber-300'
                        }`}
                      >
                        {/* Product Thumbnail Image */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-zinc-200 shrink-0 flex items-center justify-center">
                          {entry.imageUrl ? (
                            <ProductImageWithFallback
                              src={entry.imageUrl}
                              alt={entry.title}
                              variant="thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-violet-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-zinc-500">
                              {entry.sku}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-400">
                              · {entry.volumeLabel}
                            </span>
                            {isSellerOnly && (
                              <span
                                data-testid="seller-only-product-badge"
                                className="text-[10px] font-extrabold text-violet-800 bg-violet-100 border border-violet-200 px-1.5 py-0.5 rounded-md"
                              >
                                Só Orçamento
                              </span>
                            )}
                            {inQuoteQty > 0 && (
                              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                                {inQuoteQty}x
                              </span>
                            )}
                          </div>
                          <p
                            title={entry.title}
                            className="text-xs font-bold text-zinc-900 truncate"
                          >
                            {entry.title}
                          </p>
                          <div className="flex items-center justify-between gap-1.5 mt-0.5">
                            <span className="font-mono text-xs font-extrabold text-emerald-700">
                              {hidePrices ? 'Sob consulta' : formatCurrency(entry.price)}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {isSellerOnly && onSaveSellerCustomProducts && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteSellerCustomProduct(entry.id)
                                  }
                                  title="Remover da lista de produtos só p/ orçamento"
                                  aria-label={`Remover produto exclusivo ${entry.title}`}
                                  className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleAddCatalogEntry(entry)}
                                className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Adicionar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Items Editable Table (with Thumbnail + Individual Product Editor) */}
              <div className="pt-2 border-t border-zinc-100 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                  <span className="font-extrabold text-zinc-800">
                    Itens Selecionados ({items.length} · {totals.totalUnits} un.)
                  </span>
                  {items.length > 0 && (
                    <span className="text-[11px] text-zinc-500">
                      Alterações de preço ou nome valem <strong className="text-zinc-700">somente para este orçamento</strong> (não alteram o catálogo global)
                    </span>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-zinc-300 bg-[#FAFAFA] text-center space-y-1">
                    <Package className="w-6 h-6 text-zinc-400 mx-auto" />
                    <p className="text-xs font-bold text-zinc-700">
                      Nenhum produto adicionado ainda
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Clique em &ldquo;+ Adicionar&rdquo; nos produtos acima ou inclua um item avulso.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {items.map((item) => {
                      const isEditingThis = editingItemId === item.id;
                      const hasCustomQuotePrice =
                        !hidePrices &&
                        item.catalogPrice !== undefined &&
                        Math.abs(item.catalogPrice - item.unitPrice) > 0.009;

                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border transition-colors ${
                            isEditingThis
                              ? 'bg-[#FFFBEB]/60 border-[#FFBE00] shadow-xs'
                              : 'bg-white border-zinc-200'
                          }`}
                        >
                          <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#FAFAFA] border border-zinc-200 shrink-0 flex items-center justify-center">
                                {item.imageUrl ? (
                                  <ProductImageWithFallback
                                    src={item.imageUrl}
                                    alt={item.title}
                                    variant="thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-violet-500" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-[10px] font-bold text-zinc-500">
                                    {item.sku || 'AVULSO'}
                                  </span>
                                  {item.volumeLabel && (
                                    <span className="text-[10px] font-semibold text-zinc-400">
                                      · {item.volumeLabel}
                                    </span>
                                  )}
                                  {hasCustomQuotePrice && (
                                    <>
                                      <span className="text-[10px] font-mono text-zinc-400 line-through">
                                        Tabela: {formatCurrency(item.catalogPrice!)}
                                      </span>
                                      <span
                                        data-testid="quote-only-price-badge"
                                        className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded"
                                      >
                                        Só neste orçamento
                                      </span>
                                    </>
                                  )}
                                </div>
                                <p className="text-xs font-extrabold text-zinc-900 truncate">
                                  {item.title}
                                </p>
                                {item.itemNote && (
                                  <p className="text-[11px] text-amber-800 font-medium truncate">
                                    Obs.: {item.itemNote}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {/* Qty Stepper */}
                              <div className="inline-flex items-center rounded-lg border border-zinc-300 bg-[#FAFAFA]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateItemQty(item.id, item.quantity - 1)
                                  }
                                  aria-label="Diminuir quantidade"
                                  className="p-1.5 text-zinc-600 hover:text-zinc-950 cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateItemQty(item.id, Number(e.target.value))
                                  }
                                  aria-label={`Quantidade de ${item.title}`}
                                  className="w-11 text-center font-mono text-xs font-bold text-zinc-900 bg-transparent focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateItemQty(item.id, item.quantity + 1)
                                  }
                                  aria-label="Aumentar quantidade"
                                  className="p-1.5 text-zinc-600 hover:text-zinc-950 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Editable Negotiated Unit Price */}
                              <div
                                className={`flex items-center gap-1 border rounded-lg px-2 py-1 ${
                                  hidePrices
                                    ? 'bg-zinc-100 border-zinc-200 opacity-70'
                                    : 'bg-[#FAFAFA] border-zinc-300'
                                }`}
                              >
                                <span className="text-[10px] font-mono text-zinc-500">
                                  R$
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    handleUpdateItemPrice(item.id, e.target.value)
                                  }
                                  aria-label={`Preço unitário de ${item.title}`}
                                  className="w-16 font-mono text-xs font-bold text-zinc-900 bg-transparent focus:outline-none"
                                />
                              </div>

                              <span className="font-mono text-xs font-extrabold text-zinc-950 w-20 text-right tabular-nums">
                                {hidePrices ? (
                                  <span className="text-[10px] font-sans uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                    Oculto
                                  </span>
                                ) : (
                                  formatCurrency(item.subtotal)
                                )}
                              </span>

                              {/* Individual Item Edit Toggle */}
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingItemId(isEditingThis ? null : item.id)
                                }
                                aria-label={`Editar item ${item.title}`}
                                title="Editar produto individual"
                                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                  isEditingThis
                                    ? 'bg-zinc-950 text-[#FFBE00]'
                                    : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'
                                }`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                aria-label={`Remover ${item.title}`}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Expandable Individual Product Editor */}
                          {isEditingThis && (
                            <div className="px-3 pb-3 pt-2.5 border-t border-amber-200/80 space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono uppercase font-extrabold text-amber-900">
                                  Edição Individual · Somente neste orçamento (não altera o catálogo global)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingItemId(null)}
                                  className="text-[11px] font-extrabold text-zinc-900 hover:text-amber-800 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Concluir edição</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                <div className="sm:col-span-6">
                                  <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">
                                    Descrição / Nome no Orçamento
                                  </label>
                                  <input
                                    type="text"
                                    aria-label="Editar nome do item"
                                    value={item.title}
                                    onChange={(e) =>
                                      handleUpdateItemFields(item.id, {
                                        title: e.target.value,
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-900"
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">
                                    SKU / Código
                                  </label>
                                  <input
                                    type="text"
                                    aria-label="Editar SKU do item"
                                    value={item.sku || ''}
                                    onChange={(e) =>
                                      handleUpdateItemFields(item.id, {
                                        sku: e.target.value.toUpperCase(),
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900"
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">
                                    Embalagem / Un.
                                  </label>
                                  <input
                                    type="text"
                                    aria-label="Editar embalagem do item"
                                    value={item.volumeLabel || ''}
                                    onChange={(e) =>
                                      handleUpdateItemFields(item.id, {
                                        volumeLabel: e.target.value,
                                      })
                                    }
                                    placeholder="Ex: 5L, Caixa c/ 6"
                                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                <div className="sm:col-span-7">
                                  <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">
                                    Observação específica deste item (aparece no PDF e WhatsApp)
                                  </label>
                                  <input
                                    type="text"
                                    aria-label="Observação do item"
                                    value={item.itemNote || ''}
                                    onChange={(e) =>
                                      handleUpdateItemFields(item.id, {
                                        itemNote: e.target.value,
                                      })
                                    }
                                    placeholder="Ex: Fragrância Lavanda · Entregar em bombona lacrada"
                                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900"
                                  />
                                </div>

                                <div className="sm:col-span-5 flex flex-wrap items-center gap-1 justify-end">
                                  <span className="text-[10px] font-bold text-zinc-500 mr-0.5">
                                    Desc. item:
                                  </span>
                                  {[5, 10, 15].map((pct) => (
                                    <button
                                      key={pct}
                                      type="button"
                                      onClick={() =>
                                        handleApplyItemPercentDiscount(item, pct)
                                      }
                                      className="px-2 py-1 rounded-md bg-white hover:bg-zinc-950 hover:text-[#FFBE00] border border-zinc-300 text-[10px] font-mono font-bold text-zinc-800 cursor-pointer transition-colors"
                                    >
                                      -{pct}%
                                    </button>
                                  ))}
                                  {item.catalogPrice !== undefined &&
                                    item.unitPrice !== item.catalogPrice && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdateItemFields(item.id, {
                                            unitPrice: item.catalogPrice!,
                                          })
                                        }
                                        className="px-2 py-1 rounded-md bg-zinc-200 hover:bg-zinc-300 text-[10px] font-bold text-zinc-800 cursor-pointer"
                                      >
                                        Tabela
                                      </button>
                                    )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Step 3: Price Visibility Mode + Discount (% or R$) + Delivery Fee + Notes */}
            <section className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#FFBE00] text-zinc-950 font-mono text-xs font-extrabold flex items-center justify-center">
                  3
                </span>
                <h2 className="font-display text-base font-extrabold text-zinc-900">
                  Exibição de Valores, Desconto &amp; Observações
                </h2>
              </div>

              {/* Hidden Price Checkbox Toggle */}
              <label
                htmlFor="seller-quote-hide-prices"
                className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-colors ${
                  hidePrices
                    ? 'bg-[#FFFBEB] border-[#FFBE00]'
                    : 'bg-[#FAFAFA] border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <input
                  id="seller-quote-hide-prices"
                  type="checkbox"
                  checked={hidePrices}
                  onChange={(e) => setHidePrices(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-zinc-950 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-zinc-950 inline-flex items-center gap-1.5">
                      {hidePrices ? (
                        <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                      )}
                      <span>Preço Oculto — Não exibir valores no orçamento (Sob Consulta)</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase font-extrabold px-2 py-0.5 rounded-md ${
                        hidePrices
                          ? 'bg-zinc-950 text-[#FFBE00]'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {hidePrices ? 'Valores Ocultos' : 'Com Preço Visível'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    Marque esta caixa quando quiser enviar a lista de produtos, quantidades e condições pelo PDF e WhatsApp <strong>sem revelar os preços unitários nem o valor total</strong>.
                  </p>
                </div>
              </label>

              {/* Discount (% or R$) + Freight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="seller-quote-discount"
                      className="text-[11px] font-bold text-zinc-700"
                    >
                      Desconto Comercial
                    </label>
                    <div className="inline-flex rounded-lg border border-zinc-300 bg-[#FAFAFA] p-0.5">
                      <button
                        type="button"
                        data-discount-mode="percent"
                        onClick={() => handleSwitchDiscountType('percent')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                          discountType === 'percent'
                            ? 'bg-zinc-950 text-[#FFBE00]'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        <Percent className="w-3 h-3" />
                        <span>%</span>
                      </button>
                      <button
                        type="button"
                        data-discount-mode="fixed"
                        onClick={() => handleSwitchDiscountType('fixed')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                          discountType === 'fixed'
                            ? 'bg-zinc-950 text-[#FFBE00]'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>R$</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative flex items-center">
                    {discountType === 'fixed' && (
                      <span className="absolute left-3 font-mono text-xs font-bold text-zinc-500">
                        R$
                      </span>
                    )}
                    <input
                      id="seller-quote-discount"
                      type="number"
                      min="0"
                      max={discountType === 'percent' ? '100' : undefined}
                      step="0.5"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className={`w-full py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-900 ${
                        discountType === 'fixed' ? 'pl-9 pr-3' : 'pl-3 pr-8'
                      }`}
                    />
                    {discountType === 'percent' && (
                      <span className="absolute right-3 font-mono text-xs font-bold text-zinc-500">
                        %
                      </span>
                    )}
                  </div>

                  {/* Quick Discount Presets */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(discountType === 'percent' ? [5, 10, 15] : [10, 25, 50]).map(
                      (val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setDiscountInput(String(val))}
                          className="px-2 py-0.5 rounded-md bg-[#FAFAFA] hover:bg-zinc-950 hover:text-[#FFBE00] border border-zinc-200 text-[10px] font-mono font-bold text-zinc-700 cursor-pointer transition-colors"
                        >
                          {discountType === 'percent' ? `${val}%` : `R$ ${val}`}
                        </button>
                      )
                    )}
                    {totals.discountAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => setDiscountInput('0')}
                        className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-[10px] font-bold text-rose-700 cursor-pointer"
                      >
                        Zerar
                      </button>
                    )}
                    {totals.discountAmount > 0 && (
                      <span className="text-[10px] font-mono font-bold text-emerald-700 ml-auto">
                        -{formatCurrency(totals.discountAmount)} ({totals.discountPercent}%)
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="seller-quote-delivery-fee"
                    className="block text-[11px] font-bold text-zinc-700 mb-2"
                  >
                    Taxa de Entrega / Frete (R$)
                  </label>
                  <input
                    id="seller-quote-delivery-fee"
                    type="number"
                    min="0"
                    step="0.5"
                    value={deliveryFeeInput}
                    onChange={(e) => setDeliveryFeeInput(e.target.value)}
                    disabled={deliveryType === 'pickup'}
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-900 disabled:opacity-60"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1.5">
                    {deliveryType === 'pickup'
                      ? 'Retirada no balcão selecionada (frete zerado).'
                      : 'Informe o frete negociado ou deixe 0 para "Grátis / A combinar".'}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="seller-quote-notes"
                  className="block text-[11px] font-bold text-zinc-700 mb-1"
                >
                  Observações Comerciais (aparecem no PDF e no WhatsApp)
                </label>
                <textarea
                  id="seller-quote-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Condição especial para pagamento via PIX · Entrega programada em até 24h na Grande Cuiabá..."
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 focus:bg-white focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs text-zinc-900"
                />
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (5 cols): Sticky Live Quote Preview + PDF & WhatsApp Dispatch */}
          <aside className="xl:col-span-5 xl:sticky xl:top-20 space-y-4">
            <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-sm overflow-hidden">
              {/* Mini Branded Proposal Header */}
              <div className="bg-zinc-950 text-white px-5 py-4 border-b-4 border-[#FFBE00] flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase font-extrabold text-[#FFBE00] block">
                    {hidePrices
                      ? `PRÉVIA SOB CONSULTA · ${settings.storeName || 'LIMPER MT'}`
                      : `PRÉVIA DO ORÇAMENTO · ${settings.storeName || 'LIMPER MT'}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono text-lg font-extrabold text-white">
                      {nextQuoteIdPreview}
                    </h3>
                    {hidePrices && (
                      <span className="px-2 py-0.5 rounded bg-[#FFBE00] text-zinc-950 text-[10px] font-extrabold uppercase">
                        Preço Oculto
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-[11px] text-zinc-300">
                  <div className="font-bold text-white">
                    {currentAdminUser?.name || 'Vendedor'}
                  </div>
                  <div className="font-mono text-[10px]">
                    Validade: {validUntilDate ? formatBrDateFromYmd(validUntilDate) : '—'}
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Summary Customer */}
                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-zinc-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-extrabold text-zinc-900">
                    <User className="w-3.5 h-3.5 text-[#E3262E]" />
                    <span>{customerName.trim() || 'Informe o nome do cliente'}</span>
                  </div>
                  {(customerCompany || customerDocument) && (
                    <div className="text-[11px] text-zinc-600">
                      {[customerCompany, customerDocument].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  <div className="text-[11px] text-zinc-500">
                    {deliveryType === 'pickup'
                      ? 'Retirada no Balcão (Grátis)'
                      : `Delivery (${customerCity || 'MT'})`}
                  </div>
                  <div
                    data-testid="seller-preview-payment"
                    className="text-[11px] font-bold text-zinc-800 pt-0.5"
                  >
                    💳 {livePaymentSummary}
                  </div>
                </div>

                {/* Compact Items Recap */}
                {items.length > 0 && (
                  <div className="max-h-[175px] overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-xl px-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="py-2 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div>
                            <span className="font-mono font-bold text-zinc-900">
                              {item.quantity}x
                            </span>{' '}
                            <span className="font-semibold text-zinc-800">
                              {item.title}
                            </span>
                            {item.volumeLabel && (
                              <span className="text-[10px] text-zinc-400 ml-1">
                                ({item.volumeLabel})
                              </span>
                            )}
                          </div>
                          {item.itemNote && (
                            <div className="text-[10px] text-amber-800">
                              Obs.: {item.itemNote}
                            </div>
                          )}
                        </div>
                        <span className="font-mono font-bold text-zinc-900 shrink-0 tabular-nums">
                          {hidePrices ? (
                            <span className="text-[10px] font-sans uppercase text-amber-800">
                              Sob consulta
                            </span>
                          ) : (
                            formatCurrency(item.subtotal)
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals Block (or Hidden Prices Box) */}
                <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-1.5 text-xs">
                  {hidePrices ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-amber-900">
                        <span className="font-bold">Itens no orçamento</span>
                        <strong className="font-mono">
                          {items.length} prod. · {totals.totalUnits} un.
                        </strong>
                      </div>
                      <div className="pt-2 mt-1 border-t border-amber-300/70 flex items-center justify-between">
                        <span className="font-display text-sm font-extrabold text-zinc-950">
                          VALORES NO ENVIO
                        </span>
                        <span
                          data-testid="seller-quote-total"
                          className="font-mono text-sm font-extrabold uppercase text-amber-900 bg-amber-200/70 px-2.5 py-1 rounded-lg"
                        >
                          Sob Consulta
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-zinc-700">
                        <span>Subtotal ({totals.totalUnits} un.)</span>
                        <strong className="font-mono tabular-nums">
                          {formatCurrency(totals.subtotal)}
                        </strong>
                      </div>
                      {totals.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>
                            {totals.discountType === 'fixed'
                              ? `Desconto (R$ · ${totals.discountPercent}%)`
                              : `Desconto (${totals.discountPercent}%)`}
                          </span>
                          <strong className="font-mono tabular-nums">
                            -{formatCurrency(totals.discountAmount)}
                          </strong>
                        </div>
                      )}
                      <div className="flex justify-between text-zinc-700">
                        <span>Entrega / Frete</span>
                        <strong className="font-mono tabular-nums">
                          {totals.deliveryFee > 0
                            ? formatCurrency(totals.deliveryFee)
                            : 'Grátis / A combinar'}
                        </strong>
                      </div>
                      <div className="pt-2 mt-1 border-t border-amber-300/70 flex items-baseline justify-between">
                        <span className="font-display text-sm font-extrabold text-zinc-950">
                          TOTAL DO ORÇAMENTO
                        </span>
                        <span
                          data-testid="seller-quote-total"
                          className="font-mono text-xl font-extrabold text-zinc-950 tabular-nums"
                        >
                          {formatCurrency(totals.total)}
                        </span>
                      </div>
                      {installmentCount > 1 && (
                        <div className="text-right font-mono text-[11px] font-bold text-amber-900">
                          ou {installmentSummary.count}x de{' '}
                          {formatCurrency(installmentSummary.unitAmount)}
                          {installmentInterestFree && !installmentSummary.isCustomValue
                            ? ' sem juros'
                            : ''}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* WhatsApp Destination Choice */}
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-extrabold text-zinc-700 uppercase font-mono">
                    Destino do Envio no WhatsApp
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors bg-emerald-50/70 border-emerald-300">
                      <span className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                        <input
                          type="radio"
                          name="seller-wa-target"
                          checked={whatsappTargetMode === 'system'}
                          onChange={() => setWhatsappTargetMode('system')}
                          className="accent-emerald-700"
                        />
                        <span>WhatsApp Cadastrado no Sistema</span>
                      </span>
                      <span className="font-mono text-[11px] font-extrabold text-emerald-800">
                        {activeSystemWaDisplay}
                      </span>
                    </label>

                    <label
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-colors ${
                        customerNormalizedWa
                          ? 'bg-white border-zinc-200 hover:border-zinc-300 cursor-pointer'
                          : 'bg-zinc-50 border-zinc-200 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-xs font-bold text-zinc-800">
                        <input
                          type="radio"
                          name="seller-wa-target"
                          disabled={!customerNormalizedWa}
                          checked={
                            whatsappTargetMode === 'customer' &&
                            Boolean(customerNormalizedWa)
                          }
                          onChange={() => setWhatsappTargetMode('customer')}
                          className="accent-emerald-700"
                        />
                        <span>WhatsApp do Cliente</span>
                      </span>
                      <span className="font-mono text-[11px] font-bold text-zinc-500">
                        {customerNormalizedWa
                          ? formatStoreWhatsAppDisplay(customerNormalizedWa)
                          : 'Informe telefone'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Primary Actions: Combo, PDF Only, WhatsApp Only */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handlePdfAndWhatsAppCombo}
                    className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>Gerar PDF + Enviar no WhatsApp</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadPdfAction}
                      className="py-2.5 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] font-extrabold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendWhatsAppAction}
                      data-whatsapp-url={directPreviewWhatsAppUrl}
                      className="py-2.5 px-3 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Enviar WhatsApp</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={handleSaveDraftAction}
                      className="py-2 px-2.5 rounded-xl bg-[#FAFAFA] hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-bold cursor-pointer"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppText}
                      className="py-2 px-2.5 rounded-xl bg-[#FAFAFA] hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedSummary ? 'Copiado!' : 'Copiar Texto'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetBuilderForm}
                      className="py-2 px-2.5 rounded-xl bg-[#FAFAFA] hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 text-zinc-600 hover:text-rose-700 text-[11px] font-bold cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* SUBVIEW 2: SAVED QUOTES HISTORY */}
      {subView === 'history' && (
        <section className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-extrabold text-zinc-900">
                Histórico de Orçamentos ({filteredHistoryQuotes.length})
              </h2>
              <p className="text-xs text-zinc-500">
                Baixe o PDF novamente, reenvie pelo WhatsApp ativo ({activeSystemWaDisplay}) ou duplique um orçamento em 1 clique.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Buscar por código, cliente ou produto..."
                  className="pl-8 pr-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs w-60"
                />
              </div>

              {(isMaster || currentAdminUser?.role === 'manager') &&
                sellerFilterOptions.length > 1 && (
                  <select
                    aria-label="Filtrar por vendedor"
                    value={historySellerFilter}
                    onChange={(e) => setHistorySellerFilter(e.target.value)}
                    className="px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 cursor-pointer"
                  >
                    <option value="all">Todos os vendedores</option>
                    {sellerFilterOptions.map(([key, name]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                  </select>
                )}
            </div>
          </div>

          {filteredHistoryQuotes.length === 0 ? (
            <div className="p-10 rounded-2xl border border-dashed border-zinc-300 bg-[#FAFAFA] text-center space-y-2">
              <FileText className="w-7 h-7 text-zinc-400 mx-auto" />
              <p className="text-sm font-extrabold text-zinc-800">
                Nenhum orçamento registrado ainda
              </p>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Monte seu primeiro orçamento na aba &ldquo;Novo Orçamento&rdquo; para gerar o PDF e enviar para o WhatsApp cadastrado.
              </p>
              <button
                type="button"
                onClick={() => setSubView('builder')}
                className="mt-2 px-4 py-2 rounded-xl bg-zinc-950 text-[#FFBE00] text-xs font-extrabold cursor-pointer"
              >
                Criar Primeiro Orçamento
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistoryQuotes.map((quote) => {
                const reSendUrl = buildSellerQuoteWhatsAppUrl(
                  activeSystemWaNumber,
                  quote,
                  settings
                );
                return (
                  <div
                    key={quote.id}
                    className="p-4 rounded-2xl bg-[#FAFAFA] border border-zinc-200 hover:border-zinc-300 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3.5"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-zinc-950 text-[#FFBE00]">
                          {quote.id}
                        </span>
                        <strong className="text-sm font-extrabold text-zinc-950">
                          {quote.customerName}
                        </strong>
                        {quote.customerCompany && (
                          <span className="text-xs text-zinc-500">
                            · {quote.customerCompany}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            quote.status === 'sent_whatsapp'
                              ? 'bg-emerald-100 text-emerald-800'
                              : quote.status === 'pdf_generated'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-zinc-200 text-zinc-700'
                          }`}
                        >
                          {quote.status === 'sent_whatsapp'
                            ? 'Enviado WhatsApp'
                            : quote.status === 'pdf_generated'
                              ? 'PDF Gerado'
                              : 'Rascunho'}
                        </span>
                        {quote.hidePrices && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-200">
                            Preço Oculto
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-600">
                        <span>
                          Vendedor: <strong>{quote.sellerName}</strong>
                        </span>
                        <span>·</span>
                        <span>{quote.items.length} item(ns)</span>
                        <span>·</span>
                        <span>
                          Validade: {formatBrDateFromYmd(quote.validUntilDate)}
                        </span>
                        <span>·</span>
                        <span>{formatSellerQuotePaymentSummary(quote)}</span>
                        <span>·</span>
                        <span className="font-mono font-extrabold text-zinc-950">
                          {quote.hidePrices ? 'Sob Consulta' : formatCurrency(quote.total)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const file = downloadSellerQuotePdf(quote, settings);
                          showFeedback(`PDF "${file}" baixado novamente.`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>

                      <a
                        href={reSendUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 text-[11px] font-extrabold inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setPreviewModalQuote(quote)}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadQuoteIntoBuilder(quote, false)}
                        title="Editar orçamento"
                        className="p-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-600 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadQuoteIntoBuilder(quote, true)}
                        title="Duplicar orçamento"
                        className="p-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-600 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSavedQuote(quote)}
                        title="Excluir orçamento"
                        className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 text-zinc-500 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Printable Quote Detail Modal */}
      {previewModalQuote && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewModalQuote(null);
          }}
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90dvh] flex flex-col border border-zinc-200 shadow-2xl overflow-hidden my-auto">
            <div className="shrink-0 bg-zinc-950 text-white px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-2 border-b-4 border-[#FFBE00]">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase font-extrabold text-[#FFBE00] block truncate">
                  {previewModalQuote.hidePrices
                    ? `ORÇAMENTO SOB CONSULTA · ${settings.storeName}`
                    : `ORÇAMENTO COMERCIAL · ${settings.storeName}`}
                </span>
                <h3 className="font-mono text-base sm:text-lg font-extrabold truncate">
                  {previewModalQuote.id} · {previewModalQuote.customerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalQuote(null)}
                aria-label="Fechar visualização"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#FAFAFA] border border-zinc-200">
                <div>
                  <span className="text-zinc-500 block">Vendedor</span>
                  <strong>{previewModalQuote.sellerName}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Validade</span>
                  <strong className="font-mono">
                    {formatBrDateFromYmd(previewModalQuote.validUntilDate)}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Pagamento</span>
                  <strong>{formatSellerQuotePaymentSummary(previewModalQuote)}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">WhatsApp Destino</span>
                  <strong className="font-mono">
                    {previewModalQuote.targetWhatsappDisplay}
                  </strong>
                </div>
              </div>

              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl px-3 max-h-[240px] overflow-y-auto">
                {previewModalQuote.items.map((item) => (
                  <div
                    key={item.id}
                    className="py-2 flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#FAFAFA] border border-zinc-200 shrink-0">
                        <ProductImageWithFallback
                          src={item.imageUrl || ''}
                          alt={item.title}
                          variant="thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <strong className="block truncate">
                          {item.quantity}x {item.title}
                        </strong>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {[item.sku, item.volumeLabel].filter(Boolean).join(' · ')}
                        </span>
                        {item.itemNote && (
                          <span className="block text-[10px] text-amber-800">
                            Obs.: {item.itemNote}
                          </span>
                        )}
                      </div>
                    </div>
                    <strong className="font-mono tabular-nums shrink-0">
                      {previewModalQuote.hidePrices
                        ? 'Sob Consulta'
                        : formatCurrency(item.subtotal)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
                <span className="font-display text-sm font-extrabold">
                  {previewModalQuote.hidePrices ? 'VALORES NO ENVIO' : 'TOTAL GERAL'}
                </span>
                <span className="font-mono text-lg font-extrabold">
                  {previewModalQuote.hidePrices
                    ? 'Sob Consulta'
                    : formatCurrency(previewModalQuote.total)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => downloadSellerQuotePdf(previewModalQuote, settings)}
                  className="px-4 py-2 rounded-xl bg-zinc-950 text-[#FFBE00] font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </button>
                <a
                  href={buildSellerQuoteWhatsAppUrl(
                    activeSystemWaNumber,
                    previewModalQuote,
                    settings
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#25D366] text-zinc-950 font-extrabold text-xs inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Enviar no WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
