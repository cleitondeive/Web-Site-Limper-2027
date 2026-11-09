import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Category, Product, StoreSettings } from '../types/commerce';
import { ProductCard } from './ProductCard';

interface ProductShelfCarouselProps {
  title: string;
  kicker?: string;
  subtitle?: string;
  badgeText?: string;
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  cartQuantities: Record<string, number>;
  favorites: string[];
  customerCep?: string;
  onAdd: (product: Product) => void;
  onUpdateQuantity: (productId: string, newQty: number) => void;
  onOpenDetail: (product: Product) => void;
  onToggleFavorite: (productId: string) => void;
  onViewAll?: () => void;
  viewAllLabel?: string;
}

export const ProductShelfCarousel: React.FC<ProductShelfCarouselProps> = ({
  title,
  kicker,
  subtitle,
  badgeText,
  products,
  categories,
  settings,
  cartQuantities,
  favorites,
  customerCep,
  onAdd,
  onUpdateQuantity,
  onOpenDetail,
  onToggleFavorite,
  onViewAll,
  viewAllLabel = 'Ver mais',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activePage, setActivePage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const updateScrollState = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 12);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 12);

    const pages = Math.max(1, Math.ceil(scrollWidth / Math.max(1, clientWidth * 0.85)));
    setTotalPages(pages);
    const current = Math.min(
      pages - 1,
      Math.max(0, Math.round(scrollLeft / Math.max(1, (scrollWidth - clientWidth) / Math.max(1, pages - 1))))
    );
    setActivePage(Number.isFinite(current) ? current : 0);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleResize = () => updateScrollState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [products.length]);

  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const step = Math.max(280, el.clientWidth * 0.78);
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  const scrollToPage = (pageIdx: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const target = totalPages <= 1 ? 0 : (maxScroll / (totalPages - 1)) * pageIdx;
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  if (products.length === 0) return null;

  return (
    <section className="max-w-[1360px] mx-auto px-3 sm:px-6 py-3 sm:py-4 relative group/shelf">
      {/* Shelf Header: Drogasil + Mercado Livre ("Título + Ver mais" + Circular Arrows on Top Right) */}
      <div className="flex items-end justify-between gap-3 mb-3 sm:mb-4">
        <div className="min-w-0 flex-1">
          {kicker && (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-extrabold text-[#E3262E] mb-0.5">
              <span>{kicker}</span>
              {badgeText && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#B45309]">{badgeText}</span>
                </>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-baseline gap-2.5 sm:gap-3">
            <h2 className="font-display text-lg sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
              {title}
            </h2>
            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#2563EB] hover:text-[#1D4ED8] hover:underline cursor-pointer whitespace-nowrap"
              >
                <span>{viewAllLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{subtitle}</p>
          )}
        </div>

        {/* Drogasil-Style Top-Right Circular Navigation Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => scrollByAmount('left')}
            disabled={!canScrollLeft}
            aria-label={`Voltar slide em ${title}`}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              canScrollLeft
                ? 'bg-white hover:bg-[#FFBE00] border-zinc-400 hover:border-[#FFBE00] text-zinc-900 shadow-2xs active:scale-95'
                : 'bg-white/60 border-zinc-200 text-zinc-300 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount('right')}
            disabled={!canScrollRight}
            aria-label={`Avançar slide em ${title}`}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              canScrollRight
                ? 'bg-white hover:bg-[#FFBE00] border-zinc-500 hover:border-[#FFBE00] text-zinc-900 shadow-2xs active:scale-95'
                : 'bg-white/60 border-zinc-200 text-zinc-300 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Carousel Wrapper with Floating Side Arrows (Mercado Livre / Todimo / Netflix Peek Style) */}
      <div className="relative">
        {/* Floating Left Circular Arrow (Todimo / Mercado Livre style) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByAmount('left')}
            aria-label={`Rolar ${title} para a esquerda`}
            className="hidden sm:flex absolute -left-3 lg:-left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white hover:bg-[#FFBE00] text-zinc-900 border border-zinc-200 shadow-lg items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.4]" />
          </button>
        )}

        {/* Horizontal Scrollable Track with Netflix-Style Right Edge Card Peek
            Mobile: 2.15 cards visible (so the 3rd card peeks on the right edge!)
            Tablet: 3.25 cards visible
            Desktop: 4.65 cards visible (5 full cards + partial peek of the next card on the right!) */}
        <div
          ref={scrollContainerRef}
          onScroll={updateScrollState}
          className="flex items-stretch gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-2 pt-0.5 pr-6 sm:pr-12"
        >
          {products.map((product) => {
            const qty = cartQuantities[product.id] || 0;
            const catObj = categories.find((c) => c.id === product.categoryId);
            return (
              <div
                key={`shelf-item-${title}-${product.id}`}
                className="snap-start shrink-0 w-[45.5%] xs:w-[44%] sm:w-[30.5%] md:w-[23.5%] lg:w-[18.8%] flex flex-col"
              >
                <ProductCard
                  product={product}
                  category={catObj}
                  settings={settings}
                  quantityInCart={qty}
                  isFavorite={favorites.includes(product.id)}
                  customerCep={customerCep}
                  onAdd={onAdd}
                  onUpdateQuantity={onUpdateQuantity}
                  onOpenDetail={onOpenDetail}
                  onToggleFavorite={onToggleFavorite}
                />
              </div>
            );
          })}

          {/* Final "Ver Todos da Linha" Peek Card (Netflix + Mercado Livre End-of-Shelf Card) */}
          {onViewAll && (
            <div className="snap-start shrink-0 w-[38%] sm:w-[22%] lg:w-[14%] flex">
              <button
                type="button"
                onClick={onViewAll}
                className="w-full rounded-2xl bg-white hover:bg-[#FFFBEB] border border-dashed border-zinc-300 hover:border-[#FFBE00] p-4 flex flex-col items-center justify-center text-center gap-3 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[#FFFBEB] group-hover:bg-[#FFBE00] border border-[#FDE68A] text-zinc-900 flex items-center justify-center transition-colors shadow-2xs">
                  <ChevronRight className="w-6 h-6 text-[#E3262E] group-hover:text-zinc-950" />
                </div>
                <div>
                  <span className="block font-display text-xs sm:text-sm font-extrabold text-zinc-900">
                    Ver linha completa
                  </span>
                  <span className="block text-[11px] text-zinc-500 mt-0.5">
                    +{products.length} produtos disponíveis
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Right Edge Subtle Fade + Floating Circular Arrow (Mercado Livre / Netflix Peek Indicator) */}
        {canScrollRight && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 sm:w-14 bg-gradient-to-l from-[#FAFAFA] via-[#FAFAFA]/60 to-transparent z-10"
            />
            <button
              type="button"
              onClick={() => scrollByAmount('right')}
              aria-label={`Ver mais produtos em ${title}`}
              className="flex absolute right-1 sm:-right-3 lg:-right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-[#FFBE00] text-zinc-900 border border-zinc-200/90 shadow-lg items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 stroke-[2.4]" />
            </button>
          </>
        )}
      </div>

      {/* Todimo-Style Bottom Pagination Dots */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={`dot-${title}-${idx}`}
              type="button"
              onClick={() => scrollToPage(idx)}
              aria-label={`Página ${idx + 1} de ${title}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                activePage === idx
                  ? 'w-5 bg-[#FFBE00]'
                  : 'w-1.5 bg-zinc-300 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};
