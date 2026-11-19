import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Command,
  DatabaseBackup,
  Gift,
  Megaphone,
  Package,
  Plus,
  Search,
  ShoppingBag,
  TicketPercent,
  Users,
  X,
} from 'lucide-react';
import {
  AdminAppTab,
  AdminUser,
  Order,
  Product,
} from '../types/commerce';
import {
  ADMIN_TAB_CATALOG,
  canAdminUserAccessTab,
  formatCurrency,
} from '../utils/commerce';

export interface CommandPaletteAction {
  id: string;
  group: 'Ações Rápidas' | 'Módulos do Painel' | 'Produtos (Catálogo)' | 'Pedidos Recentes';
  title: string;
  subtitle?: string;
  badge?: string;
  keywords: string;
  onRun: () => void;
}

interface AdminCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AdminUser | null;
  products: Product[];
  orders: Order[];
  onNavigateTab: (tab: AdminAppTab) => void;
  onQuickCreateProduct: () => void;
  onQuickCreateKit: () => void;
  onQuickCreateBanner: () => void;
  onQuickCreateCoupon: () => void;
  onEditProduct: (product: Product) => void;
  onOpenOrderInKanban: (orderId: string) => void;
  onOpenBackupVault: () => void;
}

export const AdminCommandPalette: React.FC<AdminCommandPaletteProps> = ({
  isOpen,
  onClose,
  currentUser,
  products,
  orders,
  onNavigateTab,
  onQuickCreateProduct,
  onQuickCreateKit,
  onQuickCreateBanner,
  onQuickCreateCoupon,
  onEditProduct,
  onOpenOrderInKanban,
  onOpenBackupVault,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  const actions = useMemo<CommandPaletteAction[]>(() => {
    const list: CommandPaletteAction[] = [];
    const can = (tab: AdminAppTab) => canAdminUserAccessTab(currentUser, tab);

    // 1. Quick Creation & Utility Actions (RBAC-filtered)
    if (can('products')) {
      list.push({
        id: 'quick-new-product',
        group: 'Ações Rápidas',
        title: 'Cadastrar Novo Produto',
        subtitle: 'Abrir editor completo de produto, fotos, selos e preços',
        badge: 'Cadastro',
        keywords: 'novo produto cadastrar criar sku item catalogo',
        onRun: () => {
          onQuickCreateProduct();
          onClose();
        },
      });
    }
    if (can('kits')) {
      list.push({
        id: 'quick-new-kit',
        group: 'Ações Rápidas',
        title: 'Cadastrar Novo Kit / Combo',
        subtitle: 'Montar combo promocional para a vitrine',
        badge: 'Cadastro',
        keywords: 'novo kit combo promocao cadastrar',
        onRun: () => {
          onQuickCreateKit();
          onClose();
        },
      });
    }
    if (can('banners')) {
      list.push({
        id: 'quick-new-banner',
        group: 'Ações Rápidas',
        title: 'Criar Novo Banner Promocional',
        subtitle: 'Adicionar campanha ao carrossel ou destaque da Home',
        badge: 'Campanha',
        keywords: 'novo banner campanha carrossel vitrine',
        onRun: () => {
          onQuickCreateBanner();
          onClose();
        },
      });
    }
    if (can('coupons')) {
      list.push({
        id: 'quick-new-coupon',
        group: 'Ações Rápidas',
        title: 'Cadastrar Novo Cupom de Desconto',
        subtitle: 'Criar código promocional (% ou R$ OFF)',
        badge: 'Cupom',
        keywords: 'novo cupom desconto codigo promocional',
        onRun: () => {
          onQuickCreateCoupon();
          onClose();
        },
      });
    }
    if (currentUser?.role === 'master' && can('security')) {
      list.push({
        id: 'quick-backup-vault',
        group: 'Ações Rápidas',
        title: 'Abrir Central de Backups do Site',
        subtitle: 'Gerar snapshot por data, baixar JSON ou restaurar o site',
        badge: 'Master',
        keywords: 'backup restaurar snapshot cofre seguranca json data',
        onRun: () => {
          onOpenBackupVault();
          onClose();
        },
      });
    }

    // 2. Allowed Navigation Tabs
    for (const tab of ADMIN_TAB_CATALOG) {
      if (!can(tab.id)) continue;
      list.push({
        id: `nav-${tab.id}`,
        group: 'Módulos do Painel',
        title: tab.label,
        subtitle: tab.description,
        badge: tab.group,
        keywords: `${tab.label} ${tab.shortLabel} ${tab.description} ${tab.group}`.toLowerCase(),
        onRun: () => {
          onNavigateTab(tab.id);
          onClose();
        },
      });
    }

    // 3. Catalog Products (top matches)
    if (can('products')) {
      for (const p of products) {
        list.push({
          id: `prod-${p.id}`,
          group: 'Produtos (Catálogo)',
          title: p.title,
          subtitle: `SKU ${p.sku} · ${p.volumeLabel} · ${formatCurrency(p.promoPrice ?? p.price)}`,
          badge: p.status === 'active' ? 'Ativo' : p.status === 'out_of_stock' ? 'Em Falta' : 'Inativo',
          keywords: `${p.title} ${p.sku} ${p.volumeLabel} produto editar`.toLowerCase(),
          onRun: () => {
            onEditProduct(p);
            onClose();
          },
        });
      }
    }

    // 4. Recent Orders (top matches)
    if (can('kanban')) {
      for (const o of orders.slice(0, 30)) {
        list.push({
          id: `ord-${o.id}`,
          group: 'Pedidos Recentes',
          title: `${o.id} · ${o.customerName}`,
          subtitle: `${o.items.length} item(ns) · ${formatCurrency(o.total)} · ${
            o.deliveryType === 'pickup' ? 'Balcão VG' : 'Delivery'
          }`,
          badge: 'Kanban',
          keywords: `${o.id} ${o.customerName} ${o.customerPhone} pedido kanban`.toLowerCase(),
          onRun: () => {
            onOpenOrderInKanban(o.id);
            onClose();
          },
        });
      }
    }

    return list;
  }, [
    currentUser,
    products,
    orders,
    onNavigateTab,
    onQuickCreateProduct,
    onQuickCreateKit,
    onQuickCreateBanner,
    onQuickCreateCoupon,
    onEditProduct,
    onOpenOrderInKanban,
    onOpenBackupVault,
    onClose,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show quick actions + modules + top 4 products + top 3 orders
      const quickAndNav = actions.filter(
        (a) => a.group === 'Ações Rápidas' || a.group === 'Módulos do Painel'
      );
      const topProds = actions
        .filter((a) => a.group === 'Produtos (Catálogo)')
        .slice(0, 3);
      const topOrders = actions
        .filter((a) => a.group === 'Pedidos Recentes')
        .slice(0, 3);
      return [...quickAndNav, ...topProds, ...topOrders];
    }
    return actions
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.subtitle || '').toLowerCase().includes(q) ||
          a.keywords.includes(q)
      )
      .slice(0, 16);
  }, [actions, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filtered.length > 0 ? (prev + 1) % filtered.length : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
        );
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].onRun();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  const grouped = (
    [
      'Ações Rápidas',
      'Módulos do Painel',
      'Produtos (Catálogo)',
      'Pedidos Recentes',
    ] as const
  )
    .map((groupName) => ({
      groupName,
      items: filtered
        .map((item, globalIdx) => ({ item, globalIdx }))
        .filter((entry) => entry.item.group === groupName),
    }))
    .filter((g) => g.items.length > 0);

  const getGroupIcon = (id: string, group: CommandPaletteAction['group']) => {
    if (id === 'quick-backup-vault') return <DatabaseBackup className="w-4 h-4" />;
    if (id === 'quick-new-kit') return <Gift className="w-4 h-4" />;
    if (id === 'quick-new-banner') return <Megaphone className="w-4 h-4" />;
    if (id === 'quick-new-coupon') return <TicketPercent className="w-4 h-4" />;
    if (id === 'nav-users') return <Users className="w-4 h-4" />;
    if (group === 'Ações Rápidas') return <Plus className="w-4 h-4" />;
    if (group === 'Produtos (Catálogo)') return <Package className="w-4 h-4" />;
    if (group === 'Pedidos Recentes') return <ShoppingBag className="w-4 h-4" />;
    return <ArrowRight className="w-4 h-4" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/55 backdrop-blur-[2px] flex items-start justify-center p-4 sm:pt-16"
      role="dialog"
      aria-modal="true"
      aria-label="Busca rápida e comandos do Gestor Limper MT"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="px-4 py-3.5 border-b border-zinc-200 flex items-center gap-3">
          <Search className="w-4 h-4 text-[#E3262E] shrink-0" />
          <input
            ref={inputRef}
            id="admin-command-palette-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto, SKU, pedido #LMP, ação rápida ou módulo..."
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] font-bold text-zinc-500">
            ESC
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca rápida"
            className="w-7 h-7 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto p-3 space-y-4">
          {grouped.length === 0 ? (
            <div className="py-10 text-center space-y-1.5">
              <Command className="w-7 h-7 text-zinc-300 mx-auto" />
              <div className="font-display text-sm font-extrabold text-zinc-900">
                Nenhum comando ou registro encontrado
              </div>
              <p className="text-xs text-zinc-500">
                Tente buscar por nome de produto, SKU (ex: QMP-101), pedido (#LMP) ou módulo.
              </p>
            </div>
          ) : (
            grouped.map(({ groupName, items }) => (
              <div key={groupName} className="space-y-1">
                <div className="px-2.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  {groupName}
                </div>
                <div className="space-y-0.5">
                  {items.map(({ item, globalIdx }) => {
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        onClick={item.onRun}
                        className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-950 text-white'
                            : 'text-zinc-800 hover:bg-zinc-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#FFBE00] text-zinc-950'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {getGroupIcon(item.id, item.group)}
                          </span>
                          <div className="min-w-0">
                            <div
                              className={`text-xs sm:text-sm font-extrabold truncate ${
                                isSelected ? 'text-white' : 'text-zinc-900'
                              }`}
                            >
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div
                                className={`text-[11px] truncate ${
                                  isSelected ? 'text-zinc-300' : 'text-zinc-500'
                                }`}
                              >
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ${
                              isSelected
                                ? 'bg-zinc-800 text-[#FFBE00]'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 bg-[#FAFAFA] border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navegar</span>
            <span>↵ Executar</span>
            <span>ESC Fechar</span>
          </div>
          <span className="font-mono text-zinc-400">
            Respeita seu nível de permissão
          </span>
        </div>
      </div>
    </div>
  );
};
