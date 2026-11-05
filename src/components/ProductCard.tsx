import React from 'react';
import { ArrowDown, Eye, Heart, Minus, Plus, ShoppingCart, Sparkles, X } from 'lucide-react';
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

  return (
    <article className="group bg-white rounded-2xl border border-zinc-200/90 hover:border-[#FFBE00] overflow-hidden flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <div>
        {/* Product Image Container (Todimo + Drogasil style) */}
        <div className="relative aspect-square bg-white p-3 overflow-hidden border-b border-zinc-100">
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
            <div className="absolute top-3 left-3 w-11 h-11 rounded-full bg-[#E5B800] text-zinc-950 font-mono font-extrabold text-[11px] leading-none flex flex-col items-center justify-center shadow-xs border border-white">
              <span>{discountPct}%</span>
              <span className="text-[9px] font-black tracking-tight mt-0.5">OFF</span>
            </div>
          )}

          {/* Top-Right Favorite Heart & Quick-View Buttons */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
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
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors shadow-2xs cursor-pointer ${
                  isFavorite
                    ? 'bg-rose-50 border-[#E3262E] text-[#E3262E]'
                    : 'bg-white/95 hover:bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-[#E3262E]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#E3262E]' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenDetail(product)}
              aria-label={`Inspecionar ${product.title}`}
              className="w-8 h-8 rounded-full bg-white/95 hover:bg-[#FFBE00] text-zinc-600 hover:text-zinc-950 border border-zinc-200 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Volume / Options Pill at bottom of image (Drogasil "2 opções" style) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/95 border border-zinc-300 text-[10px] font-mono font-bold text-zinc-700 shadow-2xs whitespace-nowrap">
              {product.volumeLabel.includes('|') ? '2 opções · ' : 'Emb. '}
              {product.volumeLabel}
            </span>
          </div>

          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-2xs flex items-center justify-center">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-800 font-bold border border-zinc-300 bg-white px-3 py-1.5 rounded-lg">
                Esgotado Temporariamente
              </span>
            </div>
          )}
        </div>

        {/* Promotional Highlight Badges & Title (Todimo + Drogasil Hybrid) */}
        <div className="p-3.5 pb-2 space-y-2">
          {/* Badges Stack */}
          <div className="space-y-1">
            {discountPct > 0 ? (
              <>
                <div className="inline-block px-2 py-0.5 rounded-md bg-[#2B2E34] text-white text-[10px] font-extrabold tracking-tight">
                  Oferta do Dia
                </div>
                <div className="w-full py-1 px-2 rounded-md bg-[#E5B800] text-zinc-950 text-[10px] font-extrabold text-center truncate">
                  {product.badgeLabel || 'Ofertas do Mês | Limper MT'}
                </div>
              </>
            ) : (
              <div className="w-full py-1 px-2 rounded-md bg-[#FFF3C4] border border-[#FDE68A] text-zinc-900 text-[10px] font-extrabold text-center truncate">
                {product.subBadgeLabel || `Preço Exclusivo Site | ${category?.shortName || 'Quimiprol'}`}
              </div>
            )}
          </div>

          {/* Product Title + SKU Reference (Todimo style) */}
          <h3 className="font-sans text-xs sm:text-[13px] font-semibold text-zinc-800 leading-snug line-clamp-2 min-h-[2.3rem]">
            <button
              type="button"
              onClick={() => onOpenDetail(product)}
              className="text-left hover:text-[#E3262E] transition-colors cursor-pointer"
            >
              {product.title}{' '}
              <span className="text-zinc-400 font-normal">— Ref. {product.sku}</span>
            </button>
          </h3>

          {product.dilutionHint && (
            <p className="text-[11px] text-zinc-500 truncate">
              Rendimento: <span className="font-semibold text-zinc-700">{product.dilutionHint}</span>
            </p>
          )}
        </div>
      </div>

      {/* Pricing, Installments, CEP Notice & Add Button */}
      <div className="p-3.5 pt-1 flex flex-col justify-end gap-2.5">
        {priceVisible ? (
          <div>
            {discountPct > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-zinc-400 line-through tabular-nums">
                  {formatCurrency(product.price)}
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-extrabold">
                  <ArrowDown className="w-2.5 h-2.5 stroke-[3]" />
                  {discountPct}%
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-zinc-400">Preço exclusivo online</div>
            )}

            <div className="flex items-baseline justify-between gap-1 mt-0.5">
              <div className="text-lg sm:text-xl font-mono font-extrabold text-zinc-950 tabular-nums leading-tight">
                {formatCurrency(effectivePrice)}
              </div>
              {pricePerLiter && (
                <span className="px-1.5 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] font-mono text-[10px] font-bold shrink-0">
                  {pricePerLiter}
                </span>
              )}
            </div>

            <div className="text-[11px] text-zinc-500 mt-0.5">
              ou <strong className="text-zinc-700">3x de {formatCurrency(installmentValue)}</strong> sem juros
            </div>

            <div className="text-[10px] text-zinc-400 mt-1 truncate">
              {customerCep
                ? `Disponível p/ CEP ${customerCep} (15min)`
                : 'Retirada 15min Av. Couto Magalhães'}
            </div>
          </div>
        ) : (
          <div className="py-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#E3262E] font-bold">
              Atacado & Varejo Quimiprol
            </div>
            <div className="text-sm font-display font-extrabold text-zinc-900">
              Valor sob consulta
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              Cotação imediata via WhatsApp
            </div>
          </div>
        )}

        {isOutOfStock ? (
          <button
            type="button"
            disabled
            className="w-full py-2 bg-zinc-100 text-zinc-400 text-xs font-semibold rounded-xl cursor-not-allowed"
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
            <span className="font-mono text-xs font-extrabold px-1.5 tabular-nums">
              {quantityInCart} na cesta
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
            className="w-full py-2.5 px-3 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-transform active:scale-98 cursor-pointer shadow-2xs"
          >
            <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>{priceVisible ? 'Adicionar à Cesta' : 'Cotar no Pedido'}</span>
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
