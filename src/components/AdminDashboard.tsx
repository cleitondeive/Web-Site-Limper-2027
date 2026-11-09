import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Calendar,
  Check,
  Clock,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FolderKanban,
  Gift,
  History,
  Image as ImageIcon,
  Layers,
  Link2,
  ListFilter,
  Lock,
  Megaphone,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  TicketPercent,
  Trash2,
  Truck,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  BannerSlotType,
  BannerThemeType,
  Category,
  CategoryIconName,
  DeliveryType,
  Order,
  OrderDatePreset,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductStatus,
  PromoBanner,
  PromoCoupon,
  PromoKit,
  StoreSettings,
  UnitOfMeasure,
} from '../types/commerce';
import {
  ORDER_STATUS_META,
  filterOrdersByCriteria,
  formatCurrency,
  formatPaymentMethodLabel,
  formatPhone,
  getAdjacentOrderStatus,
  getEffectivePrice,
  normalizePhone,
  summarizeOrdersPeriod,
  toDateKeyYmd,
  transitionOrderStatus,
} from '../utils/commerce';
import {
  GENERATED_IMAGES,
  INITIAL_BANNERS,
  INITIAL_COUPONS,
  LIMPER_LOGO_URL,
} from '../data/initialCatalog';
import { CategoryIcon, ProductImageWithFallback } from './CategoryIcon';

interface AdminDashboardProps {
  categories: Category[];
  products: Product[];
  kits: PromoKit[];
  coupons?: PromoCoupon[];
  banners?: PromoBanner[];
  orders: Order[];
  settings: StoreSettings;
  onSaveCategories: (categories: Category[]) => void;
  onSaveProducts: (products: Product[]) => void;
  onSaveKits: (kits: PromoKit[]) => void;
  onSaveCoupons?: (coupons: PromoCoupon[]) => void;
  onSaveBanners?: (banners: PromoBanner[]) => void;
  onSaveOrders: (orders: Order[]) => void;
  onSaveSettings: (settings: StoreSettings) => void;
  onBackToStore: () => void;
}

const KANBAN_COLUMNS: OrderStatus[] = [
  'pending_separation',
  'separating',
  'ready_or_out',
  'completed',
];

const ICON_OPTIONS: CategoryIconName[] = [
  'Home',
  'Shirt',
  'ShieldAlert',
  'Car',
  'HandHeart',
  'PawPrint',
  'Wind',
  'Sparkles',
];

