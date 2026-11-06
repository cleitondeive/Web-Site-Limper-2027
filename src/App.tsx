import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FilePlus2,
  Filter,
  FlaskConical,
  Gift,
  Home as HomeIcon,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Percent,
  Phone,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Star,
  Store,
  Tally4,
} from 'lucide-react';
import {
  CartItem,
  CatalogSortOption,
  Category,
  CustomerProfile,
  Order,
  Product,
  PromoBanner,
  PromoCoupon,
  PromoKit,
  StoreSettings,
  VolumeFilterOption,
} from './types/commerce';
import {
  addToCart,
  calculateCartTotals,
  filterProducts,
  formatCurrency,
  getEffectivePrice,
  mergeOrderIntoCart,
  updateCartQuantity,
} from './utils/commerce';
import { storageService } from './utils/storage';
import { GENERATED_IMAGES, LIMPER_LOGO_URL } from './data/initialCatalog';
import { ProductImageWithFallback } from './components/CategoryIcon';
import { ActiveView, Header } from './components/Header';
import { MegaMenu } from './components/MegaMenu';
import { HeroCarousel } from './components/HeroCarousel';
import { CategoryBar } from './components/CategoryBar';
import { ProductCard, ProductDetailModal } from './components/ProductCard';
import {
  CartCheckoutDrawer,
  OrderConfirmationModal,
} from './components/CartCheckoutDrawer';
import { OrdersHistoryView } from './components/OrdersHistoryModal';
import { AdminDashboard } from './components/AdminDashboard';
import {
  CepLocationModal,
  CustomerAccountModal,
  QuickOrderListModal,
} from './components/CustomerModals';

