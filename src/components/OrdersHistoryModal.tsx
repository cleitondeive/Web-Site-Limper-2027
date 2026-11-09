import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  KeyRound,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Undo2,
  UserCheck,
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
  buildWhatsAppOrderUrl,
  filterOrdersByCriteria,
  formatCurrency,
  formatPaymentMethodLabel,
  formatPhone,
  getAdjacentOrderStatus,
  getOrderStageMeta,
  normalizePhone,
  summarizeOrdersPeriod,
  toDateKeyYmd,
} from '../utils/commerce';

interface OrdersHistoryViewProps {
  orders: Order[];
  settings: StoreSettings;
  savedCustomerPhone: string;
  onRepeatOrder: (order: Order) => void;
  onUpdateOrderStatus?: (
    orderId: string,
    nextStatus: OrderStatus,
    reason?: string
  ) => void;
  onBackToStore: () => void;
}

function getTrackingStepsForMode(deliveryType: DeliveryType): {
  status: OrderStatus;
  shortTitle: string;
  subLabel: string;
  etaBadge: string;
  specialistLabel: string;
}[] {
  return ORDER_STATUS_SEQUENCE.map((st) => {
    const meta = getOrderStageMeta(st, deliveryType);
    return {
      status: st,
      shortTitle: meta.stepShortTitle,
      subLabel: meta.stepSubLabel,
      etaBadge: meta.etaBadge,
      specialistLabel: meta.specialistLabel,
    };
  });
}

