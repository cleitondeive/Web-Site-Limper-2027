import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Boxes,
  Clock,
  FilePlus2,
  FlaskConical,
  Gift,
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
  isMegaMenuOpen: boolean;
  searchQuery: string;
  products: Product[];
  categories: Category[];
  cartItemCount: number;
  cartSubtotal: number;
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
  isMegaMenuOpen,
  searchQuery,
  products,
  categories,
  cartItemCount,
  cartSubtotal,
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

  return (
    <header className="sticky top-0 z-30 bg-white text-zinc-900 border-b border-zinc-200/90 shadow-2xs no-print">
      {/* Tier 1: Top Regional, Official Store Address & Phone Strip */}
      <div className="bg-[#181A20] text-white text-[11px]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#FFBE00] shrink-0" />
            <span className="text-zinc-300 hidden sm:inline">Loja Física & Retirada:</span>
            <strong className="text-white truncate">
              Av. Couto Magalhães, 2820 - Centro Norte, Várzea Grande - MT
            </strong>
            <button
              type="button"
              onClick={onOpenCepModal}
              className="underline text-[#FFBE00] hover:text-amber-300 ml-1 font-semibold cursor-pointer shrink-0"
            >
              CEP: {customerProfile.cep || '78110-400'}
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-2 font-semibold text-zinc-200">
            <Clock className="w-3.5 h-3.5 text-[#FFBE00]" />
            <span>Retirada Expressa em 15min · Frete grátis acima de R$ 150</span>
          </div>

          <div className="flex items-center gap-3.5 text-zinc-300 shrink-0">
            <a
              href="tel:6530296824"
              className="hidden md:inline-flex items-center gap-1 text-white hover:text-[#FFBE00] font-mono font-bold transition-colors"
            >
              <Phone className="w-3 h-3 text-[#FFBE00]" />
              <span>(65) 3029-6824</span>
            </a>
            <button
              type="button"
              onClick={onOpenQuickOrderModal}
              className="hidden sm:inline-flex items-center gap-1 hover:text-white cursor-pointer"
            >
              <FlaskConical className="w-3 h-3 text-[#FFBE00]" />
              <span>Calculadora de Diluição</span>
            </button>
            <button
              type="button"
              onClick={onSelectAdmin}
              className={`font-extrabold px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                activeView === 'admin'
                  ? 'bg-[#FFBE00] text-zinc-950'
                  : 'bg-white/10 text-[#FFBE00] hover:bg-[#FFBE00] hover:text-zinc-950'
              }`}
            >
              App Lojista / ADM
            </button>
          </div>
        </div>
      </div>

      {/* Tier 2: Main Drogasil + Todimo Header (Logo, Interactive Live Search w/ Photos, and 4 Icon Actions) */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 lg:gap-7">
        {/* Brand Logo */}
        <a
          href="#catalogo"
          onClick={(e) => {
            e.preventDefault();
            onSelectStore();
          }}
          className="flex items-center gap-2 shrink-0 focus-visible:outline-2 focus-visible:outline-[#FFBE00]"
        >
          <img
            src={LIMPER_LOGO_URL}
            alt="Limper MT Produtos de Limpeza"
            className="h-9 sm:h-11 w-auto object-contain"
          />
          <span className="font-display text-[11px] font-extrabold uppercase tracking-wider text-zinc-950 bg-[#FFBE00] px-1.5 py-0.5 rounded-md">
            MT
          </span>
        </a>

        {/* Interactive Live Search Input with Instant Photo Autocomplete Dropdown */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-xl">
          <label htmlFor="header-catalog-search" className="sr-only">
            Buscar na Limper MT
          </label>
          <div className="relative">
            <input
              id="header-catalog-search"
              type="search"
              autoComplete="off"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder="Digite o nome do produto (ex: sabão, quimi 90, cloro, amaciante)..."
              className="w-full pl-5 pr-11 py-2.5 bg-[#F1F3F6] hover:bg-[#EAECEF] focus:bg-white border-2 border-transparent focus:border-[#FFBE00] rounded-full text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none transition-all shadow-2xs"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  setIsSearchOpen(false);
                }}
                aria-label="Limpar busca"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Search className="w-4 h-4 text-[#E3262E] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.4]" />
            )}
          </div>

          {/* LIVE INTERACTIVE SEARCH DROPDOWN WITH PRODUCT PHOTOS */}
          {isSearchOpen && (
            <div
              role="region"
              aria-label="Resultados instantâneos da busca"
              className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white rounded-2xl border-2 border-[#FFBE00] shadow-2xl overflow-hidden z-50"
            >
              {/* Quick Search Pills when empty or typing */}
              <div className="px-4 py-2.5 bg-[#FFFBEB] border-b border-amber-200/70 flex items-center gap-1.5 overflow-x-auto">
                <Sparkles className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
                <span className="text-[11px] font-extrabold text-zinc-700 shrink-0 mr-1">
                  Busca rápida:
                </span>
                {POPULAR_SEARCH_TERMS.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      onSearchChange(term);
                      setIsSearchOpen(true);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
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
              <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between text-[11px] font-bold text-zinc-500">
                <span>
                  {normalizedQuery
                    ? `Produtos encontrados para "${searchQuery}" (${liveMatches.length})`
                    : 'Produtos em Destaque · Clique para ver ou adicionar à cesta'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="text-zinc-400 hover:text-zinc-800 cursor-pointer"
                >
                  Fechar ✕
                </button>
              </div>

              {/* Matching Product Cards with Photo, Price & Instant Add */}
              {liveMatches.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs font-bold text-zinc-800">
                    Nenhum produto encontrado com &ldquo;{searchQuery}&rdquo;.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Tente buscar por &ldquo;5L&rdquo;, &ldquo;Cloro&rdquo;, &ldquo;Amaciante&rdquo; ou &ldquo;Quimi 90&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto divide-y divide-zinc-100">
                  {liveMatches.slice(0, 6).map((prod) => {
                    const effectivePrice = getEffectivePrice(prod);
                    const discountPct = getDiscountPercentage(prod);
                    const cat = categories.find((c) => c.id === prod.categoryId);
                    const showPrice = prod.showPrice !== false && !hideAllPrices;

                    return (
                      <div
                        key={`search-item-${prod.id}`}
                        className="px-4 py-2.5 hover:bg-[#FFFDF5] flex items-center justify-between gap-3 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProduct(prod);
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer group"
                        >
                          <div className="relative w-13 h-13 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
                            <ProductImageWithFallback
                              src={prod.imageUrl}
                              alt={prod.title}
                              volumeLabel={prod.volumeLabel}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {showPrice && discountPct > 0 && (
                              <span className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-[#E5B800] text-zinc-950 font-mono text-[9px] font-black">
                                -{discountPct}%
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#E3262E]">
                              <span>{cat?.shortName || 'Quimiprol'}</span>
                              <span className="text-zinc-300">·</span>
                              <span className="font-mono text-zinc-500">Ref. {prod.sku}</span>
                              <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 font-mono">
                                {prod.volumeLabel}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-[#E3262E] truncate">
                              {prod.title}
                            </div>
                            {prod.dilutionHint && (
                              <div className="text-[11px] text-zinc-500 truncate">
                                {prod.dilutionHint}
                              </div>
                            )}
                          </div>
                        </button>

                        <div className="flex items-center gap-3 shrink-0">
                          {showPrice ? (
                            <div className="text-right">
                              {discountPct > 0 && (
                                <div className="text-[10px] font-mono text-zinc-400 line-through tabular-nums">
                                  {formatCurrency(prod.price)}
                                </div>
                              )}
                              <div className="text-sm font-mono font-extrabold text-zinc-950 tabular-nums">
                                {formatCurrency(effectivePrice)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-[#E3262E]">
                              Sob consulta
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onAddToCart(prod);
                            }}
                            aria-label={`Adicionar ${prod.title} à cesta`}
                            className="px-3 py-2 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl inline-flex items-center gap-1 shadow-2xs cursor-pointer"
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
              <div className="px-4 py-2.5 bg-zinc-50 border-t border-zinc-200/80 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">
                  Retirada em 15min na Av. Couto Magalhães, 2820
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[#E3262E] hover:underline cursor-pointer"
                >
                  <span>Ver todos no catálogo ({liveMatches.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Drogasil-Style Action Links with Red Icons */}
        <div className="flex items-center gap-4 lg:gap-6 shrink-0">
          {/* 1. Compra rápida com receita/lista */}
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

          {/* 2. Boas-vindas! Entrar ou cadastrar */}
          <button
            type="button"
            onClick={onOpenAccountModal}
            className="hidden sm:flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center group-hover:bg-[#E3262E] group-hover:text-white text-[#E3262E] transition-colors">
              <User className="w-5 h-5 shrink-0 stroke-[1.9]" />
            </div>
            <div className="text-xs leading-tight">
              <span className="block text-zinc-500">
                {firstName ? `Olá, ${firstName}!` : 'Boas-vindas!'}
              </span>
              <strong className="block font-extrabold text-zinc-900 group-hover:text-[#E3262E]">
                {firstName ? 'Minha conta & CEP' : 'Entrar ou cadastrar'}
              </strong>
            </div>
          </button>

          {/* 3. Acompanhar pedidos */}
          <button
            type="button"
            onClick={onSelectOrders}
            className="hidden md:flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="relative w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center group-hover:bg-[#E3262E] group-hover:text-white text-[#E3262E] transition-colors">
              <Package className="w-5 h-5 shrink-0 stroke-[1.9]" />
              {ordersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#FFBE00] text-zinc-950 font-mono text-[10px] font-extrabold flex items-center justify-center shadow-2xs">
                  {ordersCount}
                </span>
              )}
            </div>
            <div className="text-xs leading-tight">
              <span className="block text-zinc-500">Acompanhar</span>
              <strong className="block font-extrabold text-zinc-900 group-hover:text-[#E3262E]">
                pedidos
              </strong>
            </div>
          </button>

          {/* 4. Cesta R$ 0,00 */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Abrir cesta com ${cartItemCount} itens`}
            className="flex items-center gap-2.5 text-left group cursor-pointer px-3 py-1.5 rounded-xl bg-[#FFFBEB] border border-[#FFBE00] hover:bg-[#FFBE00]/30 transition-colors"
          >
            <div className="relative">
              <ShoppingBasket className="w-6 h-6 text-[#E3262E] shrink-0 stroke-[2]" />
              <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#E3262E] text-white font-mono text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                {cartItemCount}
              </span>
            </div>
            <div className="text-xs leading-tight">
              <span className="block text-zinc-600 font-medium">Minha Cesta</span>
              <strong className="block font-mono font-extrabold text-zinc-950 tabular-nums">
                {hideAllPrices ? 'Cotar' : formatCurrency(cartSubtotal)}
              </strong>
            </div>
          </button>
        </div>
      </div>

      {/* Tier 3: Sub-Header Navigation Bar (Insira seu CEP | Todas as categorias | Links | Exibir descontos) */}
      <div className="border-t border-zinc-100 bg-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-11 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-3.5 xl:gap-5 text-xs font-medium text-zinc-700 whitespace-nowrap">
            {/* Insira seu CEP */}
            <button
              type="button"
              onClick={onOpenCepModal}
              className="inline-flex items-center gap-1.5 text-zinc-900 font-bold hover:text-[#E3262E] cursor-pointer shrink-0 bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-1 rounded-lg"
            >
              <MapPin className="w-3.5 h-3.5 text-[#E3262E]" />
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
              className={`inline-flex items-center gap-1.5 font-extrabold transition-colors cursor-pointer shrink-0 ${
                isMegaMenuOpen
                  ? 'text-[#E3262E]'
                  : 'text-zinc-900 hover:text-[#E3262E]'
              }`}
            >
              <Menu className="w-4 h-4 text-[#E3262E]" />
              <span>Todas as categorias</span>
            </button>

            <button
              type="button"
              onClick={onOpenCepModal}
              className="inline-flex items-center gap-1.5 hover:text-[#E3262E] transition-colors cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
              <span>Nossa Loja (Av. Couto Magalhães, 2820)</span>
            </button>

            <button
              type="button"
              onClick={onOpenQuickOrderModal}
              className="inline-flex items-center gap-1.5 hover:text-[#E3262E] transition-colors cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
              <span>Calculadora de Diluição</span>
            </button>

            <button
              type="button"
              onClick={onSelectOrders}
              className="inline-flex items-center gap-1.5 hover:text-[#E3262E] transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Rastrear Pedido</span>
            </button>

            <button
              type="button"
              onClick={onSelectOffers}
              className="inline-flex items-center gap-1.5 hover:text-[#E3262E] transition-colors cursor-pointer"
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
              className="inline-flex items-center gap-1.5 hover:text-[#E3262E] transition-colors cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
              <span>Kits & Combos</span>
            </a>
          </div>

          {/* Right Pill CTA ("Exibir descontos" like Drogasil) */}
          <button
            type="button"
            onClick={onSelectOffers}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-2xs inline-flex items-center gap-1.5 ${
              onlyOffers
                ? 'bg-[#FFBE00] text-zinc-950'
                : 'bg-[#BA1826] hover:bg-[#9E1420] text-white'
            }`}
          >
            <Percent className="w-3.5 h-3.5 shrink-0" />
            <span>
              {onlyOffers ? 'Exibindo descontos ✓' : 'Exibir descontos Limper'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
