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
  if (!isOpen) return null;

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <div
      role="region"
      aria-label="MegaMenu de Produtos Quimiprol e Limper MT"
      className="fixed inset-x-0 top-[7.5rem] z-40 bg-zinc-900/35 backdrop-blur-[2px] no-print"
      onClick={onClose}
    >
      <div
        className="max-w-[1280px] mx-auto bg-white border-x border-b border-zinc-200 rounded-b-2xl shadow-2xl p-5 sm:p-7 max-h-[82vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Strip inside MegaMenu */}
        <div className="flex items-center justify-between gap-4 pb-4 mb-5 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E3262E]" />
            <span className="font-display text-sm sm:text-base font-extrabold text-zinc-900 uppercase tracking-wide">
              Linhas de Produtos de Limpeza Profissional & Doméstica (Base Quimiprol)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onSelectCategory(null);
                onClose();
              }}
              className="text-xs font-extrabold text-[#E3262E] hover:underline cursor-pointer"
            >
              Ver Todos os Produtos ({products.filter((p) => p.status !== 'inactive').length})
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu de produtos"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4-Column Quimiprol MegaMenu Grid (Matches Reference Screenshot) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
  );
};
