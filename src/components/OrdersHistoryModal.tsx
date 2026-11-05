import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  PackageCheck,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from 'lucide-react';
import { Order, OrderStatus, StoreSettings } from '../types/commerce';
import {
  ORDER_STATUS_META,
  buildWhatsAppOrderUrl,
  formatCurrency,
  formatPaymentMethodLabel,
  formatPhone,
  normalizePhone,
} from '../utils/commerce';

interface OrdersHistoryViewProps {
  orders: Order[];
  settings: StoreSettings;
  savedCustomerPhone: string;
  onRepeatOrder: (order: Order) => void;
  onBackToStore: () => void;
}

const TRACKING_STEPS: {
  status: OrderStatus;
  shortTitle: string;
  subLabel: string;
}[] = [
  {
    status: 'pending_separation',
    shortTitle: '1. Pedido Recebido',
    subLabel: 'Registrado na Central',
  },
  {
    status: 'separating',
    shortTitle: '2. Separando Galões',
    subLabel: 'Conferência & Lacres',
  },
  {
    status: 'ready_or_out',
    shortTitle: '3. Pronto / Em Rota',
    subLabel: 'Balcão Express / Saiu',
  },
  {
    status: 'completed',
    shortTitle: '4. Entregue / Retirado',
    subLabel: 'Concluído c/ Sucesso',
  },
];

