import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FolderKanban,
  Gift,
  Image as ImageIcon,
  Layers,
  Link2,
  Lock,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Printer,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  Category,
  CategoryIconName,
  DeliveryType,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductStatus,
  PromoKit,
  StoreSettings,
  UnitOfMeasure,
} from '../types/commerce';
import {
  ORDER_STATUS_META,
  formatCurrency,
  formatPaymentMethodLabel,
  formatPhone,
  getEffectivePrice,
  normalizePhone,
} from '../utils/commerce';
import { GENERATED_IMAGES, LIMPER_LOGO_URL } from '../data/initialCatalog';
import { CategoryIcon, ProductImageWithFallback } from './CategoryIcon';

interface AdminDashboardProps {
  categories: Category[];
  products: Product[];
  kits: PromoKit[];
  orders: Order[];
  settings: StoreSettings;
  onSaveCategories: (categories: Category[]) => void;
  onSaveProducts: (products: Product[]) => void;
  onSaveKits: (kits: PromoKit[]) => void;
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

type AdminAppTab = 'kanban' | 'products' | 'kits' | 'categories' | 'customers' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  categories,
  products,
  kits,
  orders,
  settings,
  onSaveCategories,
  onSaveProducts,
  onSaveKits,
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

  // Kit & Combo Form State ("Cadastro de Kits com Imagem")
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
  const [kitQuantities, setKitQuantities] = useState<Record<string, number>>({
    'prod-casa-1': 1,
    'prod-casa-3': 1,
    'prod-casa-4': 1,
  });

  // Settings Form State
  const [formSettings, setFormSettings] = useState<StoreSettings>(settings);
  const [savedSettingsBanner, setSavedSettingsBanner] = useState(false);
  const [newNeighborhoodName, setNewNeighborhoodName] = useState('');
  const [newNeighborhoodCity, setNewNeighborhoodCity] = useState<'Cuiabá' | 'Várzea Grande'>('Várzea Grande');
  const [newNeighborhoodFee, setNewNeighborhoodFee] = useState('8.00');

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

  const handleMoveOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    const updated = orders.map((o) =>
      o.id === orderId ? { ...o, status: nextStatus } : o
    );
    onSaveOrders(updated);
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
        id: `prod-${Date.now()}`,
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
      label: 'Kits & Combos',
      badge: kits.length,
      icon: Gift,
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

