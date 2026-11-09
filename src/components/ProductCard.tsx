import React from 'react';
import {
  ArrowDown,
  Eye,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react';
import { Category, Product, StoreSettings } from '../types/commerce';
import {
  formatCurrency,
  getDiscountPercentage,
  getEffectivePrice,
  getPricePerLiterLabel,
  isProductPriceVisible,
} from '../utils/commerce';
import { ProductImageWithFallback } from './CategoryIcon';

interface ProductCardProps {
  product: Product;
  category?: Category;
  settings?: StoreSettings;
  quantityInCart: number;
  isFavorite?: boolean;
  customerCep?: string;
  onAdd: (product: Product) => void;
  onUpdateQuantity: (productId: string, newQty: number) => void;
  onOpenDetail: (product: Product) => void;
  onToggleFavorite?: (productId: string) => void;
}

function getDeterministicReviewCount(id: string): number {
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i);
  }
  return 24 + (sum % 65);
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  category,
  settings,
  quantityInCart,
  isFavorite = false,
  customerCep,
  onAdd,
  onUpdateQuantity,
  onOpenDetail,
  onToggleFavorite,
}) => {
  const priceVisible = isProductPriceVisible(product, settings);
  const effectivePrice = getEffectivePrice(product);
  const discountPct = getDiscountPercentage(product);
  const pricePerLiter = getPricePerLiterLabel(product);
  const isOutOfStock = product.status === 'out_of_stock';
  const installmentValue = effectivePrice / 3;
  const wholesaleUnitPrice = +(effectivePrice * 0.94).toFixed(2);
  const reviewCount = getDeterministicReviewCount(product.id);

  return (
    <article className="group h-full bg-white rounded-2xl border border-zinc-200/90 hover:border-[#FFBE00] overflow-hidden flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <div>
        {/* Product Image Container (Todimo + Drogasil + Mercado Livre style) */}
        <div className="relative aspect-square bg-white p-2 sm:p-3 overflow-hidden border-b border-zinc-100">
          <button
            type="button"
            onClick={() => onOpenDetail(product)}
            aria-label={`Ver detalhes de ${product.title}`}
            className="w-full h-full block text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FFBE00] rounded-xl overflow-hidden bg-[#F8F9FA]"
          >
            <ProductImageWithFallback
              src={product.imageUrl}
              alt={product.title}
              volumeLabel={product.volumeLabel}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-103"
            />
          </button>

          {/* Top-Left Circular Yellow Discount Badge (Todimo style: "22% OFF") */}
          {priceVisible && discountPct > 0 && !isOutOfStock && (
            <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#E5B800] text-zinc-950 font-mono font-extrabold text-[10px] sm:text-[11px] leading-none flex flex-col items-center justify-center shadow-xs border border-white">
              <span>{discountPct}%</span>
              <span className="text-[8px] font-black tracking-tight mt-0.5">OFF</span>
            </div>
          )}

          {/* Top-Right Drogasil Green Discount Pill or Favorite Heart */}
          <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 flex flex-col items-end gap-1">
            {priceVisible && discountPct > 0 && !isOutOfStock && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#15803D] text-white font-mono text-[9px] sm:text-[10px] font-extrabold shadow-2xs">
                <ArrowDown className="w-2.5 h-2.5 stroke-[3]" />
                <span>{discountPct}%</span>
              </span>
            )}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(product.id);
                }}
                aria-label={
                  isFavorite
                    ? `Remover ${product.title} dos favoritos`
                    : `Salvar ${product.title} nos favoritos`
                }
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-colors shadow-2xs cursor-pointer ${
                  isFavorite
                    ? 'bg-rose-50 border-[#E3262E] text-[#E3262E]'
                    : 'bg-white/95 hover:bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-[#E3262E]'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorite ? 'fill-[#E3262E]' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenDetail(product)}
              aria-label={`Inspecionar ${product.title}`}
              className="hidden sm:flex w-7 h-7 rounded-full bg-white/95 hover:bg-[#FFBE00] text-zinc-600 hover:text-zinc-950 border border-zinc-200 items-center justify-center transition-colors shadow-2xs cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bottom-Left Volume Pill */}
          <div className="absolute bottom-2 sm:bottom-2.5 left-2 sm:left-2.5 max-w-[68%]">
            <span className="block truncate px-2 py-0.5 rounded-full bg-white/95 border border-zinc-300 text-[9px] sm:text-[10px] font-mono font-bold text-zinc-700 shadow-2xs whitespace-nowrap">
              {product.volumeLabel}
            </span>
          </div>

          {/* Bottom-Right Drogasil Floating Circular Red "+" Quick-Add Button */}
          {!isOutOfStock && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdd(product);
              }}
              aria-label={`Adição rápida de ${product.title}`}
              title="Adicionar rápido à cesta"
              className={`absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-90 cursor-pointer ${
                quantityInCart > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-white'
                  : 'bg-[#C81E25] hover:bg-[#A6141B] text-white'
              }`}
            >
              {quantityInCart > 0 ? (
                <span className="font-mono text-xs font-extrabold">{quantityInCart}</span>
              ) : (
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.6]" />
              )}
            </button>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-2xs flex items-center justify-center p-2 text-center">
              <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-zinc-800 font-bold border border-zinc-300 bg-white px-2.5 py-1.5 rounded-lg">
                Esgotado
              </span>
            </div>
          )}
        </div>

        {/* Promotional Highlight Badges, Title & Star Rating (Todimo + Drogasil + Mercado Livre Hybrid) */}
        <div className="p-2.5 sm:p-3 pb-1.5 space-y-1.5">
          {/* Single Clean Highlight Tag (Mercado Livre "MAIS VENDIDO" / Todimo "Preço Exclusivo Site") */}
          <div>
            {discountPct > 0 ? (
              <div className="inline-block max-w-full py-0.5 px-2 rounded bg-[#E5B800] text-zinc-950 text-[9px] sm:text-[10px] font-extrabold truncate">
                {product.badgeLabel || 'Preço Exclusivo Site | Limper MT'}
              </div>
            ) : (
              <div className="inline-block max-w-full py-0.5 px-2 rounded bg-[#FF6B00] text-white text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight truncate">
                {product.subBadgeLabel || `MAIS VENDIDO · ${category?.shortName || 'Quimiprol'}`}
              </div>
            )}
          </div>

          {/* Product Title + SKU Reference */}
          <h3 className="font-sans text-[11px] sm:text-[13px] font-semibold text-zinc-800 leading-snug line-clamp-2 min-h-[2rem] sm:min-h-[2.25rem]">
            <button
              type="button"
              onClick={() => onOpenDetail(product)}
              className="text-left hover:text-[#E3262E] transition-colors cursor-pointer"
            >
              {product.title}{' '}
              <span className="text-zinc-400 font-normal hidden sm:inline">
                — Ref. {product.sku}
              </span>
            </button>
          </h3>

          {/* Drogasil Star Rating Row */}
          <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-500">
            <div className="flex items-center gap-0.5 text-[#F59E0B]">
              <Star className="w-3 h-3 fill-[#F59E0B]" />
              <Star className="w-3 h-3 fill-[#F59E0B]" />
              <Star className="w-3 h-3 fill-[#F59E0B]" />
              <Star className="w-3 h-3 fill-[#F59E0B]" />
              <Star className="w-3 h-3 fill-[#F59E0B]" />
              <span className="font-mono font-bold text-zinc-500 ml-0.5">
                ({reviewCount})
              </span>
            </div>
            {pricePerLiter && (
              <span className="font-mono text-[9px] font-bold text-[#B45309] truncate">
                {pricePerLiter}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pricing, Mercado Livre Wholesale Tier ("Levando 3 ou mais"), Fast Pickup & Add Button */}
      <div className="p-2.5 sm:p-3 pt-1 flex flex-col justify-end gap-1.5">
        {priceVisible ? (
          <div className="space-y-1">
            {discountPct > 0 ? (
              <div className="text-[10px] sm:text-[11px] font-mono text-zinc-400 line-through tabular-nums leading-none">
                {formatCurrency(product.price)}
              </div>
            ) : (
              <div className="text-[10px] text-zinc-400 leading-none truncate">
                Direto da fábrica Quimiprol
              </div>
            )}

            {/* Main Price + Mercado Livre Green PIX Tag */}
            <div className="flex flex-wrap items-baseline gap-1.5">
              <div className="text-base sm:text-xl font-mono font-extrabold text-zinc-950 tabular-nums leading-none">
                {formatCurrency(effectivePrice)}
              </div>
              {discountPct > 0 ? (
                <span className="px-1.5 py-0.5 rounded bg-[#00A650] text-white font-mono text-[9px] sm:text-[10px] font-extrabold leading-none">
                  {discountPct}% OFF
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#00A650] leading-none">
                  no PIX
                </span>
              )}
            </div>

            <div className="text-[10px] sm:text-[11px] text-zinc-500 leading-tight truncate">
              ou <strong className="text-zinc-700">3x {formatCurrency(installmentValue)}</strong> s/ juros
            </div>

            {/* Mercado Livre B2B Wholesale Tier Pill ("R$ XX,XX levando 3 ou mais") */}
            {!isOutOfStock && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuantity(product.id, Math.max(3, quantityInCart + 3));
                }}
                title="Clique para adicionar 3 unidades no pacote atacado"
                className="w-full text-left px-2 py-1 rounded-md bg-[#EBF3FF] hover:bg-[#DBEAFE] text-[#1D4ED8] font-mono text-[9px] sm:text-[10px] font-extrabold truncate transition-colors cursor-pointer"
              >
                {formatCurrency(wholesaleUnitPrice)} un. levando 3 ou +
              </button>
            )}

            {/* Mercado Livre FULL-style Green Fast Pickup / Delivery Line */}
            <div className="flex items-center gap-1 text-[10px] font-extrabold text-[#00A650] pt-0.5 truncate">
              <Zap className="w-3 h-3 fill-[#00A650] shrink-0" />
              <span className="truncate">
                {customerCep ? 'Retirada Grátis 15min' : 'Retirada Grátis ⚡ 15 MIN'}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-1">
            <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#E3262E] font-bold truncate">
              Atacado & Varejo
            </div>
            <div className="text-xs sm:text-sm font-display font-extrabold text-zinc-900">
              Sob consulta
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
              Cotação no WhatsApp
            </div>
          </div>
        )}

        {isOutOfStock ? (
          <button
            type="button"
            disabled
            className="w-full py-2 bg-zinc-100 text-zinc-400 text-[11px] sm:text-xs font-semibold rounded-xl cursor-not-allowed"
          >
            Indisponível
          </button>
        ) : quantityInCart > 0 ? (
          <div className="flex items-center justify-between bg-[#FFFBEB] border-2 border-[#FFBE00] text-zinc-950 rounded-xl p-1">
            <button
              type="button"
              onClick={() => onUpdateQuantity(product.id, quantityInCart - 1)}
              aria-label={`Diminuir quantidade de ${product.title}`}
              className="w-7 h-7 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] sm:text-xs font-extrabold px-1 tabular-nums">
              {quantityInCart} <span className="hidden sm:inline">na cesta</span>
            </span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(product.id, quantityInCart + 1)}
              aria-label={`Aumentar quantidade de ${product.title}`}
              className="w-7 h-7 rounded-lg bg-[#FFBE00] text-zinc-950 hover:bg-[#F59E0B] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onAdd(product)}
            aria-label={`Adicionar ${product.title} ao carrinho`}
            className="w-full py-2 px-2 sm:px-3 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-[11px] sm:text-xs rounded-xl flex items-center justify-center gap-1.5 transition-transform active:scale-98 cursor-pointer shadow-2xs"
          >
            <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
            <span className="sm:hidden">{priceVisible ? 'Adicionar' : 'Cotar'}</span>
            <span className="hidden sm:inline">
              {priceVisible ? 'Adicionar à Cesta' : 'Cotar no Pedido'}
            </span>
          </button>
        )}
      </div>
    </article>
  );
};