export const OrdersHistoryView: React.FC<OrdersHistoryViewProps> = ({
  orders,
  settings,
  savedCustomerPhone,
  onRepeatOrder,
  onUpdateOrderStatus,
  onBackToStore,
}) => {
  const [lookupQuery, setLookupQuery] = useState(
    savedCustomerPhone ? formatPhone(savedCustomerPhone) : ''
  );
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
  const [lastStageMove, setLastStageMove] = useState<{
    orderId: string;
    previousStatus: OrderStatus;
    newStatus: OrderStatus;
    deliveryType: DeliveryType;
  } | null>(null);
  const [pickupCheckinState, setPickupCheckinState] = useState<
    Record<string, 'idle' | 'on_the_way' | 'arrived'>
  >({});

  // Reference date based on latest order so preset filters work with 2026 seed dates and live dates
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

  // Distinct dates with orders for 1-click historical consultation
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
    filteredOrders.find((o) => o.id === selectedOrderId) ||
    filteredOrders[0] ||
    orders[0];

  const handleRepeat = (order: Order) => {
    setReorderedId(order.id);
    onRepeatOrder(order);
    setTimeout(() => setReorderedId(null), 2000);
  };

  const handleTransitionStatus = (
    order: Order,
    nextStatus: OrderStatus,
    reason?: string
  ) => {
    if (!onUpdateOrderStatus || order.status === nextStatus) return;
    setLastStageMove({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: nextStatus,
      deliveryType: order.deliveryType,
    });
    onUpdateOrderStatus(order.id, nextStatus, reason);
  };

  const handleUndoStageMove = () => {
    if (!lastStageMove || !onUpdateOrderStatus) return;
    onUpdateOrderStatus(
      lastStageMove.orderId,
      lastStageMove.previousStatus,
      'Desfeito (Correção de etapa)'
    );
    setLastStageMove(null);
  };

  const handleSelectOrderMode = (targetType: DeliveryType) => {
    setModalityFilter('all');
    const matched = filteredOrders.find((o) => o.deliveryType === targetType) ||
      orders.find((o) => o.deliveryType === targetType);
    if (matched) {
      setSelectedOrderId(matched.id);
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

  return (
    <section className="max-w-[1320px] mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Header & Back Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-zinc-200">
        <div>
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-[#E3262E] mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#E3262E]" />
            <span>Voltar para a Vitrine de Produtos</span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl sm:text-3xl font-extrabold text-zinc-900">
              Rastreio Ao Vivo & Histórico Completo do Cliente
            </h1>
            <span className="text-[10px] sm:text-[11px] font-mono font-extrabold uppercase bg-[#FFBE00] text-zinc-950 px-2.5 py-1 rounded-md">
              BALCÃO 15MIN & ROTA EXPRESS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 mt-1">
            Acompanhe cada etapa em tempo real, consulte pedidos de datas anteriores, veja o histórico de movimentações e refaça qualquer pedido em 1 clique.
          </p>
        </div>

        {/* Lookup by WhatsApp or Order Number */}
        <div className="w-full lg:w-96 bg-white p-3.5 sm:p-4 rounded-2xl border border-zinc-200 shadow-2xs">
          <label
            htmlFor="order-phone-lookup"
            className="block text-xs font-extrabold text-zinc-900 mb-1.5"
          >
            Buscar por WhatsApp, Nome ou Nº do Pedido
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-[#E3262E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="order-phone-lookup"
              type="text"
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              placeholder="Ex: (65) 99999-9999 ou #LMP-1041"
              className="w-full pl-9 pr-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-zinc-500">
            <span>Atalhos Rápidos:</span>
            <button
              type="button"
              onClick={() => {
                handleClearAllFilters();
                setSelectedOrderId('#LMP-1041');
              }}
              className="text-[#E3262E] font-mono font-extrabold hover:underline cursor-pointer"
            >
              #LMP-1041 (Buscar na Loja)
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => {
                handleClearAllFilters();
                setSelectedOrderId('#LMP-1042');
              }}
              className="text-zinc-900 font-mono font-bold hover:underline cursor-pointer"
            >
              #LMP-1042 (Delivery)
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-zinc-600 hover:underline cursor-pointer"
            >
              Todos ({orders.length})
            </button>
          </div>
        </div>
      </div>

      {/* Undo Stage Transition Banner (Human Error Protection) */}
      {lastStageMove && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl bg-zinc-950 text-white px-4 py-3 border-2 border-[#FFBE00] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-7 h-7 rounded-lg bg-[#FFBE00] text-zinc-950 flex items-center justify-center shrink-0">
              <Undo2 className="w-4 h-4" />
            </span>
            <div>
              <span className="font-mono font-extrabold text-[#FFBE00]">
                ETAPA ATUALIZADA ({lastStageMove.orderId}):
              </span>{' '}
              <span>
                Movido de{' '}
                <strong className="underline">
                  {
                    getOrderStageMeta(
                      lastStageMove.previousStatus,
                      lastStageMove.deliveryType
                    ).shortLabel
                  }
                </strong>{' '}
                para{' '}
                <strong className="text-[#FFBE00]">
                  {
                    getOrderStageMeta(
                      lastStageMove.newStatus,
                      lastStageMove.deliveryType
                    ).shortLabel
                  }
                </strong>
                . Avançou por engano?
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleUndoStageMove}
              className="px-3.5 py-1.5 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Desfazer e Voltar Etapa</span>
            </button>
            <button
              type="button"
              onClick={() => setLastStageMove(null)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 text-xs font-bold cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Mode Switcher Bar: Cliente Indo Buscar na Loja vs Entrega Delivery */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-2.5 sm:p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-2xs">
        <div className="grid grid-cols-2 gap-2 flex-1">
          <button
            type="button"
            onClick={() => handleSelectOrderMode('pickup')}
            className={`p-2.5 sm:px-4 sm:py-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTrackedOrder?.deliveryType === 'pickup'
                ? 'bg-[#FFFBEB] border-2 border-[#E3262E] text-zinc-950 shadow-2xs'
                : 'bg-[#FAFAFA] hover:bg-zinc-100 border-zinc-200 text-zinc-700'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                activeTrackedOrder?.deliveryType === 'pickup'
                  ? 'bg-[#E3262E] text-white'
                  : 'bg-white border border-zinc-200 text-[#D97706]'
              }`}
            >
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-extrabold leading-tight truncate">
                Indo Buscar na Loja (Retirada)
              </div>
              <div className="text-[10px] text-zinc-500 truncate">
                Av. Couto Magalhães, 2820 · Sem Fila
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectOrderMode('delivery')}
            className={`p-2.5 sm:px-4 sm:py-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTrackedOrder?.deliveryType === 'delivery'
                ? 'bg-[#FFFBEB] border-2 border-[#E3262E] text-zinc-950 shadow-2xs'
                : 'bg-[#FAFAFA] hover:bg-zinc-100 border-zinc-200 text-zinc-700'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                activeTrackedOrder?.deliveryType === 'delivery'
                  ? 'bg-[#E3262E] text-white'
                  : 'bg-white border border-zinc-200 text-[#D97706]'
              }`}
            >
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-extrabold leading-tight truncate">
                Entrega Delivery Local
              </div>
              <div className="text-[10px] text-zinc-500 truncate">
                Rota Limper Express · VG e Cuiabá
              </div>
            </div>
          </button>
        </div>

        {/* Order Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {filteredOrders.map((ord) => {
            const isSelected = activeTrackedOrder?.id === ord.id;
            return (
              <button
                key={`pill-${ord.id}`}
                type="button"
                onClick={() => setSelectedOrderId(ord.id)}
                className={`px-3 py-2 rounded-xl font-mono text-xs font-extrabold border whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950'
                    : 'bg-white hover:bg-[#FFFBEB] text-zinc-700 border-zinc-200'
                }`}
              >
                {ord.id} · {ord.deliveryType === 'pickup' ? '🏪 Loja' : '🚚 Delivery'}
              </button>
            );
          })}
        </div>
      </div>

      {/* HERO LIVE RADAR TRACKER (Tailored for Store Pickup vs Delivery + Bidirectional Stage Controls) */}
      {activeTrackedOrder && (() => {
        const isPickup = activeTrackedOrder.deliveryType === 'pickup';
        const stageMeta = getOrderStageMeta(
          activeTrackedOrder.status,
          activeTrackedOrder.deliveryType
        );
        const stepIndex = stageMeta.step; // 1..4
        const prevStatus = getAdjacentOrderStatus(activeTrackedOrder.status, 'prev');
        const nextStatus = getAdjacentOrderStatus(activeTrackedOrder.status, 'next');
        const modeSteps = getTrackingStepsForMode(activeTrackedOrder.deliveryType);
        const currentCheckin = pickupCheckinState[activeTrackedOrder.id] || 'idle';

        const progressPercent =
          stepIndex === 1 ? 22 : stepIndex === 2 ? 55 : stepIndex === 3 ? 86 : 100;
        const securityPin = activeTrackedOrder.customerPhone
          ? normalizePhone(activeTrackedOrder.customerPhone).slice(-4) || '2820'
          : '2820';

        const whatsappUrl = buildWhatsAppOrderUrl(
          settings.whatsappNumber,
          activeTrackedOrder,
          settings.storeAddress
        );

        const customerArrivedWhatsAppUrl = `https://wa.me/${
          settings.whatsappNumber
        }?text=${encodeURIComponent(
          `Olá Limper MT! Estou indo buscar / cheguei na loja (Av. Couto Magalhães, 2820) para retirar meu pedido *${
            activeTrackedOrder.id
          }* (${activeTrackedOrder.customerName} - Senha: *${
            activeTrackedOrder.pickupCode || `BALCÃO-${securityPin}`
          }*).`
        )}`;

        return (
          <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-sm overflow-hidden">
            {/* Top Status Bar with Both ← Voltar Etapa and Avançar Etapa → */}
            <div className="bg-[#181A20] text-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFBE00] text-zinc-950 flex items-center justify-center font-mono font-black text-sm shrink-0">
                  {isPickup ? (
                    <Store className="w-5 h-5" />
                  ) : (
                    <Truck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-[#FFBE00]">
                      PEDIDO {activeTrackedOrder.id}
                    </span>
                    <span aria-hidden="true" className="text-zinc-500">·</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[11px] text-white font-bold">
                      {isPickup
                        ? 'CLIENTE VAI BUSCAR NA LOJA (BALCÃO 15MIN)'
                        : 'ENTREGA DELIVERY EM DOMICÍLIO / EMPRESA'}
                    </span>
                  </div>
                  <h2 className="font-display text-base sm:text-xl font-extrabold text-white mt-0.5">
                    {stageMeta.cleaningStageTitle}
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-right">
                  <div className="text-[10px] font-mono uppercase text-zinc-400">
                    {isPickup ? 'TEMPO NO BALCÃO' : 'PREVISÃO ROTA'}
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-extrabold text-[#FFBE00]">
                    {stageMeta.etaBadge}
                  </div>
                </div>

                {onUpdateOrderStatus && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!prevStatus}
                      onClick={() =>
                        prevStatus &&
                        handleTransitionStatus(
                          activeTrackedOrder,
                          prevStatus,
                          'Retorno manual de etapa no rastreio'
                        )
                      }
                      title={
                        prevStatus
                          ? 'Voltar para a etapa anterior'
                          : 'Já está na 1ª etapa'
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1 border transition-colors ${
                        prevStatus
                          ? 'bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer'
                          : 'bg-white/5 text-zinc-500 border-white/10 cursor-not-allowed'
                      }`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-[#FFBE00]" />
                      <span>Voltar Etapa</span>
                    </button>

                    <button
                      type="button"
                      disabled={!nextStatus}
                      onClick={() =>
                        nextStatus &&
                        handleTransitionStatus(
                          activeTrackedOrder,
                          nextStatus,
                          'Avanço de etapa no rastreio'
                        )
                      }
                      title={
                        nextStatus
                          ? 'Avançar para a próxima etapa'
                          : 'Pedido já está na etapa final (use Voltar Etapa se desejar retornar)'
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1 transition-colors ${
                        nextStatus
                          ? 'bg-[#E3262E] hover:bg-[#C81E25] text-white cursor-pointer shadow-xs'
                          : 'bg-emerald-800/60 text-emerald-200 cursor-not-allowed'
                      }`}
                    >
                      <span>{nextStatus ? 'Avançar Etapa' : 'Etapa Concluída'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#FFBE00]" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Route Radar + Store Pickup Check-In Hub */}
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Left 7 Cols: Visual Radar + Dedicated 4-Step Timeline */}
              <div className="lg:col-span-7 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-zinc-200 space-y-5">
                {/* Visual Route Canvas */}
                <div className="relative rounded-2xl bg-[#F4F6F9] border border-zinc-200/90 p-3.5 sm:p-5 overflow-hidden">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 opacity-35 pointer-events-none"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, #CBD5E1 1px, transparent 1px), linear-gradient(to bottom, #CBD5E1 1px, transparent 1px)',
                      backgroundSize: '36px 36px',
                    }}
                  />

                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-[11px] font-extrabold text-zinc-900 inline-flex items-center gap-1.5 shadow-2xs">
                      <Navigation className="w-3.5 h-3.5 text-[#E3262E]" />
                      <span>
                        {isPickup
                          ? 'Retirada na Loja Física · Av. Couto Magalhães, 2820 (Centro Norte, VG)'
                          : 'Rota de Entrega Limper Express · Várzea Grande / Cuiabá'}
                      </span>
                    </span>

                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Av.+Couto+Magalhaes,+2820+-+Centro+Norte,+Varzea+Grande+-+MT,+78110-400"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FFFBEB] border border-zinc-200 text-[11px] font-extrabold text-[#2563EB] inline-flex items-center gap-1 shadow-2xs"
                    >
                      <span>{isPickup ? 'Traçar Rota até a Loja' : 'Abrir Mapa GPS'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Route Progress Bar */}
                  <div className="relative z-10 py-5 px-2 sm:px-4">
                    <div className="h-3 rounded-full bg-zinc-200 overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-[#FFBE00] to-[#E3262E] rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500"
                      style={{ left: `${Math.min(90, Math.max(12, progressPercent))}%` }}
                    >
                      <div className="px-2.5 py-1 rounded-full bg-zinc-950 text-[#FFBE00] border-2 border-[#FFBE00] shadow-md flex items-center gap-1.5 whitespace-nowrap">
                        {isPickup ? (
                          <Store className="w-3.5 h-3.5 text-[#FFBE00]" />
                        ) : (
                          <Truck className="w-3.5 h-3.5 text-[#FFBE00]" />
                        )}
                        <span className="font-mono text-[10px] font-extrabold">
                          {stageMeta.shortLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Endpoints */}
                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                    <div className="bg-white/95 rounded-xl p-2.5 border border-zinc-200/80 shadow-2xs">
                      <div className="text-[10px] font-mono uppercase text-zinc-400 font-bold">
                        {isPickup
                          ? '1. ESTOQUE & CONFERÊNCIA QUIMIPROL'
                          : 'ORIGEM · CENTRAL LIMPER MT'}
                      </div>
                      <div className="font-extrabold text-zinc-900 truncate">
                        Av. Couto Magalhães, 2820 · Centro Norte, VG
                      </div>
                    </div>

                    <div className="bg-white/95 rounded-xl p-2.5 border border-zinc-200/80 shadow-2xs sm:text-right">
                      <div className="text-[10px] font-mono uppercase text-[#E3262E] font-extrabold">
                        {isPickup
                          ? '2. BALCÃO EXPRESS / PORTA-MALAS (SEM FILA)'
                          : 'DESTINO · ENDEREÇO DO CLIENTE'}
                      </div>
                      <div className="font-extrabold text-zinc-900 truncate">
                        {isPickup
                          ? `Pronto p/ ${activeTrackedOrder.customerName} retirar na Loja`
                          : `${activeTrackedOrder.address?.street || ''}, ${
                              activeTrackedOrder.address?.number || ''
                            } - ${activeTrackedOrder.address?.neighborhood || 'Centro Norte'}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4-Step Mode-Aware Timeline (Clickable for any forward/backward step!) */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <span className="font-extrabold text-zinc-900">
                      {stageMeta.cleaningStageDesc}
                    </span>
                    <span className="font-mono font-bold text-[#E3262E] shrink-0">
                      Etapa {stepIndex} de 4 (Toque em qualquer etapa p/ ir ou voltar)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {modeSteps.map((st, idx) => {
                      const num = idx + 1;
                      const isDone = num <= stepIndex;
                      const isCurrent = num === stepIndex;
                      return (
                        <button
                          key={st.status}
                          type="button"
                          onClick={() =>
                            handleTransitionStatus(
                              activeTrackedOrder,
                              st.status,
                              `Seleção direta da Etapa ${num}`
                            )
                          }
                          className={`text-left rounded-xl p-2.5 border transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-[#FFFBEB] border-2 border-[#E3262E] shadow-2xs'
                              : isDone
                              ? 'bg-white border-[#FFBE00] hover:border-[#E3262E]'
                              : 'bg-zinc-50 border-zinc-200 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div
                            className={`h-1.5 rounded-full mb-2 ${
                              isCurrent
                                ? 'bg-[#E3262E]'
                                : isDone
                                ? 'bg-[#FFBE00]'
                                : 'bg-zinc-200'
                            }`}
                          />
                          <div className="text-[11px] font-extrabold text-zinc-900 leading-tight">
                            {st.shortTitle}
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                            {st.subLabel}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* DEDICATED STORE PICKUP CHECK-IN PANEL ("Cliente indo até a loja buscar os produtos") */}
                {isPickup && (
                  <div className="rounded-2xl bg-[#FFFBEB] border-2 border-[#FFBE00] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#E3262E] text-white flex items-center justify-center shrink-0">
                          <Car className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block text-[10px] font-mono uppercase font-extrabold text-[#E3262E]">
                            CHECK-IN DE RETIRADA NA LOJA · DRIVE-THRU / BALCÃO SEM FILA
                          </span>
                          <h3 className="font-display text-sm font-extrabold text-zinc-950">
                            Vai buscar seus produtos agora na Av. Couto Magalhães, 2820?
                          </h3>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-mono text-[10px] font-extrabold">
                        Estacionamento Fácil em Frente
                      </span>
                    </div>

                    <p className="text-xs text-zinc-700 leading-relaxed">
                      Avise nossa equipe com 1 toque abaixo quando estiver saindo ou quando estacionar em frente à loja. Carregamos os galões de 5L direto no seu porta-malas!
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPickupCheckinState((prev) => ({
                            ...prev,
                            [activeTrackedOrder.id]: 'on_the_way',
                          }))
                        }
                        className={`py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          currentCheckin === 'on_the_way'
                            ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950 shadow-xs'
                            : 'bg-white hover:bg-amber-50 text-zinc-900 border-zinc-300'
                        }`}
                      >
                        <Car className="w-4 h-4 text-[#E3262E]" />
                        <span>
                          {currentCheckin === 'on_the_way'
                            ? '✓ Balcão Avisado: Estou a Caminho!'
                            : '1. Estou Indo Buscar na Loja'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPickupCheckinState((prev) => ({
                            ...prev,
                            [activeTrackedOrder.id]: 'arrived',
                          }))
                        }
                        className={`py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          currentCheckin === 'arrived'
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                            : 'bg-[#E3262E] hover:bg-[#C81E25] text-white border-[#E3262E]'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                        <span>
                          {currentCheckin === 'arrived'
                            ? '✓ Já Estou na Loja / Porta-Malas!'
                            : '2. Já Cheguei na Loja (Trazer Pedido)'}
                        </span>
                      </button>
                    </div>

                    {currentCheckin !== 'idle' && (
                      <div className="p-3 rounded-xl bg-white border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2 text-emerald-900 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            {currentCheckin === 'on_the_way'
                              ? 'Balcão Express notificado! Seus galões já estão posicionados na frente da loja.'
                              : 'Atendente acionado! Informe a senha do balcão ou confirme no WhatsApp abaixo.'}
                          </span>
                        </div>
                        <a
                          href={customerArrivedWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-extrabold text-[11px] inline-flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-zinc-950" />
                          <span>Enviar Aviso no WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right 5 Cols: Pickup Pass / Security PIN + Store Location / Specialist Card */}
              <div className="lg:col-span-5 p-4 sm:p-6 bg-[#FAFAFA] flex flex-col justify-between gap-4">
                <div className="space-y-3.5">
                  {/* Pickup Pass or Delivery Security PIN */}
                  <div className="bg-white rounded-2xl border-2 border-[#FFBE00] p-4 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#E3262E] flex items-center justify-center shrink-0">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-mono uppercase font-extrabold text-zinc-500">
                          {isPickup
                            ? 'SENHA DE RETIRADA NO BALCÃO'
                            : 'CÓDIGO DE SEGURANÇA (PIN ENTREGA)'}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {isPickup
                            ? 'Apresente no Balcão Limper MT sem pegar fila'
                            : 'Informe ao entregador no recebimento'}
                        </span>
                      </div>
                    </div>

                    <div className="px-3.5 py-2 rounded-xl bg-zinc-950 text-[#FFBE00] font-mono text-sm sm:text-base font-black tracking-wider shrink-0">
                      {activeTrackedOrder.pickupCode ||
                        (isPickup ? `BALCÃO-${securityPin}` : `PIN-${securityPin}`)}
                    </div>
                  </div>

                  {/* Store Address & Pickup Instructions OR Delivery Driver Card */}
                  <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                        {isPickup ? (
                          <Store className="w-5 h-5" />
                        ) : (
                          <UserCheck className="w-5 h-5" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-extrabold text-zinc-900">
                          {stageMeta.specialistLabel}
                        </div>
                        <div className="text-[11px] text-zinc-600">
                          {isPickup ? (
                            <>
                              <strong>Endereço de Retirada:</strong> Av. Couto Magalhães, 2820 - Centro Norte, Várzea Grande - MT · Seg–Sex 07h30–18h / Sáb 07h30–13h
                            </>
                          ) : (
                            <>
                              <strong>Endereço de Entrega:</strong>{' '}
                              {activeTrackedOrder.address
                                ? `${activeTrackedOrder.address.street}, ${activeTrackedOrder.address.number} - ${activeTrackedOrder.address.neighborhood}, ${activeTrackedOrder.address.city}`
                                : 'Centro Norte, Várzea Grande - MT'}
                            </>
                          )}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 pt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Galões 5L/2L Quimiprol com lacre anti-vazamento conferido</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 grid grid-cols-2 gap-2">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-zinc-950" />
                        <span>{isPickup ? 'Falar c/ Balcão' : 'Falar c/ Expedição'}</span>
                      </a>
                      <a
                        href={`tel:${settings.whatsappNumber.replace(/^55/, '')}`}
                        className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#E3262E]" />
                        <span>Ligar (65) 3029-6824</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* 1-Click Reorder from Active Tracker */}
                <div className="pt-2 border-t border-zinc-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-zinc-500">
                      Total do Pedido ({activeTrackedOrder.items.reduce((a, i) => a + i.quantity, 0)} itens)
                    </div>
                    <div className="font-mono text-lg font-extrabold text-zinc-950 tabular-nums">
                      {formatCurrency(activeTrackedOrder.total)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRepeat(activeTrackedOrder)}
                    className="px-4 py-2.5 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-4 h-4 text-[#E3262E]" />
                    <span>Repetir Este Pedido</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CUSTOMER HISTORY FILTER BAR & FINANCIAL SUMMARY (Consulta por Data / Calendário) */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <span className="text-[10px] font-mono uppercase font-extrabold text-[#E3262E]">
              CONSULTA DE HISTÓRICO POR DATA & PERÍODO
            </span>
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-zinc-900">
              Histórico de Pedidos & Recompra Inteligente ({filteredOrders.length})
            </h2>
          </div>

          {/* Period Summary Strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="px-3 py-2 rounded-xl bg-[#FAFAFA] border border-zinc-200/80">
              <span className="block text-[10px] font-mono uppercase text-zinc-400">
                Pedidos Filtrados
              </span>
              <strong className="font-mono text-sm font-black text-zinc-950">
                {periodSummary.totalOrders} ({periodSummary.pickupCount} Loja /{' '}
                {periodSummary.deliveryCount} Rota)
              </strong>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
              <span className="block text-[10px] font-mono uppercase text-[#B45309]">
                Total em Compras
              </span>
              <strong className="font-mono text-sm font-black text-zinc-950 tabular-nums">
                {formatCurrency(periodSummary.totalRevenue)}
              </strong>
            </div>
            <div className="px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <span className="block text-[10px] font-mono uppercase text-emerald-800">
                Concluídos
              </span>
              <strong className="font-mono text-sm font-black text-emerald-900">
                {periodSummary.completedCount} de {periodSummary.totalOrders}
              </strong>
            </div>
          </div>
        </div>

        {/* Date Preset Pills + Custom Calendar Range + Status Filter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-6 space-y-1.5">
            <label className="block text-[11px] font-bold text-zinc-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#E3262E]" />
              <span>Filtrar por Período ou Data Anterior:</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'Todas as Datas' },
                  { id: 'today', label: 'Hoje' },
                  { id: 'last_7_days', label: 'Últimos 7 Dias' },
                  { id: 'last_30_days', label: 'Últimos 30 Dias' },
                  { id: 'custom', label: 'Escolher Data' },
                ] as { id: OrderDatePreset; label: string }[]
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDatePreset(preset.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                    datePreset === preset.id
                      ? 'bg-[#FFBE00] text-zinc-950 border-[#F59E0B] shadow-2xs'
                      : 'bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-[11px] font-bold text-zinc-600 mb-1">
              Status do Pedido
            </label>
            <div className="grid grid-cols-3 gap-1 bg-[#FAFAFA] p-1 rounded-xl border border-zinc-200">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'active', label: 'Em Curso' },
                  { id: 'completed', label: 'Finalizados' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                    statusFilter === st.id
                      ? 'bg-zinc-950 text-[#FFBE00]'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-[11px] font-bold text-zinc-600 mb-1">
              Modalidade
            </label>
            <div className="grid grid-cols-3 gap-1 bg-[#FAFAFA] p-1 rounded-xl border border-zinc-200">
              {(
                [
                  { id: 'all', label: 'Todas' },
                  { id: 'pickup', label: '🏪 Loja' },
                  { id: 'delivery', label: '🚚 Rota' },
                ] as const
              ).map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setModalityFilter(mod.id)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                    modalityFilter === mod.id
                      ? 'bg-zinc-950 text-[#FFBE00]'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {mod.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Calendar Date Picker + Quick Historical Date Chips */}
        <div className="pt-2 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-zinc-500">
              Datas com pedidos registrados:
            </span>
            {distinctOrderDates.map((ymd) => {
              const [y, m, d] = ymd.split('-');
              const isSelectedDate =
                datePreset === 'custom' && dateFrom === ymd && dateTo === ymd;
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => {
                    if (isSelectedDate) {
                      setDatePreset('all');
                      setDateFrom('');
                      setDateTo('');
                    } else {
                      setDatePreset('custom');
                      setDateFrom(ymd);
                      setDateTo(ymd);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-extrabold border transition-all cursor-pointer ${
                    isSelectedDate
                      ? 'bg-[#E3262E] text-white border-[#E3262E]'
                      : 'bg-[#FAFAFA] hover:bg-[#FFFBEB] text-zinc-700 border-zinc-200'
                  }`}
                >
                  📅 {`${d}/${m}/${y}`}
                </button>
              );
            })}
          </div>

          {datePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-zinc-600">De:</span>
                <input
                  type="date"
                  aria-label="Data Inicial do Histórico"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2.5 py-1 bg-[#FAFAFA] border border-zinc-300 rounded-lg font-mono text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-zinc-600">Até:</span>
                <input
                  type="date"
                  aria-label="Data Final do Histórico"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2.5 py-1 bg-[#FAFAFA] border border-zinc-300 rounded-lg font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Orders History Grid */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center max-w-lg mx-auto">
            <ShoppingBag className="w-10 h-10 text-[#E3262E] mx-auto mb-3" />
            <h3 className="font-display text-lg font-extrabold text-zinc-900 mb-1">
              Nenhum pedido localizado para esta data ou filtro
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 mb-5">
              Limpe o filtro de data ou busca abaixo para visualizar todos os pedidos registrados no histórico.
            </p>
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="px-4 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-xs font-extrabold rounded-xl cursor-pointer"
            >
              Mostrar Todos os Pedidos ({orders.length})
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredOrders.map((order) => {
              const stageMeta = getOrderStageMeta(order.status, order.deliveryType);
              const cardSteps = getTrackingStepsForMode(order.deliveryType);
              const currentStep = stageMeta.step;
              const prevStatus = getAdjacentOrderStatus(order.status, 'prev');
              const nextStatus = getAdjacentOrderStatus(order.status, 'next');
              const isSelected = activeTrackedOrder?.id === order.id;
              const isHistoryOpen = expandedHistoryOrderId === order.id;
              const historyEntries = order.statusHistory || [];
              const dateFormatted = new Date(order.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const whatsappUrl = buildWhatsAppOrderUrl(
                settings.whatsappNumber,
                order,
                settings.storeAddress
              );

              return (
                <article
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-2 border-[#FFBE00] shadow-md'
                      : 'border-zinc-200 hover:border-[#FFBE00] shadow-2xs'
                  }`}
                >
                  <div>
                    {/* Order Top Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200 mb-4">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="font-mono text-base font-extrabold text-zinc-950">
                          {order.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-bold text-[10px]">
                          {order.deliveryType === 'pickup'
                            ? '🏪 Retirada na Loja'
                            : '🚚 Entrega Delivery'}
                        </span>
                        <span className="font-mono text-[11px]">{dateFormatted}</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#E3262E]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{stageMeta.shortLabel}</span>
                      </div>
                    </div>

                    {/* Interactive 4-Stage Stepper + Bidirectional Stage Controls */}
                    <div
                      className="bg-[#FAFAFA] border border-zinc-200/90 rounded-xl p-3.5 mb-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <div>
                          <span className="text-xs font-extrabold text-zinc-950 block">
                            {stageMeta.cleaningStageTitle}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-[#B45309]">
                            Etapa {currentStep} de 4 · Clique p/ alternar ou corrigir etapa
                          </span>
                        </div>

                        {onUpdateOrderStatus && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={!prevStatus}
                              onClick={() =>
                                prevStatus &&
                                handleTransitionStatus(
                                  order,
                                  prevStatus,
                                  'Retorno de etapa pelo card do histórico'
                                )
                              }
                              className={`px-2 py-1 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1 border transition-colors ${
                                prevStatus
                                  ? 'bg-white hover:bg-amber-50 text-zinc-800 border-zinc-300 cursor-pointer'
                                  : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
                              }`}
                            >
                              <ArrowLeft className="w-3 h-3 text-[#E3262E]" />
                              <span>Voltar</span>
                            </button>
                            <button
                              type="button"
                              disabled={!nextStatus}
                              onClick={() =>
                                nextStatus &&
                                handleTransitionStatus(
                                  order,
                                  nextStatus,
                                  'Avanço de etapa pelo card do histórico'
                                )
                              }
                              className={`px-2 py-1 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1 border transition-colors ${
                                nextStatus
                                  ? 'bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 border-[#F59E0B] cursor-pointer'
                                  : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
                              }`}
                            >
                              <span>Avançar</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {cardSteps.map((st, idx) => {
                          const stepNum = idx + 1;
                          const isDone = stepNum <= currentStep;
                          const isCurrent = stepNum === currentStep;
                          return (
                            <button
                              key={st.status}
                              type="button"
                              onClick={() =>
                                handleTransitionStatus(
                                  order,
                                  st.status,
                                  `Mudança direta para Etapa ${stepNum}`
                                )
                              }
                              className="space-y-1 text-left cursor-pointer group"
                            >
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  isCurrent
                                    ? 'bg-[#E3262E]'
                                    : isDone
                                    ? 'bg-[#FFBE00] group-hover:bg-[#E3262E]/70'
                                    : 'bg-zinc-200 group-hover:bg-zinc-300'
                                }`}
                              />
                              <div
                                className={`text-[10px] leading-tight font-bold ${
                                  isCurrent
                                    ? 'text-[#E3262E]'
                                    : isDone
                                    ? 'text-zinc-900'
                                    : 'text-zinc-400'
                                }`}
                              >
                                {st.shortTitle}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Logistics & Customer Info */}
                    <div className="text-xs text-zinc-600 space-y-1 mb-4">
                      <div>
                        <strong className="text-zinc-900">Cliente:</strong> {order.customerName}{' '}
                        <span className="font-mono text-zinc-500">
                          · {formatPhone(order.customerPhone)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-600">
                        <MapPin className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
                        <span>
                          {order.deliveryType === 'pickup'
                            ? `Buscar na Loja Física: ${settings.storeAddress}`
                            : `Delivery: ${order.address?.street || ''}, ${order.address?.number || ''} - ${order.address?.neighborhood || ''}`}
                        </span>
                      </div>
                      <div>
                        <strong className="text-zinc-900">Pagamento:</strong>{' '}
                        {formatPaymentMethodLabel(order)}
                      </div>
                    </div>

                    {/* Itemized Products */}
                    <div className="bg-[#FAFAFA] rounded-xl p-3 border border-zinc-200/80 space-y-1.5 mb-3">
                      {order.items.map((item, idx) => (
                        <div
                          key={`${order.id}-${item.productId}-${idx}`}
                          className="flex items-center justify-between text-xs text-zinc-900"
                        >
                          <span className="truncate pr-3">
                            <strong className="font-mono">{item.quantity}x</strong> {item.title}{' '}
                            <span className="font-mono text-zinc-500">({item.volumeLabel})</span>
                          </span>
                          <span className="font-mono font-bold shrink-0 tabular-nums">
                            {item.priceHidden
                              ? 'Sob consulta'
                              : formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Collapsible Status Audit Trail */}
                    {historyEntries.length > 0 && (
                      <div
                        className="mb-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedHistoryOrderId(isHistoryOpen ? null : order.id)
                          }
                          className="text-[11px] font-mono font-bold text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-[#D97706]" />
                          <span>
                            {isHistoryOpen
                              ? 'Ocultar Linha do Tempo de Etapas'
                              : `Ver Linha do Tempo / Auditoria (${historyEntries.length} registros)`}
                          </span>
                        </button>

                        {isHistoryOpen && (
                          <div className="mt-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/90 space-y-1.5 text-[11px]">
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
                                  className="flex items-center justify-between gap-2 text-zinc-700"
                                >
                                  <div className="truncate">
                                    <strong className="text-zinc-950">
                                      {toMeta.shortLabel}
                                    </strong>
                                    {entry.reason && (
                                      <span className="text-zinc-500">
                                        {' '}
                                        · {entry.reason}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                                    {tsFormatted}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Order Footer Totals & 1-Click Reorder Action */}
                  <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-mono font-extrabold text-zinc-900 tabular-nums">
                        Total: {formatCurrency(order.total)}
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Falar sobre pedido ${order.id} no WhatsApp`}
                        className="px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-bold rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <MessageCircle className="w-4 h-4 text-[#1DA851]" />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleRepeat(order)}
                        className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                      >
                        {reorderedId === order.id ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                            <span>Enviado à Cesta!</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4 text-[#E3262E]" />
                            <span>Refazer Pedido</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