          {/* TAB 1: KANBAN DE SEPARAÇÃO DE PEDIDOS + LANÇAMENTO PDV BALCÃO */}
          {activeTab === 'kanban' && (
            <div className="space-y-4 no-print">
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-zinc-900">
                    Quadro Operacional de Separação & Retirada Expressa
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Avance os pedidos conforme os galões forem lacrados, lance vendas de balcão (PDV) ou exporte relatórios em planilha.
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

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('products');
                      openCreateProduct();
                    }}
                    className="px-3.5 py-2 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Produto</span>
                  </button>
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

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
                {KANBAN_COLUMNS.map((statusKey) => {
                  const colMeta = ORDER_STATUS_META[statusKey];
                  const colOrders = orders.filter((o) => o.status === statusKey);

                  return (
                    <div
                      key={statusKey}
                      className="bg-white rounded-2xl p-3.5 border border-zinc-200 flex flex-col min-h-[420px] shadow-2xs"
                    >
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200">
                        <h3 className="font-display text-xs font-extrabold text-zinc-900">
                          {colMeta.label}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDE68A] font-mono text-xs font-extrabold text-[#B45309] tabular-nums">
                          {colOrders.length}
                        </span>
                      </div>

                      <div className="space-y-3 flex-1">
                        {colOrders.length === 0 ? (
                          <div className="h-32 rounded-xl border border-dashed border-zinc-200 flex items-center justify-center text-xs text-zinc-400">
                            Sem pedidos nesta etapa
                          </div>
                        ) : (
                          colOrders.map((order) => {
                            const currentIdx = KANBAN_COLUMNS.indexOf(order.status);
                            const nextStatus =
                              currentIdx < KANBAN_COLUMNS.length - 1
                                ? KANBAN_COLUMNS[currentIdx + 1]
                                : null;

                            return (
                              <article
                                key={order.id}
                                className="bg-[#FAFAFA] rounded-xl p-3.5 border border-zinc-200/90 space-y-2.5"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-mono font-extrabold text-zinc-900">
                                    {order.id}
                                  </span>
                                  <span className="font-mono font-extrabold text-zinc-900 tabular-nums">
                                    {formatCurrency(order.total)}
                                  </span>
                                </div>

                                <div className="text-xs">
                                  <div className="font-bold text-zinc-900">
                                    {order.customerName}
                                  </div>
                                  <div className="font-mono text-zinc-500 text-[11px]">
                                    {formatPhone(order.customerPhone)} ·{' '}
                                    <strong className="text-[#E3262E]">
                                      {order.deliveryType === 'delivery' ? 'Delivery' : 'Retirada 15min'}
                                    </strong>
                                  </div>
                                </div>

                                <div className="text-[11px] text-zinc-700 space-y-1 bg-white p-2.5 rounded-lg border border-zinc-200/70">
                                  {order.items.map((item, idx) => (
                                    <div
                                      key={`${order.id}-${idx}`}
                                      className="flex justify-between gap-2"
                                    >
                                      <span className="truncate">
                                        <strong className="font-mono">{item.quantity}x</strong>{' '}
                                        {item.title}
                                      </span>
                                      <span className="font-mono shrink-0">{item.volumeLabel}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="pt-2 border-t border-zinc-200/60 flex flex-wrap items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setPrintOrder(order)}
                                      aria-label={`Imprimir comanda do pedido ${order.id}`}
                                      className="px-2 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-900 text-[11px] font-bold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Printer className="w-3 h-3" />
                                      <span>Comanda</span>
                                    </button>

                                    <a
                                      href={buildCustomerWhatsAppStatusUrl(order)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Avisar cliente no WhatsApp"
                                      className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg inline-flex items-center gap-1"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                      <span>Avisar</span>
                                    </a>
                                  </div>

                                  {nextStatus && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveOrderStatus(order.id, nextStatus)}
                                      className="px-2.5 py-1.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-[11px] font-extrabold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>Avançar</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )}
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
            </div>
          )}

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
                      Salvar Produto no Catálogo
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

                      {/* Composição de Produtos do Kit */}
                      <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-zinc-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-zinc-900">
                            Selecione os Produtos Inclusos no Kit *
                          </span>
                          <span className="text-[11px] font-mono font-bold text-[#E3262E]">
                            {Object.values(kitQuantities).reduce((a, b) => a + b, 0)} un. no combo
                          </span>
                        </div>

                        <div className="max-h-56 overflow-y-auto divide-y divide-zinc-200/70 bg-white rounded-xl border border-zinc-200 p-2">
                          {products
                            .filter((p) => p.status === 'active')
                            .map((prod) => {
                              const qty = kitQuantities[prod.id] || 0;
                              return (
                                <div
                                  key={`kit-prod-${prod.id}`}
                                  className={`py-2 px-2 flex items-center justify-between gap-2 text-xs rounded-lg ${
                                    qty > 0 ? 'bg-[#FFFBEB]' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-white border border-zinc-200 overflow-hidden shrink-0">
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
                                      <span className="text-[11px] font-mono text-zinc-500">
                                        {prod.volumeLabel} · {formatCurrency(getEffectivePrice(prod))}
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
                                      className="w-6 h-6 rounded-md bg-zinc-100 hover:bg-zinc-200 font-bold cursor-pointer"
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
                                  </div>
                                </div>
                              );
                            })}
                        </div>

                        {/* Cálculo Automático de Soma Avulsa vs Preço Promocional do Kit */}
                        {(() => {
                          const regularTotal = Object.entries(kitQuantities).reduce(
                            (acc, [prodId, q]) => {
                              if (q <= 0) return acc;
                              const p = products.find((item) => item.id === prodId);
                              return acc + (p ? getEffectivePrice(p) * q : 0);
                            },
                            0
                          );
                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 items-end">
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
                                  Preço Promocional do Kit (R$) *
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