interface ProductDetailModalProps {
  product: Product | null;
  category?: Category;
  settings?: StoreSettings;
  quantityInCart: number;
  onClose: () => void;
  onAdd: (product: Product) => void;
  onUpdateQuantity: (productId: string, newQty: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  category,
  settings,
  quantityInCart,
  onClose,
  onAdd,
  onUpdateQuantity,
}) => {
  if (!product) return null;

  const priceVisible = isProductPriceVisible(product, settings);
  const effectivePrice = getEffectivePrice(product);
  const discountPct = getDiscountPercentage(product);
  const pricePerLiter = getPricePerLiterLabel(product);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
      className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden border border-zinc-200 shadow-2xl grid grid-cols-1 md:grid-cols-2">
        <div className="relative aspect-4/3 md:aspect-auto bg-[#F8F9FA] min-h-[240px]">
          <ProductImageWithFallback
            src={product.imageUrl}
            alt={product.title}
            volumeLabel={product.volumeLabel}
            className="w-full h-full object-cover"
          />
          {priceVisible && discountPct > 0 && (
            <div className="absolute top-3 left-3 w-12 h-12 rounded-full bg-[#E5B800] text-zinc-950 font-mono font-extrabold text-xs leading-tight flex flex-col items-center justify-center shadow-xs">
              <span>{discountPct}%</span>
              <span className="text-[9px] font-black">OFF</span>
            </div>
          )}
        </div>

        <div className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-xs text-zinc-500 font-medium">
                <span className="text-[#E3262E] font-bold">{category?.name || 'Linha Quimiprol'}</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono">{product.sku}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar detalhes do produto"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2
              id="modal-product-title"
              className="font-display text-xl font-extrabold text-zinc-900 mb-3"
            >
              {product.title}
            </h2>

            <p className="text-sm text-zinc-600 leading-relaxed mb-4">
              {product.description}
            </p>

            <div className="py-3 border-y border-zinc-200 text-xs text-zinc-600 space-y-1.5 mb-5">
              <div>
                <span className="font-bold text-zinc-900">Embalagem Comercial:</span>{' '}
                <span className="font-mono font-semibold">{product.volumeLabel}</span> ({product.unit})
              </div>
              {pricePerLiter && (
                <div>
                  <span className="font-bold text-zinc-900">Custo por Litro:</span>{' '}
                  <span className="font-mono font-bold text-[#B45309]">{pricePerLiter}</span> (Alta Economia)
                </div>
              )}
              {product.dilutionHint && (
                <div>
                  <span className="font-bold text-zinc-900">Indicação & Rendimento:</span>{' '}
                  {product.dilutionHint}
                </div>
              )}
              <div>
                <span className="font-bold text-zinc-900">Retirada & Delivery:</span>{' '}
                Pronto em 15 min na Av. Couto Magalhães, 2820 - Várzea Grande
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              {priceVisible ? (
                <>
                  {discountPct > 0 && (
                    <div className="text-xs font-mono text-zinc-400 line-through tabular-nums">
                      De {formatCurrency(product.price)}
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-mono font-extrabold text-zinc-900 tabular-nums">
                      {formatCurrency(effectivePrice)}
                    </div>
                    {pricePerLiter && (
                      <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] font-mono text-xs font-bold">
                        {pricePerLiter}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <div className="text-xs font-mono font-bold text-[#E3262E] uppercase">
                    Cotação Direta no Pedido
                  </div>
                  <div className="text-xl font-display font-extrabold text-zinc-900">
                    Valor sob consulta no WhatsApp
                  </div>
                </div>
              )}
            </div>

            {quantityInCart > 0 ? (
              <div className="flex items-center justify-between bg-[#FFFBEB] border border-[#FFBE00] text-zinc-950 rounded-xl p-2">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(product.id, quantityInCart - 1)}
                  className="px-3 py-2 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono text-sm font-extrabold tabular-nums">
                  {quantityInCart} no pedido
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(product.id, quantityInCart + 1)}
                  className="px-3 py-2 rounded-lg bg-[#FFBE00] text-zinc-950 hover:bg-[#F59E0B] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onAdd(product);
                    onClose();
                  }}
                  className="py-3 px-3 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{priceVisible ? 'Adicionar 1 un.' : 'Incluir no Pedido'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateQuantity(product.id, 3);
                    onClose();
                  }}
                  className="py-3 px-3 bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#FFBE00] text-zinc-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#E3262E]" />
                  <span>Lote Atacado (3 un.)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
