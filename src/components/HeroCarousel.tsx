import React, { useEffect, useState } from 'react';
import {
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Heart,
  Home,
  PackageCheck,
  Plus,
  ShieldAlert,
  Shirt,
  Sparkles,
  TicketPercent,
} from 'lucide-react';
import { INITIAL_BANNERS, LIMPER_LOGO_URL } from '../data/initialCatalog';
import { Order, Product, PromoBanner, PromoCoupon } from '../types/commerce';
import {
  formatCurrency,
  getDiscountPercentage,
  getEffectivePrice,
  getOrderStageMeta,
} from '../utils/commerce';
import { ProductImageWithFallback } from './CategoryIcon';

interface HeroCarouselProps {
  banners?: PromoBanner[];
  products?: Product[];
  coupons?: PromoCoupon[];
  hideAllPrices?: boolean;
  selectedCategoryId: string | null;
  onlyFavorites: boolean;
  favoritesCount: number;
  onToggleFavorites: () => void;
  onToggleMegaMenu: () => void;
  onSelectCategory: (catId: string | null) => void;
  onSelectOffers: () => void;
  onOpenRepeatOrders: () => void;
  onOpenQuickOrderModal: () => void;
  onOpenCepModal: () => void;
  onSelectProduct?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onApplyCoupon?: (code: string) => void;
  latestActiveOrder?: Order;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  banners = INITIAL_BANNERS,
  products = [],
  coupons = [],
  hideAllPrices = false,
  selectedCategoryId,
  onlyFavorites,
  favoritesCount,
  onToggleFavorites,
  onSelectCategory,
  onSelectOffers,
  onOpenRepeatOrders,
  onOpenQuickOrderModal,
  onOpenCepModal,
  onSelectProduct,
  onAddToCart,
  onApplyCoupon,
  latestActiveOrder,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);

  const heroBanners = banners
    .filter((b) => b.slot === 'hero_carousel' && b.active)
    .sort((a, b) => a.order - b.order);

  const effectiveBanners =
    heroBanners.length > 0
      ? heroBanners
      : INITIAL_BANNERS.filter((b) => b.slot === 'hero_carousel');

  const totalSlides = effectiveBanners.length;
  const safeSlideIndex = activeSlide % Math.max(1, totalSlides);
  const currentBanner = effectiveBanners[safeSlideIndex] || effectiveBanners[0];

  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % totalSlides);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [isPaused, totalSlides]);

  const scrollToCatalog = () => {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeCoupons = coupons.filter((c) => c.active);

  const handleCouponClick = (code: string) => {
    setCopiedCouponCode(code);
    try {
      navigator.clipboard?.writeText(code);
    } catch {
      // ignore clipboard errors
    }
    if (onApplyCoupon) {
      onApplyCoupon(code);
    }
    window.setTimeout(() => {
      setCopiedCouponCode((prev) => (prev === code ? null : prev));
    }, 2600);
  };

  const smartSolutionCards = [
    {
      id: 'sol-casa',
      title: 'Casa & Perfumaria',
      subtitle: 'Água p/ Lençol & Álcool 5L',
      badge: 'Mais Vendido',
      icon: Home,
      isActive: selectedCategoryId === 'cat-casa' && !onlyFavorites,
      accent: 'yellow' as const,
      onClick: () => {
        onSelectCategory('cat-casa');
        scrollToCatalog();
      },
    },
    {
      id: 'sol-lavanderia',
      title: 'Lavanderia 5 Litros',
      subtitle: 'Sabão, Amaciante & Alvejante',
      badge: 'Economia Mensal',
      icon: Shirt,
      isActive: selectedCategoryId === 'cat-lavanderia' && !onlyFavorites,
      accent: 'yellow' as const,
      onClick: () => {
        onSelectCategory('cat-lavanderia');
        scrollToCatalog();
      },
    },
    {
      id: 'sol-pesada',
      title: 'Pós-Obra & Limpeza Pesada',
      subtitle: 'Cloro, Quimi 90 & Limpa Piso',
      badge: 'Uso Profissional',
      icon: ShieldAlert,
      isActive: selectedCategoryId === 'cat-pesada' && !onlyFavorites,
      accent: 'red' as const,
      onClick: () => {
        onSelectCategory('cat-pesada');
        scrollToCatalog();
      },
    },
    {
      id: 'sol-auto',
      title: 'Estética Automotiva',
      subtitle: 'Shampoo c/ Cera & Alumínio',
      badge: 'Linha Lava-Jato',
      icon: Car,
      isActive: selectedCategoryId === 'cat-automotiva' && !onlyFavorites,
      accent: 'yellow' as const,
      onClick: () => {
        onSelectCategory('cat-automotiva');
        scrollToCatalog();
      },
    },
    {
      id: 'sol-diluicao',
      title: 'Calculadora & Compra Rápida',
      subtitle: 'Calcule litros por m² ou lote',
      badge: 'Ferramenta Útil',
      icon: FlaskConical,
      isActive: false,
      accent: 'red' as const,
      onClick: () => {
        onOpenQuickOrderModal();
      },
    },
    {
      id: 'sol-favoritos',
      title: `Meus Salvos (${favoritesCount})`,
      subtitle: 'Sua lista de recompra rápida',
      badge: onlyFavorites ? 'Filtro Ativo' : 'Favoritos',
      icon: Heart,
      isActive: onlyFavorites,
      accent: 'red' as const,
      onClick: () => {
        onToggleFavorites();
        scrollToCatalog();
      },
    },
  ];

  // Resolve products linked to the current banner
  const linkedBannerProducts = currentBanner
    ? currentBanner.featuredProductIds
        .map((id) => products.find((p) => p.id === id && p.status === 'active'))
        .filter((p): p is Product => Boolean(p))
        .slice(0, 3)
    : [];

  return (
    <section
      aria-label="Soluções Inteligentes de Limpeza e Destaques Limper MT"
      className="max-w-[1360px] mx-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 space-y-2.5 sm:space-y-3.5"
    >
      {/* 1. Light, Clean, High-Utility Solutions & Tools Strip
          Mobile (< sm): Sleek single-row horizontal swipeable strip (~52px tall)
          Desktop (sm+ / lg+): Structured 3-column / 6-column executive retail cards */}
      <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 -mx-3 px-3 sm:mx-0 sm:px-0">
        {smartSolutionCards.map((card) => {
          const IconComponent = card.icon;
          const isRed = card.accent === 'red';
          return (
            <button
              key={card.id}
              type="button"
              onClick={card.onClick}
              className={`group shrink-0 w-[192px] sm:w-auto text-left rounded-xl sm:rounded-2xl p-2 sm:p-3 border transition-all duration-150 flex items-center sm:flex-col sm:items-stretch justify-between gap-2.5 sm:gap-2 cursor-pointer ${
                card.isActive
                  ? 'bg-[#FFFBEB] border-2 border-[#E3262E] shadow-xs'
                  : 'bg-white hover:bg-[#FFFDF7] border-zinc-200/90 hover:border-[#FFBE00] shadow-2xs hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between gap-2 sm:w-full shrink-0">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    card.isActive
                      ? 'bg-[#E3262E] text-white'
                      : isRed
                      ? 'bg-rose-50 border border-rose-200/80 text-[#E3262E]'
                      : 'bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706]'
                  }`}
                >
                  <IconComponent className="w-4 h-4 stroke-[2]" />
                </div>

                <span
                  className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-tight ${
                    card.isActive
                      ? 'bg-[#E3262E] text-white'
                      : isRed
                      ? 'bg-rose-50 text-[#E3262E]'
                      : 'bg-[#FFF3C4] text-zinc-900'
                  }`}
                >
                  {card.badge}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-display text-[11px] sm:text-xs font-extrabold text-zinc-900 group-hover:text-[#E3262E] leading-snug truncate">
                  {card.title}
                </div>
                <div className="text-[10px] sm:text-[11px] text-zinc-500 leading-tight truncate mt-0.5">
                  {card.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Dynamic Auto-Playing Promotional Banner Carousel (Managed in Admin) */}
      {currentBanner && (
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-zinc-200/90 shadow-xs bg-white"
        >
          {/* Previous / Next Slide Controls */}
          {totalSlides > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setActiveSlide((prev) => (prev - 1 + totalSlides) % totalSlides)
                }
                aria-label="Banner anterior"
                className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 hover:bg-[#FFBE00] text-zinc-900 border border-zinc-200 shadow-md items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSlide((prev) => (prev + 1) % totalSlides)}
                aria-label="Próximo banner"
                className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 hover:bg-[#FFBE00] text-zinc-900 border border-zinc-200 shadow-md items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* THEME 1: yellow_red (Todimo + Drogasil Multi-Offer Style) */}
          {currentBanner.theme === 'yellow_red' && (
            <div className="bg-[#FDF8D8] grid grid-cols-1 lg:grid-cols-12 sm:min-h-[280px] items-center relative overflow-hidden">
              {/* Left Red Brand Panel */}
              <div className="lg:col-span-4 bg-[#E3262E] text-white p-4 sm:py-8 sm:pr-8 sm:pl-16 lg:rounded-r-[80px] h-full flex flex-col justify-center space-y-1 sm:space-y-2">
                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[#FFBE00] font-extrabold">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{currentBanner.badge}</span>
                </div>
                <h2 className="font-display text-xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                  {currentBanner.title}
                </h2>
                <p className="text-[11px] sm:text-xs text-white/90 leading-relaxed line-clamp-2 sm:line-clamp-3">
                  {currentBanner.subtitle}
                </p>
              </div>

              {/* Center Featured Offer Cards (Dynamic Products Linked to Banner or Tiered Fallback) */}
              <div className="lg:col-span-5 px-3 pt-3 pb-2 sm:p-5 grid grid-cols-3 gap-2 sm:gap-3 items-stretch">
                {linkedBannerProducts.length > 0 ? (
                  linkedBannerProducts.map((prod) => {
                    const effective = getEffectivePrice(prod);
                    const discountPct = getDiscountPercentage(prod);
                    const priceVisible = !hideAllPrices && prod.showPrice !== false;
                    return (
                      <div
                        key={`banner-prod-${prod.id}`}
                        onClick={() =>
                          onSelectProduct ? onSelectProduct(prod) : onSelectOffers()
                        }
                        className="bg-white rounded-xl sm:rounded-2xl border-2 border-[#BA1826] overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-0.5 transition-transform shadow-2xs group"
                      >
                        <div className="p-1.5 sm:p-2.5 text-center space-y-1">
                          <div className="w-11 h-11 sm:w-14 sm:h-14 mx-auto rounded-lg overflow-hidden bg-zinc-50 border border-zinc-100 relative">
                            <ProductImageWithFallback
                              src={prod.imageUrl}
                              alt={prod.title}
                              volumeLabel={prod.volumeLabel}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {discountPct > 0 && (
                              <span className="absolute top-0.5 right-0.5 px-1 py-0.2 rounded bg-[#E3262E] text-white font-mono text-[8px] font-black">
                                -{discountPct}%
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] sm:text-[11px] font-extrabold text-zinc-900 leading-tight line-clamp-2">
                            {prod.title}
                          </div>
                        </div>

                        <div className="bg-[#880D3E] text-white py-1.5 px-1.5 sm:p-2.5 text-center flex flex-col items-center justify-center gap-1">
                          <div className="font-mono text-xs sm:text-base font-extrabold text-[#FFBE00] tabular-nums leading-none">
                            {priceVisible ? formatCurrency(effective) : 'Sob Consulta'}
                          </div>
                          {onAddToCart && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(prod);
                              }}
                              className="w-full py-1 rounded-md bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-[9px] sm:text-[10px] flex items-center justify-center gap-0.5 cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5 stroke-[2.8]" />
                              <span>Na Cesta</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div
                      onClick={() => {
                        onSelectCategory('cat-casa');
                        scrollToCatalog();
                      }}
                      className="bg-[#FFFBEB] rounded-xl sm:rounded-2xl border-2 border-[#BA1826] overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-0.5 transition-transform shadow-2xs"
                    >
                      <div className="p-2 sm:p-3 text-center">
                        <div className="text-[10px] sm:text-xs font-extrabold text-[#BA1826] leading-tight">
                          1 Galão 5L
                        </div>
                        <div className="text-[9px] sm:text-[11px] text-zinc-600 font-medium leading-tight mt-0.5 line-clamp-2">
                          Álcool / Amaciante
                        </div>
                      </div>
                      <div className="bg-[#880D3E] text-white py-2 px-1.5 sm:p-3 text-center">
                        <div className="text-[9px] sm:text-[11px] text-white/80 leading-none">Por</div>
                        <div className="font-mono text-sm sm:text-xl font-extrabold text-white tabular-nums leading-tight mt-0.5">
                          R$ 32<sup className="text-[9px] sm:text-xs">,90</sup>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        onSelectCategory('cat-lavanderia');
                        scrollToCatalog();
                      }}
                      className="bg-[#FFFBEB] rounded-xl sm:rounded-2xl border-2 border-[#BA1826] overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-0.5 transition-transform shadow-2xs"
                    >
                      <div className="p-2 sm:p-3 text-center">
                        <div className="text-[10px] sm:text-xs font-extrabold text-[#BA1826] leading-tight">
                          Combo 2x 5L
                        </div>
                        <div className="text-[9px] sm:text-[11px] text-zinc-600 font-medium leading-tight mt-0.5 line-clamp-2">
                          Sabão + Amaciante
                        </div>
                      </div>
                      <div className="bg-[#880D3E] text-white py-2 px-1.5 sm:p-3 text-center">
                        <div className="text-[9px] sm:text-[10px] text-white/85 leading-none truncate">
                          Cada galão sai:
                        </div>
                        <div className="font-mono text-sm sm:text-xl font-extrabold text-[#FFBE00] tabular-nums leading-tight mt-0.5">
                          R$ 30<sup className="text-[9px] sm:text-xs">,90</sup>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        onSelectCategory('cat-pesada');
                        scrollToCatalog();
                      }}
                      className="bg-[#FFFBEB] rounded-xl sm:rounded-2xl border-2 border-[#BA1826] overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-0.5 transition-transform shadow-2xs"
                    >
                      <div className="p-2 sm:p-3 text-center">
                        <div className="text-[10px] sm:text-xs font-extrabold text-[#BA1826] leading-tight">
                          Kit 3x 5L
                        </div>
                        <div className="text-[9px] sm:text-[11px] text-zinc-600 font-medium leading-tight mt-0.5 line-clamp-2">
                          Limpeza do Mês
                        </div>
                      </div>
                      <div className="bg-[#880D3E] text-white py-2 px-1.5 sm:p-3 text-center">
                        <div className="text-[9px] sm:text-[10px] text-white/85 leading-none truncate">
                          Cada galão sai:
                        </div>
                        <div className="font-mono text-sm sm:text-xl font-extrabold text-[#FFBE00] tabular-nums leading-tight mt-0.5">
                          R$ 28<sup className="text-[9px] sm:text-xs">,90</sup>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right Installment Badge + CTA */}
              <div className="lg:col-span-3 px-3 pb-3 pt-1 sm:p-6 flex flex-row lg:flex-col items-center justify-between lg:justify-center gap-3 text-left lg:text-center">
                <div className="w-13 h-13 sm:w-20 sm:h-20 rounded-full bg-[#68092F] text-white flex flex-col items-center justify-center shadow-md border-2 border-[#FFBE00] shrink-0">
                  <span className="text-[8px] sm:text-[10px] uppercase tracking-wider leading-none">
                    Em até
                  </span>
                  <span className="font-mono text-base sm:text-2xl font-black text-[#FFBE00] leading-none">
                    3x*
                  </span>
                  <span className="text-[8px] sm:text-[10px] leading-none">s/ juros</span>
                </div>

                <div className="flex-1 lg:flex-initial flex sm:flex-col items-center justify-between gap-2">
                  <p className="text-[11px] sm:text-sm font-extrabold text-[#880D3E] leading-snug">
                    Ofertas Selecionadas no Banner
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentBanner.linkedCategoryId) {
                        onSelectCategory(currentBanner.linkedCategoryId);
                      } else {
                        onSelectOffers();
                      }
                      scrollToCatalog();
                    }}
                    className="px-3.5 sm:px-5 py-2 bg-[#E3262E] hover:bg-[#C81E25] text-white text-[11px] sm:text-xs font-extrabold rounded-full shadow-xs shrink-0 cursor-pointer"
                  >
                    {currentBanner.ctaText || 'Aproveitar Ofertas'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* THEME 2: dark_gold (Todimo Style "IMBATÍVEL" Banner + Featured Offer Strip) */}
          {currentBanner.theme === 'dark_gold' && (
            <div className="bg-[#141416] text-white grid grid-cols-1 lg:grid-cols-12 sm:min-h-[280px] items-center">
              <div className="lg:col-span-4 p-4 sm:py-8 sm:pr-8 sm:pl-16 flex flex-col justify-center space-y-2 sm:space-y-3 border-b lg:border-b-0 lg:border-r border-zinc-800">
                <div className="inline-flex items-center gap-2 self-start bg-white px-2.5 py-1 rounded-lg">
                  <img
                    src={LIMPER_LOGO_URL}
                    alt="Limper MT"
                    className="h-5 sm:h-6 w-auto object-contain"
                  />
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#FFBE00] font-bold">
                    {currentBanner.badge}
                  </span>
                  <h2 className="font-display text-xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                    {currentBanner.title}
                  </h2>
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-300 line-clamp-2">
                  {currentBanner.subtitle}
                </p>
              </div>

              <div className="lg:col-span-5 bg-[#FFBE00] text-zinc-950 h-full p-4 sm:p-6 flex flex-col justify-center space-y-3">
                {linkedBannerProducts.length > 0 ? (
                  <div className="space-y-2">
                    <span className="inline-block px-2.5 py-0.5 rounded bg-zinc-950 text-[#FFBE00] font-mono text-[10px] font-extrabold uppercase">
                      OFERTAS VINCULADAS A ESTE BANNER ({linkedBannerProducts.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {linkedBannerProducts.map((prod) => {
                        const effective = getEffectivePrice(prod);
                        const priceVisible = !hideAllPrices && prod.showPrice !== false;
                        return (
                          <div
                            key={`dark-gold-${prod.id}`}
                            onClick={() =>
                              onSelectProduct ? onSelectProduct(prod) : onSelectOffers()
                            }
                            className="bg-white rounded-xl p-2 border border-zinc-900/15 flex sm:flex-col items-center justify-between gap-2 cursor-pointer hover:shadow-md transition-all"
                          >
                            <div className="flex sm:flex-col items-center gap-2 sm:text-center min-w-0">
                              <img
                                src={prod.imageUrl}
                                alt={prod.title}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0 border border-zinc-200"
                              />
                              <div className="min-w-0">
                                <div className="text-[11px] font-extrabold text-zinc-900 truncate max-w-[140px] sm:max-w-[115px]">
                                  {prod.title}
                                </div>
                                <div className="font-mono text-xs font-black text-[#E3262E]">
                                  {priceVisible ? formatCurrency(effective) : 'Sob Consulta'}
                                </div>
                              </div>
                            </div>
                            {onAddToCart && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddToCart(prod);
                                }}
                                className="px-2.5 py-1 sm:w-full rounded-lg bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] font-extrabold text-[10px] shrink-0 cursor-pointer"
                              >
                                + Cesta
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="inline-block self-start px-2.5 py-0.5 rounded bg-zinc-950 text-[#FFBE00] font-mono text-[10px] sm:text-[11px] font-extrabold uppercase">
                      OFERTAS DO MÊS | LIMPER MT
                    </span>
                    <h3 className="font-display text-lg sm:text-2xl font-black leading-tight">
                      {currentBanner.title}
                    </h3>
                  </>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentBanner.linkedCategoryId) {
                        onSelectCategory(currentBanner.linkedCategoryId);
                      } else {
                        onSelectOffers();
                      }
                      scrollToCatalog();
                    }}
                    className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-xs font-extrabold rounded-xl cursor-pointer"
                  >
                    {currentBanner.ctaText || 'Ver Todas as Ofertas'}
                  </button>
                  <button
                    type="button"
                    onClick={onOpenCepModal}
                    className="px-3.5 py-2 bg-white/90 hover:bg-white text-zinc-950 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Consultar Meu CEP
                  </button>
                </div>
              </div>

              <div className="hidden lg:block lg:col-span-3 h-full min-h-[240px] relative bg-zinc-900">
                <img
                  src={currentBanner.imageUrl}
                  alt={currentBanner.title}
                  className="w-full h-full object-cover opacity-95"
                />
              </div>
            </div>
          )}

          {/* THEME 3: crimson_wine (Express Pickup / Institutional & Linked Products) */}
          {currentBanner.theme === 'crimson_wine' && (
            <div className="bg-gradient-to-r from-[#181A20] via-[#23272F] to-[#880D3E] text-white grid grid-cols-1 lg:grid-cols-12 sm:min-h-[280px] items-center">
              <div className="lg:col-span-7 p-4 sm:py-8 sm:pr-8 sm:pl-16 space-y-2.5 sm:space-y-3">
                <span className="inline-block px-2.5 sm:px-3 py-1 rounded-full bg-[#FFBE00] text-zinc-950 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider">
                  {currentBanner.badge}
                </span>
                <h2 className="font-display text-xl sm:text-3xl font-extrabold leading-tight">
                  {currentBanner.title}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-200 max-w-xl leading-relaxed">
                  {currentBanner.subtitle}
                </p>

                {linkedBannerProducts.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {linkedBannerProducts.map((prod) => {
                      const effective = getEffectivePrice(prod);
                      const priceVisible = !hideAllPrices && prod.showPrice !== false;
                      return (
                        <div
                          key={`crimson-${prod.id}`}
                          onClick={() =>
                            onSelectProduct ? onSelectProduct(prod) : onSelectOffers()
                          }
                          className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-2 flex items-center gap-2.5 cursor-pointer transition-colors"
                        >
                          <img
                            src={prod.imageUrl}
                            alt={prod.title}
                            className="w-9 h-9 rounded-lg object-cover bg-white shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-white truncate max-w-[140px]">
                              {prod.title}
                            </div>
                            <div className="font-mono text-xs font-extrabold text-[#FFBE00]">
                              {priceVisible ? formatCurrency(effective) : 'Sob Consulta'}
                            </div>
                          </div>
                          {onAddToCart && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(prod);
                              }}
                              className="px-2 py-1 rounded-lg bg-[#FFBE00] text-zinc-950 font-extrabold text-[10px] cursor-pointer"
                            >
                              + Cesta
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 sm:gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentBanner.linkedCategoryId) {
                        onSelectCategory(currentBanner.linkedCategoryId);
                        scrollToCatalog();
                      } else {
                        onOpenQuickOrderModal();
                      }
                    }}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl cursor-pointer"
                  >
                    {currentBanner.ctaText || 'Fazer Compra Rápida por Lista'}
                  </button>
                  <button
                    type="button"
                    onClick={onOpenRepeatOrders}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/20 cursor-pointer"
                  >
                    Acompanhar Pedido / Repetir
                  </button>
                </div>
              </div>

              <div className="hidden lg:flex lg:col-span-5 p-6 items-center justify-center">
                <div className="rounded-2xl overflow-hidden border-2 border-[#FFBE00] shadow-xl max-w-sm w-full bg-white">
                  <img
                    src={currentBanner.imageUrl}
                    alt={currentBanner.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Carousel Pagination Dots */}
          <div className="py-2 sm:py-2.5 bg-white border-t border-zinc-100 flex items-center justify-center gap-2">
            {effectiveBanners.map((b, idx) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setActiveSlide(idx)}
                aria-label={`Ir para banner ${idx + 1}: ${b.title}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  safeSlideIndex === idx
                    ? 'w-6 bg-[#E3262E]'
                    : 'w-2 bg-zinc-300 hover:bg-zinc-400'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. Interactive 1-Click Coupon Bar (Displays Active Admin Coupons on the Storefront) */}
      {activeCoupons.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200/90 px-3.5 py-2.5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar shadow-2xs">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-[#E3262E] flex items-center justify-center">
              <TicketPercent className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-zinc-900">
              Cupons Ativos Hoje:
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeCoupons.map((cp) => {
              const isCopied = copiedCouponCode === cp.code;
              return (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => handleCouponClick(cp.code)}
                  title="Clique para copiar e ativar o cupom na sua Cesta"
                  className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-extrabold'
                      : 'bg-[#FFFBEB] hover:bg-[#FFBE00]/30 border-[#FDE68A] text-zinc-900'
                  }`}
                >
                  <span className="font-mono font-extrabold text-[#E3262E]">
                    {cp.code}
                  </span>
                  <span className="text-[11px] text-zinc-700 font-semibold">
                    {cp.discountType === 'percent'
                      ? `${cp.discountValue}% OFF`
                      : `-${formatCurrency(cp.discountValue)}`}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-zinc-200 text-[10px] font-extrabold text-zinc-800 inline-flex items-center gap-1">
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Ativado!</span>
                      </>
                    ) : (
                      <span>Usar Cupom</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. iFood / 99 Style Live Order Mini-Radar Strip */}
      {latestActiveOrder && (() => {
        const meta = getOrderStageMeta(
          latestActiveOrder.status,
          latestActiveOrder.deliveryType
        );
        const currentStep = meta.step;
        return (
          <div className="rounded-2xl bg-white border border-zinc-200/90 px-3.5 sm:px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] border border-[#FFBE00] text-[#E3262E] flex items-center justify-center shrink-0">
                <PackageCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-zinc-950 text-[#FFBE00] font-mono text-[10px] font-extrabold uppercase">
                    {latestActiveOrder.deliveryType === 'pickup'
                      ? `RETIRADA NA LOJA · ${latestActiveOrder.id}`
                      : `RASTREIO DELIVERY · ${latestActiveOrder.id}`}
                  </span>
                  <span className="font-extrabold text-zinc-900">
                    {meta.cleaningStageTitle}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-emerald-700">
                    · {meta.etaBadge}
                  </span>
                </div>
                {/* 4-Bar iFood Progress Indicator */}
                <div className="grid grid-cols-4 gap-1.5 max-w-xs mt-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={`mini-step-${step}`}
                      className={`h-1.5 rounded-full ${
                        step === currentStep
                          ? 'bg-[#E3262E]'
                          : step < currentStep
                          ? 'bg-[#FFBE00]'
                          : 'bg-zinc-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-[#FAFAFA] border border-zinc-200 font-mono text-[11px] font-extrabold text-zinc-800">
                Senha: {latestActiveOrder.pickupCode || latestActiveOrder.id}
              </span>
              <button
                type="button"
                onClick={onOpenRepeatOrders}
                className="px-3.5 py-2 rounded-xl bg-[#E3262E] hover:bg-[#C81E25] text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <span>
                  {latestActiveOrder.deliveryType === 'pickup'
                    ? 'Ver Senha & Ir Buscar'
                    : 'Abrir Radar do Pedido'}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })()}
    </section>
  );
};
