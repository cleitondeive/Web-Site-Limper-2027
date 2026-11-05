import React, { useEffect, useState } from 'react';
import {
  Car,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Heart,
  Home,
  PackageCheck,
  ShieldAlert,
  Shirt,
  Sparkles,
} from 'lucide-react';
import { GENERATED_IMAGES, LIMPER_LOGO_URL } from '../data/initialCatalog';
import { Order } from '../types/commerce';
import { ORDER_STATUS_META } from '../utils/commerce';

interface HeroCarouselProps {
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
  latestActiveOrder?: Order;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  selectedCategoryId,
  onlyFavorites,
  favoritesCount,
  onToggleFavorites,
  onSelectCategory,
  onSelectOffers,
  onOpenRepeatOrders,
  onOpenQuickOrderModal,
  onOpenCepModal,
  latestActiveOrder,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const totalSlides = 3;

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % totalSlides);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  const scrollToCatalog = () => {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
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

  return (
    <section
      aria-label="Soluções Inteligentes de Limpeza e Destaques Limper MT"
      className="max-w-[1360px] mx-auto px-4 sm:px-6 pt-4 pb-3 space-y-4"
    >
      {/* 1. Light, Clean, High-Utility Solutions & Tools Strip (Replaces heavy black icons) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {smartSolutionCards.map((card) => {
          const IconComponent = card.icon;
          const isRed = card.accent === 'red';
          return (
            <button
              key={card.id}
              type="button"
              onClick={card.onClick}
              className={`group text-left rounded-2xl p-3 border transition-all duration-150 flex flex-col justify-between gap-2 cursor-pointer ${
                card.isActive
                  ? 'bg-[#FFFBEB] border-2 border-[#E3262E] shadow-xs'
                  : 'bg-white hover:bg-[#FFFDF7] border-zinc-200/90 hover:border-[#FFBE00] shadow-2xs hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
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
                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-tight ${
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

              <div>
                <div className="font-display text-xs font-extrabold text-zinc-900 group-hover:text-[#E3262E] leading-snug truncate">
                  {card.title}
                </div>
                <div className="text-[11px] text-zinc-500 leading-tight truncate mt-0.5">
                  {card.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Auto-Playing Promotional Banner Carousel */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative rounded-3xl overflow-hidden border border-zinc-200/90 shadow-xs bg-white"
      >
        {/* Previous / Next Slide Controls */}
        <button
          type="button"
          onClick={() =>
            setActiveSlide((prev) => (prev - 1 + totalSlides) % totalSlides)
          }
          aria-label="Banner anterior"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 hover:bg-[#FFBE00] text-zinc-900 border border-zinc-200 shadow-md flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setActiveSlide((prev) => (prev + 1) % totalSlides)}
          aria-label="Próximo banner"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 hover:bg-[#FFBE00] text-zinc-900 border border-zinc-200 shadow-md flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* SLIDE 0: Multi-Pack Tiered Quimiprol 5L Offer */}
        {activeSlide === 0 && (
          <div className="bg-[#FDF8D8] grid grid-cols-1 lg:grid-cols-12 min-h-[260px] sm:min-h-[290px] items-center relative overflow-hidden">
            {/* Left Red Curved Brand Panel */}
            <div className="lg:col-span-4 bg-[#E3262E] text-white py-6 pr-6 pl-14 sm:py-8 sm:pr-8 sm:pl-16 lg:rounded-r-[80px] h-full flex flex-col justify-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#FFBE00] font-extrabold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ATACADO & VAREJO 5 LITROS</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight leading-none">
                Quimiprol
              </h2>
              <p className="font-display text-base sm:text-lg font-semibold text-white/95">
                direto na Limper MT
              </p>
              <p className="text-xs text-white/85 pt-1 leading-relaxed">
                Compre por unidade ou em combo com desconto progressivo para casa, condomínio e empresa.
              </p>
            </div>

            {/* Center 3 Tiered Price Cards */}
            <div className="lg:col-span-5 p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
              <div
                onClick={() => {
                  onSelectCategory('cat-casa');
                  scrollToCatalog();
                }}
                className="bg-[#FFFBEB] rounded-2xl border-2 border-[#BA1826] overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-0.5 transition-transform shadow-2xs"
              >
                <div className="p-3 text-center">
                  <div className="text-xs font-extrabold text-[#BA1826]">
                    1 Galão 5 Litros
                  </div>
                  <div className="text-[11px] text-zinc-600 font-medium">
                    Álcool Perfumado / Amaciante
                  </div>
                </div>
                <div className="bg-[#880D3E] text-white p-3 text-center">
                  <div className="text-[11px] text-white/80">Por</div>
                  <div className="font-mono text-xl font-extrabold text-white tabular-nums">
                    R$ 32<sup className="text-xs">,90</sup>
                  </div>
                </div>
              </div>

              <div
                onClick={() => {
                  onSelectCategory('cat-lavanderia');
                  scrollToCatalog();
                }}
                className="bg-[#FFFBEB] rounded-2xl border-2 border-[#BA1826] overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-0.5 transition-transform shadow-2xs"
              >
                <div className="p-3 text-center">
                  <div className="text-xs font-extrabold text-[#BA1826]">
                    Combo 2 Galões 5L
                  </div>
                  <div className="text-[11px] text-zinc-600 font-medium">
                    Sabão + Amaciante 5L
                  </div>
                </div>
                <div className="bg-[#880D3E] text-white p-3 text-center">
                  <div className="text-[10px] text-white/85">
                    Por R$ 61,80 · Cada galão:
                  </div>
                  <div className="font-mono text-xl font-extrabold text-[#FFBE00] tabular-nums">
                    R$ 30<sup className="text-xs">,90</sup>
                  </div>
                </div>
              </div>

              <div
                onClick={() => {
                  onSelectCategory('cat-pesada');
                  scrollToCatalog();
                }}
                className="bg-[#FFFBEB] rounded-2xl border-2 border-[#BA1826] overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-0.5 transition-transform shadow-2xs"
              >
                <div className="p-3 text-center">
                  <div className="text-xs font-extrabold text-[#BA1826]">
                    Kit 3 Galões 5L
                  </div>
                  <div className="text-[11px] text-zinc-600 font-medium">
                    Limpeza Completa do Mês
                  </div>
                </div>
                <div className="bg-[#880D3E] text-white p-3 text-center">
                  <div className="text-[10px] text-white/85">
                    Por R$ 86,70 · Cada galão:
                  </div>
                  <div className="font-mono text-xl font-extrabold text-[#FFBE00] tabular-nums">
                    R$ 28<sup className="text-xs">,90</sup>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Installment Scallop Badge + CTA */}
            <div className="lg:col-span-3 p-5 sm:p-6 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-3 text-center">
              <div className="w-20 h-20 rounded-full bg-[#68092F] text-white flex flex-col items-center justify-center shadow-md border-2 border-[#FFBE00]">
                <span className="text-[10px] uppercase tracking-wider">Em até</span>
                <span className="font-mono text-2xl font-black text-[#FFBE00] leading-none">
                  3x*
                </span>
                <span className="text-[10px]">sem juros</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-extrabold text-[#880D3E] leading-snug">
                  Alto rendimento para sua casa ou empresa
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onSelectOffers();
                    scrollToCatalog();
                  }}
                  className="px-5 py-2 bg-[#E3262E] hover:bg-[#C81E25] text-white text-xs font-extrabold rounded-full shadow-xs cursor-pointer"
                >
                  aproveitar ofertas
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 1: Todimo Style "MÊS IMBATÍVEL LIMPER MT" Banner */}
        {activeSlide === 1 && (
          <div className="bg-[#141416] text-white grid grid-cols-1 lg:grid-cols-12 min-h-[260px] sm:min-h-[290px] items-center">
            <div className="lg:col-span-4 py-6 pr-6 pl-14 sm:py-8 sm:pr-8 sm:pl-16 flex flex-col justify-center space-y-3 border-b lg:border-b-0 lg:border-r border-zinc-800">
              <div className="inline-flex items-center gap-2 self-start bg-white px-2.5 py-1 rounded-lg">
                <img
                  src={LIMPER_LOGO_URL}
                  alt="Limper MT"
                  className="h-6 w-auto object-contain"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
                  SEMANA DE OFERTAS
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-[#FFBE00] leading-none">
                  IMBATÍVEL
                </h2>
              </div>
              <p className="text-xs text-zinc-300">
                Desengordurante Quimi 90, Cloro Concentrado 5L e Linha Automotiva com preços de atacado.
              </p>
            </div>

            <div className="lg:col-span-5 bg-[#FFBE00] text-zinc-950 h-full p-6 sm:p-8 flex flex-col justify-center space-y-3">
              <span className="inline-block self-start px-2.5 py-0.5 rounded bg-zinc-950 text-[#FFBE00] font-mono text-[11px] font-extrabold uppercase">
                OFERTAS DO MÊS | LIMPER MT
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-black leading-tight">
                Preços que cabem no bolso para comprar sem pensar
              </h3>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onSelectOffers();
                    scrollToCatalog();
                  }}
                  className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-xs font-extrabold rounded-xl cursor-pointer"
                >
                  Ver Todas as Ofertas
                </button>
                <button
                  type="button"
                  onClick={onOpenCepModal}
                  className="px-4 py-2.5 bg-white/90 hover:bg-white text-zinc-950 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Consultar Meu CEP
                </button>
              </div>
            </div>

            <div className="lg:col-span-3 h-full min-h-[200px] relative bg-zinc-900">
              <img
                src={GENERATED_IMAGES.prodLimpezaPesada}
                alt="Galões Quimiprol Limper MT"
                className="w-full h-full object-cover opacity-95"
              />
            </div>
          </div>
        )}

        {/* SLIDE 2: Express Pickup in 15min & Official Várzea Grande Store */}
        {activeSlide === 2 && (
          <div className="bg-gradient-to-r from-[#181A20] via-[#23272F] to-[#880D3E] text-white grid grid-cols-1 lg:grid-cols-12 min-h-[260px] sm:min-h-[290px] items-center">
            <div className="lg:col-span-7 py-6 pr-6 pl-14 sm:py-10 sm:pr-10 sm:pl-16 space-y-3">
              <span className="inline-block px-3 py-1 rounded-full bg-[#FFBE00] text-zinc-950 text-[11px] font-extrabold uppercase tracking-wider">
                AV. COUTO MAGALHÃES, 2820 · VÁRZEA GRANDE - MT
              </span>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold leading-tight">
                Peça pelo Catálogo Online e Retire no{' '}
                <span className="text-[#FFBE00]">Balcão Express em 15min</span> ou Receba Hoje
              </h2>
              <p className="text-xs sm:text-sm text-zinc-200 max-w-xl leading-relaxed">
                Seus galões de 5L e 2L já ficam separados, conferidos e lacrados. Atendemos residências, clínicas, lava-jatos e condomínios pelo (65) 3029-6824.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={onOpenQuickOrderModal}
                  className="px-5 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Fazer Compra Rápida por Lista
                </button>
                <button
                  type="button"
                  onClick={onOpenRepeatOrders}
                  className="px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/20 cursor-pointer"
                >
                  Acompanhar Pedido / Repetir
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 flex items-center justify-center">
              <div className="rounded-2xl overflow-hidden border-2 border-[#FFBE00] shadow-xl max-w-sm w-full bg-white">
                <img
                  src={GENERATED_IMAGES.bannerAutomotivo}
                  alt="Linha Automotiva e Profissional Limper MT"
                  className="w-full h-48 object-cover"
                />
              </div>
            </div>
          </div>
        )}

        {/* Carousel Pagination Dots */}
        <div className="py-2.5 bg-white border-t border-zinc-100 flex items-center justify-center gap-2">
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSlide(idx)}
              aria-label={`Ir para slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                activeSlide === idx
                  ? 'w-6 bg-[#E3262E]'
                  : 'w-2 bg-zinc-300 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 3. Live Order Status Strip */}
      {latestActiveOrder && (
        <div className="rounded-2xl bg-white border border-zinc-200/90 border-l-4 border-l-[#E3262E] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <PackageCheck className="w-4 h-4 text-[#E3262E] shrink-0" />
            <div>
              <strong className="font-mono text-zinc-900">
                Status Ao Vivo ({latestActiveOrder.id}):
              </strong>{' '}
              <span className="font-bold text-[#E3262E]">
                {ORDER_STATUS_META[latestActiveOrder.status].shortLabel}
              </span>{' '}
              <span className="text-zinc-500 hidden md:inline">
                — {ORDER_STATUS_META[latestActiveOrder.status].cleaningStageDesc}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenRepeatOrders}
            className="text-xs font-extrabold text-zinc-900 hover:text-[#E3262E] underline self-start sm:self-auto cursor-pointer shrink-0"
          >
            Acompanhar separação →
          </button>
        </div>
      )}
    </section>
  );
};
