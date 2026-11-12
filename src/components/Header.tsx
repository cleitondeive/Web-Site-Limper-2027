import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Boxes,
  Clock,
  FilePlus2,
  FlaskConical,
  Gift,
  Home,
  MapPin,
  Menu,
  Package,
  Percent,
  Phone,
  Plus,
  Search,
  ShoppingBasket,
  Sparkles,
  Store,
  Truck,
  User,
  X,
} from 'lucide-react';
import { Category, CustomerProfile, Product } from '../types/commerce';
import {
  formatCurrency,
  getDiscountPercentage,
  getEffectivePrice,
} from '../utils/commerce';
import { LIMPER_LOGO_URL } from '../data/initialCatalog';
import { ProductImageWithFallback } from './CategoryIcon';

export type ActiveView = 'store' | 'orders' | 'admin';

interface HeaderProps {
  activeView: ActiveView;
  onlyOffers: boolean;
  hasActiveFilters?: boolean;
  isMegaMenuOpen: boolean;
  searchQuery: string;
  products: Product[];
  categories: Category[];
  cartItemCount: number;
  cartSubtotal: number;
  isCartQuoteOnly?: boolean;
  ordersCount: number;
  customerProfile: CustomerProfile;
  hideAllPrices?: boolean;
  onSearchChange: (q: string) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onSelectStore: () => void;
  onToggleMegaMenu: () => void;
  onSelectOffers: () => void;
  onSelectOrders: () => void;
  onSelectAdmin: () => void;
  onOpenCart: () => void;
  onOpenAccountModal: () => void;
  onOpenCepModal: () => void;
  onOpenQuickOrderModal: () => void;
}

