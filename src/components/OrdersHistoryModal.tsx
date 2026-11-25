import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  History,
  KeyRound,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  UserCheck,
  X,
} from 'lucide-react';
import {
  DeliveryType,
  Order,
  OrderDatePreset,
  OrderStatus,
  StoreSettings,
} from '../types/commerce';
import {
  ORDER_STATUS_SEQUENCE,
  buildStoreTelHref,
  buildStoreWhatsAppHref,
  buildWhatsAppOrderUrl,
  filterOrdersByCriteria,
  formatCurrency,
  formatLogisticsModeLabel,
  formatPaymentMethodLabel,
  formatPhone,
  getOrderStageMeta,
  isOrderQuoteOnly,
  normalizePhone,
  summarizeOrdersPeriod,
  toDateKeyYmd,
} from '../utils/commerce';

interface OrdersHistoryViewProps {
  orders: Order[];
  settings: StoreSettings;
  savedCustomerPhone: string;
  isLoggedIn?: boolean;
  verifiedGuestOrderId?: string | null;
  onVerifyGuestOrder?: (orderCode: string, phone: string) => boolean;
  onClearGuestLookup?: () => void;
  onRequestLogin?: () => void;
  onRepeatOrder: (order: Order) => void;
  onBackToStore: () => void;
}

function getTrackingStepsForMode(deliveryType: DeliveryType): {
  status: OrderStatus;
  shortTitle: string;
  subLabel: string;
}[] {
  return ORDER_STATUS_SEQUENCE.map((st) => {
    const meta = getOrderStageMeta(st, deliveryType);
    return {
      status: st,
      shortTitle: meta.stepShortTitle.replace(/^\d+\.\s*/, ''),
      subLabel: meta.stepSubLabel,
    };
  });
}