type AdminAppTab =
  | 'kanban'
  | 'products'
  | 'kits'
  | 'banners'
  | 'coupons'
  | 'categories'
  | 'customers'
  | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  categories,
  products,
  kits,
  coupons = INITIAL_COUPONS,
  banners = INITIAL_BANNERS,
  orders,
  settings,
  onSaveCategories,
  onSaveProducts,
  onSaveKits,
  onSaveCoupons,
  onSaveBanners,
  onSaveOrders,
  onSaveSettings,
  onBackToStore,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('admin');
  const [loginPass, setLoginPass] = useState('limper123');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminAppTab>('kanban');
  const [adminProductSearch, setAdminProductSearch] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>('all');

  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  // Manual POS / Walk-in Order State ("Lançar Pedido Balcão / Telefone")
  const [isManualPosOpen, setIsManualPosOpen] = useState(false);
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posDeliveryType, setPosDeliveryType] = useState<DeliveryType>('pickup');
  const [posPaymentMethod, setPosPaymentMethod] = useState<PaymentMethod>('pix');
  const [posQuantities, setPosQuantities] = useState<Record<string, number>>({
    'prod-pes-1': 1,
    'prod-casa-3': 1,
  });

  // Product Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [prodTitle, setProdTitle] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCatId, setProdCatId] = useState(categories[0]?.id || 'cat-casa');
  const [prodPrice, setProdPrice] = useState('29.90');
  const [prodPromoPrice, setProdPromoPrice] = useState('24.90');
  const [prodShowPrice, setProdShowPrice] = useState<boolean>(true);
  const [prodUnit, setProdUnit] = useState<UnitOfMeasure>('L');
  const [prodVolLabel, setProdVolLabel] = useState('5L');
  const [prodStatus, setProdStatus] = useState<ProductStatus>('active');
  const [prodImage, setProdImage] = useState(GENERATED_IMAGES.prodLimpezaPesada);
  const [prodDilution, setProdDilution] = useState('');
  const [prodBadgeLabel, setProdBadgeLabel] = useState('Ofertas do Mês | Limper MT');
  const [imageUploadStatus, setImageUploadStatus] = useState<string | null>(null);

  // Category Form State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catShortName, setCatShortName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIcon, setCatIcon] = useState<CategoryIconName>('Sparkles');

  // Kit & Combo Form State ("Cadastro de Kits com Imagem + Busca na Lupa")
  const [editingKit, setEditingKit] = useState<PromoKit | null>(null);
  const [isKitFormOpen, setIsKitFormOpen] = useState(false);
  const [kitTitle, setKitTitle] = useState('');
  const [kitBadge, setKitBadge] = useState('KIT ECONÔMICO LIMPER MT');
  const [kitDesc, setKitDesc] = useState('');
  const [kitPromoPrice, setKitPromoPrice] = useState('59.90');
  const [kitShowPrice, setKitShowPrice] = useState<boolean>(true);
  const [kitActive, setKitActive] = useState<boolean>(true);
  const [kitImage, setKitImage] = useState(GENERATED_IMAGES.prodCasa);
  const [kitImageUploadStatus, setKitImageUploadStatus] = useState<string | null>(null);
  const [kitProductSearchQuery, setKitProductSearchQuery] = useState('');
  const [kitQuantities, setKitQuantities] = useState<Record<string, number>>({
    'prod-casa-1': 1,
    'prod-casa-3': 1,
    'prod-casa-4': 1,
  });

  // Product-to-Banner Placement State ("Escolher em qual banner colocar a promoção")
  const [selectedProductBannerIds, setSelectedProductBannerIds] = useState<string[]>([]);

  // Banner & Promotional Campaign Manager State
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [isBannerFormOpen, setIsBannerFormOpen] = useState(false);
  const [bannerSlot, setBannerSlot] = useState<BannerSlotType>('hero_carousel');
  const [bannerBadge, setBannerBadge] = useState('SEMANA DE OFERTAS · LIMPER MT');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerCtaText, setBannerCtaText] = useState('Aproveitar Ofertas');
  const [bannerTheme, setBannerTheme] = useState<BannerThemeType>('yellow_red');
  const [bannerImage, setBannerImage] = useState(GENERATED_IMAGES.prodLavanderia);
  const [bannerImageUploadStatus, setBannerImageUploadStatus] = useState<string | null>(null);
  const [bannerCategoryId, setBannerCategoryId] = useState<string>('cat-casa');
  const [bannerFeaturedProductIds, setBannerFeaturedProductIds] = useState<string[]>([]);
  const [bannerProductSearch, setBannerProductSearch] = useState('');
  const [bannerActive, setBannerActive] = useState(true);

  // Coupon Manager State ("Cadastrar Cupom na ADM")
  const [editingCoupon, setEditingCoupon] = useState<PromoCoupon | null>(null);
  const [isCouponFormOpen, setIsCouponFormOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDesc, setCouponDesc] = useState('');
  const [couponType, setCouponType] = useState<'percent' | 'fixed'>('percent');
  const [couponValue, setCouponValue] = useState('10');
  const [couponMinOrder, setCouponMinOrder] = useState('0');
  const [couponActive, setCouponActive] = useState(true);

  // Settings Form State
  const [formSettings, setFormSettings] = useState<StoreSettings>(settings);
  const [savedSettingsBanner, setSavedSettingsBanner] = useState(false);
  const [newNeighborhoodName, setNewNeighborhoodName] = useState('');
  const [newNeighborhoodCity, setNewNeighborhoodCity] = useState<'Cuiabá' | 'Várzea Grande'>('Várzea Grande');
  const [newNeighborhoodFee, setNewNeighborhoodFee] = useState('8.00');

  // Kanban & Order History Filter + Undo State
  const [kanbanViewMode, setKanbanViewMode] = useState<'board' | 'history_table'>('board');
  const [kanbanSearchQuery, setKanbanSearchQuery] = useState('');
  const [kanbanDatePreset, setKanbanDatePreset] = useState<OrderDatePreset>('all');
  const [kanbanStartDate, setKanbanStartDate] = useState('');
  const [kanbanEndDate, setKanbanEndDate] = useState('');
  const [kanbanDeliveryFilter, setKanbanDeliveryFilter] = useState<'all' | DeliveryType>('all');
  const [expandedHistoryOrderId, setExpandedHistoryOrderId] = useState<string | null>(null);
  const [lastStatusMove, setLastStatusMove] = useState<{
    orderId: string;
    customerName: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
  } | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (loginUser.trim().toLowerCase() === 'admin' ||
        loginUser.trim().toLowerCase() === 'limper') &&
      loginPass.trim() === 'limper123'
    ) {
      setIsAuthenticated(true);
      setLoginError(null);
    } else {
      setLoginError('Credenciais inválidas. Utilize admin / limper123.');
    }
  };

  const handleMoveOrderStatus = (
    orderId: string,
    nextStatus: OrderStatus,
    customReason?: string
  ) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder || targetOrder.status === nextStatus) return;

    const fromStatus = targetOrder.status;
    setLastStatusMove({
      orderId: targetOrder.id,
      customerName: targetOrder.customerName,
      fromStatus,
      toStatus: nextStatus,
    });

    const updated = orders.map((o) =>
      o.id === orderId ? transitionOrderStatus(o, nextStatus, customReason) : o
    );
    onSaveOrders(updated);
  };

  const handleUndoLastStatusMove = () => {
    if (!lastStatusMove) return;
    const { orderId, fromStatus } = lastStatusMove;
    const updated = orders.map((o) =>
      o.id === orderId
        ? transitionOrderStatus(
            o,
            fromStatus,
            'Desfeito pelo operador (correção de falha humana)'
          )
        : o
    );
    onSaveOrders(updated);
    setLastStatusMove(null);
  };

  const handleCreatePosOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedItems = products
      .filter((p) => (posQuantities[p.id] || 0) > 0)
      .map((p) => {
        const qty = posQuantities[p.id];
        const unitPrice = getEffectivePrice(p);
        return {
          productId: p.id,
          sku: p.sku,
          title: p.title,
          volumeLabel: p.volumeLabel,
          unitPrice,
          quantity: qty,
          subtotal: Math.round(unitPrice * qty * 100) / 100,
        };
      });

    if (selectedItems.length === 0) return;

    const subtotal = selectedItems.reduce((acc, i) => acc + i.subtotal, 0);
    const nextNum = 1043 + orders.length;
    const newPosOrder: Order = {
      id: `#LMP-${nextNum}`,
      createdAt: new Date().toISOString(),
      customerName: posCustomerName.trim() || 'Cliente Balcão VG',
      customerPhone: normalizePhone(posCustomerPhone) || '6530296824',
      items: selectedItems,
      subtotal,
      deliveryFee: 0,
      total: subtotal,
      deliveryType: posDeliveryType,
      pickupCode: `BALCÃO-${nextNum}`,
      estimatedTime: 'Atendimento Presencial / Telefone (Av. Couto Magalhães, 2820)',
      paymentMethod: posPaymentMethod,
      status: 'pending_separation',
    };

    onSaveOrders([newPosOrder, ...orders]);
    setIsManualPosOpen(false);
    setPosCustomerName('');
    setPosCustomerPhone('');
    setPrintOrder(newPosOrder);
  };

  const handleExportProductsCsv = () => {
    const headers = ['SKU', 'Produto', 'Volume', 'Preco_Regular', 'Preco_Oferta', 'Status', 'Destaque'];
    const rows = products.map((p) => [
      p.sku,
      `"${p.title.replace(/"/g, '""')}"`,
      p.volumeLabel,
      p.price.toFixed(2),
      p.promoPrice ? p.promoPrice.toFixed(2) : '',
      p.status,
      p.featured ? 'Sim' : 'Nao',
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'catalogo-limper-mt.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportOrdersCsv = () => {
    const headers = ['Pedido', 'Data', 'Cliente', 'Telefone', 'Modalidade', 'Pagamento', 'Total_R$', 'Status'];
    const rows = orders.map((o) => [
      o.id,
      new Date(o.createdAt).toLocaleDateString('pt-BR'),
      `"${o.customerName.replace(/"/g, '""')}"`,
      formatPhone(o.customerPhone),
      o.deliveryType === 'pickup' ? 'Retirada Balcao' : 'Delivery',
      o.paymentMethod.toUpperCase(),
      o.total.toFixed(2),
      o.status,
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pedidos-limper-mt.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleProductFeatured = (product: Product) => {
    onSaveProducts(
      products.map((p) =>
        p.id === product.id ? { ...p, featured: !p.featured } : p
      )
    );
  };

  const buildCustomerWhatsAppStatusUrl = (order: Order): string => {
    const cleanPhone = normalizePhone(order.customerPhone);
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const statusText = ORDER_STATUS_META[order.status].shortLabel;
    const message = [
      `🧼 *ATUALIZAÇÃO DO SEU PEDIDO ${order.id} - LIMPER MT*`,
      `Olá, *${order.customerName}*!`,
      ``,
      `Status atual: *${statusText}*`,
      order.deliveryType === 'pickup'
        ? `📍 *Local de Retirada Expressa:* ${settings.storeAddress}`
        : `🚚 *Entrega Delivery:* ${order.address?.street || ''}, ${order.address?.number || ''} - ${order.address?.neighborhood || ''}`,
      `📞 Central Limper MT: ${settings.whatsappDisplay}`,
    ].join('\n');
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProdTitle('');
    setProdSku(`QMP-${100 + products.length + 1}`);
    setProdDesc('');
    setProdCatId(categories[0]?.id || 'cat-casa');
    setProdPrice('39.90');
    setProdPromoPrice('32.90');
    setProdShowPrice(true);
    setProdUnit('L');
    setProdVolLabel('5L');
    setProdStatus('active');
    setProdImage(GENERATED_IMAGES.prodLimpezaPesada);
    setProdDilution('Alto rendimento profissional');
    setProdBadgeLabel('Ofertas do Mês | Limper MT');
    setSelectedProductBannerIds([]);
    setImageUploadStatus(null);
    setIsProductFormOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProdTitle(product.title);
    setProdSku(product.sku);
    setProdDesc(product.description);
    setProdCatId(product.categoryId);
    setProdPrice(String(product.price));
    setProdPromoPrice(product.promoPrice ? String(product.promoPrice) : '');
    setProdShowPrice(product.showPrice !== false);
    setProdUnit(product.unit);
    setProdVolLabel(product.volumeLabel);
    setProdStatus(product.status);
    setProdImage(product.imageUrl);
    setProdDilution(product.dilutionHint || '');
    setProdBadgeLabel(product.badgeLabel || 'Ofertas do Mês | Limper MT');
    const currentBannerIds = banners
      .filter((b) => b.featuredProductIds.includes(product.id))
      .map((b) => b.id);
    setSelectedProductBannerIds(currentBannerIds);
    setImageUploadStatus(null);
    setIsProductFormOpen(true);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimeTypes.includes(file.type)) {
      setImageUploadStatus('Formato inválido. Selecione um arquivo JPG, PNG ou WEBP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProdImage(reader.result);
        setImageUploadStatus(`Arquivo "${file.name}" (${Math.round(file.size / 1024)} KB) carregado com sucesso!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTitle.trim()) return;

    const priceNum = Number(prodPrice.replace(',', '.')) || 0;
    const promoNum = prodPromoPrice.trim()
      ? Number(prodPromoPrice.replace(',', '.'))
      : null;

    let targetProdId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;

    if (editingProduct) {
      const updated = products.map((p) =>
        p.id === editingProduct.id
          ? {
              ...p,
              title: prodTitle.trim(),
              sku: prodSku.trim(),
              description: prodDesc.trim(),
              categoryId: prodCatId,
              price: priceNum,
              promoPrice: promoNum,
              showPrice: prodShowPrice,
              unit: prodUnit,
              volumeLabel: prodVolLabel.trim(),
              status: prodStatus,
              imageUrl: prodImage.trim() || GENERATED_IMAGES.prodLimpezaPesada,
              dilutionHint: prodDilution.trim() || undefined,
              badgeLabel: prodBadgeLabel.trim() || undefined,
            }
          : p
      );
      onSaveProducts(updated);
    } else {
      const newProd: Product = {
        id: targetProdId,
        sku: prodSku.trim() || `QMP-${products.length + 1}`,
        title: prodTitle.trim(),
        description: prodDesc.trim() || 'Produto da linha profissional Quimiprol.',
        categoryId: prodCatId,
        price: priceNum,
        promoPrice: promoNum,
        showPrice: prodShowPrice,
        unit: prodUnit,
        volumeLabel: prodVolLabel.trim() || '5L',
        status: prodStatus,
        imageUrl: prodImage.trim() || GENERATED_IMAGES.prodLimpezaPesada,
        dilutionHint: prodDilution.trim() || undefined,
        badgeLabel: prodBadgeLabel.trim() || undefined,
      };
      onSaveProducts([newProd, ...products]);
    }

    // Update Banner placements if onSaveBanners is wired
    if (onSaveBanners) {
      const updatedBanners = banners.map((b) => {
        const shouldInclude = selectedProductBannerIds.includes(b.id);
        const alreadyIncludes = b.featuredProductIds.includes(targetProdId);
        if (shouldInclude && !alreadyIncludes) {
          return {
            ...b,
            featuredProductIds: [targetProdId, ...b.featuredProductIds],
          };
        }
        if (!shouldInclude && alreadyIncludes) {
          return {
            ...b,
            featuredProductIds: b.featuredProductIds.filter((id) => id !== targetProdId),
          };
        }
        return b;
      });
      onSaveBanners(updatedBanners);
    }

    setIsProductFormOpen(false);
    setEditingProduct(null);
  };

  const handleToggleProductStatus = (product: Product) => {
    const cycle: Record<ProductStatus, ProductStatus> = {
      active: 'out_of_stock',
      out_of_stock: 'inactive',
      inactive: 'active',
    };
    const next = cycle[product.status];
    onSaveProducts(
      products.map((p) => (p.id === product.id ? { ...p, status: next } : p))
    );
  };

  const handleToggleProductPriceVisibility = (product: Product) => {
    const nextShow = product.showPrice === false ? true : false;
    onSaveProducts(
      products.map((p) => (p.id === product.id ? { ...p, showPrice: nextShow } : p))
    );
  };

  const handleToggleGlobalHidePrices = () => {
    const nextHide = !settings.hideAllPrices;
    const updatedSettings: StoreSettings = {
      ...settings,
      hideAllPrices: nextHide,
    };
    setFormSettings(updatedSettings);
    onSaveSettings(updatedSettings);
  };

  const handleDeleteProduct = (productId: string) => {
    onSaveProducts(products.filter((p) => p.id !== productId));
  };

  // Kits & Combos Handlers
  const openCreateKit = () => {
    setEditingKit(null);
    setKitTitle('');
    setKitBadge('KIT PROMOCIONAL LIMPER MT');
    setKitDesc('');
    setKitPromoPrice('64.90');
    setKitShowPrice(true);
    setKitActive(true);
    setKitImage(GENERATED_IMAGES.prodCasa);
    setKitImageUploadStatus(null);
    setKitQuantities({
      'prod-casa-1': 1,
      'prod-casa-3': 1,
    });
    setIsKitFormOpen(true);
  };

  const openEditKit = (kit: PromoKit) => {
    setEditingKit(kit);
    setKitTitle(kit.title);
    setKitBadge(kit.badge);
    setKitDesc(kit.description);
    setKitPromoPrice(String(kit.promoPrice));
    setKitShowPrice(kit.showPrice !== false);
    setKitActive(kit.active);
    setKitImage(kit.imageUrl || GENERATED_IMAGES.prodCasa);
    setKitImageUploadStatus(null);
    const map: Record<string, number> = {};
    kit.items.forEach((item) => {
      map[item.productId] = item.quantity;
    });
    setKitQuantities(map);
    setIsKitFormOpen(true);
  };

  const handleKitImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimeTypes.includes(file.type)) {
      setKitImageUploadStatus('Formato inválido. Selecione um arquivo JPG, PNG ou WEBP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setKitImage(reader.result);
        setKitImageUploadStatus(
          `Imagem do Kit "${file.name}" (${Math.round(file.size / 1024)} KB) carregada com sucesso!`
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveKit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitTitle.trim()) return;

    const selectedItems = Object.entries(kitQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (selectedItems.length === 0) return;

    const regularSum = selectedItems.reduce((acc, item) => {
      const p = products.find((prod) => prod.id === item.productId);
      return acc + (p ? getEffectivePrice(p) * item.quantity : 0);
    }, 0);

    const promoNum = Number(kitPromoPrice.replace(',', '.')) || regularSum;

    if (editingKit) {
      const updated = kits.map((k) =>
        k.id === editingKit.id
          ? {
              ...k,
              title: kitTitle.trim(),
              badge: kitBadge.trim() || 'KIT LIMPER MT',
              description: kitDesc.trim(),
              imageUrl: kitImage.trim() || GENERATED_IMAGES.prodCasa,
              items: selectedItems,
              promoPrice: promoNum,
              showPrice: kitShowPrice,
              active: kitActive,
            }
          : k
      );
      onSaveKits(updated);
    } else {
      const newKit: PromoKit = {
        id: `kit-${Date.now()}`,
        title: kitTitle.trim(),
        badge: kitBadge.trim() || 'KIT LIMPER MT',
        description:
          kitDesc.trim() ||
          selectedItems
            .map((it) => {
              const p = products.find((prod) => prod.id === it.productId);
              return p ? `${it.quantity}x ${p.title}` : '';
            })
            .filter(Boolean)
            .join(' + '),
        imageUrl: kitImage.trim() || GENERATED_IMAGES.prodCasa,
        items: selectedItems,
        promoPrice: promoNum,
        showPrice: kitShowPrice,
        active: kitActive,
      };
      onSaveKits([newKit, ...kits]);
    }

    setIsKitFormOpen(false);
    setEditingKit(null);
  };

  const handleToggleKitActive = (kit: PromoKit) => {
    onSaveKits(kits.map((k) => (k.id === kit.id ? { ...k, active: !k.active } : k)));
  };

  const handleDeleteKit = (kitId: string) => {
    onSaveKits(kits.filter((k) => k.id !== kitId));
  };

  // Banner & Promotional Campaign Handlers
  const openCreateBanner = () => {
    setEditingBanner(null);
    setBannerSlot('hero_carousel');
    setBannerBadge('NOVA CAMPANHA · LIMPER MT');
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerCtaText('Aproveitar Ofertas');
    setBannerTheme('yellow_red');
    setBannerImage(GENERATED_IMAGES.prodLavanderia);
    setBannerImageUploadStatus(null);
    setBannerCategoryId(categories[0]?.id || 'cat-casa');
    setBannerFeaturedProductIds(['prod-casa-3', 'prod-lav-1']);
    setBannerProductSearch('');
    setBannerActive(true);
    setIsBannerFormOpen(true);
  };

  const openEditBanner = (banner: PromoBanner) => {
    setEditingBanner(banner);
    setBannerSlot(banner.slot);
    setBannerBadge(banner.badge);
    setBannerTitle(banner.title);
    setBannerSubtitle(banner.subtitle);
    setBannerCtaText(banner.ctaText);
    setBannerTheme(banner.theme);
    setBannerImage(banner.imageUrl);
    setBannerImageUploadStatus(null);
    setBannerCategoryId(banner.linkedCategoryId || '');
    setBannerFeaturedProductIds(banner.featuredProductIds);
    setBannerProductSearch('');
    setBannerActive(banner.active);
    setIsBannerFormOpen(true);
  };

  const handleBannerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimeTypes.includes(file.type)) {
      setBannerImageUploadStatus('Formato inválido. Selecione JPG, PNG ou WEBP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBannerImage(reader.result);
        setBannerImageUploadStatus(
          `Banner "${file.name}" (${Math.round(file.size / 1024)} KB) carregado!`
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim() || !onSaveBanners) return;

    if (editingBanner) {
      const updated = banners.map((b) =>
        b.id === editingBanner.id
          ? {
              ...b,
              slot: bannerSlot,
              badge: bannerBadge.trim() || 'OFERTA LIMPER MT',
              title: bannerTitle.trim(),
              subtitle: bannerSubtitle.trim(),
              ctaText: bannerCtaText.trim() || 'Ver Ofertas',
              theme: bannerTheme,
              imageUrl: bannerImage.trim() || GENERATED_IMAGES.prodLavanderia,
              linkedCategoryId: bannerCategoryId || undefined,
              featuredProductIds: bannerFeaturedProductIds,
              active: bannerActive,
            }
          : b
      );
      onSaveBanners(updated);
    } else {
      const newBanner: PromoBanner = {
        id: `banner-${Date.now()}`,
        slot: bannerSlot,
        badge: bannerBadge.trim() || 'OFERTA LIMPER MT',
        title: bannerTitle.trim(),
        subtitle:
          bannerSubtitle.trim() ||
          'Ofertas exclusivas na linha de limpeza profissional Quimiprol.',
        ctaText: bannerCtaText.trim() || 'Ver Ofertas',
        theme: bannerTheme,
        imageUrl: bannerImage.trim() || GENERATED_IMAGES.prodLavanderia,
        linkedCategoryId: bannerCategoryId || undefined,
        featuredProductIds: bannerFeaturedProductIds,
        active: bannerActive,
        order: banners.length + 1,
      };
      onSaveBanners([...banners, newBanner]);
    }

    setIsBannerFormOpen(false);
    setEditingBanner(null);
  };

  const handleToggleBannerActive = (banner: PromoBanner) => {
    if (!onSaveBanners) return;
    onSaveBanners(
      banners.map((b) => (b.id === banner.id ? { ...b, active: !b.active } : b))
    );
  };

  const handleDeleteBanner = (bannerId: string) => {
    if (!onSaveBanners) return;
    onSaveBanners(banners.filter((b) => b.id !== bannerId));
  };

  const handleReorderBanner = (bannerId: string, dir: 'up' | 'down') => {
    if (!onSaveBanners) return;
    const sorted = [...banners].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((b) => b.id === bannerId);
    if (idx === -1) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const temp = sorted[idx];
    sorted[idx] = sorted[swapIdx];
    sorted[swapIdx] = temp;
    onSaveBanners(sorted.map((b, i) => ({ ...b, order: i + 1 })));
  };

  // Coupon Handlers ("Cadastrar Cupom na ADM")
  const openCreateCoupon = () => {
    setEditingCoupon(null);
    setCouponCode('');
    setCouponDesc('');
    setCouponType('percent');
    setCouponValue('10');
    setCouponMinOrder('0');
    setCouponActive(true);
    setIsCouponFormOpen(true);
  };

  const openEditCoupon = (cp: PromoCoupon) => {
    setEditingCoupon(cp);
    setCouponCode(cp.code);
    setCouponDesc(cp.description);
    setCouponType(cp.discountType);
    setCouponValue(String(cp.discountValue));
    setCouponMinOrder(String(cp.minOrderValue || 0));
    setCouponActive(cp.active);
    setIsCouponFormOpen(true);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim() || !onSaveCoupons) return;
    const cleanCode = couponCode.trim().toUpperCase().replace(/\s+/g, '');
    const valNum = Number(couponValue.replace(',', '.')) || 0;
    const minNum = Number(couponMinOrder.replace(',', '.')) || 0;

    if (editingCoupon) {
      const updated = coupons.map((c) =>
        c.id === editingCoupon.id
          ? {
              ...c,
              code: cleanCode,
              description:
                couponDesc.trim() ||
                (couponType === 'percent'
                  ? `${valNum}% OFF Especial Limper MT`
                  : `${formatCurrency(valNum)} OFF Limper MT`),
              discountType: couponType,
              discountValue: valNum,
              minOrderValue: minNum,
              active: couponActive,
            }
          : c
      );
      onSaveCoupons(updated);
    } else {
      const newCoupon: PromoCoupon = {
        id: `cp-${Date.now()}`,
        code: cleanCode,
        description:
          couponDesc.trim() ||
          (couponType === 'percent'
            ? `${valNum}% OFF Especial Limper MT`
            : `${formatCurrency(valNum)} OFF Limper MT`),
        discountType: couponType,
        discountValue: valNum,
        minOrderValue: minNum,
        active: couponActive,
      };
      onSaveCoupons([newCoupon, ...coupons]);
    }

    setIsCouponFormOpen(false);
    setEditingCoupon(null);
  };

  const handleToggleCouponActive = (cp: PromoCoupon) => {
    if (!onSaveCoupons) return;
    onSaveCoupons(
      coupons.map((c) => (c.id === cp.id ? { ...c, active: !c.active } : c))
    );
  };

  const handleDeleteCoupon = (cpId: string) => {
    if (!onSaveCoupons) return;
    onSaveCoupons(coupons.filter((c) => c.id !== cpId));
  };

  // Categories Handlers
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategory) {
      const updated = categories.map((c) =>
        c.id === editingCategory.id
          ? {
              ...c,
              name: catName.trim(),
              shortName: catShortName.trim() || catName.trim(),
              description: catDesc.trim(),
              icon: catIcon,
            }
          : c
      );
      onSaveCategories(updated);
      setEditingCategory(null);
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: catName.trim(),
        shortName: catShortName.trim() || catName.trim(),
        description: catDesc.trim() || 'Linha de produtos Limper MT',
        icon: catIcon,
        order: categories.length + 1,
      };
      onSaveCategories([...categories, newCat]);
    }

    setCatName('');
    setCatShortName('');
    setCatDesc('');
    setCatIcon('Sparkles');
  };

  const handleReorderCategory = (catId: string, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === catId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const temp = sorted[idx];
    sorted[idx] = sorted[swapIdx];
    sorted[swapIdx] = temp;

    const renumbered = sorted.map((c, i) => ({ ...c, order: i + 1 }));
    onSaveCategories(renumbered);
  };

  const handleDeleteCategory = (catId: string) => {
    onSaveCategories(categories.filter((c) => c.id !== catId));
  };

  // Settings Handlers
  const handleSaveSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formSettings);
    setSavedSettingsBanner(true);
    setTimeout(() => setSavedSettingsBanner(false), 3000);
  };

  const handleAddNeighborhood = () => {
    if (!newNeighborhoodName.trim()) return;
    const fee = Number(newNeighborhoodFee.replace(',', '.')) || 0;
    const updated: StoreSettings = {
      ...formSettings,
      neighborhoodFees: [
        ...formSettings.neighborhoodFees,
        {
          id: `nb-${Date.now()}`,
          name: newNeighborhoodName.trim(),
          city: newNeighborhoodCity,
          fee,
        },
      ],
    };
    setFormSettings(updated);
    onSaveSettings(updated);
    setNewNeighborhoodName('');
  };

  const handleRemoveNeighborhood = (id: string) => {
    const updated: StoreSettings = {
      ...formSettings,
      neighborhoodFees: formSettings.neighborhoodFees.filter((n) => n.id !== id),
    };
    setFormSettings(updated);
    onSaveSettings(updated);
  };

  // KPI Metrics Calculation
  const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
  const activeOrdersCount = orders.filter((o) => o.status !== 'completed').length;
  const activeProductsCount = products.filter((p) => p.status === 'active').length;
  const visiblePriceCount = products.filter((p) => p.showPrice !== false).length;

  // Filtered Admin Products
  const filteredAdminProducts = products.filter((p) => {
    const matchesCat = adminCategoryFilter === 'all' || p.categoryId === adminCategoryFilter;
    const q = adminProductSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  // Aggregated Customers for CRM Tab
  const customerMap = new Map<
    string,
    {
      name: string;
      phone: string;
      ordersCount: number;
      totalSpent: number;
      lastOrderId: string;
      lastDeliveryType: 'delivery' | 'pickup';
    }
  >();

  orders.forEach((o) => {
    const key = normalizePhone(o.customerPhone) || o.customerName;
    const existing = customerMap.get(key);
    if (existing) {
      existing.ordersCount += 1;
      existing.totalSpent += o.total;
    } else {
      customerMap.set(key, {
        name: o.customerName,
        phone: o.customerPhone,
        ordersCount: 1,
        totalSpent: o.total,
        lastOrderId: o.id,
        lastDeliveryType: o.deliveryType,
      });
    }
  });
  const customersList = Array.from(customerMap.values());

  if (!isAuthenticated) {
    return (
      <section className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-md">
          <div className="flex items-center justify-between mb-5">
            <img
              src={LIMPER_LOGO_URL}
              alt="Limper MT"
              className="h-9 w-auto object-contain"
            />
            <div className="w-10 h-10 rounded-xl bg-[#FFBE00] text-zinc-950 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-zinc-900 mb-1">
            App Gestor Limper MT
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mb-6">
            Central de separação 15min, catálogo Quimiprol e gestão de clientes — Av. Couto Magalhães, 2820.
          </p>

          {loginError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-user"
                className="block text-xs font-bold text-zinc-700 mb-1"
              >
                Usuário Lojista
              </label>
              <input
                id="admin-user"
                type="text"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm font-mono focus:border-[#FFBE00] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="admin-pass"
                className="block text-xs font-bold text-zinc-700 mb-1"
              >
                Senha de Acesso
              </label>
              <input
                id="admin-pass"
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm font-mono focus:border-[#FFBE00] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-sm rounded-xl cursor-pointer shadow-2xs"
            >
              Entrar no Painel Lojista
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Credencial demo: admin / limper123</span>
            <button
              type="button"
              onClick={onBackToStore}
              className="font-bold text-zinc-900 hover:underline cursor-pointer"
            >
              Voltar à Loja
            </button>
          </div>
        </div>
      </section>
    );
  }

  const navItems: {
    id: AdminAppTab;
    label: string;
    badge?: string | number;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'kanban',
      label: 'Kanban de Separação',
      badge: activeOrdersCount,
      icon: FolderKanban,
    },
    {
      id: 'products',
      label: 'Produtos & Fotos',
      badge: products.length,
      icon: Package,
    },
    {
      id: 'kits',
      label: 'Kits & Combos (Lupa)',
      badge: kits.length,
      icon: Gift,
    },
    {
      id: 'banners',
      label: 'Banners & Promoções',
      badge: banners.length,
      icon: Megaphone,
    },
    {
      id: 'coupons',
      label: 'Cupons de Desconto',
      badge: coupons.filter((c) => c.active).length,
      icon: TicketPercent,
    },
    {
      id: 'categories',
      label: 'Categorias Quimiprol',
      badge: categories.length,
      icon: Layers,
    },
    {
      id: 'customers',
      label: 'Clientes & Recompra',
      badge: customersList.length,
      icon: Users,
    },
    {
      id: 'settings',
      label: 'Loja, PIX & Frete',
      icon: Settings,
    },
  ];

  return (
    <section className="max-w-[1380px] mx-auto px-4 sm:px-6 py-5">
      {/* App-Like Workspace Shell (Left Sidebar on Desktop + Main Content Workspace) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left App Navigation Sidebar */}
        <aside className="lg:col-span-3 bg-white rounded-3xl border border-zinc-200/90 p-4 shadow-2xs space-y-4 lg:sticky lg:top-28 no-print">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] border border-[#FFBE00] flex items-center justify-center text-[#E3262E] font-mono font-black text-xs">
                APP
              </div>
              <div>
                <h1 className="font-display text-sm font-extrabold text-zinc-900 leading-none">
                  Limper MT Gestor
                </h1>
                <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Balcão VG Online
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onBackToStore}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Loja</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5" aria-label="Menu do Aplicativo Lojista">
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#FFBE00] text-zinc-950 shadow-2xs'
                      : 'text-zinc-700 hover:bg-[#FAFAFA] hover:text-zinc-950'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp
                      className={`w-4 h-4 ${
                        isActive ? 'text-zinc-950' : 'text-[#E3262E]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold ${
                        isActive
                          ? 'bg-zinc-950 text-[#FFBE00]'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Store Address & Phone Card inside Sidebar */}
          <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-extrabold text-zinc-900">
              <Store className="w-3.5 h-3.5 text-[#E3262E]" />
              <span>Unidade Várzea Grande - MT</span>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              {settings.storeAddress}
            </p>
            <div className="flex items-center gap-1.5 font-mono font-bold text-zinc-900 pt-1 border-t border-amber-200/70">
              <Phone className="w-3 h-3 text-[#E3262E]" />
              <span>{settings.whatsappDisplay}</span>
            </div>
          </div>
        </aside>

        {/* Main App Content Workspace */}
        <div className="lg:col-span-9 space-y-6">
          {/* Executive KPI Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-500 font-bold">
                  Volume em Pedidos
                </p>
                <p className="font-mono text-xl font-extrabold text-zinc-950 tabular-nums mt-0.5">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                  {orders.length} pedidos registrados
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-500 font-bold">
                  Fila de Separação
                </p>
                <p className="font-mono text-xl font-extrabold text-[#E3262E] tabular-nums mt-0.5">
                  {activeOrdersCount} ativos
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Balcão 15min & Delivery
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-[#E3262E] flex items-center justify-center">
                <FolderKanban className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-500 font-bold">
                  Catálogo Quimiprol
                </p>
                <p className="font-mono text-xl font-extrabold text-zinc-950 tabular-nums mt-0.5">
                  {activeProductsCount} / {products.length}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Em {categories.length} linhas oficiais
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-500 font-bold">
                  Exibição de Preços
                </p>
                <p className="font-mono text-base font-extrabold text-zinc-950 mt-0.5">
                  {settings.hideAllPrices ? 'Modo Orçamento' : `${visiblePriceCount} visíveis`}
                </p>
                <button
                  type="button"
                  onClick={handleToggleGlobalHidePrices}
                  className="text-[11px] font-bold text-[#E3262E] hover:underline mt-0.5 cursor-pointer"
                >
                  {settings.hideAllPrices ? 'Reativar preços' : 'Modo Sob Consulta'}
                </button>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FFBE00] text-zinc-950 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* TAB 1: KANBAN DE SEPARAÇÃO DE PEDIDOS + REVERSÃO DE ETAPAS + FILTRO DE DATAS E HISTÓRICO */}
          {activeTab === 'kanban' && (() => {
            const filteredKanbanOrders = filterOrdersByCriteria(orders, {
              searchQuery: kanbanSearchQuery,
              datePreset: kanbanDatePreset,
              startDate: kanbanStartDate,
              endDate: kanbanEndDate,
              deliveryType: kanbanDeliveryFilter,
            });
            const periodSummary = summarizeOrdersPeriod(filteredKanbanOrders);
            const distinctDates = Array.from(
              new Set(orders.map((o) => toDateKeyYmd(o.createdAt)).filter(Boolean))
            ).sort((a, b) => b.localeCompare(a));

            return (
              <div className="space-y-4 no-print">
                {/* Top Header & Primary Actions */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-extrabold text-zinc-900">
                        Quadro Operacional de Separação, Retirada & Histórico
                      </h2>
                      <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] font-mono text-[10px] font-extrabold text-[#B45309]">
                        REVERSÃO DE ETAPAS & AUDITORIA ATIVA
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Avance ou volte etapas a qualquer momento (inclusive de pedidos já concluídos), consulte datas anteriores e audite o histórico de cada pedido.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsManualPosOpen((prev) => !prev)}
                      className="px-3.5 py-2 bg-[#E3262E] hover:bg-[#C81E25] text-white font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{isManualPosOpen ? 'Fechar PDV Balcão' : '+ Pedido Balcão / PDV'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportOrdersCsv}
                      className="px-3.5 py-2 bg-[#FAFAFA] hover:bg-zinc-100 border border-zinc-300 text-zinc-800 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>Exportar Pedidos (CSV)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('kits');
                        openCreateKit();
                      }}
                      className="px-3.5 py-2 bg-[#FFFBEB] hover:bg-[#FFBE00]/40 border border-[#FFBE00] text-zinc-950 font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Gift className="w-4 h-4 text-[#E3262E]" />
                      <span>+ Cadastrar Kit</span>
                    </button>
                  </div>
                </div>

                {/* HUMAN ERROR UNDO BANNER ("Errou a etapa sem querer? Desfaça com 1 clique") */}
                {lastStatusMove && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="bg-[#FFFBEB] border-2 border-[#FFBE00] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 text-xs">
                      <div className="w-8 h-8 rounded-xl bg-[#E3262E] text-white flex items-center justify-center shrink-0">
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-mono text-[10px] uppercase font-extrabold text-[#E3262E] block">
                          PROTEÇÃO CONTRA FALHA HUMANA · ÚLTIMA MOVIMENTAÇÃO
                        </span>
                        <span className="text-zinc-900">
                          Pedido <strong className="font-mono">{lastStatusMove.orderId}</strong> ({lastStatusMove.customerName}) movido de{' '}
                          <strong>{ORDER_STATUS_META[lastStatusMove.fromStatus].shortLabel}</strong> para{' '}
                          <strong className="text-[#E3262E]">
                            {ORDER_STATUS_META[lastStatusMove.toStatus].shortLabel}
                          </strong>.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleUndoLastStatusMove}
                        className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>
                          Desfazer e Voltar p/ {ORDER_STATUS_META[lastStatusMove.fromStatus].shortLabel}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLastStatusMove(null)}
                        aria-label="Ocultar aviso de desfazer"
                        className="p-1.5 rounded-lg text-zinc-500 hover:bg-amber-200/50 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* FILTER & HISTORICAL DATE CONSULTATION BAR ("Consultar uma data anterior / Filtrar histórico do Kanban") */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3.5 shadow-2xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#E3262E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={kanbanSearchQuery}
                        onChange={(e) => setKanbanSearchQuery(e.target.value)}
                        placeholder="Buscar no Kanban por Nº (#LMP-1041), Cliente, WhatsApp, Senha ou Produto..."
                        className="w-full pl-9 pr-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                      />
                    </div>

                    {/* Modality Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: 'all' as const, label: 'Todas Modalidades' },
                        { id: 'pickup' as const, label: '🏪 Retirada na Loja' },
                        { id: 'delivery' as const, label: '🚚 Entrega Delivery' },
                      ].map((mod) => (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => setKanbanDeliveryFilter(mod.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                            kanbanDeliveryFilter === mod.id
                              ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950 shadow-2xs'
                              : 'bg-[#FAFAFA] hover:bg-zinc-100 border-zinc-200 text-zinc-600'
                          }`}
                        >
                          {mod.label}
                        </button>
                      ))}
                    </div>

                    {/* View Mode Switcher: Quadro Kanban vs Histórico Cronológico */}
                    <div className="inline-flex rounded-xl bg-[#FAFAFA] p-1 border border-zinc-200 self-start lg:self-auto">
                      <button
                        type="button"
                        onClick={() => setKanbanViewMode('board')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                          kanbanViewMode === 'board'
                            ? 'bg-zinc-950 text-[#FFBE00] shadow-2xs'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        <FolderKanban className="w-3.5 h-3.5" />
                        <span>Quadro Kanban (4 Colunas)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setKanbanViewMode('history_table')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                          kanbanViewMode === 'history_table'
                            ? 'bg-zinc-950 text-[#FFBE00] shadow-2xs'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Histórico & Auditoria ({filteredKanbanOrders.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Date / Period Filter Row + Calendar Date Picker */}
                  <div className="pt-3 border-t border-zinc-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-zinc-800 mr-1">
                        <Calendar className="w-3.5 h-3.5 text-[#E3262E]" />
                        <span>Período / Data:</span>
                      </span>
                      {[
                        { id: 'all' as OrderDatePreset, label: 'Todas as Datas' },
                        { id: 'today' as OrderDatePreset, label: 'Hoje' },
                        { id: 'last_7_days' as OrderDatePreset, label: 'Últimos 7 Dias' },
                        { id: 'last_30_days' as OrderDatePreset, label: 'Últimos 30 Dias' },
                        { id: 'custom' as OrderDatePreset, label: 'Escolher Data Específica' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setKanbanDatePreset(preset.id);
                            if (preset.id !== 'custom') {
                              setKanbanStartDate('');
                              setKanbanEndDate('');
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                            kanbanDatePreset === preset.id
                              ? 'bg-[#E3262E] border-[#E3262E] text-white font-extrabold'
                              : 'bg-[#FAFAFA] hover:bg-zinc-100 border-zinc-200 text-zinc-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}

                      {/* Quick Date Chips for Existing Order Dates ("Consultar uma data anterior") */}
                      {distinctDates.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pl-1">
                          <span className="text-[10px] font-mono text-zinc-400">
                            Datas c/ pedidos:
                          </span>
                          {distinctDates.map((ymd) => {
                            const [yyyy, mm, dd] = ymd.split('-');
                            const isSelectedDate =
                              kanbanDatePreset === 'custom' &&
                              kanbanStartDate === ymd &&
                              kanbanEndDate === ymd;
                            return (
                              <button
                                key={`date-chip-${ymd}`}
                                type="button"
                                onClick={() => {
                                  setKanbanDatePreset('custom');
                                  setKanbanStartDate(ymd);
                                  setKanbanEndDate(ymd);
                                }}
                                className={`px-2 py-1 rounded-lg font-mono text-[10px] font-extrabold border transition-colors cursor-pointer ${
                                  isSelectedDate
                                    ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950'
                                    : 'bg-white hover:bg-[#FFFBEB] text-zinc-700 border-zinc-200'
                                }`}
                              >
                                {dd}/{mm}/{yyyy}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Custom Calendar Date Inputs (De / Até) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <label
                          htmlFor="kanban-start-date"
                          className="text-[11px] font-bold text-zinc-600"
                        >
                          De:
                        </label>
                        <input
                          id="kanban-start-date"
                          type="date"
                          value={kanbanStartDate}
                          onChange={(e) => {
                            setKanbanDatePreset('custom');
                            setKanbanStartDate(e.target.value);
                          }}
                          className="px-2.5 py-1.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 focus:border-[#FFBE00] focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label
                          htmlFor="kanban-end-date"
                          className="text-[11px] font-bold text-zinc-600"
                        >
                          Até:
                        </label>
                        <input
                          id="kanban-end-date"
                          type="date"
                          value={kanbanEndDate}
                          onChange={(e) => {
                            setKanbanDatePreset('custom');
                            setKanbanEndDate(e.target.value);
                          }}
                          className="px-2.5 py-1.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 focus:border-[#FFBE00] focus:outline-none"
                        />
                      </div>

                      {(kanbanSearchQuery ||
                        kanbanDatePreset !== 'all' ||
                        kanbanStartDate ||
                        kanbanEndDate ||
                        kanbanDeliveryFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setKanbanSearchQuery('');
                            setKanbanDatePreset('all');
                            setKanbanStartDate('');
                            setKanbanEndDate('');
                            setKanbanDeliveryFilter('all');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#E3262E] text-[11px] font-extrabold cursor-pointer"
                        >
                          Limpar Filtro
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Period Financial & Operational Metrics Strip */}
                  <div className="pt-2.5 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#FAFAFA] border border-zinc-200/80 flex items-center justify-between">
                      <span className="text-zinc-500 font-semibold">Pedidos no Filtro:</span>
                      <strong className="font-mono text-sm font-extrabold text-zinc-950">
                        {periodSummary.totalOrders} pedido(s)
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FFFBEB]/70 border border-[#FDE68A] flex items-center justify-between">
                      <span className="text-zinc-700 font-semibold">Volume Filtrado:</span>
                      <strong className="font-mono text-sm font-extrabold text-zinc-950">
                        {formatCurrency(periodSummary.totalRevenue)}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FAFAFA] border border-zinc-200/80 flex items-center justify-between">
                      <span className="text-zinc-500 font-semibold">Modalidades:</span>
                      <strong className="font-mono text-xs font-extrabold text-zinc-900">
                        {periodSummary.pickupCount} Loja · {periodSummary.deliveryCount} Delivery
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FAFAFA] border border-zinc-200/80 flex items-center justify-between">
                      <span className="text-zinc-500 font-semibold">Ticket Médio:</span>
                      <strong className="font-mono text-sm font-extrabold text-emerald-700">
                        {formatCurrency(periodSummary.averageTicket)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* PDV / Manual Walk-In & Phone Order Form */}
                {isManualPosOpen && (
                  <form
                    onSubmit={handleCreatePosOrder}
                    className="bg-white rounded-2xl border-2 border-[#FFBE00] p-5 shadow-md space-y-4"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                      <div>
                        <span className="text-[10px] font-mono uppercase font-extrabold text-[#E3262E]">
                          PDV RÁPIDO · ATENDIMENTO PRESENCIAL OU TELEFONE (65) 3029-6824
                        </span>
                        <h3 className="font-display text-base font-extrabold text-zinc-900">
                          Lançar Pedido de Balcão / Telefone (Gera Comanda Automática)
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsManualPosOpen(false)}
                        className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Nome do Cliente / Empresa
                        </label>
                        <input
                          type="text"
                          value={posCustomerName}
                          onChange={(e) => setPosCustomerName(e.target.value)}
                          placeholder="Ex: Condomínio Solar / Balcão"
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          WhatsApp / Telefone
                        </label>
                        <input
                          type="tel"
                          value={posCustomerPhone}
                          onChange={(e) => setPosCustomerPhone(formatPhone(e.target.value))}
                          placeholder="(65) 99999-9999"
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Modalidade
                        </label>
                        <select
                          value={posDeliveryType}
                          onChange={(e) => setPosDeliveryType(e.target.value as DeliveryType)}
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold"
                        >
                          <option value="pickup">Retirada Balcão (15min)</option>
                          <option value="delivery">Entrega Delivery Local</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Pagamento
                        </label>
                        <select
                          value={posPaymentMethod}
                          onChange={(e) => setPosPaymentMethod(e.target.value as PaymentMethod)}
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold"
                        >
                          <option value="pix">PIX na Loja</option>
                          <option value="card">Cartão (Maquininha)</option>
                          <option value="cash">Dinheiro no Caixa</option>
                        </select>
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100 bg-[#FAFAFA] p-2">
                      {products
                        .filter((p) => p.status === 'active')
                        .slice(0, 10)
                        .map((p) => {
                          const qty = posQuantities[p.id] || 0;
                          return (
                            <div
                              key={`pos-${p.id}`}
                              className="py-1.5 px-2 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="truncate">
                                <strong className="text-zinc-900">{p.title}</strong>{' '}
                                <span className="font-mono text-zinc-500">
                                  ({p.volumeLabel} · {formatCurrency(getEffectivePrice(p))})
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPosQuantities((prev) => ({
                                      ...prev,
                                      [p.id]: Math.max(0, (prev[p.id] || 0) - 1),
                                    }))
                                  }
                                  className="w-6 h-6 rounded-md bg-white border border-zinc-300 font-bold cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="font-mono font-extrabold w-5 text-center">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPosQuantities((prev) => ({
                                      ...prev,
                                      [p.id]: (prev[p.id] || 0) + 1,
                                    }))
                                  }
                                  className="w-6 h-6 rounded-md bg-[#FFBE00] text-zinc-950 font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsManualPosOpen(false)}
                        className="px-4 py-2 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl cursor-pointer"
                      >
                        Gerar Pedido & Abrir Comanda de Separação
                      </button>
                    </div>
                  </form>
                )}

                {/* VIEW 1: 4-COLUMN KANBAN BOARD WITH BIDIRECTIONAL STAGE REVERSAL (VOLTAR & AVANÇAR + SELETOR DIRETO 1..4) */}
                {kanbanViewMode === 'board' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
                    {KANBAN_COLUMNS.map((statusKey, colIdx) => {
                      const colMeta = ORDER_STATUS_META[statusKey];
                      const colOrders = filteredKanbanOrders.filter(
                        (o) => o.status === statusKey
                      );

                      return (
                        <div
                          key={statusKey}
                          className="bg-white rounded-2xl p-3.5 border border-zinc-200 flex flex-col min-h-[440px] shadow-2xs"
                        >
                          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-md bg-zinc-950 text-[#FFBE00] font-mono text-[10px] font-extrabold flex items-center justify-center">
                                {colIdx + 1}
                              </span>
                              <h3 className="font-display text-xs font-extrabold text-zinc-900">
                                {colMeta.label}
                              </h3>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDE68A] font-mono text-xs font-extrabold text-[#B45309] tabular-nums">
                              {colOrders.length}
                            </span>
                          </div>

                          <div className="space-y-3 flex-1">
                            {colOrders.length === 0 ? (
                              <div className="h-32 rounded-xl border border-dashed border-zinc-200 flex items-center justify-center text-xs text-zinc-400 text-center px-3">
                                Sem pedidos nesta etapa para o período selecionado
                              </div>
                            ) : (
                              colOrders.map((order) => {
                                const prevStatus = getAdjacentOrderStatus(
                                  order.status,
                                  'prev'
                                );
                                const nextStatus = getAdjacentOrderStatus(
                                  order.status,
                                  'next'
                                );
                                const orderDateFormatted = new Date(
                                  order.createdAt
                                ).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                });
                                const isHistoryExpanded =
                                  expandedHistoryOrderId === order.id;

                                return (
                                  <article
                                    key={order.id}
                                    className="bg-[#FAFAFA] rounded-xl p-3.5 border border-zinc-200/90 space-y-2.5 hover:border-[#FFBE00] transition-colors"
                                  >
                                    {/* Top Row: ID + Date + Total */}
                                    <div className="flex items-center justify-between gap-2 text-xs">
                                      <div>
                                        <span className="font-mono font-extrabold text-zinc-950">
                                          {order.id}
                                        </span>
                                        <span className="block font-mono text-[10px] text-zinc-500">
                                          {orderDateFormatted}
                                        </span>
                                      </div>
                                      <span className="font-mono font-extrabold text-zinc-950 tabular-nums text-sm">
                                        {formatCurrency(order.total)}
                                      </span>
                                    </div>

                                    {/* Customer & Modality */}
                                    <div className="text-xs">
                                      <div className="font-bold text-zinc-900">
                                        {order.customerName}
                                      </div>
                                      <div className="font-mono text-zinc-500 text-[11px] flex flex-wrap items-center gap-1 mt-0.5">
                                        <span>{formatPhone(order.customerPhone)}</span>
                                        <span>·</span>
                                        <strong
                                          className={
                                            order.deliveryType === 'pickup'
                                              ? 'text-emerald-700'
                                              : 'text-[#E3262E]'
                                          }
                                        >
                                          {order.deliveryType === 'delivery'
                                            ? '🚚 Delivery'
                                            : '🏪 Retirada 15min'}
                                        </strong>
                                        {order.pickupCode && (
                                          <span className="px-1.5 py-0.2 rounded bg-zinc-200/80 text-zinc-800 text-[9px] font-extrabold">
                                            {order.pickupCode}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="text-[11px] text-zinc-700 space-y-1 bg-white p-2.5 rounded-lg border border-zinc-200/70">
                                      {order.items.map((item, idx) => (
                                        <div
                                          key={`${order.id}-${idx}`}
                                          className="flex justify-between gap-2"
                                        >
                                          <span className="truncate">
                                            <strong className="font-mono">
                                              {item.quantity}x
                                            </strong>{' '}
                                            {item.title}
                                          </span>
                                          <span className="font-mono shrink-0">
                                            {item.volumeLabel}
                                          </span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* DIRECT 4-STAGE QUICK JUMP PILLS ("Ir direto p/ etapa correta se passou todas sem querer") */}
                                    <div className="bg-white rounded-lg p-1.5 border border-zinc-200/80 space-y-1">
                                      <div className="flex items-center justify-between text-[9px] font-mono uppercase text-zinc-500 font-bold px-0.5">
                                        <span>Mudar Etapa Direto:</span>
                                        {(order.statusHistory?.length || 0) > 0 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setExpandedHistoryOrderId(
                                                isHistoryExpanded ? null : order.id
                                              )
                                            }
                                            className="text-[#E3262E] hover:underline cursor-pointer"
                                          >
                                            {isHistoryExpanded
                                              ? 'Ocultar Log'
                                              : `Log (${order.statusHistory?.length})`}
                                          </button>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-4 gap-1">
                                        {[
                                          { st: 'pending_separation' as OrderStatus, label: '1. Novo' },
                                          { st: 'separating' as OrderStatus, label: '2. Sep.' },
                                          { st: 'ready_or_out' as OrderStatus, label: '3. Pronto' },
                                          { st: 'completed' as OrderStatus, label: '4. Fim' },
                                        ].map((stepBtn) => {
                                          const isCurrent = order.status === stepBtn.st;
                                          return (
                                            <button
                                              key={`${order.id}-jump-${stepBtn.st}`}
                                              type="button"
                                              onClick={() =>
                                                handleMoveOrderStatus(
                                                  order.id,
                                                  stepBtn.st,
                                                  `Movido direto para ${ORDER_STATUS_META[stepBtn.st].shortLabel}`
                                                )
                                              }
                                              title={`Mover pedido ${order.id} para ${ORDER_STATUS_META[stepBtn.st].label}`}
                                              className={`py-1 rounded text-[10px] font-mono font-extrabold transition-colors cursor-pointer ${
                                                isCurrent
                                                  ? 'bg-zinc-950 text-[#FFBE00]'
                                                  : 'bg-zinc-100 hover:bg-[#FFFBEB] text-zinc-700 border border-zinc-200'
                                              }`}
                                            >
                                              {stepBtn.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Collapsible Audit History Log per Card */}
                                    {isHistoryExpanded &&
                                      order.statusHistory &&
                                      order.statusHistory.length > 0 && (
                                        <div className="p-2 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] space-y-1 text-[10px]">
                                          <div className="font-mono font-extrabold text-zinc-900 uppercase">
                                            Histórico de Movimentações:
                                          </div>
                                          {order.statusHistory.slice(0, 4).map((h, hIdx) => (
                                            <div
                                              key={`${order.id}-hist-${hIdx}`}
                                              className="text-zinc-700 leading-tight border-t border-amber-200/60 pt-1"
                                            >
                                              <span className="font-mono text-zinc-500">
                                                {new Date(h.changedAt).toLocaleTimeString(
                                                  'pt-BR',
                                                  {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                  }
                                                )}
                                              </span>{' '}
                                              ·{' '}
                                              <strong>
                                                {ORDER_STATUS_META[h.fromStatus].shortLabel}
                                              </strong>{' '}
                                              →{' '}
                                              <strong className="text-[#E3262E]">
                                                {ORDER_STATUS_META[h.toStatus].shortLabel}
                                              </strong>
                                              {h.reason && (
                                                <span className="block text-[9px] text-zinc-500">
                                                  {h.reason}
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                    {/* Action Bar: Comanda + Avisar + Bidirectional <- Voltar & Avançar -> */}
                                    <div className="pt-2 border-t border-zinc-200/60 space-y-2">
                                      <div className="flex items-center justify-between gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setPrintOrder(order)}
                                          aria-label={`Imprimir comanda do pedido ${order.id}`}
                                          className="flex-1 py-1.5 px-2 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-900 text-[11px] font-bold rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                          <Printer className="w-3 h-3" />
                                          <span>Comanda</span>
                                        </button>

                                        <a
                                          href={buildCustomerWhatsAppStatusUrl(order)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="Avisar cliente no WhatsApp"
                                          className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg inline-flex items-center justify-center gap-1"
                                        >
                                          <MessageCircle className="w-3 h-3" />
                                          <span>Avisar</span>
                                        </a>
                                      </div>

                                      <div className="flex items-center justify-between gap-1.5">
                                        {prevStatus && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleMoveOrderStatus(
                                                order.id,
                                                prevStatus,
                                                'Voltou etapa anterior (correção operacional)'
                                              )
                                            }
                                            title={`Voltar para ${ORDER_STATUS_META[prevStatus].label}`}
                                            className="flex-1 py-1.5 px-2 bg-white hover:bg-rose-50 border border-zinc-300 hover:border-[#E3262E] text-zinc-800 hover:text-[#E3262E] text-[11px] font-extrabold rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                          >
                                            <ArrowLeft className="w-3 h-3" />
                                            <span>
                                              {order.status === 'completed'
                                                ? 'Voltar Etapa'
                                                : 'Voltar'}
                                            </span>
                                          </button>
                                        )}

                                        {nextStatus && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleMoveOrderStatus(
                                                order.id,
                                                nextStatus,
                                                'Avanço operacional no Kanban'
                                              )
                                            }
                                            className="flex-1 py-1.5 px-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-[11px] font-extrabold rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer"
                                          >
                                            <span>Avançar</span>
                                            <ArrowRight className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </article>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* VIEW 2: CHRONOLOGICAL ORDER HISTORY & AUDIT TABLE ("Consultar histórico por data e corrigir etapas") */
                  <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs">
                    <div className="p-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2 bg-[#FAFAFA]">
                      <div>
                        <h3 className="font-display text-sm font-extrabold text-zinc-900">
                          Relatório Cronológico & Auditoria de Etapas ({filteredKanbanOrders.length} pedidos)
                        </h3>
                        <p className="text-xs text-zinc-500">
                          Consulte pedidos de qualquer data anterior, altere ou reverta a etapa diretamente no seletor e confira o horário da última movimentação.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-white text-[11px] font-mono uppercase text-zinc-500">
                            <th className="py-3 px-4">Pedido · Data/Hora</th>
                            <th className="py-3 px-4">Cliente · Contato</th>
                            <th className="py-3 px-4">Modalidade · Senha</th>
                            <th className="py-3 px-4">Itens</th>
                            <th className="py-3 px-4">Total</th>
                            <th className="py-3 px-4">Etapa Atual (Reversível)</th>
                            <th className="py-3 px-4">Última Auditoria</th>
                            <th className="py-3 px-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-xs">
                          {filteredKanbanOrders.map((ord) => {
                            const lastAudit = ord.statusHistory?.[0];
                            const prevSt = getAdjacentOrderStatus(ord.status, 'prev');
                            const nextSt = getAdjacentOrderStatus(ord.status, 'next');

                            return (
                              <tr key={`table-${ord.id}`} className="hover:bg-zinc-50/80">
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div className="font-mono font-extrabold text-zinc-950">
                                    {ord.id}
                                  </div>
                                  <div className="font-mono text-[11px] text-zinc-500">
                                    {new Date(ord.createdAt).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-zinc-900">
                                    {ord.customerName}
                                  </div>
                                  <div className="font-mono text-[11px] text-zinc-500">
                                    {formatPhone(ord.customerPhone)}
                                  </div>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                      ord.deliveryType === 'pickup'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-rose-50 text-[#E3262E] border border-rose-200'
                                    }`}
                                  >
                                    {ord.deliveryType === 'pickup'
                                      ? '🏪 Retirada na Loja'
                                      : '🚚 Entrega Delivery'}
                                  </span>
                                  {ord.pickupCode && (
                                    <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
                                      Senha: <strong>{ord.pickupCode}</strong>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 max-w-[220px]">
                                  <div className="truncate font-medium text-zinc-800">
                                    {ord.items
                                      .map((i) => `${i.quantity}x ${i.title}`)
                                      .join(', ')}
                                  </div>
                                  <div className="text-[10px] font-mono text-zinc-400">
                                    {ord.items.reduce((a, i) => a + i.quantity, 0)} unid. ·{' '}
                                    {formatPaymentMethodLabel(ord)}
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-mono font-extrabold text-zinc-950 whitespace-nowrap">
                                  {formatCurrency(ord.total)}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    {prevSt && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleMoveOrderStatus(
                                            ord.id,
                                            prevSt,
                                            'Voltou etapa pela tabela de histórico'
                                          )
                                        }
                                        title="Voltar 1 etapa"
                                        className="p-1 rounded-lg bg-white hover:bg-rose-50 border border-zinc-300 text-zinc-700 hover:text-[#E3262E] cursor-pointer"
                                      >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <select
                                      aria-label={`Alterar etapa do pedido ${ord.id}`}
                                      value={ord.status}
                                      onChange={(e) =>
                                        handleMoveOrderStatus(
                                          ord.id,
                                          e.target.value as OrderStatus,
                                          'Alterado diretamente na tabela de histórico'
                                        )
                                      }
                                      className="px-2.5 py-1.5 rounded-xl bg-[#FFFBEB] border border-[#FFBE00] text-xs font-extrabold text-zinc-950 cursor-pointer"
                                    >
                                      {KANBAN_COLUMNS.map((stKey, idx) => (
                                        <option key={stKey} value={stKey}>
                                          {idx + 1}. {ORDER_STATUS_META[stKey].shortLabel}
                                        </option>
                                      ))}
                                    </select>
                                    {nextSt && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleMoveOrderStatus(
                                            ord.id,
                                            nextSt,
                                            'Avançou etapa pela tabela de histórico'
                                          )
                                        }
                                        title="Avançar 1 etapa"
                                        className="p-1 rounded-lg bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 cursor-pointer"
                                      >
                                        <ArrowRight className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-[11px] text-zinc-600 max-w-[200px]">
                                  {lastAudit ? (
                                    <div>
                                      <span className="font-mono font-bold text-zinc-900">
                                        {ORDER_STATUS_META[lastAudit.fromStatus].shortLabel} →{' '}
                                        {ORDER_STATUS_META[lastAudit.toStatus].shortLabel}
                                      </span>
                                      <span className="block text-[10px] text-zinc-400 truncate">
                                        {lastAudit.reason}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-400">
                                      Aguardando 1ª movimentação
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setPrintOrder(ord)}
                                    className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Printer className="w-3 h-3" />
                                    <span>Comanda</span>
                                  </button>
                                  <a
                                    href={buildCustomerWhatsAppStatusUrl(ord)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>WhatsApp</span>
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 2: GESTÃO DE PRODUTOS (COM UPLOAD DE IMAGEM JPG/PNG/WEBP + LINK URL + BUSCA RÁPIDA) */}
          {activeTab === 'products' && (
            <div className="space-y-5 no-print">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-zinc-900">
                    Catálogo de Produtos Quimiprol ({products.length})
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Cadastre produtos com foto via Link URL ou Upload (JPG, PNG, WEBP), marque destaques com ★ e escolha se o valor aparece ou fica oculto.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportProductsCsv}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-zinc-300 bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-800 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>Exportar CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleGlobalHidePrices}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer ${
                      settings.hideAllPrices
                        ? 'bg-[#E3262E] text-white border-[#E3262E]'
                        : 'bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-800 border-zinc-300'
                    }`}
                  >
                    {settings.hideAllPrices
                      ? 'Modo Orçamento Ativo · Clique p/ Exibir'
                      : 'Ocultar Todos os Valores da Loja'}
                  </button>

                  <button
                    type="button"
                    onClick={openCreateProduct}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs sm:text-sm rounded-xl cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Produto</span>
                  </button>
                </div>
              </div>

              {isProductFormOpen && (
                <form
                  onSubmit={handleSaveProduct}
                  className="bg-white p-6 rounded-2xl border-2 border-[#FFBE00] shadow-lg space-y-5"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-[#E3262E] uppercase">
                        FICHA TÉCNICA & VITRINE COMERCIAL
                      </span>
                      <h3 className="font-display text-lg font-extrabold text-zinc-900">
                        {editingProduct ? `Editar: ${editingProduct.title}` : 'Cadastrar Novo Produto Limper MT'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsProductFormOpen(false)}
                      className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Título do Produto *
                      </label>
                      <input
                        type="text"
                        required
                        value={prodTitle}
                        onChange={(e) => setProdTitle(e.target.value)}
                        placeholder="Ex: Detergente Clorado 5L | 2L"
                        className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Código SKU / Ref.
                      </label>
                      <input
                        type="text"
                        value={prodSku}
                        onChange={(e) => setProdSku(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Categoria Quimiprol
                      </label>
                      <select
                        value={prodCatId}
                        onChange={(e) => setProdCatId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Preço Regular &ldquo;De&rdquo; (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Preço Oferta &ldquo;Por&rdquo; (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={prodPromoPrice}
                        onChange={(e) => setProdPromoPrice(e.target.value)}
                        placeholder="Opcional"
                        className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Volume
                        </label>
                        <input
                          type="text"
                          value={prodVolLabel}
                          onChange={(e) => setProdVolLabel(e.target.value)}
                          placeholder="5L | 2L"
                          className="w-full px-2.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Unid.
                        </label>
                        <select
                          value={prodUnit}
                          onChange={(e) => setProdUnit(e.target.value as UnitOfMeasure)}
                          className="w-full px-2 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                        >
                          <option value="L">L</option>
                          <option value="mL">mL</option>
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="Unid">Unid</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* IMAGE REGISTRATION SECTION: URL LINK OR FILE UPLOAD (JPG, PNG, WEBP) */}
                  <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-zinc-200/90 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[#E3262E]" />
                        <span className="text-xs font-extrabold text-zinc-900">
                          Imagem do Produto (Link URL ou Upload de Arquivo JPG, PNG, WEBP)
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        Formatos aceitos: .jpg, .jpeg, .png, .webp ou link direto
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                      {/* Live Image Preview */}
                      <div className="lg:col-span-3 flex items-center gap-3 bg-white p-2.5 rounded-xl border border-zinc-200">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                          <ProductImageWithFallback
                            src={prodImage}
                            alt={prodTitle || 'Preview'}
                            volumeLabel={prodVolLabel || '5L'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-zinc-900 truncate">
                            Pré-visualização
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate">
                            {prodImage.startsWith('data:image')
                              ? 'Arquivo local carregado'
                              : prodImage}
                          </div>
                        </div>
                      </div>

                      {/* Link Input & File Upload Input */}
                      <div className="lg:col-span-9 space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                          <div className="sm:col-span-8 relative">
                            <Link2 className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={prodImage}
                              onChange={(e) => {
                                setProdImage(e.target.value);
                                setImageUploadStatus(null);
                              }}
                              placeholder="Cole o link da imagem (https://.../produto.jpg, .png ou .webp)"
                              className="w-full pl-8 pr-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-mono"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                              <Upload className="w-3.5 h-3.5 text-[#FFBE00]" />
                              <span>Enviar JPG / PNG / WEBP</span>
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                onChange={handleImageFileUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Quick Gallery Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="text-zinc-500 font-medium mr-1">Galeria rápida Quimiprol:</span>
                          {[
                            { label: 'Galão Limpeza Pesada', url: GENERATED_IMAGES.prodLimpezaPesada },
                            { label: 'Galão Lavanderia', url: GENERATED_IMAGES.prodLavanderia },
                            { label: 'Linha Casa & Aromas', url: GENERATED_IMAGES.prodCasa },
                            { label: 'Linha Automotiva', url: GENERATED_IMAGES.bannerAutomotivo },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setProdImage(preset.url);
                                setImageUploadStatus(`Imagem "${preset.label}" selecionada.`);
                              }}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                                prodImage === preset.url
                                  ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950 font-bold'
                                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {imageUploadStatus && (
                          <p className="text-[11px] font-bold text-emerald-700">
                            {imageUploadStatus}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Descrição Comercial
                      </label>
                      <input
                        type="text"
                        value={prodDesc}
                        onChange={(e) => setProdDesc(e.target.value)}
                        placeholder="Benefícios, aplicação e fragrância"
                        className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Selo Destaque Amarelo (Estilo Todimo)
                      </label>
                      <input
                        type="text"
                        value={prodBadgeLabel}
                        onChange={(e) => setProdBadgeLabel(e.target.value)}
                        placeholder="Ofertas do Mês | Limper MT"
                        className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Exibição do Valor no Site
                      </label>
                      <select
                        value={prodShowPrice ? 'show' : 'hide'}
                        onChange={(e) => setProdShowPrice(e.target.value === 'show')}
                        className="w-full px-3 py-2 bg-[#FFFBEB] border border-[#FFBE00] rounded-xl text-xs font-bold text-zinc-900"
                      >
                        <option value="show">Exibir Valor R$ no Catálogo</option>
                        <option value="hide">Ocultar Valor (&ldquo;Sob Consulta&rdquo;)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Status no Catálogo
                      </label>
                      <select
                        value={prodStatus}
                        onChange={(e) => setProdStatus(e.target.value as ProductStatus)}
                        className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                      >
                        <option value="active">Ativo (Visível p/ Compra)</option>
                        <option value="out_of_stock">Em Falta (Esgotado)</option>
                        <option value="inactive">Inativo (Oculto)</option>
                      </select>
                    </div>
                  </div>

                  {/* CHOOSE WHICH BANNER(S) WILL DISPLAY THIS PRODUCT OFFER ("Cadastrar ofertas e escolher qual banner colocar a promoção") */}
                  <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-[#E3262E]" />
                        <span className="text-xs font-extrabold text-zinc-900">
                          Colocar esta Oferta em qual Banner Promocional? (Aparece automaticamente no Banner escolhido)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-[#B45309]">
                        {selectedProductBannerIds.length} banner(s) selecionado(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {banners.map((b, idx) => {
                        const isChecked = selectedProductBannerIds.includes(b.id);
                        return (
                          <button
                            key={`prod-banner-link-${b.id}`}
                            type="button"
                            onClick={() => {
                              setSelectedProductBannerIds((prev) =>
                                prev.includes(b.id)
                                  ? prev.filter((id) => id !== b.id)
                                  : [...prev, b.id]
                              );
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 cursor-pointer ${
                              isChecked
                                ? 'bg-white border-2 border-[#E3262E] shadow-2xs'
                                : 'bg-white/70 hover:bg-white border-zinc-200/90 text-zinc-700'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                                isChecked
                                  ? 'bg-[#E3262E] border-[#E3262E] text-white'
                                  : 'bg-white border-zinc-300'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block text-[9px] font-mono uppercase font-extrabold text-[#D97706]">
                                {b.slot === 'hero_carousel'
                                  ? `Banner Topo #${idx + 1}`
                                  : 'Banner Inferior'}
                              </span>
                              <span className="block text-xs font-extrabold text-zinc-900 truncate">
                                {b.title}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsProductFormOpen(false)}
                      className="px-4 py-2.5 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-xs font-extrabold rounded-xl cursor-pointer shadow-xs"
                    >
                      Salvar Produto & Atualizar Banners
                    </button>
                  </div>
                </form>
              )}

              {/* Search & Category Filter Bar inside Admin Products */}
              <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={adminProductSearch}
                    onChange={(e) => setAdminProductSearch(e.target.value)}
                    placeholder="Filtrar produto no estoque por nome ou SKU (ex: Quimi 90, QMP-103)..."
                    className="w-full pl-9 pr-4 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                  />
                </div>
                <select
                  value={adminCategoryFilter}
                  onChange={(e) => setAdminCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800"
                >
                  <option value="all">Todas as Categorias ({products.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-[#FAFAFA] text-[11px] font-mono uppercase text-zinc-500">
                      <th className="py-3 px-4">Foto · SKU · Produto</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4">Emb.</th>
                      <th className="py-3 px-4">De / Por</th>
                      <th className="py-3 px-4">Destaque ★</th>
                      <th className="py-3 px-4">Exibição de Valor</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {filteredAdminProducts.map((prod) => {
                      const cat = categories.find((c) => c.id === prod.categoryId);
                      const isPriceShown = prod.showPrice !== false && !settings.hideAllPrices;
                      return (
                        <tr key={prod.id} className="hover:bg-zinc-50/80">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
                                <ProductImageWithFallback
                                  src={prod.imageUrl}
                                  alt={prod.title}
                                  volumeLabel={prod.volumeLabel}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <div className="font-bold text-zinc-900">{prod.title}</div>
                                <div className="font-mono text-[11px] text-zinc-400">{prod.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-zinc-600">{cat?.shortName || '-'}</td>
                          <td className="py-3 px-4 font-mono">{prod.volumeLabel}</td>
                          <td className="py-3 px-4 font-mono tabular-nums">
                            {prod.promoPrice ? (
                              <div>
                                <span className="line-through text-zinc-400 mr-1.5">
                                  {formatCurrency(prod.price)}
                                </span>
                                <strong className="text-zinc-900">
                                  {formatCurrency(prod.promoPrice)}
                                </strong>
                              </div>
                            ) : (
                              <strong className="text-zinc-900">
                                {formatCurrency(prod.price)}
                              </strong>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleProductFeatured(prod)}
                              title="Destacar na Vitrine Principal"
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                prod.featured
                                  ? 'bg-[#FFFBEB] border-[#FFBE00] text-[#D97706]'
                                  : 'bg-white border-zinc-200 text-zinc-300 hover:text-zinc-500'
                              }`}
                            >
                              <Star
                                className={`w-4 h-4 ${prod.featured ? 'fill-[#FFBE00] text-[#D97706]' : ''}`}
                              />
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleProductPriceVisibility(prod)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                isPriceShown
                                  ? 'bg-[#FFFBEB] text-zinc-950 border-[#FFBE00]'
                                  : 'bg-rose-50 text-[#E3262E] border-rose-200'
                              }`}
                            >
                              {isPriceShown ? 'Valor Visível' : 'Valor Oculto (Sob Consulta)'}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleProductStatus(prod)}
                              className="text-xs font-bold underline cursor-pointer text-zinc-900"
                            >
                              {prod.status === 'active'
                                ? 'Ativo'
                                : prod.status === 'out_of_stock'
                                ? 'Em Falta'
                                : 'Inativo'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEditProduct(prod)}
                              aria-label={`Editar ${prod.title}`}
                              className="p-1.5 text-zinc-600 hover:text-zinc-950 cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4 inline" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id)}
                              aria-label={`Excluir ${prod.title}`}
                              className="p-1.5 text-rose-600 hover:text-rose-800 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB KITS & COMBOS: CADASTRO DE KITS COM IMAGEM (LINK OU UPLOAD JPG/PNG/WEBP) */}
          {activeTab === 'kits' && (
            <div className="space-y-4 no-print">
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-zinc-900">
                    Kits Prontos & Combos Promocionais ({kits.length})
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Cadastre combos com foto de capa (link ou arquivo JPG/PNG/WEBP), escolha os produtos inclusos e defina o valor promocional exibido na Home.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateKit}
                  className="px-4 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cadastrar Novo Kit com Imagem</span>
                </button>
              </div>

              {isKitFormOpen && (
                <form
                  onSubmit={handleSaveKit}
                  className="bg-white rounded-3xl border-2 border-[#FFBE00] p-6 shadow-md space-y-5"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] border border-[#FFBE00] text-[#E3262E] flex items-center justify-center">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase font-extrabold text-[#E3262E] block">
                          VITRINE HOME · COMBOS EM 1 CLIQUE
                        </span>
                        <h3 className="font-display text-lg font-extrabold text-zinc-900">
                          {editingKit
                            ? `Editar Kit: ${editingKit.title}`
                            : 'Cadastrar Novo Kit Promocional Limper MT'}
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsKitFormOpen(false)}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-7 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Nome do Kit / Combo *
                          </label>
                          <input
                            type="text"
                            required
                            value={kitTitle}
                            onChange={(e) => setKitTitle(e.target.value)}
                            placeholder="Ex: Kit Limpeza Pesada Pós-Obra 5L"
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Selo / Tag de Destaque *
                          </label>
                          <input
                            type="text"
                            required
                            value={kitBadge}
                            onChange={(e) => setKitBadge(e.target.value)}
                            placeholder="Ex: KIT CASA PERFUMADA · ECONOMIZE R$ 15"
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Descrição Comercial do Kit
                        </label>
                        <input
                          type="text"
                          value={kitDesc}
                          onChange={(e) => setKitDesc(e.target.value)}
                          placeholder="Ex: Cloro Concentrado 5L + Limpa Pedras 5L + Detergente Clorado 5L"
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                        />
                      </div>

                      {/* Composição de Produtos do Kit com Busca na Lupa ("Puxar item já cadastrado na lupa e adicionar no kit") */}
                      <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-zinc-200 space-y-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-extrabold text-zinc-900 block">
                              1. Pesquisar Produto Cadastrado na Lupa p/ Puxar ao Kit
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              Digite o nome, código SKU ou litragem (ex: Quimi 90, Lavanda, 5L) e clique em &ldquo;+ Puxar p/ Kit&rdquo;
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-[#FFFBEB] border border-[#FFBE00] text-[11px] font-mono font-extrabold text-[#E3262E]">
                            {Object.values(kitQuantities).reduce((a, b) => a + b, 0)} un. no combo
                          </span>
                        </div>

                        {/* Interactive Magnifying Glass Search Input */}
                        <div className="relative">
                          <Search className="w-4 h-4 text-[#E3262E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="search"
                            value={kitProductSearchQuery}
                            onChange={(e) => setKitProductSearchQuery(e.target.value)}
                            placeholder="Pesquisar na lupa produto cadastrado para puxar pro kit..."
                            className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs font-semibold text-zinc-900"
                          />
                        </div>

                        {/* Search Results List to Pull Products into Kit */}
                        <div className="max-h-44 overflow-y-auto divide-y divide-zinc-100 bg-white rounded-xl border border-zinc-200 p-1.5">
                          {products
                            .filter((p) => {
                              if (p.status !== 'active') return false;
                              const q = kitProductSearchQuery.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                p.title.toLowerCase().includes(q) ||
                                p.sku.toLowerCase().includes(q) ||
                                p.volumeLabel.toLowerCase().includes(q)
                              );
                            })
                            .map((prod) => {
                              const qty = kitQuantities[prod.id] || 0;
                              return (
                                <div
                                  key={`kit-search-${prod.id}`}
                                  className={`py-1.5 px-2 flex items-center justify-between gap-2 text-xs rounded-lg transition-colors ${
                                    qty > 0 ? 'bg-[#FFFBEB]/80' : 'hover:bg-zinc-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 overflow-hidden shrink-0">
                                      <ProductImageWithFallback
                                        src={prod.imageUrl}
                                        alt={prod.title}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="truncate">
                                      <strong className="text-zinc-900 block truncate">
                                        {prod.title}
                                      </strong>
                                      <span className="text-[10px] font-mono text-zinc-500">
                                        {prod.sku} · {prod.volumeLabel} ·{' '}
                                        {formatCurrency(getEffectivePrice(prod))}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setKitQuantities((prev) => ({
                                        ...prev,
                                        [prod.id]: (prev[prod.id] || 0) + 1,
                                      }))
                                    }
                                    className={`px-2.5 py-1.5 rounded-lg font-extrabold text-[11px] inline-flex items-center gap-1 shrink-0 cursor-pointer transition-colors ${
                                      qty > 0
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950'
                                    }`}
                                  >
                                    <Plus className="w-3 h-3 stroke-[2.5]" />
                                    <span>
                                      {qty > 0 ? `No Kit (${qty}x)` : 'Puxar p/ Kit'}
                                    </span>
                                  </button>
                                </div>
                              );
                            })}
                        </div>

                        {/* Selected Products Currently Pulled into the Kit */}
                        <div className="space-y-2 pt-1">
                          <span className="text-xs font-extrabold text-zinc-900 block">
                            2. Itens Puxados e Inclusos neste Kit:
                          </span>
                          {Object.entries(kitQuantities).filter(([, q]) => q > 0).length ===
                          0 ? (
                            <div className="p-3 rounded-xl bg-white border border-dashed border-zinc-300 text-center text-xs text-zinc-400">
                              Nenhum produto puxado ainda. Pesquise na lupa acima e clique em &ldquo;+ Puxar p/ Kit&rdquo;.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {Object.entries(kitQuantities)
                                .filter(([, q]) => q > 0)
                                .map(([prodId, qty]) => {
                                  const prod = products.find((p) => p.id === prodId);
                                  if (!prod) return null;
                                  return (
                                    <div
                                      key={`kit-selected-${prod.id}`}
                                      className="p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between gap-2 text-xs"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 overflow-hidden shrink-0">
                                          <ProductImageWithFallback
                                            src={prod.imageUrl}
                                            alt={prod.title}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <div className="truncate">
                                          <strong className="text-zinc-900 block truncate">
                                            {prod.title}
                                          </strong>
                                          <span className="text-[10px] font-mono text-zinc-600">
                                            {prod.volumeLabel} · Subtotal:{' '}
                                            {formatCurrency(getEffectivePrice(prod) * qty)}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setKitQuantities((prev) => ({
                                              ...prev,
                                              [prod.id]: Math.max(0, (prev[prod.id] || 0) - 1),
                                            }))
                                          }
                                          className="w-6 h-6 rounded-md bg-white border border-zinc-300 font-bold cursor-pointer"
                                        >
                                          -
                                        </button>
                                        <span className="w-5 text-center font-mono font-extrabold">
                                          {qty}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setKitQuantities((prev) => ({
                                              ...prev,
                                              [prod.id]: (prev[prod.id] || 0) + 1,
                                            }))
                                          }
                                          className="w-6 h-6 rounded-md bg-[#FFBE00] text-zinc-950 font-bold cursor-pointer"
                                        >
                                          +
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setKitQuantities((prev) => ({
                                              ...prev,
                                              [prod.id]: 0,
                                            }))
                                          }
                                          title="Remover do kit"
                                          className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>

                        {/* Cálculo Automático de Soma Avulsa vs Preço Promocional do Kit */}
                        {(() => {
                          const regularTotal =
                            Math.round(
                              Object.entries(kitQuantities).reduce((acc, [prodId, q]) => {
                                if (q <= 0) return acc;
                                const p = products.find((item) => item.id === prodId);
                                return acc + (p ? getEffectivePrice(p) * q : 0);
                              }, 0) * 100
                            ) / 100;
                          const typedPromo =
                            Math.round(
                              (Number(kitPromoPrice.replace(',', '.')) || 0) * 100
                            ) / 100;
                          const finalCartKitPrice =
                            typedPromo > 0 ? typedPromo : regularTotal;
                          const exactSavings =
                            Math.max(
                              0,
                              Math.round((regularTotal - finalCartKitPrice) * 100) / 100
                            );

                          return (
                            <div className="space-y-2.5 pt-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <div className="p-2.5 rounded-xl bg-white border border-zinc-200">
                                  <span className="block text-[10px] font-mono uppercase text-zinc-500">
                                    Soma Avulsa dos Itens
                                  </span>
                                  <strong className="font-mono text-sm font-extrabold text-zinc-700">
                                    {formatCurrency(regularTotal)}
                                  </strong>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                                    Preço Fechado do Kit na Cesta (R$) *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={kitPromoPrice}
                                    onChange={(e) => setKitPromoPrice(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border-2 border-[#FFBE00] rounded-xl text-xs font-mono font-extrabold text-zinc-950"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                                    Visibilidade do Preço
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setKitShowPrice((prev) => !prev)}
                                    className={`w-full py-2 px-3 rounded-xl border text-xs font-extrabold cursor-pointer ${
                                      kitShowPrice
                                        ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950'
                                        : 'bg-rose-50 border-rose-200 text-[#E3262E]'
                                    }`}
                                  >
                                    {kitShowPrice ? 'Exibir Preço na Home' : 'Ocultar (Sob Consulta)'}
                                  </button>
                                </div>
                              </div>

                              {/* 1-Click Discount Presets + Live Cart Verification */}
                              <div className="p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-zinc-700">
                                    Aplicar Desconto Rápido:
                                  </span>
                                  {[10, 15, 20, 25].map((pct) => (
                                    <button
                                      key={`kit-disc-${pct}`}
                                      type="button"
                                      onClick={() => {
                                        if (regularTotal <= 0) return;
                                        const discounted =
                                          Math.round(regularTotal * (1 - pct / 100) * 10) /
                                          10;
                                        setKitPromoPrice(discounted.toFixed(2));
                                      }}
                                      className="px-2 py-1 rounded-lg bg-white hover:bg-[#FFBE00] border border-zinc-300 font-mono text-[10px] font-extrabold text-zinc-900 cursor-pointer"
                                    >
                                      -{pct}% OFF
                                    </button>
                                  ))}
                                </div>

                                <div className="font-mono text-[11px] font-extrabold text-emerald-800">
                                  Vai entrar na Cesta por{' '}
                                  <span className="text-zinc-950 underline">
                                    {formatCurrency(finalCartKitPrice)}
                                  </span>{' '}
                                  (Economia exata: -{formatCurrency(exactSavings)})
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Kit Image Upload & URL Section ("Colocar uma imagem também para cadastrar kits") */}
                    <div className="lg:col-span-5 p-4 rounded-2xl bg-[#FAFAFA] border border-zinc-200 space-y-3 self-start">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[#E3262E]" />
                        <h4 className="font-display text-sm font-extrabold text-zinc-900">
                          Imagem do Kit (Link ou Upload JPG, PNG, WEBP)
                        </h4>
                      </div>

                      <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-white h-40 flex items-center justify-center relative">
                        <ProductImageWithFallback
                          src={kitImage}
                          alt={kitTitle || 'Preview da imagem do Kit'}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#FFBE00] text-zinc-950 font-mono text-[10px] font-extrabold shadow-xs">
                          {kitBadge || 'KIT LIMPER MT'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          1. Colar Link Direto da Imagem do Kit (URL)
                        </label>
                        <div className="relative">
                          <Link2 className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={kitImage}
                            onChange={(e) => {
                              setKitImage(e.target.value);
                              setKitImageUploadStatus(null);
                            }}
                            placeholder="https://exemplo.com/foto-kit-limper.webp"
                            className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-zinc-700 mb-1">
                          2. Enviar Foto do Computador / Celular (.JPG, .PNG, .WEBP)
                        </span>
                        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-extrabold cursor-pointer transition-colors w-full justify-center">
                          <Upload className="w-4 h-4 text-[#FFBE00]" />
                          <span>Escolher Imagem do Kit (JPG, PNG, WEBP)</span>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                            onChange={handleKitImageFileUpload}
                            className="hidden"
                          />
                        </label>
                        {kitImageUploadStatus && (
                          <p className="text-[11px] font-bold text-emerald-700 mt-1.5">
                            {kitImageUploadStatus}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="block text-[11px] font-bold text-zinc-500 mb-1.5">
                          3. Ou selecione uma Foto Oficial Quimiprol:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: 'Combo Casa & Limpeza', url: GENERATED_IMAGES.prodCasa },
                            { label: 'Combo Lavanderia 5L', url: GENERATED_IMAGES.prodLavanderia },
                            { label: 'Combo Lava-Jato', url: GENERATED_IMAGES.bannerAutomotivo },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setKitImage(preset.url);
                                setKitImageUploadStatus(`Imagem padrão "${preset.label}" aplicada.`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FFFBEB] border border-zinc-300 text-[11px] font-bold text-zinc-700 cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setIsKitFormOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs cursor-pointer shadow-xs"
                    >
                      Salvar Kit na Vitrine da Home
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Kits Cadastrados com Imagem */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {kits.map((kit) => {
                  const resolvedItems = kit.items
                    .map((it) => {
                      const product = products.find((p) => p.id === it.productId);
                      return product ? { product, quantity: it.quantity } : null;
                    })
                    .filter(
                      (entry): entry is { product: Product; quantity: number } =>
                        Boolean(entry)
                    );

                  const regularSum = resolvedItems.reduce(
                    (acc, entry) => acc + getEffectivePrice(entry.product) * entry.quantity,
                    0
                  );

                  return (
                    <div
                      key={kit.id}
                      className={`rounded-2xl border overflow-hidden bg-white flex flex-col justify-between shadow-2xs ${
                        kit.active ? 'border-zinc-200' : 'border-zinc-200 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="relative h-36 bg-zinc-100 border-b border-zinc-100 overflow-hidden">
                          <ProductImageWithFallback
                            src={kit.imageUrl}
                            alt={kit.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#FFBE00] text-zinc-950 font-mono text-[10px] font-extrabold shadow-xs">
                            {kit.badge}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleKitActive(kit)}
                            className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold cursor-pointer ${
                              kit.active
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-700 text-white'
                            }`}
                          >
                            {kit.active ? 'ATIVO NA HOME' : 'OCULTO'}
                          </button>
                        </div>

                        <div className="p-4 space-y-2">
                          <h3 className="font-display text-sm font-extrabold text-zinc-900">
                            {kit.title}
                          </h3>
                          <p className="text-xs text-zinc-500 line-clamp-2">
                            {kit.description}
                          </p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {resolvedItems.map(({ product, quantity }) => (
                              <span
                                key={`${kit.id}-${product.id}`}
                                className="px-2 py-0.5 rounded-md bg-[#FAFAFA] border border-zinc-200 text-[10px] font-bold text-zinc-700"
                              >
                                {quantity}x {product.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border-t border-zinc-100 bg-[#FAFAFA] flex items-center justify-between gap-2">
                        <div>
                          {regularSum > kit.promoPrice && (
                            <span className="block text-[10px] text-zinc-400 line-through font-mono">
                              Avulso: {formatCurrency(regularSum)}
                            </span>
                          )}
                          <strong className="font-mono text-base font-extrabold text-zinc-950">
                            {kit.showPrice === false
                              ? 'Sob Consulta'
                              : formatCurrency(kit.promoPrice)}
                          </strong>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditKit(kit)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-xs font-bold text-zinc-800 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteKit(kit.id)}
                            aria-label={`Excluir ${kit.title}`}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB BANNERS & PROMOÇÕES AUTOMÁTICAS ("Cadastrar Banner das Promoções Automáticas e Escolher Produtos do Banner") */}
          {activeTab === 'banners' && (
            <div className="space-y-4 no-print">
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-zinc-900">
                    Banners Rotativos & Campanhas de Ofertas ({banners.length})
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Cadastre banners automáticos para o Carrossel do Topo ou Banner Inferior, envie fotos e puxe na lupa quais produtos em oferta aparecem dentro de cada banner.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateBanner}
                  className="px-4 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cadastrar Novo Banner Promocional</span>
                </button>
              </div>

              {isBannerFormOpen && (
                <form
                  onSubmit={handleSaveBanner}
                  className="bg-white rounded-3xl border-2 border-[#FFBE00] p-6 shadow-md space-y-5"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] border border-[#FFBE00] text-[#E3262E] flex items-center justify-center">
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase font-extrabold text-[#E3262E] block">
                          GESTOR DE VITRINE & PROMOÇÃO AUTOMÁTICA
                        </span>
                        <h3 className="font-display text-lg font-extrabold text-zinc-900">
                          {editingBanner
                            ? `Editar Banner: ${editingBanner.title}`
                            : 'Cadastrar Novo Banner de Promoção Automática'}
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBannerFormOpen(false)}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-7 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Onde este Banner vai aparecer? *
                          </label>
                          <select
                            value={bannerSlot}
                            onChange={(e) => setBannerSlot(e.target.value as BannerSlotType)}
                            className="w-full px-3 py-2 bg-[#FFFBEB] border border-[#FFBE00] rounded-xl text-xs font-extrabold text-zinc-900"
                          >
                            <option value="hero_carousel">
                              Carrossel Principal Rotativo (Topo da Home)
                            </option>
                            <option value="bottom_banner">
                              Banner Promocional Destaque (Parte Inferior da Home)
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Estilo Visual / Cores do Banner *
                          </label>
                          <select
                            value={bannerTheme}
                            onChange={(e) => setBannerTheme(e.target.value as BannerThemeType)}
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900"
                          >
                            <option value="yellow_red">
                              Amarelo & Vermelho Multi-Ofertas (Estilo Todimo/Drogasil)
                            </option>
                            <option value="dark_gold">
                              Preto & Ouro Imbatível (Alto Contraste)
                            </option>
                            <option value="crimson_wine">
                              Vinho & Dourado Express (Institucional & Produtos)
                            </option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Selo Superior (Badge) *
                          </label>
                          <input
                            type="text"
                            required
                            value={bannerBadge}
                            onChange={(e) => setBannerBadge(e.target.value)}
                            placeholder="Ex: SEMANA DE OFERTAS · ATÉ 25% OFF"
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Texto do Botão (CTA)
                          </label>
                          <input
                            type="text"
                            value={bannerCtaText}
                            onChange={(e) => setBannerCtaText(e.target.value)}
                            placeholder="Ex: Aproveitar Ofertas"
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Título Principal da Promoção *
                        </label>
                        <input
                          type="text"
                          required
                          value={bannerTitle}
                          onChange={(e) => setBannerTitle(e.target.value)}
                          placeholder="Ex: Festival de Galões 5L Quimiprol com Preço de Fábrica"
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Subtítulo / Explicação da Campanha
                          </label>
                          <input
                            type="text"
                            value={bannerSubtitle}
                            onChange={(e) => setBannerSubtitle(e.target.value)}
                            placeholder="Ex: Compre online e retire em 15 minutos na Av. Couto Magalhães, 2820"
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Categoria Alvo do Botão
                          </label>
                          <select
                            value={bannerCategoryId}
                            onChange={(e) => setBannerCategoryId(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                          >
                            <option value="">Ver Todas as Ofertas</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Search & Link Offer Products into this Banner */}
                      <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-zinc-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-extrabold text-zinc-900 block">
                              Produtos em Oferta Exibidos Dentro Deste Banner (Até 3 Destaques)
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              Pesquise na lupa e selecione os produtos que aparecerão com foto e preço dentro do banner
                            </span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FFBE00] font-mono text-[11px] font-extrabold text-[#E3262E]">
                            {bannerFeaturedProductIds.length} vinculado(s)
                          </span>
                        </div>

                        <div className="relative">
                          <Search className="w-4 h-4 text-[#E3262E] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="search"
                            value={bannerProductSearch}
                            onChange={(e) => setBannerProductSearch(e.target.value)}
                            placeholder="Pesquisar produto na lupa para colocar neste banner..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="max-h-44 overflow-y-auto divide-y divide-zinc-100 bg-white rounded-xl border border-zinc-200 p-1.5">
                          {products
                            .filter((p) => {
                              if (p.status !== 'active') return false;
                              const q = bannerProductSearch.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                p.title.toLowerCase().includes(q) ||
                                p.sku.toLowerCase().includes(q)
                              );
                            })
                            .map((prod) => {
                              const isLinked = bannerFeaturedProductIds.includes(prod.id);
                              return (
                                <div
                                  key={`banner-pick-${prod.id}`}
                                  className={`py-1.5 px-2 flex items-center justify-between gap-2 text-xs rounded-lg ${
                                    isLinked ? 'bg-[#FFFBEB]' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={prod.imageUrl}
                                      alt={prod.title}
                                      className="w-8 h-8 rounded-lg object-cover border border-zinc-200 shrink-0"
                                    />
                                    <div className="truncate">
                                      <strong className="text-zinc-900 block truncate">
                                        {prod.title}
                                      </strong>
                                      <span className="font-mono text-[10px] text-zinc-500">
                                        {prod.volumeLabel} · {formatCurrency(getEffectivePrice(prod))}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBannerFeaturedProductIds((prev) =>
                                        prev.includes(prod.id)
                                          ? prev.filter((id) => id !== prod.id)
                                          : [...prev, prod.id]
                                      );
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                                      isLinked
                                        ? 'bg-[#E3262E] text-white'
                                        : 'bg-zinc-100 hover:bg-[#FFBE00] text-zinc-900'
                                    }`}
                                  >
                                    {isLinked ? '✓ No Banner' : '+ Colocar no Banner'}
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Banner Image Upload & URL */}
                    <div className="lg:col-span-5 p-4 rounded-2xl bg-[#FAFAFA] border border-zinc-200 space-y-3 self-start">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[#E3262E]" />
                        <h4 className="font-display text-sm font-extrabold text-zinc-900">
                          Imagem do Banner (Link ou Upload JPG/PNG/WEBP)
                        </h4>
                      </div>

                      <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-white h-40 relative">
                        <img
                          src={bannerImage}
                          alt={bannerTitle || 'Preview do Banner'}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#FFBE00] text-zinc-950 font-mono text-[10px] font-extrabold shadow-xs">
                          {bannerSlot === 'hero_carousel'
                            ? 'CARROSSEL TOPO'
                            : 'BANNER INFERIOR'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Link Direto da Imagem (URL)
                        </label>
                        <input
                          type="text"
                          value={bannerImage}
                          onChange={(e) => setBannerImage(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-mono"
                        />
                      </div>

                      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-extrabold cursor-pointer w-full justify-center">
                        <Upload className="w-4 h-4 text-[#FFBE00]" />
                        <span>Enviar Imagem do Banner (JPG, PNG, WEBP)</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          onChange={handleBannerImageUpload}
                          className="hidden"
                        />
                      </label>

                      {bannerImageUploadStatus && (
                        <p className="text-[11px] font-bold text-emerald-700">
                          {bannerImageUploadStatus}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setIsBannerFormOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs cursor-pointer shadow-xs"
                    >
                      Salvar Banner Promocional
                    </button>
                  </div>
                </form>
              )}

              {/* List of Registered Banners */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...banners]
                  .sort((a, b) => a.order - b.order)
                  .map((b, idx) => {
                    const linkedProds = b.featuredProductIds
                      .map((id) => products.find((p) => p.id === id))
                      .filter((p): p is Product => Boolean(p));

                    return (
                      <div
                        key={b.id}
                        className={`rounded-2xl border overflow-hidden bg-white flex flex-col justify-between shadow-2xs ${
                          b.active ? 'border-zinc-200' : 'border-zinc-200 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="relative h-36 bg-zinc-900 overflow-hidden">
                            <img
                              src={b.imageUrl}
                              alt={b.title}
                              className="w-full h-full object-cover opacity-85"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                            <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#FFBE00] text-zinc-950 font-mono text-[10px] font-extrabold">
                              {b.slot === 'hero_carousel'
                                ? `SLIDE TOPO #${idx + 1}`
                                : 'BANNER INFERIOR HOME'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleBannerActive(b)}
                              className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-extrabold cursor-pointer ${
                                b.active
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-zinc-700 text-white'
                              }`}
                            >
                              {b.active ? 'ATIVO NA LOJA' : 'PAUSADO'}
                            </button>
                            <div className="absolute bottom-2.5 left-3 right-3 text-white">
                              <span className="text-[10px] font-mono uppercase text-[#FFBE00] font-bold block">
                                {b.badge}
                              </span>
                              <h3 className="font-display text-sm font-extrabold leading-tight truncate">
                                {b.title}
                              </h3>
                            </div>
                          </div>

                          <div className="p-4 space-y-2.5">
                            <p className="text-xs text-zinc-500 line-clamp-2">
                              {b.subtitle}
                            </p>
                            <div>
                              <span className="block text-[10px] font-mono uppercase text-zinc-400 font-bold mb-1">
                                Ofertas exibidas neste banner ({linkedProds.length}):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {linkedProds.map((p) => (
                                  <span
                                    key={`${b.id}-${p.id}`}
                                    className="px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[10px] font-bold text-zinc-900"
                                  >
                                    {p.title} ({formatCurrency(getEffectivePrice(p))})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3.5 border-t border-zinc-100 bg-[#FAFAFA] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleReorderBanner(b.id, 'up')}
                              className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReorderBanner(b.id, 'down')}
                              className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditBanner(b)}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-xs font-bold text-zinc-800 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar / Escolher Ofertas</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBanner(b.id)}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB CUPONS DE DESCONTO ("Cadastrar Cupom na ADM") */}
          {activeTab === 'coupons' && (
            <div className="space-y-4 no-print">
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-zinc-900">
                    Cupons de Desconto & Vouchers Atacado ({coupons.length})
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Crie cupons em porcentagem (%) ou valor fixo (R$). Os cupons ativos aparecem na Home e na Cesta do cliente para aplicação em 1 clique!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateCoupon}
                  className="px-4 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cadastrar Novo Cupom</span>
                </button>
              </div>

              {isCouponFormOpen && (
                <form
                  onSubmit={handleSaveCoupon}
                  className="bg-white rounded-3xl border-2 border-[#FFBE00] p-6 shadow-md space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <TicketPercent className="w-5 h-5 text-[#E3262E]" />
                      <h3 className="font-display text-base font-extrabold text-zinc-900">
                        {editingCoupon
                          ? `Editar Cupom: ${editingCoupon.code}`
                          : 'Cadastrar Novo Cupom Promocional Limper MT'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCouponFormOpen(false)}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Código do Cupom *
                      </label>
                      <input
                        type="text"
                        required
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Ex: LIMPER15"
                        className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono font-extrabold uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Tipo de Desconto *
                      </label>
                      <select
                        value={couponType}
                        onChange={(e) =>
                          setCouponType(e.target.value as 'percent' | 'fixed')
                        }
                        className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold"
                      >
                        <option value="percent">Porcentagem (% OFF)</option>
                        <option value="fixed">Valor Fixo em Reais (R$ OFF)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        {couponType === 'percent'
                          ? 'Desconto (%)'
                          : 'Valor do Desconto (R$)'}{' '}
                        *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={couponValue}
                        onChange={(e) => setCouponValue(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Pedido Mínimo (R$)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={couponMinOrder}
                        onChange={(e) => setCouponMinOrder(e.target.value)}
                        placeholder="0 = Sem mínimo"
                        className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Descrição Comercial (Aparece na Cesta)
                      </label>
                      <input
                        type="text"
                        value={couponDesc}
                        onChange={(e) => setCouponDesc(e.target.value)}
                        placeholder="Ex: 15% OFF Especial Semana da Limpeza Limper MT"
                        className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl cursor-pointer shadow-xs"
                      >
                        Salvar Cupom na Loja
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {coupons.map((cp) => (
                  <div
                    key={cp.id}
                    className={`rounded-2xl border p-4 bg-white flex flex-col justify-between gap-3 shadow-2xs ${
                      cp.active ? 'border-zinc-200' : 'border-zinc-200 opacity-60'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#FFFBEB] border border-[#FFBE00] font-mono text-xs font-extrabold text-[#E3262E]">
                          {cp.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleCouponActive(cp)}
                          className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold cursor-pointer ${
                            cp.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          {cp.active ? 'ATIVO' : 'INATIVO'}
                        </button>
                      </div>

                      <div className="font-mono text-lg font-black text-zinc-950">
                        {cp.discountType === 'percent'
                          ? `${cp.discountValue}% OFF`
                          : `-${formatCurrency(cp.discountValue)}`}
                      </div>

                      <p className="text-xs text-zinc-600 leading-snug">
                        {cp.description}
                      </p>

                      <div className="text-[11px] font-mono text-zinc-400">
                        {cp.minOrderValue && cp.minOrderValue > 0
                          ? `Pedido mín.: ${formatCurrency(cp.minOrderValue)}`
                          : 'Sem valor mínimo de pedido'}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => openEditCoupon(cp)}
                        className="text-xs font-bold text-zinc-700 hover:text-zinc-950 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(cp.id)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: GESTÃO DE CATEGORIAS */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
              <form
                onSubmit={handleSaveCategory}
                className="lg:col-span-5 bg-white p-6 rounded-2xl border border-zinc-200 space-y-4 self-start"
              >
                <h2 className="font-display text-lg font-extrabold text-zinc-900">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Nome Completo da Linha *
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Ex: Linha Piscina & Tratamento"
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Nome Curto (Ícone Circular) *
                  </label>
                  <input
                    type="text"
                    required
                    value={catShortName}
                    onChange={(e) => setCatShortName(e.target.value)}
                    placeholder="Ex: Piscina"
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Ícone da Linha
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {ICON_OPTIONS.map((iconName) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setCatIcon(iconName)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-[11px] cursor-pointer ${
                          catIcon === iconName
                            ? 'bg-[#FFBE00] text-zinc-950 border-[#F59E0B] font-bold'
                            : 'bg-[#FAFAFA] text-zinc-600 border-zinc-200'
                        }`}
                      >
                        <CategoryIcon name={iconName} className="w-5 h-5" />
                        <span>{iconName}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  {editingCategory ? 'Atualizar Categoria' : 'Adicionar Categoria'}
                </button>
              </form>

              <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200 divide-y divide-zinc-100">
                {[...categories]
                  .sort((a, b) => a.order - b.order)
                  .map((cat, idx) => (
                    <div
                      key={cat.id}
                      className="p-4 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] flex items-center justify-center shrink-0">
                          <CategoryIcon name={cat.icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-900">
                            {idx + 1}. {cat.name}{' '}
                            <span className="text-xs font-normal text-zinc-400">
                              ({cat.shortName})
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">{cat.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReorderCategory(cat.id, 'up')}
                          aria-label={`Subir ${cat.name}`}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 cursor-pointer"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorderCategory(cat.id, 'down')}
                          aria-label={`Descer ${cat.name}`}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 cursor-pointer"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setCatName(cat.name);
                            setCatShortName(cat.shortName);
                            setCatDesc(cat.description);
                            setCatIcon(cat.icon);
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-900 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 4: CRM DE CLIENTES & RECOMPRA */}
          {activeTab === 'customers' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4 no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-zinc-900">
                    Base de Clientes & Histórico de Recompra ({customersList.length})
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Acompanhe condomínios, lava-jatos, clínicas e clientes residenciais com contato direto via WhatsApp.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-[#FAFAFA] text-[11px] font-mono uppercase text-zinc-500">
                      <th className="py-3 px-4">Cliente / Empresa</th>
                      <th className="py-3 px-4">WhatsApp</th>
                      <th className="py-3 px-4">Pedidos</th>
                      <th className="py-3 px-4">Modalidade</th>
                      <th className="py-3 px-4">Total Acumulado</th>
                      <th className="py-3 px-4 text-right">Contato Rápido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {customersList.map((cust) => {
                      const clean = normalizePhone(cust.phone);
                      const waPhone = clean.startsWith('55') ? clean : `55${clean}`;
                      return (
                        <tr key={cust.phone + cust.name} className="hover:bg-zinc-50">
                          <td className="py-3 px-4 font-bold text-zinc-900">
                            {cust.name}
                            <span className="block font-mono text-[10px] text-zinc-400">
                              Último pedido: {cust.lastOrderId}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-700">
                            {formatPhone(cust.phone)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            {cust.ordersCount} pedido(s)
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-bold text-[11px]">
                              {cust.lastDeliveryType === 'pickup'
                                ? 'Retirada Balcão'
                                : 'Delivery Local'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-extrabold text-zinc-950 tabular-nums">
                            {formatCurrency(cust.totalSpent)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <a
                              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                                `Olá, ${cust.name}! Aqui é da Limper MT (Av. Couto Magalhães, 2820). Gostaria de repor seu estoque de produtos Quimiprol com desconto?`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Oferecer Reposição</span>
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: CONFIGURAÇÕES GERAIS (WHATSAPP, PIX, FRETE) */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
              <form
                onSubmit={handleSaveSettingsSubmit}
                className="lg:col-span-7 bg-white p-6 rounded-2xl border border-zinc-200 space-y-4"
              >
                <h2 className="font-display text-lg font-extrabold text-zinc-900">
                  Dados de Recebimento PIX, Endereço & Telefone Oficial
                </h2>

                {savedSettingsBanner && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Configurações da Limper MT salvas com sucesso!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      WhatsApp / Telefone Destino (Com DDI 55 + DDD)
                    </label>
                    <input
                      type="text"
                      value={formSettings.whatsappNumber}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, whatsappNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Telefone de Exibição Oficial
                    </label>
                    <input
                      type="text"
                      value={formSettings.whatsappDisplay}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, whatsappDisplay: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Tipo de Chave PIX
                    </label>
                    <select
                      value={formSettings.pixKeyType}
                      onChange={(e) =>
                        setFormSettings({
                          ...formSettings,
                          pixKeyType: e.target.value as StoreSettings['pixKeyType'],
                        })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                    >
                      <option value="CNPJ">CNPJ</option>
                      <option value="Celular">Celular</option>
                      <option value="E-mail">E-mail</option>
                      <option value="Aleatória">Chave Aleatória</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Chave PIX da Limper MT
                    </label>
                    <input
                      type="text"
                      value={formSettings.pixKey}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, pixKey: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Favorecido / Razão Social PIX
                  </label>
                  <input
                    type="text"
                    value={formSettings.pixBeneficiary}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, pixBeneficiary: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Endereço Oficial da Loja p/ Retirada no Balcão
                  </label>
                  <input
                    type="text"
                    value={formSettings.storeAddress}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, storeAddress: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Frete Grátis Acima de (R$)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={formSettings.freeShippingThreshold}
                      onChange={(e) =>
                        setFormSettings({
                          ...formSettings,
                          freeShippingThreshold: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Taxa Padrão Outros Bairros (R$)
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      value={formSettings.defaultDeliveryFee}
                      onChange={(e) =>
                        setFormSettings({
                          ...formSettings,
                          defaultDeliveryFee: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Salvar Configurações da Loja
                </button>
              </form>

              {/* Neighborhood Fees Table */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-zinc-200 space-y-4 self-start">
                <h3 className="font-display text-base font-extrabold text-zinc-900">
                  Tabela de Taxas de Entrega por Bairro
                </h3>

                <div className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={newNeighborhoodName}
                    onChange={(e) => setNewNeighborhoodName(e.target.value)}
                    placeholder="Nome do Bairro"
                    className="col-span-5 px-2.5 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-lg text-xs"
                  />
                  <select
                    value={newNeighborhoodCity}
                    onChange={(e) =>
                      setNewNeighborhoodCity(e.target.value as 'Cuiabá' | 'Várzea Grande')
                    }
                    className="col-span-3 px-2 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-lg text-xs"
                  >
                    <option value="Várzea Grande">Várzea Grande</option>
                    <option value="Cuiabá">Cuiabá</option>
                  </select>
                  <input
                    type="number"
                    step="0.50"
                    value={newNeighborhoodFee}
                    onChange={(e) => setNewNeighborhoodFee(e.target.value)}
                    className="col-span-2 px-2 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddNeighborhood}
                    className="col-span-2 bg-[#FFBE00] text-zinc-950 font-extrabold text-xs rounded-lg flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="divide-y divide-zinc-100 text-xs">
                  {formSettings.neighborhoodFees.map((nb) => (
                    <div
                      key={nb.id}
                      className="py-2.5 flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-zinc-900">{nb.name}</strong>{' '}
                        <span className="text-zinc-400">({nb.city})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-zinc-900 tabular-nums">
                          {formatCurrency(nb.fee)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveNeighborhood(nb.id)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PRINTABLE PICKING COMMAND MODAL (COMANDA DE SEPARAÇÃO) */}
      {printOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="picking-slip-title"
          className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-zinc-300 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-dashed border-zinc-300 pb-3">
              <div>
                <p className="text-[11px] font-mono uppercase text-zinc-500">
                  COMANDA INTERNA DE SEPARAÇÃO · LIMPER MT
                </p>
                <h2
                  id="picking-slip-title"
                  className="font-mono text-xl font-extrabold text-zinc-900"
                >
                  Pedido {printOrder.id}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPrintOrder(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 no-print cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs font-mono space-y-1 text-zinc-900 border-b border-dashed border-zinc-300 pb-3">
              <div>CLIENTE: {printOrder.customerName}</div>
              <div>WHATSAPP: {formatPhone(printOrder.customerPhone)}</div>
              <div>
                TIPO:{' '}
                {printOrder.deliveryType === 'delivery'
                  ? 'ENTREGA DELIVERY'
                  : 'RETIRADA NO BALCÃO (AV. COUTO MAGALHÃES, 2820)'}
              </div>
              {printOrder.address && (
                <div>
                  ENDEREÇO: {printOrder.address.street}, {printOrder.address.number} -{' '}
                  {printOrder.address.neighborhood} ({printOrder.address.city})
                </div>
              )}
              <div>PAGAMENTO: {formatPaymentMethodLabel(printOrder)}</div>
            </div>

            <div className="space-y-2 border-b border-dashed border-zinc-300 pb-3">
              <div className="text-xs font-mono font-bold text-zinc-900">
                CHECKLIST DE ESTOQUE:
              </div>
              {printOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs font-mono text-zinc-900"
                >
                  <span>
                    [ ] {item.quantity}x {item.title} ({item.volumeLabel})
                  </span>
                  <span className="tabular-nums">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-mono text-sm font-extrabold text-zinc-900">
              <span>TOTAL A CONFERIR:</span>
              <span className="tabular-nums">{formatCurrency(printOrder.total)}</span>
            </div>

            <div className="pt-2 flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#FFBE00] text-zinc-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comanda Agora</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintOrder(null)}
                className="px-4 py-2.5 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
