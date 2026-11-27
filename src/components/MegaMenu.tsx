import React from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { Category, Product } from '../types/commerce';

interface MegaMenuProps {
  isOpen: boolean;
  categories: Category[];
  products: Product[];
  onClose: () => void;
  onSelectCategory: (categoryId: string | null) => void;
  onSelectProduct: (product: Product) => void;
}

export const MegaMenu: React.FC<MegaMenuProps> = ({
  isOpen,
  categories,
  products,
  onClose,
  onSelectCategory,
  onSelectProduct,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="MegaMenu de Produtos Quimiprol e Limper MT"
      className="fixed inset-0 z-50 bg-zinc-900/45 backdrop-blur-[2px] flex items-start justify-center p-2.5 sm:p-4 md:pt-16 lg:pt-20 no-print"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[1280px] bg-white border border-zinc-200 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100dvh-1.25rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[82dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Header Strip inside MegaMenu */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3.5 sm:px-7 sm:py-5 border-b border-zinc-200 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E3262E] shrink-0" />
            <span className="font-display text-xs sm:text-base font-extrabold text-zinc-900 uppercase tracking-wide leading-snug">
              Linhas de Produtos Limper MT · Quimiprol
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                onSelectCategory(null);
                onClose();
              }}
              className="text-[11px] sm:text-xs font-extrabold text-[#E3262E] hover:underline cursor-pointer whitespace-nowrap"
            >
              Ver Todos ({products.filter((p) => p.status !== 'inactive').length})
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu de produtos"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable 4-Column Quimiprol MegaMenu Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {sortedCategories.map((cat) => {
            const catProducts = products.filter(
              (p) => p.categoryId === cat.id && p.status !== 'inactive'
            );

            return (
              <div
                key={cat.id}
                className="border border-zinc-200/90 hover:border-[#FFBE00] rounded-lg bg-white flex flex-col h-60 transition-colors shadow-2xs"
              >
                {/* Category Box Header */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat.id);
                    onClose();
                  }}
                  className="w-full px-4 py-3 border-b border-zinc-200 text-left font-display text-xs font-extrabold uppercase tracking-wider text-zinc-950 hover:bg-[#FFFBEB] flex items-center justify-between gap-2 transition-colors cursor-pointer shrink-0"
                >
                  <span className="truncate">{cat.name.toUpperCase()}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
                </button>

                {/* Scrollable Product List inside Category Card */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                  {catProducts.length === 0 ? (
                    <p className="text-xs text-zinc-400">Em breve novos itens</p>
                  ) : (
                    catProducts.map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => {
                          onSelectProduct(prod);
                          onClose();
                        }}
                        className="w-full text-left block text-[11px] font-semibold uppercase tracking-tight text-zinc-700 hover:text-[#E3262E] transition-colors leading-snug cursor-pointer"
                      >
                        {prod.title.toUpperCase()}
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* 8th Slot: Express Pickup & Wholesale Callout Card */}
          <div className="border border-[#FDE68A] rounded-lg bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7]/60 p-4 flex flex-col justify-between h-60">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-extrabold text-[#E3262E] uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Retirada Rápida & Delivery</span>
              </div>
              <h3 className="font-display text-sm font-extrabold text-zinc-900 uppercase mb-2">
                Central Express Limper MT
              </h3>
              <p className="text-xs text-zinc-700 leading-relaxed">
                Compre galões de 5L, 2L e linha completa de limpeza profissional com retirada sem fila no balcão ou entrega em Cuiabá e Várzea Grande.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectCategory(null);
                onClose();
              }}
              className="w-full py-2.5 px-3 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Ver Catálogo Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
