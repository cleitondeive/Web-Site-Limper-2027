import React from 'react';
import { Sparkles } from 'lucide-react';
import { Category } from '../types/commerce';
import { CategoryIcon } from './CategoryIcon';

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onlyOffers: boolean;
  onSelectCategory: (categoryId: string | null) => void;
  onToggleOffers: (onlyOffers: boolean) => void;
  totalFilteredCount: number;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  selectedCategoryId,
  onlyOffers,
  onSelectCategory,
  onToggleOffers,
  totalFilteredCount,
}) => {
  const sorted = [...categories].sort((a, b) => a.order - b.order);

  return (
    <section id="catalogo" className="bg-[#FAFAFA] pt-4 sm:pt-7 pb-2 sm:pb-3">
      <div className="max-w-[1360px] mx-auto px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-3.5 sm:mb-5">
          <div>
            <h2 className="font-display text-lg sm:text-2xl font-extrabold text-zinc-900">
              Navegue por Categoria
            </h2>
            <p className="text-[11px] sm:text-sm text-zinc-500">
              Escolha a linha ideal para sua necessidade ({totalFilteredCount}{' '}
              {totalFilteredCount === 1 ? 'produto disponível' : 'produtos disponíveis'})
            </p>
          </div>

          {/* Interactive segmented filter control */}
          <div className="flex items-center gap-1 p-1 bg-white border border-zinc-200 rounded-xl self-start sm:self-auto shadow-2xs">
            <button
              type="button"
              onClick={() => onToggleOffers(false)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !onlyOffers
                  ? 'bg-[#FFBE00] text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Todos os Produtos
            </button>
            <button
              type="button"
              onClick={() => onToggleOffers(true)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                onlyOffers
                  ? 'bg-[#FFBE00] text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Ofertas com Desconto
            </button>
          </div>
        </div>

        {/* Light Circular & Card Category Selector (Horizontal swipe on mobile, 8-col grid on md+) */}
        <div
          role="tablist"
          aria-label="Categorias de produtos"
          className="flex md:grid md:grid-cols-8 gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1 -mx-3 px-3 md:mx-0 md:px-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!selectedCategoryId || selectedCategoryId === 'all'}
            onClick={() => onSelectCategory(null)}
            className={`group shrink-0 w-[86px] sm:w-[100px] md:w-auto flex flex-col items-center text-center p-2.5 sm:p-3 rounded-2xl border transition-all hover:-translate-y-0.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FFBE00] ${
              !selectedCategoryId || selectedCategoryId === 'all'
                ? 'bg-white border-[#FFBE00] shadow-md'
                : 'bg-white border-zinc-200/80 hover:border-[#FFBE00]/60 shadow-2xs'
            }`}
          >
            <div
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors mb-1.5 sm:mb-2.5 ${
                !selectedCategoryId || selectedCategoryId === 'all'
                  ? 'bg-[#FFBE00] text-zinc-950'
                  : 'bg-[#FFFBEB] text-[#D97706] group-hover:bg-[#FEF3C7]'
              }`}
            >
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span
              className={`text-[11px] sm:text-xs leading-tight whitespace-nowrap truncate max-w-full ${
                !selectedCategoryId || selectedCategoryId === 'all'
                  ? 'text-zinc-950 font-extrabold'
                  : 'text-zinc-700 font-semibold group-hover:text-zinc-950'
              }`}
            >
              Ver Todas
            </span>
          </button>

          {sorted.map((cat) => {
            const isActive = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectCategory(isActive ? null : cat.id)}
                className={`group shrink-0 w-[86px] sm:w-[100px] md:w-auto flex flex-col items-center text-center p-2.5 sm:p-3 rounded-2xl border transition-all hover:-translate-y-0.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FFBE00] ${
                  isActive
                    ? 'bg-white border-[#FFBE00] shadow-md'
                    : 'bg-white border-zinc-200/80 hover:border-[#FFBE00]/60 shadow-2xs'
                }`}
              >
                <div
                  className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors mb-1.5 sm:mb-2.5 ${
                    isActive
                      ? 'bg-[#FFBE00] text-zinc-950'
                      : 'bg-[#FFFBEB] text-[#D97706] group-hover:bg-[#FEF3C7]'
                  }`}
                >
                  <CategoryIcon name={cat.icon} className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span
                  className={`text-[11px] sm:text-xs leading-tight whitespace-nowrap truncate max-w-full ${
                    isActive
                      ? 'text-zinc-950 font-extrabold'
                      : 'text-zinc-700 font-semibold group-hover:text-zinc-950'
                  }`}
                >
                  {cat.shortName}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