const POPULAR_SEARCH_TERMS = [
  'Quimi 90',
  'Álcool 5L',
  'Amaciante',
  'Detergente Clorado',
  'Limpa Piso',
  'Automotivo',
];

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onlyOffers,
  hasActiveFilters = false,
  isMegaMenuOpen,
  searchQuery,
  products,
  categories,
  cartItemCount,
  cartSubtotal,
  isCartQuoteOnly = false,
  ordersCount,
  customerProfile,
  hideAllPrices,
  onSearchChange,
  onSelectProduct,
  onAddToCart,
  onSelectStore,
  onToggleMegaMenu,
  onSelectOffers,
  onSelectOrders,
  onSelectAdmin,
  onOpenCart,
  onOpenAccountModal,
  onOpenCepModal,
  onOpenQuickOrderModal,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const firstName = customerProfile.name
    ? customerProfile.name.trim().split(' ')[0]
    : '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts: "/" or Ctrl+K / Cmd+K to focus search; Escape to close search dropdown
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (
        ((event.key === '/' && !isInputFocused) ||
          ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'))
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (event.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const activeProducts = products.filter((p) => p.status !== 'inactive');

  const liveMatches = normalizedQuery
    ? activeProducts.filter((p) => {
        const cat = categories.find((c) => c.id === p.categoryId);
        return (
          p.title.toLowerCase().includes(normalizedQuery) ||
          p.sku.toLowerCase().includes(normalizedQuery) ||
          p.description.toLowerCase().includes(normalizedQuery) ||
          p.volumeLabel.toLowerCase().includes(normalizedQuery) ||
          (cat && cat.name.toLowerCase().includes(normalizedQuery))
        );
      })
    : activeProducts.filter((p) => p.featured).slice(0, 5);

  const isAwayFromHome = activeView !== 'store' || hasActiveFilters;

  const handleLogoHomeClick = () => {
    setIsSearchOpen(false);
    onSelectStore();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md text-zinc-900 border-b border-zinc-200/90 shadow-2xs no-print transition-all">
      {/* Tier 1: Top Regional, Official Store Address & Phone Strip */}
      <div className="bg-[#181A20] text-white text-[10px] sm:text-[11px]">
        <div className="max-w-[1360px] mx-auto px-3 sm:px-6 h-7 sm:h-8 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FFBE00] shrink-0" />
            <span className="text-zinc-300 hidden md:inline">Loja Física & Retirada:</span>
            <strong className="text-white truncate">
              Av. Couto Magalhães, 2820 - Várzea Grande
            </strong>
            <button
              type="button"
              onClick={onOpenCepModal}
              className="hidden sm:inline-block underline text-[#FFBE00] hover:text-amber-300 ml-1 font-semibold cursor-pointer shrink-0"
            >
              CEP: {customerProfile.cep || '78110-400'}
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-2 font-semibold text-zinc-200 shrink-0">
            <Clock className="w-3.5 h-3.5 text-[#FFBE00]" />
            <span>
              {hideAllPrices
                ? 'Retirada Expressa em 15min · Lista de Orçamento via WhatsApp'
                : 'Retirada Expressa em 15min · Frete grátis acima de R$ 150'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5 text-zinc-300 shrink-0">
            <a
              href="tel:6530296824"
              className="inline-flex items-center gap-1 text-white hover:text-[#FFBE00] font-mono font-bold transition-colors"
            >
              <Phone className="w-3 h-3 text-[#FFBE00]" />
              <span className="hidden xs:inline sm:inline">(65) 3029-6824</span>
            </a>
            <button
              type="button"
              onClick={onOpenQuickOrderModal}
              className="hidden lg:inline-flex items-center gap-1 hover:text-white cursor-pointer"
            >
              <FlaskConical className="w-3 h-3 text-[#FFBE00]" />
              <span>Calculadora de Diluição</span>
            </button>
            <button
              type="button"
              onClick={onSelectAdmin}
              className={`font-extrabold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                activeView === 'admin'
                  ? 'bg-[#FFBE00] text-zinc-950'
                  : 'bg-white/10 text-[#FFBE00] hover:bg-[#FFBE00] hover:text-zinc-950'
              }`}
            >
              <span className="sm:hidden">ADM</span>
              <span className="hidden sm:inline">App Lojista / ADM</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tier 2: Main Drogasil + Todimo Header
          Mobile (< md): Row 1 = Logo + Compact Action Icons & Basket; Row 2 = 100% Full-Width Interactive Search Bar
          Desktop (md+): Single Row = Logo + Centered Interactive Search Bar + 4 Icon Actions */}
      <div className="max-w-[1360px] mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-2.5 gap-x-3 lg:gap-6">
        {/* 1. Interactive Brand Logo (Always resets filters & returns smoothly to Home top) */}
        <button
          type="button"
          onClick={handleLogoHomeClick}
          title="Voltar para o Início · Limper MT"
          aria-label="Limper MT Produtos de Limpeza - Voltar para a Página Inicial"
          className="order-1 group flex items-center gap-1.5 sm:gap-2 shrink-0 rounded-xl px-1.5 py-1 -ml-1.5 hover:bg-amber-50/80 active:scale-95 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FFBE00]"
        >
          <img
            src={LIMPER_LOGO_URL}
            alt="Limper MT Produtos de Limpeza"
            className="h-8 sm:h-11 w-auto object-contain group-hover:scale-[1.02] transition-transform"
          />
          <span className="font-display text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-zinc-950 bg-[#FFBE00] group-hover:bg-[#E3262E] group-hover:text-white px-1.5 py-0.5 rounded-md transition-colors">
            MT
          </span>
          {isAwayFromHome && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[#E3262E] text-[10px] font-extrabold animate-fade-in">
              <Home className="w-3 h-3" />
              <span className="hidden sm:inline">Voltar ao Início</span>
            </span>
          )}
        </button>

        {/* 2. Right Action Links (Order 2 on Mobile so it sits beside Logo; Order 3 on Desktop) */}
        <div className="order-2 md:order-3 flex items-center gap-2 sm:gap-4 lg:gap-5 shrink-0">
          {/* 2a. Compra rápida com receita/lista (Desktop xl+) */}
          <button
            type="button"
            onClick={onOpenQuickOrderModal}
            className="hidden xl:flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center group-hover:bg-[#E3262E] group-hover:text-white text-[#E3262E] transition-colors">
              <FilePlus2 className="w-5 h-5 shrink-0 stroke-[1.9]" />
            </div>
            <div className="text-xs leading-tight">
              <span className="block text-zinc-500">Compra rápida</span>
              <strong className="block font-extrabold text-zinc-900 group-hover:text-[#E3262E]">
                por lista / lote
              </strong>
            </div>
          </button>

          {/* 2b. Boas-vindas! Entrar ou cadastrar (Compact icon on mobile, full label on sm+) */}
          <button
            type="button"
            onClick={onOpenAccountModal}
            aria-label={firstName ? `Conta de ${firstName}` : 'Entrar ou cadastrar'}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center group-hover:bg-[#E3262E] group-hover:text-white text-[#E3262E] transition-colors">
              <User className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 stroke-[2]" />
            </div>
            <div className="hidden sm:block text-xs leading-tight">
              <span className="block text-zinc-500">
                {firstName ? `Olá, ${firstName}!` : 'Boas-vindas!'}
              </span>
              <strong className="block font-extrabold text-zinc-900 group-hover:text-[#E3262E]">
                {firstName ? 'Minha conta & CEP' : 'Entrar ou cadastrar'}
              </strong>
            </div>
          </button>

          {/* 2c. Acompanhar pedidos (Compact icon on mobile, full label on lg+) */}
          <button
            type="button"
            onClick={onSelectOrders}
            aria-label="Acompanhar pedidos"
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <div className="relative w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center group-hover:bg-[#E3262E] group-hover:text-white text-[#E3262E] transition-colors">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 stroke-[2]" />
              {ordersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#FFBE00] text-zinc-950 font-mono text-[10px] font-extrabold flex items-center justify-center shadow-2xs">
                  {ordersCount}
                </span>
              )}
            </div>
            <div className="hidden lg:block text-xs leading-tight">
              <span className="block text-zinc-500">Acompanhar</span>
              <strong className="block font-extrabold text-zinc-900 group-hover:text-[#E3262E]">
                pedidos
              </strong>
            </div>
          </button>

          {/* 2d. Cesta R$ 0,00 */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Abrir cesta com ${cartItemCount} itens`}
            className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#FFFBEB] border border-[#FFBE00] hover:bg-[#FFBE00]/30 active:scale-95 transition-all"
          >
            <div className="relative">
              <ShoppingBasket className="w-5 h-5 sm:w-6 sm:h-6 text-[#E3262E] shrink-0 stroke-[2]" />
              <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#E3262E] text-white font-mono text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                {cartItemCount}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs leading-tight">
              <span className="hidden xs:block text-zinc-600 font-medium text-[10px] sm:text-xs">
                {hideAllPrices || (cartItemCount > 0 && isCartQuoteOnly)
                  ? 'Minha Lista'
                  : 'Minha Cesta'}
              </span>
              <strong className="block font-mono font-extrabold text-zinc-950 tabular-nums">
                {hideAllPrices || (cartItemCount > 0 && isCartQuoteOnly)
                  ? 'Orçamento'
                  : formatCurrency(cartSubtotal)}
              </strong>
            </div>
          </button>
        </div>

        {/* 3. Interactive Live Search Input with Instant Photo Autocomplete Dropdown
            Spans 100% width on mobile (order-3 w-full) and sits inline in center on desktop (md:order-2 md:flex-1) */}
        <div
          ref={searchContainerRef}
          className="order-3 md:order-2 w-full md:w-auto md:flex-1 md:max-w-xl relative"
        >
          <label htmlFor="header-catalog-search" className="sr-only">
            Buscar na Limper MT
          </label>
          <div className="relative">
            <input
              ref={searchInputRef}
              id="header-catalog-search"
              type="text"
              inputMode="search"
              role="searchbox"
              autoComplete="off"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder="Buscar produto (ex: Quimi 90, Cloro, Sabão 5L, Amaciante)..."
              className="w-full pl-4 sm:pl-5 pr-16 sm:pr-20 py-2 sm:py-2.5 bg-[#F1F3F6] hover:bg-[#EAECEF] focus:bg-white border-2 border-zinc-200/80 focus:border-[#FFBE00] rounded-xl sm:rounded-full text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none transition-all shadow-2xs"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  setIsSearchOpen(false);
                }}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-200/80 hover:bg-zinc-300 text-zinc-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                <kbd className="hidden lg:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-400 bg-white border border-zinc-200 rounded shadow-2xs">
                  /
                </kbd>
                <Search className="w-4 h-4 text-[#E3262E] stroke-[2.4]" />
              </div>
            )}
          </div>

          {/* LIVE INTERACTIVE SEARCH DROPDOWN WITH PRODUCT PHOTOS */}
          {isSearchOpen && (
            <div
              role="region"
              aria-label="Resultados instantâneos da busca"
              className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white rounded-2xl border-2 border-[#FFBE00] shadow-2xl overflow-hidden z-50"
            >
              {/* Quick Search Pills when empty or typing */}
              <div className="px-3 sm:px-4 py-2 bg-[#FFFBEB] border-b border-amber-200/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <Sparkles className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
                <span className="text-[11px] font-extrabold text-zinc-700 shrink-0 mr-0.5">
                  Populares:
                </span>
                {POPULAR_SEARCH_TERMS.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      onSearchChange(term);
                      setIsSearchOpen(true);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      searchQuery.toLowerCase() === term.toLowerCase()
                        ? 'bg-[#E3262E] text-white'
                        : 'bg-white hover:bg-[#FFBE00] text-zinc-800 border border-amber-300/80'
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>

              {/* Header inside dropdown */}
              <div className="px-3 sm:px-4 py-2 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between gap-2 text-[11px] font-bold text-zinc-500">
                <span className="truncate">
                  {normalizedQuery
                    ? `Encontrados para "${searchQuery}" (${liveMatches.length})`
                    : 'Produtos em Destaque · Toque para ver ou adicionar'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="text-zinc-500 hover:text-zinc-900 font-extrabold shrink-0 cursor-pointer"
                >
                  Fechar ✕
                </button>
              </div>

              {/* Matching Product Cards with Photo, Price & Instant Add */}
              {liveMatches.length === 0 ? (
                <div className="p-5 text-center space-y-1.5">
                  <p className="text-xs font-bold text-zinc-800">
                    Nenhum produto encontrado com &ldquo;{searchQuery}&rdquo;.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Tente buscar por &ldquo;5L&rdquo;, &ldquo;Cloro&rdquo;, &ldquo;Amaciante&rdquo; ou &ldquo;Quimi 90&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-zinc-100">
                  {liveMatches.slice(0, 6).map((prod) => {
                    const effectivePrice = getEffectivePrice(prod);
                    const discountPct = getDiscountPercentage(prod);
                    const cat = categories.find((c) => c.id === prod.categoryId);
                    const showPrice = prod.showPrice !== false && !hideAllPrices;

                    return (
                      <div
                        key={`search-item-${prod.id}`}
                        className="px-3 sm:px-4 py-2.5 hover:bg-[#FFFDF5] flex items-center justify-between gap-2.5 sm:gap-3 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProduct(prod);
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center gap-2.5 sm:gap-3 text-left flex-1 min-w-0 cursor-pointer group"
                        >
                          <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
                            <ProductImageWithFallback
                              src={prod.imageUrl}
                              alt={prod.title}
                              volumeLabel={prod.volumeLabel}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {showPrice && discountPct > 0 && (
                              <span className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-[#E5B800] text-zinc-950 font-mono text-[8px] sm:text-[9px] font-black">
                                -{discountPct}%
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-[#E3262E] truncate">
                              <span>{cat?.shortName || 'Quimiprol'}</span>
                              <span className="text-zinc-300">·</span>
                              <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 font-mono">
                                {prod.volumeLabel}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-[#E3262E] truncate">
                              {prod.title}
                            </div>
                            {prod.dilutionHint && (
                              <div className="text-[10px] sm:text-[11px] text-zinc-500 truncate">
                                {prod.dilutionHint}
                              </div>
                            )}
                          </div>
                        </button>

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          {showPrice ? (
                            <div className="text-right">
                              {discountPct > 0 && (
                                <div className="text-[10px] font-mono text-zinc-400 line-through tabular-nums">
                                  {formatCurrency(prod.price)}
                                </div>
                              )}
                              <div className="text-xs sm:text-sm font-mono font-extrabold text-zinc-950 tabular-nums">
                                {formatCurrency(effectivePrice)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] sm:text-[11px] font-bold text-[#E3262E]">
                              Sob consulta
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onAddToCart(prod);
                            }}
                            aria-label={`Adicionar ${prod.title} à cesta`}
                            className="px-2.5 sm:px-3 py-2 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-[11px] sm:text-xs rounded-xl inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Cesta</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer CTA inside search dropdown */}
              <div className="px-3 sm:px-4 py-2 bg-zinc-50 border-t border-zinc-200/80 flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-[11px] text-zinc-500 truncate">
                  Retirada 15min · Av. Couto Magalhães, 2820
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-extrabold text-[#E3262E] hover:underline shrink-0 cursor-pointer"
                >
                  <span>Ver todos ({liveMatches.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tier 3: Sub-Header Navigation Bar (No ugly gray scrollbar on mobile!) */}
      <div className="border-t border-zinc-100 bg-white">
        <div className="max-w-[1360px] mx-auto px-3 sm:px-6 h-10 sm:h-11 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3 sm:gap-4 xl:gap-5 text-xs font-medium text-zinc-700 whitespace-nowrap">
            {/* Explicit Home / Início button */}
            <button
              type="button"
              onClick={handleLogoHomeClick}
              className={`inline-flex items-center gap-1.5 font-extrabold transition-colors cursor-pointer shrink-0 text-[11px] sm:text-xs px-2.5 py-1 rounded-lg ${
                !isAwayFromHome
                  ? 'bg-zinc-900 text-[#FFBE00]'
                  : 'text-zinc-800 hover:text-[#E3262E] hover:bg-rose-50'
              }`}
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>Início</span>
            </button>

            {/* Insira seu CEP */}
            <button
              type="button"
              onClick={onOpenCepModal}
              className="inline-flex items-center gap-1.5 text-zinc-900 font-bold hover:text-[#E3262E] cursor-pointer shrink-0 bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-1 rounded-lg text-[11px] sm:text-xs"
            >
              <MapPin className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
              <span>
                {customerProfile.cep
                  ? `CEP: ${customerProfile.cep} (${customerProfile.neighborhood})`
                  : 'Insira seu CEP'}
              </span>
            </button>

            {/* Todas as categorias (MegaMenu Trigger) */}
            <button
              type="button"
              aria-expanded={isMegaMenuOpen}
              onClick={onToggleMegaMenu}
              className={`inline-flex items-center gap-1.5 font-extrabold transition-colors cursor-pointer shrink-0 text-[11px] sm:text-xs ${
                isMegaMenuOpen
                  ? 'text-[#E3262E]'
                  : 'text-zinc-900 hover:text-[#E3262E]'
              }`}
            >
              <Menu className="w-4 h-4 text-[#E3262E] shrink-0" />
              <span>Todas as categorias</span>
            </button>

            <button
              type="button"
              onClick={onOpenCepModal}
              className="inline-flex items-center gap-1.5 hover:text-[#E3262E] transition-colors cursor-pointer text-[11px] sm:text-xs"
            >
              <Store className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
              <span>Nossa Loja (Av. Couto Magalhães, 2820)</span>
            </button>

            <button
              type="button"
              onClick={onOpenQuickOrderModal}
              className="inline-flex items-center gap-1.5 hover:text-[#E3262E] transition-colors cursor-pointer text-[11px] sm:text-xs"
            >
              <FlaskConical className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
              <span>Calculadora de Diluição</span>
            </button>

            <button
              type="button"
              onClick={onSelectOrders}
              className="inline-flex items-center gap-1.5 hover:text-[#E3262E] transition-colors cursor-pointer text-[11px] sm:text-xs"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Rastrear Pedido</span>
            </button>

            <button
              type="button"
              onClick={onSelectOffers}
              className="inline-flex items-center gap-1.5 hover:text-[#E3262E] transition-colors cursor-pointer text-[11px] sm:text-xs"
            >
              <Boxes className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
              <span>Atacado & Condomínios</span>
            </button>

            <a
              href="#kits-prontos"
              onClick={(e) => {
                e.preventDefault();
                onSelectStore();
                setTimeout(() => {
                  document.getElementById('kits-prontos')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className="inline-flex items-center gap-1.5 hover:text-[#E3262E] transition-colors cursor-pointer text-[11px] sm:text-xs"
            >
              <Gift className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
              <span>Kits & Combos</span>
            </a>

            <a
              href="#logistica-limper"
              onClick={(e) => {
                e.preventDefault();
                onSelectStore();
                setTimeout(() => {
                  document.getElementById('logistica-limper')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className="inline-flex items-center gap-1.5 hover:text-[#E3262E] transition-colors cursor-pointer text-[11px] sm:text-xs"
            >
              <Truck className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
              <span>Logística VG / CBA / MT</span>
            </a>
          </div>

          {/* Right Pill CTA ("Exibir descontos" like Drogasil) */}
          <button
            type="button"
            onClick={onSelectOffers}
            className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-extrabold transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-2xs inline-flex items-center gap-1.5 ${
              onlyOffers
                ? 'bg-[#FFBE00] text-zinc-950'
                : 'bg-[#BA1826] hover:bg-[#9E1420] text-white'
            }`}
          >
            <Percent className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>
              {onlyOffers ? 'Exibindo descontos ✓' : 'Exibir descontos Limper'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
