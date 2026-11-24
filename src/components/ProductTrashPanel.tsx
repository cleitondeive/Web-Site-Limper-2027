import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArchiveRestore,
  Clock,
  RotateCcw,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { Category, DeletedProductEntry, Product } from '../types/commerce';
import { formatCurrency } from '../utils/commerce';
import { ProductImageWithFallback } from './CategoryIcon';

interface ProductDeleteConfirmModalProps {
  productsToDelete: Product[];
  categories: Category[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const ProductDeleteConfirmModal: React.FC<ProductDeleteConfirmModalProps> = ({
  productsToDelete,
  categories,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (productsToDelete.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [productsToDelete.length, onCancel]);

  if (productsToDelete.length === 0) return null;

  const isSingle = productsToDelete.length === 1;
  const singleProduct = productsToDelete[0];
  const singleCategory = categories.find((c) => c.id === singleProduct.categoryId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-delete-confirm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-zinc-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-[#E3262E] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[#E3262E] block">
                CONFIRMAÇÃO DE EXCLUSÃO
              </span>
              <h3
                id="product-delete-confirm-title"
                className="font-display text-base font-extrabold text-zinc-900 leading-snug mt-0.5"
              >
                {isSingle
                  ? 'Deseja realmente excluir este produto?'
                  : `Deseja realmente excluir ${productsToDelete.length} produtos selecionados?`}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar confirmação de exclusão"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {isSingle ? (
            <div className="p-3 rounded-xl bg-[#FAFAFA] border border-zinc-200 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-zinc-200 shrink-0">
                <ProductImageWithFallback
                  src={singleProduct.imageUrl}
                  alt={singleProduct.title}
                  volumeLabel={singleProduct.volumeLabel}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-zinc-900 truncate">
                  {singleProduct.title}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] font-mono text-zinc-500">
                  <span className="font-bold text-zinc-700">{singleProduct.sku}</span>
                  <span>·</span>
                  <span>{singleProduct.volumeLabel}</span>
                  {singleCategory && (
                    <>
                      <span>·</span>
                      <span>{singleCategory.shortName}</span>
                    </>
                  )}
                  <span>·</span>
                  <span className="font-bold text-zinc-800">
                    {formatCurrency(singleProduct.promoPrice ?? singleProduct.price)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto rounded-xl bg-[#FAFAFA] border border-zinc-200 divide-y divide-zinc-100">
              {productsToDelete.slice(0, 8).map((prod) => (
                <div
                  key={prod.id}
                  className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-bold text-zinc-900 truncate">{prod.title}</span>
                  <span className="font-mono text-[11px] text-zinc-500 shrink-0">
                    {prod.sku}
                  </span>
                </div>
              ))}
              {productsToDelete.length > 8 && (
                <div className="px-3 py-2 text-[11px] font-mono text-zinc-500 text-center">
                  + {productsToDelete.length - 8} outro(s) produto(s)
                </div>
              )}
            </div>
          )}

          <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-zinc-700 leading-relaxed flex items-start gap-2.5">
            <ArchiveRestore className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
            <span>
              {isSingle ? 'Este produto será retirado' : 'Estes produtos serão retirados'} da vitrine e{' '}
              <strong className="text-zinc-950">
                enviado{isSingle ? '' : 's'} para a área de Produtos Excluídos
              </strong>
              , onde você poderá resgatar novamente quando quiser ou excluir definitivamente.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 bg-[#FAFAFA] border-t border-zinc-200 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 text-xs font-extrabold cursor-pointer transition-colors"
          >
            Cancelar Exclusão
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl bg-[#E3262E] hover:bg-rose-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              {isSingle
                ? 'Sim, Excluir Produto'
                : `Sim, Excluir (${productsToDelete.length}) Produtos`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ProductTrashPanelProps {
  deletedProducts: DeletedProductEntry[];
  categories: Category[];
  onRestoreProduct: (productId: string) => void;
  onRestoreAllProducts: () => void;
  onPermanentDeleteProduct: (productId: string) => void;
  onEmptyTrash: () => void;
  onBackToCatalog: () => void;
}

function formatDeletedTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Agora';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} · ${hours}:${mins}`;
}

export const ProductTrashPanel: React.FC<ProductTrashPanelProps> = ({
  deletedProducts,
  categories,
  onRestoreProduct,
  onRestoreAllProducts,
  onPermanentDeleteProduct,
  onEmptyTrash,
  onBackToCatalog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmEmptyAll, setConfirmEmptyAll] = useState(false);

  const q = searchQuery.trim().toLowerCase();
  const filteredEntries = deletedProducts.filter((entry) => {
    if (!q) return true;
    return (
      entry.product.title.toLowerCase().includes(q) ||
      entry.product.sku.toLowerCase().includes(q) ||
      entry.deletedBy.toLowerCase().includes(q)
    );
  });

  return (
    <div
      id="admin-deleted-products-panel"
      className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs"
    >
      {/* Panel Header */}
      <div className="p-5 border-b border-zinc-200 bg-[#FAFAFA] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-extrabold uppercase tracking-wider text-[#E3262E]">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Lixeira do Catálogo · Recuperação Segura</span>
            </span>
          </div>
          <h3 className="font-display text-base sm:text-lg font-extrabold text-zinc-900 mt-0.5">
            Produtos Excluídos ({deletedProducts.length})
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Resgate qualquer item de volta para o catálogo ativo em 1 clique ou exclua definitivamente para limpar esta área.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {deletedProducts.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setConfirmEmptyAll(false);
                  onRestoreAllProducts();
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resgatar Todos ({deletedProducts.length})</span>
              </button>

              {!confirmEmptyAll ? (
                <button
                  type="button"
                  onClick={() => setConfirmEmptyAll(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#E3262E] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Área de Exclusão</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-rose-50 border border-rose-300">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmEmptyAll(false);
                      onEmptyTrash();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#E3262E] hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer"
                  >
                    Confirmar Limpeza ({deletedProducts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmEmptyAll(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-700 text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Search bar when items exist */}
      {deletedProducts.length > 0 && (
        <div className="p-4 border-b border-zinc-100 bg-white">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar produto excluído por nome, SKU ou operador..."
              className="w-full pl-9 pr-4 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs"
            />
          </div>
        </div>
      )}

      {/* Empty State or Deleted Items List */}
      {deletedProducts.length === 0 ? (
        <div className="p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
            <ArchiveRestore className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-display text-sm font-extrabold text-zinc-900">
              Nenhum produto excluído no momento
            </h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
              Sempre que você excluir um item do catálogo, ele aparecerá aqui primeiro para que você possa resgatá-lo se mudar de ideia ou apagá-lo definitivamente.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToCatalog}
            className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-xs font-extrabold cursor-pointer"
          >
            Voltar ao Catálogo Ativo
          </button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="p-8 text-center text-xs text-zinc-500">
          Nenhum produto excluído encontrado para &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {filteredEntries.map((entry) => {
            const { product } = entry;
            const cat = categories.find((c) => c.id === product.categoryId);

            return (
              <div
                key={product.id}
                className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-zinc-50/70 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0 opacity-85">
                    <ProductImageWithFallback
                      src={product.imageUrl}
                      alt={product.title}
                      volumeLabel={product.volumeLabel}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-zinc-900">
                        {product.title}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] font-bold text-zinc-600">
                        {product.sku}
                      </span>
                      {cat && (
                        <span className="px-2 py-0.5 rounded bg-[#FFFBEB] border border-[#FDE68A] text-[10px] font-bold text-zinc-700">
                          {cat.shortName}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-zinc-500 font-mono">
                      <span className="font-bold text-zinc-700">
                        {product.volumeLabel} ·{' '}
                        {formatCurrency(product.promoPrice ?? product.price)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>Excluído em {formatDeletedTimestamp(entry.deletedAt)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3 h-3 text-zinc-400" />
                        <span>{entry.deletedBy}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRestoreProduct(product.id)}
                    aria-label={`Resgatar ${product.title}`}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resgatar Produto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPermanentDeleteProduct(product.id)}
                    aria-label={`Excluir definitivamente ${product.title}`}
                    title="Remover definitivamente da lixeira (ação irreversível)"
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-[#E3262E] border border-rose-200 hover:border-[#E3262E] text-[#E3262E] hover:text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Definitivamente</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