export default function App() {
  const [categories, setCategories] = useState<Category[]>(() =>
    storageService.getCategories()
  );
  const [products, setProducts] = useState<Product[]>(() =>
    storageService.getProducts()
  );
  const [kits, setKits] = useState<PromoKit[]>(() =>
    storageService.getKits()
  );
  const [coupons, setCoupons] = useState<PromoCoupon[]>(() =>
    storageService.getCoupons()
  );
  const [banners, setBanners] = useState<PromoBanner[]>(() =>
    storageService.getBanners()
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    storageService.getOrders()
  );
  const [settings, setSettings] = useState<StoreSettings>(() =>
    storageService.getSettings()
  );
  const [cart, setCart] = useState<CartItem[]>(() =>
    storageService.getCart()
  );
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile>(() =>
    storageService.getCustomerProfile()
  );
  const [favorites, setFavorites] = useState<string[]>(() =>
    storageService.getFavorites()
  );
  const [activeCouponCode, setActiveCouponCode] = useState<string>('');

  // Navigation & Filter States
  const [activeView, setActiveView] = useState<ActiveView>('store');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [volumeFilter, setVolumeFilter] = useState<VolumeFilterOption>('all');
  const [sortBy, setSortBy] = useState<CatalogSortOption>('featured');
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [showcasePage, setShowcasePage] = useState(0);

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCepModalOpen, setIsCepModalOpen] = useState(false);
  const [isQuickOrderModalOpen, setIsQuickOrderModalOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    storageService.saveCart(cart);
  }, [cart]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const handleSaveCategories = (updated: Category[]) => {
    setCategories(updated);
    storageService.saveCategories(updated);
  };

  const handleSaveProducts = (updated: Product[]) => {
    setProducts(updated);
    storageService.saveProducts(updated);
  };

  const handleSaveKits = (updated: PromoKit[]) => {
    setKits(updated);
    storageService.saveKits(updated);
  };

  const handleSaveCoupons = (updated: PromoCoupon[]) => {
    setCoupons(updated);
    storageService.saveCoupons(updated);
  };

  const handleSaveBanners = (updated: PromoBanner[]) => {
    setBanners(updated);
    storageService.saveBanners(updated);
  };

  const handleSaveOrders = (updated: Order[]) => {
    setOrders(updated);
    storageService.saveOrders(updated);
  };

  const handleSaveSettings = (updated: StoreSettings) => {
    setSettings(updated);
    storageService.saveSettings(updated);
  };

  const handleSaveCustomerProfile = (profile: CustomerProfile) => {
    setCustomerProfile(profile);
    storageService.saveCustomerProfile(profile);
  };

  const handleToggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(productId);
      const next = exists
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      storageService.saveFavorites(next);
      return next;
    });
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => addToCart(prev, product, 1));
    showToast(`${product.title} adicionado à cesta`);
  };

  const handleAddBatchToCart = (items: { product: Product; quantity: number }[]) => {
    setCart((prev) => {
      let updated = [...prev];
      items.forEach(({ product, quantity }) => {
        updated = addToCart(updated, product, quantity);
      });
      return updated;
    });
    const totalAdded = items.reduce((acc, i) => acc + i.quantity, 0);
    showToast(`${totalAdded} itens adicionados à cesta!`);
    setIsCartOpen(true);
  };

  const handleUpdateCartQty = (productId: string, newQty: number) => {
    setCart((prev) => updateCartQuantity(prev, productId, newQty));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleRepeatOrder = (order: Order) => {
    const { updatedCart, addedCount } = mergeOrderIntoCart(cart, order, products);
    setCart(updatedCart);
    showToast(`${addedCount} itens do pedido ${order.id} carregados na cesta!`);
    setIsCartOpen(true);
  };

  const handleCompleteOrder = (newOrder: Order) => {
    const updatedOrders = [newOrder, ...orders];
    handleSaveOrders(updatedOrders);
    setCart([]);
    setIsCartOpen(false);
    setConfirmedOrder(newOrder);
  };

  const baseFilteredProducts = filterProducts(products, {
    categoryId: selectedCategoryId,
    searchQuery,
    onlyOffers,
    volumeFilter,
    sortBy,
  });

  const filteredProducts = onlyFavorites
    ? baseFilteredProducts.filter((p) => favorites.includes(p.id))
    : baseFilteredProducts;

  // 5-Item Featured Todimo Showcase Row (prioritizing admin-starred featured products)
  const promoShowcaseProducts = products
    .filter((p) => p.status === 'active' && (p.featured || (p.promoPrice && p.promoPrice < p.price)))
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  const showcaseSliceStart = (showcasePage * 5) % Math.max(1, promoShowcaseProducts.length);
  const visibleShowcaseFive = [
    ...promoShowcaseProducts.slice(showcaseSliceStart, showcaseSliceStart + 5),
    ...promoShowcaseProducts.slice(
      0,
      Math.max(0, 5 - (promoShowcaseProducts.length - showcaseSliceStart))
    ),
  ].slice(0, 5);

  // Active Promo Kits managed in Admin ("Kits Prontos de Limpeza com Imagem")
  const activeKits = kits.filter((k) => k.active);
  const activeBottomBanner = banners.find(
    (b) => b.slot === 'bottom_banner' && b.active
  );

  const cartTotals = calculateCartTotals(
    cart,
    'delivery',
    customerProfile.neighborhood || 'Centro Norte',
    settings,
    activeCouponCode,
    coupons
  );

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);
  const latestActiveOrder =
    orders.find((o) => o.status !== 'completed') || orders[0];

  const hasActiveFilters = Boolean(
    selectedCategoryId ||
      searchQuery ||
      onlyOffers ||
      onlyFavorites ||
      volumeFilter !== 'all' ||
      sortBy !== 'featured'
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-zinc-900">
      {/* 1. 3-Tier Drogasil + Todimo Header with Live Photo Search */}
      <Header
        activeView={activeView}
        onlyOffers={onlyOffers}
        isMegaMenuOpen={isMegaMenuOpen}
        products={products}
        categories={categories}
        cartItemCount={cartTotals.itemCount}
        cartSubtotal={cartTotals.subtotal}
        ordersCount={orders.length}
        hideAllPrices={settings.hideAllPrices}
        customerProfile={customerProfile}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (activeView !== 'store') setActiveView('store');
        }}
        onSelectProduct={(prod) => {
          setActiveView('store');
          setDetailProduct(prod);
        }}
        onAddToCart={handleAddToCart}
        onSelectStore={() => {
          setActiveView('store');
          setOnlyOffers(false);
          setOnlyFavorites(false);
          setIsMegaMenuOpen(false);
        }}
        onToggleMegaMenu={() => setIsMegaMenuOpen((prev) => !prev)}
        onSelectOffers={() => {
          setActiveView('store');
          setOnlyOffers((prev) => !prev);
          setOnlyFavorites(false);
          setIsMegaMenuOpen(false);
        }}
        onSelectOrders={() => {
          setActiveView('orders');
          setIsMegaMenuOpen(false);
        }}
        onSelectAdmin={() => {
          setActiveView('admin');
          setIsMegaMenuOpen(false);
        }}
        onOpenCart={() => {
          setIsMegaMenuOpen(false);
          setIsCartOpen(true);
        }}
        onOpenAccountModal={() => {
          setIsMegaMenuOpen(false);
          setIsAccountModalOpen(true);
        }}
        onOpenCepModal={() => {
          setIsMegaMenuOpen(false);
          setIsCepModalOpen(true);
        }}
        onOpenQuickOrderModal={() => {
          setIsMegaMenuOpen(false);
          setIsQuickOrderModalOpen(true);
        }}
      />

      {/* Quimiprol Multi-Column MegaMenu Overlay */}
      <MegaMenu
        isOpen={isMegaMenuOpen}
        categories={categories}
        products={products}
        onClose={() => setIsMegaMenuOpen(false)}
        onSelectCategory={(catId) => {
          setActiveView('store');
          setSelectedCategoryId(catId);
          setOnlyOffers(false);
          setOnlyFavorites(false);
          setTimeout(() => {
            document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }}
        onSelectProduct={(prod) => {
          setActiveView('store');
          setDetailProduct(prod);
        }}
      />

      {/* Non-intrusive Action Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 z-40 bg-white text-zinc-950 px-4 py-3 rounded-xl shadow-lg border-2 border-[#FFBE00] text-xs font-bold flex items-center gap-2.5 no-print"
        >
          <ShoppingBag className="w-4 h-4 text-[#E3262E]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pb-24 md:pb-12">
        {activeView === 'store' && (
          <>
            {/* Section 1: Light Smart Solutions Bar + Auto-Rotating Promotional Banner Carousel */}
            <HeroCarousel
              banners={banners}
              products={products}
              coupons={coupons}
              hideAllPrices={settings.hideAllPrices}
              selectedCategoryId={selectedCategoryId}
              onlyFavorites={onlyFavorites}
              favoritesCount={favorites.length}
              onToggleFavorites={() => {
                setOnlyFavorites((prev) => !prev);
                setOnlyOffers(false);
              }}
              onToggleMegaMenu={() => setIsMegaMenuOpen((prev) => !prev)}
              onSelectCategory={(catId) => {
                setSelectedCategoryId(catId);
                setOnlyOffers(false);
                setOnlyFavorites(false);
              }}
              onSelectOffers={() => {
                setOnlyOffers(true);
                setOnlyFavorites(false);
              }}
              onOpenRepeatOrders={() => setActiveView('orders')}
              onOpenQuickOrderModal={() => setIsQuickOrderModalOpen(true)}
              onOpenCepModal={() => setIsCepModalOpen(true)}
              onSelectProduct={(prod) => setDetailProduct(prod)}
              onAddToCart={handleAddToCart}
              onApplyCoupon={(code) => {
                setActiveCouponCode(code);
                showToast(`Cupom ${code} ativado na sua Cesta!`);
              }}
              latestActiveOrder={latestActiveOrder}
            />

            {/* Section 2: Todimo 5-Product Horizontal Showcase ("Ofertas Imbatíveis da Semana") */}
            {!selectedCategoryId && !searchQuery && !onlyFavorites && (
              <section className="max-w-[1360px] mx-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-2">
                <div className="flex items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-extrabold text-[#E3262E]">
                      <span>VITRINE DE DESTAQUES · 5 PRODUTOS POR LINHA</span>
                    </div>
                    <h2 className="font-display text-lg sm:text-2xl font-extrabold text-zinc-900">
                      Ofertas Imbatíveis da Semana Limper MT
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setShowcasePage((prev) =>
                          prev === 0 ? promoShowcaseProducts.length - 1 : prev - 1
                        )
                      }
                      aria-label="Produtos anteriores da vitrine"
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-[#FFBE00] border border-zinc-300 text-zinc-800 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowcasePage((prev) => prev + 1)}
                      aria-label="Próximos produtos da vitrine"
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-[#FFBE00] border border-zinc-300 text-zinc-800 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2-Column on Mobile / 5-Column on Desktop Product Showcase Row (Todimo pattern) */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
                  {visibleShowcaseFive.map((product) => {
                    const cartEntry = cart.find((c) => c.product.id === product.id);
                    const catObj = categories.find((c) => c.id === product.categoryId);
                    return (
                      <ProductCard
                        key={`showcase-${product.id}`}
                        product={product}
                        category={catObj}
                        settings={settings}
                        quantityInCart={cartEntry ? cartEntry.quantity : 0}
                        isFavorite={favorites.includes(product.id)}
                        customerCep={customerProfile.cep}
                        onAdd={handleAddToCart}
                        onUpdateQuantity={handleUpdateCartQty}
                        onOpenDetail={setDetailProduct}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Section 3: Circular Categories Bar & Complete 5-Column Catalog Grid */}
            <CategoryBar
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onlyOffers={onlyOffers}
              onSelectCategory={(catId) => {
                setSelectedCategoryId(catId);
                setOnlyFavorites(false);
              }}
              onToggleOffers={(val) => {
                setOnlyOffers(val);
                setOnlyFavorites(false);
              }}
              totalFilteredCount={filteredProducts.length}
            />

            <section className="max-w-[1360px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
              {/* Active Filter Context Header + Retail Catalog Toolbar (Sorting & Volume Filters) */}
              <div className="bg-white rounded-2xl border border-zinc-200/90 p-3.5 sm:p-4 mb-4 sm:mb-5 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg sm:text-2xl font-extrabold text-zinc-900">
                      {onlyFavorites
                        ? `Meus Produtos Salvos (${filteredProducts.length})`
                        : selectedCategoryObj
                        ? selectedCategoryObj.name
                        : onlyOffers
                        ? 'Ofertas Especiais Quimiprol & Limper MT'
                        : 'Catálogo Completo Limper MT'}
                    </h2>
                    {selectedCategoryObj && (
                      <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                        {selectedCategoryObj.description}
                      </p>
                    )}
                  </div>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(null);
                        setSearchQuery('');
                        setOnlyOffers(false);
                        setOnlyFavorites(false);
                        setVolumeFilter('all');
                        setSortBy('featured');
                      }}
                      className="text-xs font-extrabold text-[#E3262E] hover:underline cursor-pointer"
                    >
                      Limpar filtros ({products.filter((p) => p.status !== 'inactive').length})
                    </button>
                  )}
                </div>

                {/* Interactive Volume Filter Pills & Sort Dropdown */}
                <div className="pt-2.5 sm:pt-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                  <div className="flex sm:flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-zinc-600 mr-0.5 shrink-0">
                      <Filter className="w-3.5 h-3.5 text-[#E3262E]" />
                      <span>Embalagem:</span>
                    </span>
                    {[
                      { id: 'all' as VolumeFilterOption, label: 'Todas' },
                      { id: '5L' as VolumeFilterOption, label: 'Galões 5L / 3,5L (Atacado)' },
                      { id: '2L_1L' as VolumeFilterOption, label: 'Frascos 2L e 1L' },
                      { id: 'small' as VolumeFilterOption, label: 'Pronto Uso (500mL / 60mL)' },
                    ].map((vf) => (
                      <button
                        key={vf.id}
                        type="button"
                        onClick={() => setVolumeFilter(vf.id)}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          volumeFilter === vf.id
                            ? 'bg-[#FFBE00] border-[#F59E0B] text-zinc-950 font-extrabold shadow-2xs'
                            : 'bg-[#FAFAFA] hover:bg-zinc-100 border-zinc-200 text-zinc-700'
                        }`}
                      >
                        {vf.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                    <label htmlFor="catalog-sort" className="text-[11px] sm:text-xs font-bold text-zinc-600 shrink-0">
                      Ordenar:
                    </label>
                    <select
                      id="catalog-sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as CatalogSortOption)}
                      className="px-2.5 sm:px-3 py-1.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-[11px] sm:text-xs font-extrabold text-zinc-900 focus:border-[#FFBE00] focus:outline-none cursor-pointer"
                    >
                      <option value="featured">Destaques da Loja ★</option>
                      <option value="price_asc">Menor Preço (R$)</option>
                      <option value="discount_desc">Maior Desconto (% OFF)</option>
                      <option value="price_desc">Maior Preço / Galões</option>
                      <option value="name_asc">Ordem Alfabética (A–Z)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2-Column Mobile / 5-Column Desktop Product Grid */}
              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-zinc-200 p-10 sm:p-12 text-center max-w-md mx-auto">
                  <h3 className="font-display text-lg font-extrabold text-zinc-900 mb-1">
                    Nenhum produto encontrado
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-500 mb-5">
                    {onlyFavorites
                      ? 'Você ainda não salvou produtos nos favoritos. Clique no ícone de coração nos produtos para salvar.'
                      : 'Não encontramos itens para a busca ou filtro selecionado.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(null);
                      setSearchQuery('');
                      setOnlyOffers(false);
                      setOnlyFavorites(false);
                      setVolumeFilter('all');
                      setSortBy('featured');
                    }}
                    className="px-5 py-2.5 bg-[#FFBE00] text-zinc-950 font-extrabold text-xs rounded-xl cursor-pointer"
                  >
                    Ver Catálogo Completo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
                  {filteredProducts.map((product) => {
                    const cartEntry = cart.find((c) => c.product.id === product.id);
                    const catObj = categories.find((c) => c.id === product.categoryId);
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        category={catObj}
                        settings={settings}
                        quantityInCart={cartEntry ? cartEntry.quantity : 0}
                        isFavorite={favorites.includes(product.id)}
                        customerCep={customerProfile.cep}
                        onAdd={handleAddToCart}
                        onUpdateQuantity={handleUpdateCartQty}
                        onOpenDetail={setDetailProduct}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* Section 4: Ready-to-Buy Smart Kits, Bottom Promotional Banner, Physical Store Card & Light Institutional Benefits */}
            <section className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 space-y-8">
              {/* 1-Click Ready Kits with Cover Image & Product Thumbnails ("Kits Prontos de Limpeza") */}
              <div
                id="kits-prontos"
                className="bg-white rounded-3xl border border-zinc-200/90 p-6 sm:p-7 shadow-2xs space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase text-[#E3262E] font-extrabold">
                      <Gift className="w-3.5 h-3.5" />
                      <span>PRATICIDADE & ECONOMIA EM COMBO</span>
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold text-zinc-900">
                      Kits Prontos Limper MT — Adicione o Combo em 1 Clique
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsQuickOrderModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-[#FFFBEB] hover:bg-[#FFBE00]/30 border border-[#FDE68A] text-xs font-extrabold text-zinc-900 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#E3262E]" />
                      <span>Montar Meu Próprio Kit / Atacado</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#E3262E]" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {activeKits.map((kit, idx) => {
                    const resolvedEntries = kit.items
                      .map((item) => {
                        const product = products.find((p) => p.id === item.productId);
                        return product ? { product, quantity: item.quantity } : null;
                      })
                      .filter(
                        (entry): entry is { product: Product; quantity: number } =>
                          Boolean(entry)
                      );

                    const regularTotal = resolvedEntries.reduce(
                      (acc, entry) =>
                        acc + getEffectivePrice(entry.product) * entry.quantity,
                      0
                    );
                    const finalKitPrice =
                      kit.promoPrice > 0 ? kit.promoPrice : regularTotal;
                    const savingsAmount = Math.max(0, regularTotal - finalKitPrice);
                    const totalUnitsCount = resolvedEntries.reduce(
                      (acc, entry) => acc + entry.quantity,
                      0
                    );
                    const isPriceHidden =
                      Boolean(settings.hideAllPrices) || kit.showPrice === false;

                    return (
                      <article
                        key={kit.id}
                        className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${
                          idx === 0
                            ? 'bg-[#FFFBEB]/70 border-[#FDE68A]'
                            : 'bg-white border-zinc-200'
                        }`}
                      >
                        <div>
                          {/* Kit Cover Image + Badges */}
                          <div className="relative h-44 bg-zinc-100 border-b border-zinc-200/70 overflow-hidden group">
                            <ProductImageWithFallback
                              src={kit.imageUrl}
                              alt={kit.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#FFBE00] text-zinc-950 font-mono text-[10px] font-extrabold shadow-xs">
                              {kit.badge}
                            </span>
                            {savingsAmount > 0 && !isPriceHidden && (
                              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#E3262E] text-white font-mono text-[10px] font-extrabold shadow-xs">
                                -{formatCurrency(savingsAmount)} OFF
                              </span>
                            )}
                            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
                              <span className="text-[11px] font-bold drop-shadow-xs">
                                Combo com {totalUnitsCount} produto(s) Quimiprol
                              </span>
                            </div>
                          </div>

                          {/* Kit Content & Included Product Mini-Thumbnails */}
                          <div className="p-5 space-y-3">
                            <div>
                              <h3 className="font-display text-base font-extrabold text-zinc-900">
                                {kit.title}
                              </h3>
                              <p className="text-xs text-zinc-600 leading-relaxed mt-1">
                                {kit.description}
                              </p>
                            </div>

                            {/* Included Products Strip with Photos */}
                            <div className="space-y-1.5 pt-1">
                              <span className="block text-[10px] font-mono uppercase text-zinc-400 font-bold">
                                Itens inclusos no kit:
                              </span>
                              <div className="flex flex-col gap-1.5">
                                {resolvedEntries.map(({ product, quantity }) => (
                                  <div
                                    key={`${kit.id}-${product.id}`}
                                    className="flex items-center gap-2 p-1.5 rounded-xl bg-white border border-zinc-200/80 text-xs"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-[#FAFAFA] border border-zinc-200 overflow-hidden shrink-0">
                                      <ProductImageWithFallback
                                        src={product.imageUrl}
                                        alt={product.title}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1 truncate">
                                      <strong className="font-mono text-[#E3262E]">
                                        {quantity}x
                                      </strong>{' '}
                                      <span className="font-bold text-zinc-800">
                                        {product.title}
                                      </span>
                                    </div>
                                    <span className="font-mono text-[10px] font-bold text-zinc-500 shrink-0">
                                      {product.volumeLabel}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 py-4 border-t border-zinc-200/80 bg-white/80 flex items-center justify-between gap-3">
                          <div>
                            {regularTotal > finalKitPrice && !isPriceHidden ? (
                              <span className="block text-[11px] text-zinc-400 line-through font-mono">
                                Avulso: {formatCurrency(regularTotal)}
                              </span>
                            ) : (
                              <span className="block text-[10px] text-zinc-500">
                                Total do Kit ({totalUnitsCount} itens):
                              </span>
                            )}
                            <strong className="font-mono text-lg font-extrabold text-zinc-950 tabular-nums">
                              {isPriceHidden
                                ? 'Sob consulta'
                                : formatCurrency(finalKitPrice)}
                            </strong>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddBatchToCart(resolvedEntries)}
                            className="px-4 py-2.5 bg-[#E3262E] hover:bg-[#C81E25] text-white font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                          >
                            <ShoppingBasket className="w-3.5 h-3.5" />
                            <span>Levar Kit</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Promotional Banner ("Mais Banner na Parte de Baixo" - Managed dynamically via Admin) */}
              <div className="rounded-3xl overflow-hidden border border-zinc-200 shadow-sm bg-gradient-to-r from-[#141416] via-[#1F2024] to-[#2B2E34] text-white grid grid-cols-1 lg:grid-cols-12 items-center">
                <div className="lg:col-span-7 p-6 sm:p-10 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#FFBE00] text-zinc-950 text-xs font-extrabold uppercase tracking-wider">
                    {activeBottomBanner
                      ? activeBottomBanner.badge
                      : 'AV. COUTO MAGALHÃES, 2820 · VÁRZEA GRANDE - MT'}
                  </div>
                  <h2 className="font-display text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                    {activeBottomBanner ? (
                      activeBottomBanner.title
                    ) : (
                      <>
                        Abasteça Condomínio, Clínica, Lava-Jato ou Residência com{' '}
                        <span className="text-[#FFBE00]">Galões de 5L Quimiprol</span>
                      </>
                    )}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xl">
                    {activeBottomBanner
                      ? activeBottomBanner.subtitle
                      : 'Compre online sem fila, pague via PIX sem taxa de intermediários ou na retirada e retire em 15 minutos na Av. Couto Magalhães, 2820 - Centro Norte, Várzea Grande.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeBottomBanner?.linkedCategoryId) {
                          setSelectedCategoryId(activeBottomBanner.linkedCategoryId);
                          document
                            .getElementById('catalogo')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        } else {
                          setIsQuickOrderModalOpen(true);
                        }
                      }}
                      className="px-5 py-3 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs sm:text-sm rounded-xl inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>
                        {activeBottomBanner?.ctaText || 'Abrir Compra Rápida por Lista'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAccountModalOpen(true)}
                      className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/15 cursor-pointer"
                    >
                      Cadastrar p/ Desconto Clube Limper
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 h-full bg-[#FFBE00] p-6 sm:p-8 flex flex-col justify-between text-zinc-950">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-mono uppercase font-black text-[#BA1826]">
                        OFERTAS DESTE BANNER
                      </span>
                      <h3 className="font-display text-xl sm:text-2xl font-black leading-tight mt-0.5">
                        Destaques Selecionados
                      </h3>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-[#BA1826] text-white font-mono font-black text-xs flex flex-col items-center justify-center shrink-0 shadow-md">
                      <span>ATÉ</span>
                      <span className="text-base leading-none">25%</span>
                      <span className="text-[9px] text-[#FFBE00]">OFF</span>
                    </div>
                  </div>

                  {(() => {
                    const bottomLinkedProducts = (
                      activeBottomBanner?.featuredProductIds || []
                    )
                      .map((id) =>
                        products.find((p) => p.id === id && p.status === 'active')
                      )
                      .filter((p): p is Product => Boolean(p))
                      .slice(0, 2);

                    if (bottomLinkedProducts.length > 0) {
                      return (
                        <div className="my-4 space-y-2">
                          {bottomLinkedProducts.map((prod) => (
                            <div
                              key={`bottom-banner-prod-${prod.id}`}
                              onClick={() => setDetailProduct(prod)}
                              className="rounded-2xl bg-white border border-amber-300 p-2.5 flex items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-all"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.title}
                                  className="w-12 h-12 rounded-xl object-cover border border-zinc-200 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-extrabold text-xs text-zinc-900 truncate">
                                    {prod.title}
                                  </div>
                                  <div className="font-mono text-xs font-black text-[#E3262E]">
                                    {settings.hideAllPrices || prod.showPrice === false
                                      ? 'Sob Consulta'
                                      : formatCurrency(getEffectivePrice(prod))}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToCart(prod);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] font-extrabold text-[11px] shrink-0 cursor-pointer"
                              >
                                + Na Cesta
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <div className="my-4 rounded-2xl overflow-hidden h-36 bg-white border border-amber-300 flex items-center justify-between p-3 gap-3">
                        <img
                          src={
                            activeBottomBanner?.imageUrl ||
                            GENERATED_IMAGES.bannerAutomotivo
                          }
                          alt="Linha Automotiva e Limpeza Pesada Quimiprol"
                          className="w-28 h-full object-cover rounded-xl shrink-0"
                        />
                        <div className="space-y-1 text-xs">
                          <div className="font-extrabold text-zinc-900">
                            Detergente c/ Cera 5L + Limpa Alumínio 5L + Gel Pneu
                          </div>
                          <p className="text-[11px] text-zinc-600">
                            Alto poder de espuma e brilho espelhado.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategoryId('cat-automotiva');
                              document
                                .getElementById('catalogo')
                                ?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="text-xs font-extrabold text-[#BA1826] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Ver Linha Automotiva</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="text-[11px] font-bold flex items-center justify-between border-t border-amber-500/40 pt-2.5">
                    <span>Retirada Grátis em 15min</span>
                    <span>Central: (65) 3029-6824</span>
                  </div>
                </div>
              </div>

              {/* 5 Light & Cohesive Benefit Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsCepModalOpen(true)}
                  className="bg-white hover:bg-[#FFFBEB] text-zinc-900 border border-zinc-200/90 hover:border-[#FFBE00] rounded-2xl p-4 flex items-center gap-3.5 text-left transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-[#D97706]" />
                  </div>
                  <div className="text-xs leading-snug">
                    Receba no mesmo dia com a{' '}
                    <strong className="text-[#E3262E] font-extrabold">entrega rápida VG & Cuiabá!</strong>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(true)}
                  className="bg-white hover:bg-[#FFFBEB] text-zinc-900 border border-zinc-200/90 hover:border-[#FFBE00] rounded-2xl p-4 flex items-center gap-3.5 text-left transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs"
                >
                  <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                    <Tally4 className="w-5 h-5 text-[#E3262E]" />
                  </div>
                  <div className="text-xs leading-snug">
                    Ganhe <strong className="font-extrabold">descontos progressivos</strong> em galões de 5L.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('orders')}
                  className="bg-white hover:bg-[#FFFBEB] text-zinc-900 border border-zinc-200/90 hover:border-[#FFBE00] rounded-2xl p-4 flex items-center gap-3.5 text-left transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs"
                >
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="text-xs leading-snug">
                    Retire na Av. Couto Magalhães em até 15min,{' '}
                    <strong className="text-emerald-700 font-extrabold">grátis!</strong>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOnlyOffers(true);
                    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-white hover:bg-[#FFFBEB] text-zinc-900 border border-zinc-200/90 hover:border-[#FFBE00] rounded-2xl p-4 flex items-center gap-3.5 text-left transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center shrink-0">
                    <Percent className="w-5 h-5 text-[#D97706]" />
                  </div>
                  <div className="text-xs leading-snug">
                    <strong className="font-extrabold">Ofertas de fábrica</strong> em toda a linha Quimiprol.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsQuickOrderModalOpen(true)}
                  className="bg-white hover:bg-[#FFFBEB] text-zinc-900 border border-zinc-200/90 hover:border-[#FFBE00] rounded-2xl p-4 flex items-center gap-3.5 text-left transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs"
                >
                  <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-5 h-5 text-[#E3262E]" />
                  </div>
                  <div className="text-xs leading-snug">
                    <strong className="font-extrabold">Calculadora de diluição</strong>, compra rápida e mais.
                  </div>
                </button>
              </div>

              {/* Dedicated Physical Store & 15-Minute Drive/Balcão Pickup Hub (Av. Couto Magalhães, 2820) */}
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-xs font-extrabold">
                    <Store className="w-3.5 h-3.5 text-[#E3262E]" />
                    <span>LOJA FÍSICA & BALCÃO EXPRESS 15MIN · VÁRZEA GRANDE - MT</span>
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-extrabold text-zinc-900">
                    Visite ou Retire seu Pedido Sem Fila na Av. Couto Magalhães, 2820
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                    Faça seu pedido pelo site, escolha <strong>Retirada no Balcão (Grátis)</strong> e em 15 minutos seus galões Quimiprol já estarão separados, conferidos e prontos para carregar no veículo.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-zinc-200/80 space-y-1">
                      <div className="font-extrabold text-zinc-900 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#E3262E]" />
                        <span>Endereço Oficial</span>
                      </div>
                      <p className="text-zinc-600">
                        Av. Couto Magalhães, 2820 - Centro Norte, Várzea Grande - MT, 78110-400
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-zinc-200/80 space-y-1">
                      <div className="font-extrabold text-zinc-900 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#D97706]" />
                        <span>Horário & Central Direta</span>
                      </div>
                      <p className="text-zinc-600">
                        Seg a Sex: 07h30 às 18h00 · Sáb: 07h30 às 13h00
                      </p>
                      <p className="font-mono font-extrabold text-zinc-900">
                        Telefone: (65) 3029-6824
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-extrabold text-[#E3262E]">
                        COMO FUNCIONA A RETIRADA 15MIN
                      </span>
                      <h3 className="font-display text-base font-extrabold text-zinc-900">
                        Mais Rápido que Drive de Farmácia
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[11px] font-extrabold">
                      Frete R$ 0,00
                    </span>
                  </div>

                  <ol className="space-y-2 text-xs text-zinc-700">
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#FFBE00] text-zinc-950 font-mono font-extrabold text-[11px] flex items-center justify-center shrink-0">
                        1
                      </span>
                      <span>Monte sua cesta no site (use o cupom <strong>LIMPER10</strong>).</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#FFBE00] text-zinc-950 font-mono font-extrabold text-[11px] flex items-center justify-center shrink-0">
                        2
                      </span>
                      <span>Selecione <strong>Retirada no Balcão</strong> e envie no WhatsApp.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#FFBE00] text-zinc-950 font-mono font-extrabold text-[11px] flex items-center justify-center shrink-0">
                        3
                      </span>
                      <span>Retire em 15 minutos na Av. Couto Magalhães, 2820!</span>
                    </li>
                  </ol>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Av.+Couto+Magalhaes,+2820+-+Centro+Norte,+Varzea+Grande+-+MT,+78110-400"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-900 font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#E3262E]" />
                      <span>Abrir Rota no Mapa</span>
                    </a>
                    <a
                      href={`https://wa.me/${settings.whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-zinc-950" />
                      <span>Falar com o Balcão</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Verified Customer Reviews */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h2 className="font-display text-xl font-extrabold text-zinc-900">
                      Central de Retirada Expressa & Delivery Aprovada em Várzea Grande e Cuiabá
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Avaliações reais de condomínios, clínicas, lava-jatos e famílias atendidos na Av. Couto Magalhães, 2820
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                    <span>4.9/5 Avaliação Média</span>
                    <div className="flex items-center text-[#FFBE00]">
                      <Star className="w-4 h-4 fill-[#FFBE00]" />
                      <Star className="w-4 h-4 fill-[#FFBE00]" />
                      <Star className="w-4 h-4 fill-[#FFBE00]" />
                      <Star className="w-4 h-4 fill-[#FFBE00]" />
                      <Star className="w-4 h-4 fill-[#FFBE00]" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-4 rounded-xl bg-[#FAFAFA] border border-zinc-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-zinc-900">Dra. Patrícia Mendes</strong>
                      <span className="text-zinc-400">Clínica · Centro Norte, VG</span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      &ldquo;A retirada no Balcão Express da Limper MT na Av. Couto Magalhães é mais rápida que drive de farmácia: faço o pedido pelo site e em 15 minutos já carrego os galões de 5L no porta-malas.&rdquo;
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAFAFA] border border-zinc-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-zinc-900">Carlos Eduardo Rocha</strong>
                      <span className="text-zinc-400">Estética Prime · Várzea Grande</span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      &ldquo;O Detergente Automotivo com Cera 5L e o Gel para Painel 3,5L da Quimiprol têm rendimento excelente. Pelo histórico do site refaço o pedido mensal em 10 segundos.&rdquo;
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAFAFA] border border-zinc-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-zinc-900">Fernanda Albuquerque</strong>
                      <span className="text-zinc-400">Residencial · Cuiabá</span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      &ldquo;O Desengordurante Quimi 90 e o Álcool Perfumado Lavanda 5L mudaram a rotina aqui em casa. Todos os galões chegam lacrados e muito bem identificados.&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeView === 'orders' && (
          <OrdersHistoryView
            orders={orders}
            settings={settings}
            savedCustomerPhone={customerProfile.phone}
            onRepeatOrder={handleRepeatOrder}
            onBackToStore={() => setActiveView('store')}
          />
        )}

        {activeView === 'admin' && (
          <AdminDashboard
            categories={categories}
            products={products}
            kits={kits}
            coupons={coupons}
            banners={banners}
            orders={orders}
            settings={settings}
            onSaveCategories={handleSaveCategories}
            onSaveProducts={handleSaveProducts}
            onSaveKits={handleSaveKits}
            onSaveCoupons={handleSaveCoupons}
            onSaveBanners={handleSaveBanners}
            onSaveOrders={handleSaveOrders}
            onSaveSettings={handleSaveSettings}
            onBackToStore={() => setActiveView('store')}
          />
        )}
      </main>

      {/* Mobile Native-App-Like Bottom Tab Bar */}
      <nav
        aria-label="Menu Inferior estilo Aplicativo"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xs border-t border-zinc-200 px-2 py-1.5 grid grid-cols-5 gap-1 no-print shadow-lg"
      >
        <button
          type="button"
          onClick={() => {
            setActiveView('store');
            setIsMegaMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold cursor-pointer ${
            activeView === 'store' && !isMegaMenuOpen
              ? 'text-[#E3262E]'
              : 'text-zinc-500'
          }`}
        >
          <HomeIcon className="w-4 h-4 mb-0.5" />
          <span>Início</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMegaMenuOpen((prev) => !prev)}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold cursor-pointer ${
            isMegaMenuOpen ? 'text-[#E3262E]' : 'text-zinc-500'
          }`}
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>Linhas</span>
        </button>

        <button
          type="button"
          onClick={() => setIsQuickOrderModalOpen(true)}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold text-zinc-600 cursor-pointer"
        >
          <FilePlus2 className="w-4 h-4 mb-0.5 text-[#D97706]" />
          <span>Lote/Diluição</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView('orders');
            setIsMegaMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold cursor-pointer ${
            activeView === 'orders' ? 'text-[#E3262E]' : 'text-zinc-500'
          }`}
        >
          <Package className="w-4 h-4 mb-0.5" />
          <span>Pedidos ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center justify-center py-1 rounded-xl bg-[#FFBE00] text-zinc-950 text-[10px] font-extrabold cursor-pointer"
        >
          <ShoppingBasket className="w-4 h-4 mb-0.5" />
          <span>Cesta ({cartTotals.itemCount})</span>
        </button>
      </nav>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={detailProduct}
        category={
          detailProduct
            ? categories.find((c) => c.id === detailProduct.categoryId)
            : undefined
        }
        settings={settings}
        quantityInCart={
          detailProduct
            ? cart.find((c) => c.product.id === detailProduct.id)?.quantity || 0
            : 0
        }
        onClose={() => setDetailProduct(null)}
        onAdd={handleAddToCart}
        onUpdateQuantity={handleUpdateCartQty}
      />

      {/* Customer Account Registration / Login Modal ("Boas-vindas! Entrar ou cadastrar") */}
      <CustomerAccountModal
        isOpen={isAccountModalOpen}
        profile={customerProfile}
        existingOrders={orders}
        onClose={() => setIsAccountModalOpen(false)}
        onSaveProfile={(profile) => {
          handleSaveCustomerProfile(profile);
          showToast(`Cadastro de ${profile.name} salvo com sucesso!`);
        }}
      />

      {/* CEP & Regional Delivery Calculator Modal ("Insira seu CEP") */}
      <CepLocationModal
        isOpen={isCepModalOpen}
        profile={customerProfile}
        settings={settings}
        onClose={() => setIsCepModalOpen(false)}
        onSaveProfile={(profile) => {
          handleSaveCustomerProfile(profile);
          showToast(`CEP ${profile.cep} e bairro ${profile.neighborhood} atualizados!`);
        }}
      />

      {/* Quick Order List & Dilution Calculator Modal ("Compra rápida por lista") */}
      <QuickOrderListModal
        isOpen={isQuickOrderModalOpen}
        products={products}
        onClose={() => setIsQuickOrderModalOpen(false)}
        onAddMultipleToCart={handleAddBatchToCart}
      />

      {/* Cart & Checkout Drawer */}
      <CartCheckoutDrawer
        isOpen={isCartOpen}
        cart={cart}
        catalogProducts={products}
        coupons={coupons}
        initialCouponCode={activeCouponCode}
        settings={settings}
        customerProfile={customerProfile}
        existingOrders={orders}
        onClose={() => setIsCartOpen(false)}
        onAddToCart={handleAddToCart}
        onUpdateQuantity={handleUpdateCartQty}
        onClearCart={handleClearCart}
        onSaveCustomerProfile={handleSaveCustomerProfile}
        onCompleteOrder={handleCompleteOrder}
      />

      {/* Post-Order Confirmation & WhatsApp Dispatch Modal */}
      <OrderConfirmationModal
        order={confirmedOrder}
        settings={settings}
        onClose={() => setConfirmedOrder(null)}
        onViewOrders={() => {
          setConfirmedOrder(null);
          setActiveView('orders');
        }}
      />

      {/* Clean Light Institutional Footer with Official Várzea Grande Address & Phone */}
      <footer className="bg-white text-zinc-600 border-t border-zinc-200 py-8 no-print">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <img
                src={LIMPER_LOGO_URL}
                alt="Limper MT"
                className="h-8 w-auto object-contain"
              />
              <span className="font-display text-sm font-extrabold text-zinc-900">
                Catálogo Delivery & Central de Retirada Rápida 15min
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-zinc-600">
              <MapPin className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
              <strong className="text-zinc-900">Endereço:</strong>
              <span>{settings.storeAddress}</span>
              <span aria-hidden="true">·</span>
              <Phone className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
              <strong className="text-zinc-900">Telefone:</strong>
              <span className="font-mono font-bold text-zinc-900">
                {settings.whatsappDisplay}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href={`https://wa.me/${settings.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-zinc-900 hover:text-[#E3262E] font-bold transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-[#1DA851]" />
              <span>Atendimento WhatsApp: {settings.whatsappDisplay}</span>
            </a>
            <span aria-hidden="true" className="text-zinc-300">
              ·
            </span>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className="text-zinc-500 hover:text-zinc-900 font-semibold transition-colors cursor-pointer"
            >
              App Lojista / ADM
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