export const OrdersHistoryView: React.FC<OrdersHistoryViewProps> = ({
  orders,
  settings,
  savedCustomerPhone,
  onRepeatOrder,
  onBackToStore,
}) => {
  const [lookupQuery, setLookupQuery] = useState(
    savedCustomerPhone ? formatPhone(savedCustomerPhone) : ''
  );
  const [reorderedId, setReorderedId] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    const raw = lookupQuery.trim();
    if (!raw) return true;
    const digits = normalizePhone(raw);
    const matchesPhone =
      digits.length >= 4 && normalizePhone(order.customerPhone).includes(digits);
    const matchesId = order.id.toLowerCase().includes(raw.toLowerCase());
    const matchesName = order.customerName.toLowerCase().includes(raw.toLowerCase());
    return matchesPhone || matchesId || matchesName;
  });

  const handleRepeat = (order: Order) => {
    setReorderedId(order.id);
    onRepeatOrder(order);
    setTimeout(() => setReorderedId(null), 2000);
  };

  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      {/* Header & Back Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-zinc-200 mb-6">
        <div>
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-[#E3262E] mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#E3262E]" />
            <span>Voltar para o Catálogo de Produtos</span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-zinc-900">
              Rastrear Pedido & Retirada Expressa
            </h1>
            <span className="text-xs font-mono font-extrabold uppercase bg-[#FFFBEB] border border-[#FFBE00] text-[#E3262E] px-2.5 py-1 rounded-md">
              BALCÃO EXPRESS SEM FILA & DELIVERY
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 mt-1">
            Acompanhe em tempo real se seus galões de limpeza já estão sendo separados e lacrados no estoque ou prontos para retirada rápida.
          </p>
        </div>

        {/* Lookup by WhatsApp or Order Number */}
        <div className="w-full lg:w-96 bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
          <label
            htmlFor="order-phone-lookup"
            className="block text-xs font-extrabold text-zinc-900 mb-1.5"
          >
            Consultar por WhatsApp, Nome ou Nº do Pedido
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-[#E3262E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="order-phone-lookup"
              type="text"
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              placeholder="Ex: (65) 99999-9999 ou #LMP-1042"
              className="w-full pl-9 pr-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-zinc-500">
            <span>Testar busca:</span>
            <button
              type="button"
              onClick={() => setLookupQuery('#LMP-1042')}
              className="text-[#E3262E] font-mono font-bold hover:underline cursor-pointer"
            >
              #LMP-1042 (Em Separação)
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setLookupQuery('#LMP-1041')}
              className="text-zinc-900 font-mono font-bold hover:underline cursor-pointer"
            >
              #LMP-1041 (Pronto Retirada)
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setLookupQuery('')}
              className="text-zinc-600 hover:underline cursor-pointer"
            >
              Todos ({orders.length})
            </button>
          </div>
        </div>
      </div>

      {/* Express Pickup Store Advantage Banner */}
      <div className="bg-[#FDF6E2] border border-[#F3E3B2] rounded-2xl p-4 sm:p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFBE00] text-zinc-950 flex items-center justify-center shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <strong className="text-zinc-950 block font-extrabold">
              Separação Técnica de Galões 5L & 2L
            </strong>
            <span className="text-zinc-700">
              Todos os galões de cloro, limpa pisos e sabão passam por conferência de lote e lacre de segurança.
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E3262E] text-white flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <strong className="text-zinc-950 block font-extrabold">
              Balcão Express Limper MT (Sem Fila)
            </strong>
            <span className="text-zinc-700">
              Quando o status marcar &ldquo;Pronto no Balcão&rdquo;, basta informar a senha do pedido e carregar direto no carro.
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-zinc-300 text-zinc-900 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5 text-[#E3262E]" />
          </div>
          <div className="text-xs">
            <strong className="text-zinc-950 block font-extrabold">
              Recompra Inteligente em 1 Clique
            </strong>
            <span className="text-zinc-700">
              Acabou o estoque de limpeza da casa ou empresa? Recarregue os mesmos produtos no carrinho instantaneamente.
            </span>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center max-w-lg mx-auto">
          <ShoppingBag className="w-10 h-10 text-[#E3262E] mx-auto mb-3" />
          <h2 className="font-display text-lg font-extrabold text-zinc-900 mb-1">
            Nenhum pedido localizado para esta busca
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mb-5">
            Verifique o número de WhatsApp ou código digitado, ou clique abaixo para visualizar todos os pedidos registrados.
          </p>
          <button
            type="button"
            onClick={() => setLookupQuery('')}
            className="px-4 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-xs font-extrabold rounded-xl cursor-pointer"
          >
            Mostrar Todos os Pedidos ({orders.length})
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOrders.map((order) => {
            const statusMeta = ORDER_STATUS_META[order.status];
            const currentStep = statusMeta.step;
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
                className="bg-white rounded-2xl border border-zinc-200 hover:border-[#FFBE00] p-5 sm:p-6 flex flex-col justify-between shadow-2xs transition-colors"
              >
                <div>
                  {/* Order Top Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200 mb-4">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="font-mono text-base font-extrabold text-zinc-950">
                        {order.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{dateFormatted}</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#E3262E]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{statusMeta.shortLabel}</span>
                    </div>
                  </div>

                  {/* 4-Stage Real-Time Cleaning Order & Pickup Progress Stepper */}
                  <div className="bg-[#FAFAFA] border border-zinc-200/90 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-zinc-950">
                        {statusMeta.cleaningStageTitle}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#B45309]">
                        Etapa {currentStep} de 4
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 mb-3.5">
                      {statusMeta.cleaningStageDesc}
                    </p>

                    <div className="grid grid-cols-4 gap-2">
                      {TRACKING_STEPS.map((st, idx) => {
                        const stepNum = idx + 1;
                        const isDone = stepNum <= currentStep;
                        const isCurrent = stepNum === currentStep;
                        return (
                          <div key={st.status} className="space-y-1.5">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                isCurrent
                                  ? 'bg-[#E3262E]'
                                  : isDone
                                  ? 'bg-[#FFBE00]'
                                  : 'bg-zinc-200'
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
                            <div className="text-[9px] text-zinc-500 hidden sm:block">
                              {st.subLabel}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fast-Pickup Pass / Delivery Logistics Box */}
                  <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      {order.deliveryType === 'pickup' ? (
                        <Store className="w-4 h-4 text-[#E3262E] shrink-0 mt-0.5" />
                      ) : (
                        <Truck className="w-4 h-4 text-[#E3262E] shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-extrabold text-zinc-950">
                          {order.deliveryType === 'pickup'
                            ? 'Retirada Expressa no Balcão Limper MT (Sem Fila)'
                            : `Entrega Delivery · ${order.address?.neighborhood || 'Cuiabá/VG'}`}
                        </div>
                        <div className="text-zinc-700 mt-0.5">
                          {order.estimatedTime ||
                            (order.deliveryType === 'pickup'
                              ? `Local: ${settings.storeAddress}`
                              : `${order.address?.street}, ${order.address?.number} - ${order.address?.city}`)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-zinc-300 rounded-lg px-3 py-1.5 shrink-0 text-left sm:text-right">
                      <div className="text-[10px] font-mono uppercase text-zinc-500">
                        SENHA BALCÃO / LOTE
                      </div>
                      <div className="font-mono text-xs font-extrabold text-[#E3262E]">
                        {order.pickupCode || order.id}
                      </div>
                    </div>
                  </div>

                  {/* Customer & Payment Details */}
                  <div className="text-xs text-zinc-600 space-y-1 mb-4">
                    <div>
                      <strong className="text-zinc-900">Cliente:</strong> {order.customerName}{' '}
                      <span className="font-mono text-zinc-500">
                        · {formatPhone(order.customerPhone)}
                      </span>
                    </div>
                    {order.deliveryType === 'pickup' && (
                      <div className="flex items-center gap-1 text-zinc-600">
                        <MapPin className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
                        <span>{settings.storeAddress}</span>
                      </div>
                    )}
                    <div>
                      <strong className="text-zinc-900">Pagamento:</strong>{' '}
                      {formatPaymentMethodLabel(order)}
                    </div>
                  </div>

                  {/* Itemized Cleaning Products Breakdown */}
                  <div className="bg-[#FAFAFA] rounded-xl p-3.5 border border-zinc-200/80 space-y-2 mb-5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      <span>
                        Produtos de Limpeza ({order.items.reduce((acc, i) => acc + i.quantity, 0)}{' '}
                        unid.)
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Lacre Conferido</span>
                      </span>
                    </div>
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
                </div>

                {/* Order Footer Totals & 1-Click Reorder Action */}
                <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-zinc-500">
                      Subtotal {formatCurrency(order.subtotal)}
                      {order.deliveryFee > 0 && ` + Frete ${formatCurrency(order.deliveryFee)}`}
                    </div>
                    <div className="text-lg font-mono font-extrabold text-zinc-900 tabular-nums">
                      Total: {formatCurrency(order.total)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
                          <span>Enviado ao Carrinho!</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4 text-[#E3262E]" />
                          <span>Refazer Pedido / Enviar ao Carrinho</span>
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
    </section>
  );
};