export const OrdersHistoryView: React.FC<OrdersHistoryViewProps> = ({
  orders,
  settings,
  isLoggedIn = false,
  verifiedGuestOrderId = null,
  onVerifyGuestOrder,
  onClearGuestLookup,
  onRequestLogin,
  onRepeatOrder,
  onBackToStore,
}) => {
  const [lookupQuery, setLookupQuery] = useState('');
  const [guestCodeInput, setGuestCodeInput] = useState('');
  const [guestPhoneInput, setGuestPhoneInput] = useState('');
  const [guestLookupError, setGuestLookupError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<OrderDatePreset>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'completed'
  >('all');
  const [modalityFilter, setModalityFilter] = useState<'all' | DeliveryType>(
    'all'
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    orders[0]?.id || ''
  );
  const [reorderedId, setReorderedId] = useState<string | null>(null);
  const [expandedHistoryOrderId, setExpandedHistoryOrderId] = useState<
    string | null
  >(null);
  const [pickupCheckinState, setPickupCheckinState] = useState<
    Record<string, 'idle' | 'on_the_way' | 'arrived'>
  >({});

  useEffect(() => {
    if (orders.length === 0) {
      setSelectedOrderId('');
      return;
    }
    if (!orders.some((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  const referenceNow = useMemo(() => {
    if (orders.length === 0) return new Date();
    const maxTs = Math.max(
      ...orders.map((o) => {
        const ts = new Date(o.createdAt).getTime();
        return Number.isNaN(ts) ? 0 : ts;
      })
    );
    return maxTs > 0 ? new Date(maxTs) : new Date();
  }, [orders]);

  const distinctOrderDates = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      const ymd = toDateKeyYmd(o.createdAt);
      if (ymd) set.add(ymd);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  const dateFilteredOrders = useMemo(
    () =>
      filterOrdersByCriteria(orders, {
        searchQuery: lookupQuery,
        deliveryType: modalityFilter,
        datePreset,
        startDate: dateFrom,
        endDate: dateTo,
        referenceNow,
      }),
    [orders, lookupQuery, modalityFilter, datePreset, dateFrom, dateTo, referenceNow]
  );

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'active') {
      return dateFilteredOrders.filter((o) => o.status !== 'completed');
    }
    if (statusFilter === 'completed') {
      return dateFilteredOrders.filter((o) => o.status === 'completed');
    }
    return dateFilteredOrders;
  }, [dateFilteredOrders, statusFilter]);

  const periodSummary = useMemo(
    () => summarizeOrdersPeriod(filteredOrders),
    [filteredOrders]
  );

  const activeTrackedOrder =
    filteredOrders.find((o) => o.id === selectedOrderId) || filteredOrders[0];

  const hasActiveFilters =
    Boolean(lookupQuery.trim()) ||
    datePreset !== 'all' ||
    statusFilter !== 'all' ||
    modalityFilter !== 'all';

  const handleRepeat = (order: Order) => {
    setReorderedId(order.id);
    onRepeatOrder(order);
    setTimeout(() => setReorderedId(null), 2000);
  };

  const handleSelectOrderFromList = (orderId: string) => {
    setSelectedOrderId(orderId);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClearAllFilters = () => {
    setLookupQuery('');
    setDatePreset('all');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
    setModalityFilter('all');
  };

  const handleGuestLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestCodeInput.trim()) {
      setGuestLookupError('Informe o número do pedido (ex: LMP-1042 ou 1042).');
      return;
    }
    if (normalizePhone(guestPhoneInput).length < 10) {
      setGuestLookupError('Informe o WhatsApp completo com DDD utilizado no pedido.');
      return;
    }
    const ok = onVerifyGuestOrder
      ? onVerifyGuestOrder(guestCodeInput, guestPhoneInput)
      : false;
    if (!ok) {
      setGuestLookupError(
        'Não localizamos um pedido com este código e WhatsApp. Confira os dados da comanda ou entre na sua conta.'
      );
      return;
    }
    setGuestLookupError(null);
  };

  const cleanPhoneHref = buildStoreTelHref(settings.whatsappNumber);

  // Locked Guest Gate: never reveal store-wide orders when logged out and unverified
  if (orders.length === 0) {
    return (
      <section className="max-w-[640px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <button
          type="button"
          onClick={onBackToStore}
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-[#E3262E] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar à vitrine</span>
        </button>

        {isLoggedIn ? (
          <div className="bg-white rounded-3xl border border-zinc-200 p-8 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-display text-2xl font-extrabold text-zinc-950">
                Você ainda não tem pedidos nesta conta
              </h1>
              <p className="text-sm text-zinc-600 max-w-md mx-auto">
                Quando você enviar sua lista de orçamento ou finalizar um pedido, o rastreio em tempo real aparecerá aqui somente para você.
              </p>
            </div>
            <button
              type="button"
              onClick={onBackToStore}
              className="px-6 py-3 rounded-full bg-[#BA1826] hover:bg-[#9E1420] text-white text-sm font-extrabold cursor-pointer transition-colors"
            >
              Ir para o catálogo
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-[#BA1826] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#BA1826]">
                  <Lock className="w-3 h-3" />
                  <span>Consulta Privada do Cliente</span>
                </span>
                <h1 className="font-display text-2xl font-extrabold text-zinc-950 leading-tight">
                  Consultar apenas o meu pedido
                </h1>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Por privacidade, cada cliente visualiza somente os seus pedidos. Informe o número do pedido e o WhatsApp cadastrado na compra.
                </p>
              </div>
            </div>

            {guestLookupError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
              >
                {guestLookupError}
              </div>
            )}

            <form onSubmit={handleGuestLookupSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="guest-order-code"
                    className="block text-xs font-bold text-zinc-800 mb-1.5"
                  >
                    Nº do Pedido *
                  </label>
                  <input
                    id="guest-order-code"
                    type="text"
                    required
                    value={guestCodeInput}
                    onChange={(e) => setGuestCodeInput(e.target.value)}
                    placeholder="Ex: LMP-1042 ou 1042"
                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm font-mono uppercase focus:bg-white focus:border-zinc-950 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="guest-order-phone"
                    className="block text-xs font-bold text-zinc-800 mb-1.5"
                  >
                    WhatsApp do pedido *
                  </label>
                  <input
                    id="guest-order-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={15}
                    required
                    value={guestPhoneInput}
                    onChange={(e) => setGuestPhoneInput(formatPhone(e.target.value))}
                    placeholder="(65) 99999-9999"
                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm font-mono tabular-nums focus:bg-white focus:border-zinc-950 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[46px] px-6 py-3 rounded-full bg-[#BA1826] hover:bg-[#9E1420] text-white text-sm font-extrabold cursor-pointer transition-colors"
              >
                Consultar meu pedido
              </button>
            </form>

            {onRequestLogin && (
              <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">
                  Prefere acessar toda a sua lista de pedidos?
                </span>
                <button
                  type="button"
                  onClick={onRequestLogin}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-zinc-300 hover:border-zinc-950 text-xs font-bold text-zinc-900 cursor-pointer transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#BA1826]" />
                  <span>Entrar na minha conta</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="max-w-[1220px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Guest Private Verification Banner */}
      {!isLoggedIn && verifiedGuestOrderId && onClearGuestLookup && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Consulta privada ativa · Exibindo somente o pedido{' '}
              <strong className="font-mono">{verifiedGuestOrderId}</strong>{' '}
              verificado para o seu WhatsApp.
            </span>
          </div>
          <button
            type="button"
            onClick={onClearGuestLookup}
            className="font-bold underline hover:text-[#BA1826] cursor-pointer"
          >
            Consultar outro pedido
          </button>
        </div>
      )}

      {/* Clean Page Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-zinc-200">
        <div className="space-y-2">
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-[#E3262E] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded-lg py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar à vitrine</span>
          </button>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight">
            Meus pedidos · Rastreio ao vivo
          </h1>
          <p className="text-[15px] text-zinc-500 max-w-xl leading-relaxed">
            Acompanhe somente os seus pedidos em tempo real, consulte o código de retirada e refaça compras anteriores em um clique.
          </p>
        </div>

        {/* Search Field (scoped strictly to the customer's own orders) */}
        {orders.length > 1 && (
          <div className="w-full lg:w-[340px] shrink-0">
            <label
              htmlFor="order-phone-lookup"
              className="block text-[13px] font-medium text-zinc-600 mb-1.5"
            >
              Filtrar nos meus pedidos
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="order-phone-lookup"
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Nº do pedido ou produto"
                className="w-full min-h-[44px] pl-10 pr-10 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none transition-colors"
              />
              {lookupQuery && (
                <button
                  type="button"
                  onClick={() => setLookupQuery('')}
                  aria-label="Limpar busca"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Quick Order Switcher (visible < lg so active tracker stays above the fold) */}
      {filteredOrders.length > 1 && activeTrackedOrder && (
        <div className="lg:hidden">
          <label
            htmlFor="mobile-order-switcher"
            className="block text-[13px] font-medium text-zinc-600 mb-1.5"
          >
            Pedido em exibição ({filteredOrders.length} encontrados)
          </label>
          <select
            id="mobile-order-switcher"
            value={activeTrackedOrder.id}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm font-semibold text-zinc-900 focus:border-zinc-900 focus:outline-none"
          >
            {filteredOrders.map((ord) => {
              const meta = getOrderStageMeta(ord.status, ord.deliveryType);
              return (
                <option key={ord.id} value={ord.id}>
                  {ord.id} · {ord.customerName} · {meta.shortLabel}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Main Master-Detail Layout */}
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (Desktop) / BOTTOM (Mobile): Clean Filters & Order List */}
        <aside className="w-full lg:col-span-5 space-y-5">
          {/* Calm Segmented & Select Filters */}
          <div className="space-y-3">
            <div
              role="tablist"
              aria-label="Filtrar por situação do pedido"
              className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 rounded-xl"
            >
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'active', label: 'Em andamento' },
                  { id: 'completed', label: 'Concluídos' },
                ] as const
              ).map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`min-h-[40px] px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="filter-modality"
                  className="sr-only"
                >
                  Modalidade
                </label>
                <select
                  id="filter-modality"
                  value={modalityFilter}
                  onChange={(e) =>
                    setModalityFilter(e.target.value as 'all' | DeliveryType)
                  }
                  className="w-full min-h-[42px] px-3.5 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-800 focus:border-zinc-900 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todas modalidades</option>
                  <option value="pickup">Retirada na loja</option>
                  <option value="delivery">Entrega delivery</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="filter-period"
                  className="sr-only"
                >
                  Período
                </label>
                <select
                  id="filter-period"
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as OrderDatePreset)}
                  className="w-full min-h-[42px] px-3.5 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-800 focus:border-zinc-900 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todas as datas</option>
                  <option value="today">Hoje</option>
                  <option value="last_7_days">Últimos 7 dias</option>
                  <option value="last_30_days">Últimos 30 dias</option>
                  <option value="custom">Escolher data</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range Picker (shown only when "Escolher data" is selected) */}
            {datePreset === 'custom' && (
              <div className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-600 mb-1">
                      De
                    </label>
                    <input
                      type="date"
                      aria-label="Data inicial"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full min-h-[40px] px-3 py-1.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm tabular-nums text-zinc-900 focus:bg-white focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-600 mb-1">
                      Até
                    </label>
                    <input
                      type="date"
                      aria-label="Data final"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full min-h-[40px] px-3 py-1.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm tabular-nums text-zinc-900 focus:bg-white focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>

                {distinctOrderDates.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-[13px] text-zinc-500">
                    <span className="inline-flex items-center gap-1 text-zinc-600 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Datas recentes:</span>
                    </span>
                    {distinctOrderDates.slice(0, 5).map((ymd) => {
                      const [y, m, d] = ymd.split('-');
                      const isDay = dateFrom === ymd && dateTo === ymd;
                      return (
                        <button
                          key={ymd}
                          type="button"
                          onClick={() => {
                            setDateFrom(ymd);
                            setDateTo(ymd);
                          }}
                          className={`tabular-nums cursor-pointer hover:underline ${
                            isDay
                              ? 'font-bold text-[#E3262E]'
                              : 'text-zinc-700'
                          }`}
                        >
                          {`${d}/${m}/${y}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Quiet Unboxed Summary Metadata Line */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-zinc-500 px-0.5">
              <div className="flex flex-wrap items-center gap-2 tabular-nums">
                <span className="font-medium text-zinc-700">
                  {periodSummary.totalOrders}{' '}
                  {periodSummary.totalOrders === 1 ? 'pedido' : 'pedidos'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{periodSummary.pickupCount} loja</span>
                <span aria-hidden="true">·</span>
                <span>{periodSummary.deliveryCount} entrega</span>
                {periodSummary.totalRevenue > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-zinc-700">
                      {formatCurrency(periodSummary.totalRevenue)}
                    </span>
                  </>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-[13px] font-semibold text-[#E3262E] hover:underline cursor-pointer"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {/* Clean Hairline-Divided Order List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-3">
              <ShoppingBag className="w-8 h-8 text-zinc-400 mx-auto" />
              <h2 className="font-display text-lg font-bold text-zinc-900">
                Nenhum pedido encontrado
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Ajuste a busca ou limpe os filtros para visualizar todos os pedidos registrados.
              </p>
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="min-h-[42px] px-4 py-2 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-sm font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Mostrar todos ({orders.length})
              </button>
            </div>
          ) : (
            <div
              className="bg-white rounded-2xl border border-zinc-200 divide-y divide-zinc-100 overflow-hidden"
              role="listbox"
              aria-label="Lista de pedidos"
            >
              {filteredOrders.map((order) => {
                const stageMeta = getOrderStageMeta(order.status, order.deliveryType);
                const isSelected = activeTrackedOrder?.id === order.id;
                const isCompleted = order.status === 'completed';
                const totalUnits = order.items.reduce((acc, i) => acc + i.quantity, 0);
                const firstItem = order.items[0]?.title || 'Lista de produtos';
                const shortDate = new Date(order.createdAt).toLocaleDateString(
                  'pt-BR',
                  {
                    day: '2-digit',
                    month: '2-digit',
                  }
                );

                return (
                  <button
                    key={order.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOrderFromList(order.id)}
                    className={`w-full text-left px-5 py-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 ${
                      isSelected
                        ? 'bg-[#FFFBEB]/85 ring-1 ring-inset ring-[#FFBE00]'
                        : 'bg-white hover:bg-zinc-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base font-bold text-zinc-950 tabular-nums shrink-0">
                          {order.id}
                        </span>
                        <span aria-hidden="true" className="text-zinc-300">
                          ·
                        </span>
                        <span className="text-sm text-zinc-600 truncate">
                          {order.deliveryType === 'pickup' ? 'Retirada' : 'Entrega'}
                        </span>
                      </div>
                      <span className="text-[13px] text-zinc-500 tabular-nums shrink-0">
                        {shortDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-sm font-semibold truncate ${
                          isCompleted ? 'text-emerald-700' : 'text-[#B45309]'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 shrink-0" />
                        )}
                        <span className="truncate">{stageMeta.shortLabel}</span>
                      </span>

                      <span className="text-sm text-zinc-600 truncate max-w-[140px]">
                        {order.customerName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-2 text-[13px] text-zinc-500">
                      <span className="truncate">
                        {totalUnits} {totalUnits === 1 ? 'item' : 'itens'} · {firstItem}
                      </span>
                      <span className="font-semibold text-zinc-900 tabular-nums shrink-0">
                        {isOrderQuoteOnly(order)
                          ? 'Sob consulta'
                          : formatCurrency(order.total)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN (Desktop) / TOP (Mobile): Focused Live Order Tracker */}
        <div className="w-full lg:col-span-7 lg:sticky lg:top-28">
          {!activeTrackedOrder ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center space-y-2">
              <p className="text-base font-semibold text-zinc-900">
                Selecione um pedido para acompanhar os detalhes
              </p>
              <p className="text-sm text-zinc-500">
                Os passos de separação, código de retirada e itens aparecerão aqui.
              </p>
            </div>
          ) : (() => {
            const order = activeTrackedOrder;
            const isPickup = order.deliveryType === 'pickup';
            const stageMeta = getOrderStageMeta(order.status, order.deliveryType);
            const stepIndex = stageMeta.step; // 1..4
            const modeSteps = getTrackingStepsForMode(order.deliveryType);
            const currentCheckin = pickupCheckinState[order.id] || 'idle';
            const historyEntries = order.statusHistory || [];
            const isHistoryOpen = expandedHistoryOrderId === order.id;

            const securityPin = order.customerPhone
              ? normalizePhone(order.customerPhone).slice(-4) || '2820'
              : '2820';
            const displayPassCode =
              order.pickupCode ||
              (isPickup ? `BALCÃO-${securityPin}` : `PIN-${securityPin}`);

            const dateFormatted = new Date(order.createdAt).toLocaleDateString(
              'pt-BR',
              {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }
            );
            const timeFormatted = new Date(order.createdAt).toLocaleTimeString(
              'pt-BR',
              {
                hour: '2-digit',
                minute: '2-digit',
              }
            );

            const totalUnits = order.items.reduce(
              (acc, item) => acc + item.quantity,
              0
            );

            const whatsappUrl = buildWhatsAppOrderUrl(
              settings.whatsappNumber,
              order,
              settings.storeAddress
            );

            const customerArrivedWhatsAppUrl = buildStoreWhatsAppHref(
              settings.whatsappNumber,
              `Olá Limper MT! Estou indo buscar / cheguei na loja (${settings.storeAddress}) para retirar meu pedido *${order.id}* (${order.customerName} — Senha: *${displayPassCode}*).`
            );

            const destinationAddressLine = order.address
              ? `${order.address.street}, ${order.address.number} — ${order.address.neighborhood}`
              : 'Centro Norte, Várzea Grande - MT';

            const destinationCityLine = order.address
              ? order.address.city === 'Interior de MT'
                ? `${order.address.interiorCityName || 'Interior'} - MT`
                : `${order.address.city} - MT`
              : 'Várzea Grande - MT';

            const mapsUrl = isPickup
              ? 'https://www.google.com/maps/search/?api=1&query=Av.+Couto+Magalhaes,+2820+-+Centro+Norte,+Varzea+Grande+-+MT,+78110-400'
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${destinationAddressLine}, ${destinationCityLine}`
                )}`;

            const progressFillWidth =
              stepIndex === 1
                ? '0%'
                : stepIndex === 2
                ? '33.33%'
                : stepIndex === 3
                ? '66.66%'
                : '100%';

            return (
              <article className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 space-y-8">
                {/* 1. Calm Hero Status Header & PIN */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-zinc-500 tabular-nums">
                      <span className="font-semibold text-zinc-900">
                        Pedido {order.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {dateFormatted} às {timeFormatted}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        {isPickup ? (
                          <Store className="w-3.5 h-3.5 text-zinc-500" />
                        ) : (
                          <Truck className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                        <span>
                          {isPickup ? 'Retirada no balcão' : 'Entrega delivery'}
                        </span>
                      </span>
                    </div>

                    <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-zinc-950 leading-tight">
                      {stageMeta.cleaningStageTitle.replace(/^\d+\.\s*/, '')}
                    </h2>

                    <p className="text-[15px] text-zinc-600 leading-relaxed max-w-xl">
                      {stageMeta.cleaningStageDesc}
                    </p>
                  </div>

                  {/* Focused Passcode / PIN Block */}
                  <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-1 sm:pt-0">
                    <div className="bg-zinc-950 text-white rounded-xl px-4 py-2.5 flex items-center gap-3">
                      <KeyRound className="w-4 h-4 text-[#FFBE00] shrink-0" />
                      <div>
                        <span className="block text-xs text-zinc-400 leading-none">
                          {isPickup ? 'Senha do balcão' : 'PIN de entrega'}
                        </span>
                        <span className="block font-mono text-base font-bold text-[#FFBE00] tracking-wide mt-1 leading-none">
                          {displayPassCode}
                        </span>
                      </div>
                    </div>

                    <span className="text-[13px] font-medium text-zinc-600">
                      {stageMeta.etaBadge}
                    </span>
                  </div>
                </div>

                {/* 2. Clean 4-Step Progress Track (Read-only for customers) */}
                <div className="pt-7 border-t border-zinc-100 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-zinc-900">
                      Etapa {stepIndex} de 4
                    </span>
                    <span className="text-xs font-medium text-zinc-500">
                      Atualizado pela equipe Limper MT
                    </span>
                  </div>

                  {/* Connected Horizontal Stepper (Desktop) / Clean Vertical List (Mobile) */}
                  <div className="relative">
                    {/* Track line on sm+ */}
                    <div
                      aria-hidden="true"
                      className="hidden sm:block absolute top-4 left-4 right-4 h-0.5 bg-zinc-200"
                    >
                      <div
                        className="h-full bg-[#FFBE00] transition-all duration-300"
                        style={{ width: progressFillWidth }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-3 relative">
                      {modeSteps.map((st, idx) => {
                        const num = idx + 1;
                        const isDone = num < stepIndex;
                        const isCurrent = num === stepIndex;
                        return (
                          <div
                            key={st.status}
                            className="text-left flex sm:flex-col items-start gap-3 sm:gap-2.5 rounded-xl p-1 -m-1"
                          >
                            <span
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold tabular-nums shrink-0 transition-colors border ${
                                isCurrent
                                  ? 'bg-[#E3262E] text-white border-[#E3262E] ring-4 ring-rose-50'
                                  : isDone
                                  ? 'bg-[#FFBE00] text-zinc-950 border-[#FFBE00]'
                                  : 'bg-white text-zinc-400 border-zinc-300'
                              }`}
                            >
                              {isDone ? <Check className="w-4 h-4" /> : num}
                            </span>

                            <div className="min-w-0">
                              <div
                                className={`text-sm font-semibold leading-snug ${
                                  isCurrent
                                    ? 'text-zinc-950'
                                    : isDone
                                    ? 'text-zinc-800'
                                    : 'text-zinc-400'
                                }`}
                              >
                                {st.shortTitle}
                              </div>
                              <div className="text-[13px] text-zinc-500 leading-snug mt-0.5">
                                {st.subLabel}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Route / Pickup Summary (Clean 2-Column Typography) */}
                <div className="pt-7 border-t border-zinc-100 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-[13px] font-medium text-zinc-500 block">
                        Origem · Loja Limper MT
                      </span>
                      <p className="text-[15px] font-semibold text-zinc-950">
                        Av. Couto Magalhães, 2820
                      </p>
                      <p className="text-sm text-zinc-600">
                        Centro Norte · Várzea Grande - MT
                      </p>
                      {isPickup && (
                        <p className="text-[13px] text-zinc-500 pt-0.5">
                          Seg–Sex 07h30–18h · Sáb 07h30–13h
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[13px] font-medium text-zinc-500 block">
                        {isPickup ? 'Retirada e conferência' : 'Destino de entrega'}
                      </span>
                      <p className="text-[15px] font-semibold text-zinc-950">
                        {isPickup
                          ? 'Balcão Express (sem fila)'
                          : destinationAddressLine}
                      </p>
                      <p className="text-sm text-zinc-600">
                        {isPickup
                          ? `Separado para ${order.customerName}`
                          : `${destinationCityLine} · ${formatLogisticsModeLabel(
                              order.logisticsMode,
                              order.address?.interiorCityName,
                              order.deliveryType
                            )}`}
                      </p>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:underline pt-1"
                      >
                        <span>{isPickup ? 'Ver rota até a loja' : 'Abrir no Google Maps'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Store Pickup 1-Tap Check-in (only for pickup orders) */}
                  {isPickup && (
                    <div className="rounded-xl bg-[#FFFBEB]/75 border border-amber-200 p-5 space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-zinc-950">
                          Vai retirar seu pedido agora?
                        </h3>
                        <p className="text-sm text-zinc-700 leading-relaxed">
                          Avise nossa equipe ao sair ou chegar em frente à loja para levarmos os galões até o seu veículo.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setPickupCheckinState((prev) => ({
                              ...prev,
                              [order.id]: 'on_the_way',
                            }))
                          }
                          className={`min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                            currentCheckin === 'on_the_way'
                              ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950'
                              : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-300'
                          }`}
                        >
                          <Car className="w-4 h-4" />
                          <span>
                            {currentCheckin === 'on_the_way'
                              ? 'Estou a caminho (avisado)'
                              : 'Estou indo buscar'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setPickupCheckinState((prev) => ({
                              ...prev,
                              [order.id]: 'arrived',
                            }))
                          }
                          className={`min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                            currentCheckin === 'arrived'
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-[#E3262E] hover:bg-[#C81E25] text-white border-[#E3262E]'
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                          <span>
                            {currentCheckin === 'arrived'
                              ? 'Cheguei na loja (avisado)'
                              : 'Já cheguei na loja'}
                          </span>
                        </button>
                      </div>

                      {currentCheckin !== 'idle' && (
                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-emerald-900">
                          <div className="flex items-center gap-2 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span>
                              {currentCheckin === 'on_the_way'
                                ? 'Balcão avisado. Seu pedido ficará separado na saída.'
                                : 'Atendente acionado. Apresente a senha ao chegar.'}
                            </span>
                          </div>
                          <a
                            href={customerArrivedWhatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-semibold text-emerald-800 hover:underline shrink-0"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Confirmar no WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Clean Itemized List & Summary */}
                <div className="pt-7 border-t border-zinc-100 space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-bold text-zinc-950">
                      Itens do pedido ({totalUnits})
                    </h3>
                    <span className="text-sm text-zinc-600">
                      {order.customerName} · {formatPhone(order.customerPhone)}
                    </span>
                  </div>

                  <div className="divide-y divide-zinc-100">
                    {order.items.map((item, idx) => (
                      <div
                        key={`${order.id}-${item.productId}-${idx}`}
                        className="py-3.5 first:pt-1"
                      >
                        <div className="flex items-start justify-between gap-4 text-[15px]">
                          <div className="text-zinc-900 leading-snug">
                            <span className="font-bold tabular-nums mr-1.5">
                              {item.quantity}x
                            </span>
                            <span className="font-medium">{item.title}</span>
                            {item.volumeLabel && (
                              <span className="text-sm text-zinc-500 ml-1.5">
                                ({item.volumeLabel})
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-zinc-900 tabular-nums shrink-0">
                            {item.priceHidden
                              ? 'Sob consulta'
                              : formatCurrency(item.subtotal)}
                          </span>
                        </div>

                        {item.kitItems && item.kitItems.length > 0 && (
                          <div className="mt-2 pl-4 space-y-1 text-sm text-zinc-600">
                            <div className="text-[13px] font-medium text-zinc-500">
                              Itens inclusos no kit:
                            </div>
                            {item.kitItems.map((sub, subIdx) => (
                              <div
                                key={`${order.id}-${idx}-sub-${subIdx}`}
                                className="flex items-center justify-between gap-3"
                              >
                                <span>
                                  · {sub.quantity * item.quantity}x {sub.title}
                                </span>
                                <span className="text-zinc-500 text-[13px] shrink-0">
                                  {sub.volumeLabel}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-sm text-zinc-600">
                      <span>Pagamento: </span>
                      <strong className="font-medium text-zinc-900">
                        {formatPaymentMethodLabel(order)}
                      </strong>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-zinc-500">Total:</span>
                      <span className="text-xl font-bold text-zinc-950 tabular-nums">
                        {isOrderQuoteOnly(order)
                          ? 'Orçamento sem valor'
                          : formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Collapsible Update History & Primary Actions */}
                <div className="pt-6 border-t border-zinc-100 space-y-5">
                  {historyEntries.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedHistoryOrderId(isHistoryOpen ? null : order.id)
                        }
                        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950 cursor-pointer"
                      >
                        <History className="w-4 h-4 text-zinc-500" />
                        <span>
                          Histórico de atualizações ({historyEntries.length})
                        </span>
                        {isHistoryOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {isHistoryOpen && (
                        <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2 text-sm">
                          {historyEntries.map((entry, idx) => {
                            const toMeta = getOrderStageMeta(
                              entry.toStatus,
                              order.deliveryType
                            );
                            const tsFormatted = new Date(
                              entry.changedAt
                            ).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                            return (
                              <div
                                key={`${order.id}-hist-${idx}`}
                                className="flex items-center justify-between gap-4 text-zinc-700"
                              >
                                <div className="truncate">
                                  <strong className="font-semibold text-zinc-900">
                                    {toMeta.shortLabel}
                                  </strong>
                                  {entry.reason && (
                                    <span className="text-zinc-500">
                                      {' '}
                                      · {entry.reason}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[13px] text-zinc-500 tabular-nums shrink-0">
                                  {tsFormatted}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                      >
                        <MessageCircle className="w-4 h-4 text-[#16A34A]" />
                        <span>Falar no WhatsApp</span>
                      </a>

                      <a
                        href={cleanPhoneHref}
                        className="min-h-[44px] px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                      >
                        <Phone className="w-4 h-4 text-zinc-500" />
                        <span>{settings.whatsappDisplay}</span>
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRepeat(order)}
                      className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {reorderedId === order.id ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                          <span>Adicionado à lista!</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          <span>Refazer este pedido</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })()}
        </div>
      </div>
    </section>
  );
};
