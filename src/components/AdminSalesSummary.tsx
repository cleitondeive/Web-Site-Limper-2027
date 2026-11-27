import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  BarChart3,
  CreditCard,
  DollarSign,
  Layers,
  Package,
  PieChart as PieChartIcon,
  Plus,
  ShoppingBag,
  TrendingUp,
  Truck,
} from 'lucide-react';
import {
  Category,
  DeletedProductEntry,
  MonthlySalesGoal,
  Order,
  Product,
} from '../types/commerce';
import {
  CategorySalesSlice,
  SalesDayPoint,
  SalesWindowMode,
  buildSalesSummaryAnalytics,
  formatCurrency,
} from '../utils/commerce';
import { AdminMonthlyGoals } from './AdminMonthlyGoals';

interface AdminSalesSummaryProps {
  orders: readonly Order[];
  products: readonly Product[];
  categories: readonly Category[];
  deletedProducts?: readonly DeletedProductEntry[];
  monthlySalesGoals: readonly MonthlySalesGoal[];
  onSaveMonthlySalesGoal: (goal: MonthlySalesGoal) => void;
  currentActorName?: string;
  onOpenManualPos?: () => void;
  onGoToKanban?: () => void;
}

interface BarTooltipPayloadItem {
  payload: SalesDayPoint;
}

interface BarCustomTooltipProps {
  active?: boolean;
  payload?: BarTooltipPayloadItem[];
}

const DailyOrdersTooltip: React.FC<BarCustomTooltipProps> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-zinc-950 text-white rounded-xl px-4 py-3 shadow-xl border border-zinc-800 text-xs space-y-1.5 min-w-[190px]">
      <p className="font-bold text-[#FFBE00] tracking-tight">
        {point.fullDateLabel}
      </p>
      <div className="flex items-center justify-between gap-5">
        <span className="text-zinc-400">Pedidos</span>
        <span className="font-mono font-extrabold tabular-nums">
          {point.ordersCount}
        </span>
      </div>
      <div className="flex items-center justify-between gap-5">
        <span className="text-zinc-400">Itens vendidos</span>
        <span className="font-mono font-bold tabular-nums">
          {point.unitsCount} un.
        </span>
      </div>
      <div className="flex items-center justify-between gap-5 pt-1.5 border-t border-zinc-800">
        <span className="text-zinc-400">Faturamento</span>
        <span className="font-mono font-extrabold text-emerald-400 tabular-nums">
          {formatCurrency(point.revenue)}
        </span>
      </div>
    </div>
  );
};

interface DonutTooltipPayloadItem {
  payload: CategorySalesSlice;
}

interface DonutCustomTooltipProps {
  active?: boolean;
  payload?: DonutTooltipPayloadItem[];
  metric: 'units' | 'revenue';
}

const CategoryDonutTooltip: React.FC<DonutCustomTooltipProps> = ({
  active,
  payload,
  metric,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const slice = payload[0].payload;
  const pct = metric === 'units' ? slice.shareUnitsPct : slice.shareRevenuePct;
  return (
    <div className="bg-zinc-950 text-white rounded-xl px-4 py-3 shadow-xl border border-zinc-800 text-xs space-y-1.5 min-w-[205px]">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-xs shrink-0"
          style={{ backgroundColor: slice.color }}
        />
        <p className="font-bold text-white truncate">{slice.categoryName}</p>
      </div>
      <div className="flex items-center justify-between gap-5">
        <span className="text-zinc-400">Unidades vendidas</span>
        <span className="font-mono font-extrabold tabular-nums">
          {slice.unitsSold} un.
        </span>
      </div>
      <div className="flex items-center justify-between gap-5">
        <span className="text-zinc-400">Pedidos c/ linha</span>
        <span className="font-mono font-bold tabular-nums">
          {slice.ordersCount}
        </span>
      </div>
      <div className="flex items-center justify-between gap-5">
        <span className="text-zinc-400">Receita</span>
        <span className="font-mono font-extrabold text-emerald-400 tabular-nums">
          {formatCurrency(slice.revenue)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-5 pt-1.5 border-t border-zinc-800">
        <span className="text-zinc-400">Participação</span>
        <span className="font-mono font-extrabold text-[#FFBE00] tabular-nums">
          {pct.toFixed(1).replace('.', ',')}%
        </span>
      </div>
    </div>
  );
};

export const AdminSalesSummary: React.FC<AdminSalesSummaryProps> = ({
  orders,
  products,
  categories,
  deletedProducts = [],
  monthlySalesGoals,
  onSaveMonthlySalesGoal,
  currentActorName,
  onOpenManualPos,
  onGoToKanban,
}) => {
  const [windowMode, setWindowMode] = useState<SalesWindowMode>('auto');
  const [barMetric, setBarMetric] = useState<'orders' | 'revenue' | 'units'>(
    'orders'
  );
  const [donutMetric, setDonutMetric] = useState<'units' | 'revenue'>('units');
  const [categoryScope, setCategoryScope] = useState<'all' | 'window_7d'>('all');
  const [highlightedCategoryId, setHighlightedCategoryId] = useState<string | null>(
    null
  );

  const analytics = useMemo(
    () =>
      buildSalesSummaryAnalytics({
        orders,
        products,
        categories,
        deletedProducts,
        windowMode,
        categoryScope,
      }),
    [orders, products, categories, deletedProducts, windowMode, categoryScope]
  );

  const activeCategorySlice = useMemo(() => {
    if (!highlightedCategoryId) return null;
    return (
      analytics.categoryBreakdown.find(
        (c) => c.categoryId === highlightedCategoryId
      ) || null
    );
  }, [analytics.categoryBreakdown, highlightedCategoryId]);

  const showWindowSwitcher =
    orders.length > 0 && !analytics.hasOrdersInCurrent7Days;

  const barDataKey =
    barMetric === 'orders'
      ? 'ordersCount'
      : barMetric === 'revenue'
        ? 'revenue'
        : 'unitsCount';

  const formatBarTopLabel = (rawValue: unknown): string => {
    const val = Number(rawValue);
    if (!Number.isFinite(val) || val <= 0) return '';
    if (barMetric === 'revenue') {
      return `R$${Math.round(val)}`;
    }
    return String(val);
  };

  return (
    <div
      id="admin-sales-summary"
      data-testid="admin-sales-summary"
      className="space-y-5 no-print"
    >
      {/* Executive Hero Banner — Dark Charcoal Signature Bar */}
      <header className="bg-zinc-950 text-white rounded-2xl px-6 py-5 border border-zinc-900 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-semibold text-[#FFBE00] tracking-wide">
            Inteligência Comercial · Limper MT
          </p>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight text-balance">
            Resumo de Vendas &amp; Performance do Catálogo
          </h1>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-400 pt-0.5">
            <span className="font-mono tabular-nums text-zinc-200 font-semibold">
              Janela {analytics.windowStartLabel} a {analytics.windowEndLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {analytics.allTimeOrdersCount}{' '}
              {analytics.allTimeOrdersCount === 1
                ? 'pedido registrado'
                : 'pedidos registrados'}
            </span>
            {analytics.topCategory && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Linha líder:{' '}
                  <strong className="font-semibold text-white">
                    {analytics.topCategory.categoryName}
                  </strong>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {showWindowSwitcher && (
            <div
              role="group"
              aria-label="Janela de análise de 7 dias"
              className="inline-flex items-center p-1 bg-zinc-900 rounded-xl border border-zinc-800"
            >
              <button
                type="button"
                onClick={() => setWindowMode('latest_active_7d')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  analytics.resolvedWindowMode === 'latest_active_7d'
                    ? 'bg-[#FFBE00] text-zinc-950'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Semana ativa
              </button>
              <button
                type="button"
                onClick={() => setWindowMode('rolling_7d')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  analytics.resolvedWindowMode === 'rolling_7d'
                    ? 'bg-[#FFBE00] text-zinc-950'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Últimos 7 dias
              </button>
            </div>
          )}

          {onGoToKanban && (
            <button
              type="button"
              onClick={onGoToKanban}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
            >
              <span>Ver Kanban</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenManualPos && (
            <button
              type="button"
              onClick={onOpenManualPos}
              className="px-4 py-2 rounded-xl bg-[#FFBE00] hover:bg-[#F5B000] text-zinc-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Lançar Pedido PDV</span>
            </button>
          )}
        </div>
      </header>

      {/* Configuração de Metas do Mês Vigente (Faturamento & Pedidos sobre dados reais) */}
      <AdminMonthlyGoals
        orders={orders}
        monthlySalesGoals={monthlySalesGoals}
        onSaveGoal={onSaveMonthlySalesGoal}
        currentActorName={currentActorName}
      />

      {orders.length === 0 ? (
        <section className="bg-white rounded-2xl border border-zinc-200 p-10 text-center space-y-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-600 flex items-center justify-center mx-auto">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="font-display text-base font-extrabold text-zinc-950">
              Nenhum pedido registrado para análise ainda
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Assim que novos pedidos chegarem pela vitrine ou forem lançados no balcão PDV, esta central exibirá o volume dos últimos 7 dias, as categorias mais vendidas e o ranking de produtos.
            </p>
          </div>
          {onOpenManualPos && (
            <button
              type="button"
              onClick={onOpenManualPos}
              className="px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Lançar Primeiro Pedido PDV</span>
            </button>
          )}
        </section>
      ) : (
        <>
          {/* 4-Column Executive KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold text-zinc-500">
                  Faturamento (7 dias)
                </p>
                <p className="font-mono text-2xl font-extrabold text-zinc-950 tabular-nums tracking-tight">
                  {formatCurrency(analytics.periodRevenue)}
                </p>
                <p className="text-xs text-zinc-500 font-mono tabular-nums">
                  Geral: {formatCurrency(analytics.allTimeRevenue)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-5 flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold text-zinc-500">
                  Pedidos nos 7 Dias
                </p>
                <p className="font-mono text-2xl font-extrabold text-zinc-950 tabular-nums tracking-tight">
                  {analytics.periodOrdersCount}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {analytics.peakDay
                    ? `Pico em ${analytics.peakDay.shortDate} (${analytics.peakDay.ordersCount} ${
                        analytics.peakDay.ordersCount === 1 ? 'pedido' : 'pedidos'
                      })`
                    : 'Sem pedidos nesta janela'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-5 flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold text-zinc-500">
                  Ticket Médio (7 dias)
                </p>
                <p className="font-mono text-2xl font-extrabold text-emerald-700 tabular-nums tracking-tight">
                  {formatCurrency(analytics.periodAvgTicket)}
                </p>
                <p className="text-xs text-zinc-500 font-mono tabular-nums">
                  {analytics.periodUnitsCount} unidades no período
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-5 flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold text-zinc-500">
                  Categoria Líder
                </p>
                <p
                  title={analytics.topCategory?.categoryName || '—'}
                  className="font-display text-lg font-extrabold text-zinc-950 truncate leading-8"
                >
                  {analytics.topCategory?.categoryName || '—'}
                </p>
                <p className="text-xs text-zinc-500 font-mono tabular-nums">
                  {analytics.topCategory
                    ? `${analytics.topCategory.shareUnitsPct
                        .toFixed(1)
                        .replace('.', ',')}% · ${analytics.topCategory.unitsSold} un.`
                    : 'Sem vendas ainda'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-950 text-[#FFBE00] flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Primary Charts Grid: 7-Day Bar Chart + Best-Selling Categories Donut */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
            {/* LEFT: 7-Day Orders Bar Chart */}
            <section
              data-testid="sales-7d-bar-panel"
              className="xl:col-span-7 bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col justify-between gap-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <h2 className="font-display text-base font-extrabold text-zinc-950">
                    Pedidos nos Últimos 7 Dias
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {analytics.resolvedWindowMode === 'latest_active_7d'
                      ? `Últimos 7 dias com movimento (${analytics.windowStartLabel} a ${analytics.windowEndLabel})`
                      : analytics.peakDay
                        ? `Maior movimento em ${analytics.peakDay.fullDateLabel} · ${analytics.peakDay.ordersCount} ${
                            analytics.peakDay.ordersCount === 1 ? 'pedido' : 'pedidos'
                          }`
                        : 'Nenhum pedido nos últimos 7 dias corridos'}
                  </p>
                </div>

                <div
                  role="group"
                  aria-label="Métrica do gráfico de barras"
                  className="inline-flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200/80"
                >
                  <button
                    type="button"
                    onClick={() => setBarMetric('orders')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      barMetric === 'orders'
                        ? 'bg-white text-zinc-950 shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    Pedidos
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarMetric('revenue')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      barMetric === 'revenue'
                        ? 'bg-white text-zinc-950 shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    Faturamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarMetric('units')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      barMetric === 'units'
                        ? 'bg-white text-zinc-950 shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    Unidades
                  </button>
                </div>
              </div>

              {/* Bar Chart Canvas */}
              <div className="w-full h-[300px]" data-testid="sales-bar-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.daysSeries}
                    margin={{ top: 24, right: 12, left: -12, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient id="limperBarPeak" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFBE00" stopOpacity={1} />
                        <stop offset="100%" stopColor="#CA8A04" stopOpacity={0.95} />
                      </linearGradient>
                      <linearGradient id="limperBarRegular" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#27272A" stopOpacity={1} />
                        <stop offset="100%" stopColor="#09090B" stopOpacity={0.95} />
                      </linearGradient>
                      <linearGradient id="limperBarToday" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#047857" stopOpacity={0.95} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 4"
                      stroke="#E4E4E7"
                    />
                    <XAxis
                      dataKey="shortDate"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: '#52525B',
                        fontSize: 12,
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                      dy={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      width={barMetric === 'revenue' ? 72 : 40}
                      tickFormatter={(val: number) =>
                        barMetric === 'revenue'
                          ? `R$${Math.round(val)}`
                          : String(val)
                      }
                      tick={{
                        fill: '#71717A',
                        fontSize: 11,
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: '#F4F4F5', radius: 8 }}
                      content={<DailyOrdersTooltip />}
                    />
                    <Bar
                      dataKey={barDataKey}
                      name={
                        barMetric === 'orders'
                          ? 'Pedidos'
                          : barMetric === 'revenue'
                            ? 'Faturamento'
                            : 'Unidades'
                      }
                      radius={[8, 8, 0, 0]}
                      maxBarSize={48}
                      isAnimationActive={false}
                    >
                      <LabelList
                        dataKey={barDataKey}
                        position="top"
                        formatter={formatBarTopLabel}
                        style={{
                          fill: '#27272A',
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, monospace',
                        }}
                      />
                      {analytics.daysSeries.map((entry) => {
                        const isPeak =
                          analytics.peakDay &&
                          analytics.peakDay.dateKey === entry.dateKey;
                        const fill = isPeak
                          ? 'url(#limperBarPeak)'
                          : entry.isToday
                            ? 'url(#limperBarToday)'
                            : 'url(#limperBarRegular)';
                        return <Cell key={entry.dateKey} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend + Period Total Bar */}
              <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-[#EAB308]" />
                    <span>Dia de maior volume</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-zinc-900" />
                    <span>Demais dias</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono tabular-nums font-semibold text-zinc-800">
                  <span>{analytics.periodOrdersCount} pedidos</span>
                  <span className="text-zinc-300" aria-hidden="true">
                    ·
                  </span>
                  <span>{analytics.periodUnitsCount} un.</span>
                  <span className="text-zinc-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-emerald-700 font-extrabold">
                    {formatCurrency(analytics.periodRevenue)}
                  </span>
                </div>
              </div>
            </section>

            {/* RIGHT: Best-Selling Categories Donut Chart */}
            <section
              data-testid="sales-categories-donut-panel"
              className="xl:col-span-5 bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col justify-between gap-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div className="space-y-0.5">
                  <h2 className="font-display text-base font-extrabold text-zinc-950">
                    Categorias Mais Vendidas
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {categoryScope === 'all'
                      ? `Performance geral do catálogo (${orders.length} ${
                          orders.length === 1 ? 'pedido' : 'pedidos'
                        })`
                      : `Período ${analytics.windowStartLabel}–${analytics.windowEndLabel}`}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <div
                    role="group"
                    aria-label="Escopo das categorias"
                    className="inline-flex items-center p-0.5 bg-zinc-100 rounded-lg border border-zinc-200/80"
                  >
                    <button
                      type="button"
                      onClick={() => setCategoryScope('all')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        categoryScope === 'all'
                          ? 'bg-white text-zinc-950 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Geral
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryScope('window_7d')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        categoryScope === 'window_7d'
                          ? 'bg-white text-zinc-950 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      7 dias
                    </button>
                  </div>

                  <div
                    role="group"
                    aria-label="Métrica do gráfico de rosca"
                    className="inline-flex items-center p-0.5 bg-zinc-100 rounded-lg border border-zinc-200/80"
                  >
                    <button
                      type="button"
                      onClick={() => setDonutMetric('units')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        donutMetric === 'units'
                          ? 'bg-white text-zinc-950 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Unid.
                    </button>
                    <button
                      type="button"
                      onClick={() => setDonutMetric('revenue')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        donutMetric === 'revenue'
                          ? 'bg-white text-zinc-950 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      R$
                    </button>
                  </div>
                </div>
              </div>

              {analytics.categoryBreakdown.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center space-y-2.5">
                  <PieChartIcon className="w-7 h-7 text-zinc-300" />
                  <p className="text-xs font-semibold text-zinc-600">
                    Nenhuma categoria vendida neste período
                  </p>
                  {categoryScope === 'window_7d' && (
                    <button
                      type="button"
                      onClick={() => setCategoryScope('all')}
                      className="text-xs font-bold text-amber-800 hover:underline cursor-pointer"
                    >
                      Mostrar performance geral do catálogo
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Donut Chart with Centered Metric */}
                  <div
                    className="relative w-full h-[225px]"
                    data-testid="sales-donut-chart"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.categoryBreakdown}
                          dataKey={
                            donutMetric === 'units' ? 'unitsSold' : 'revenue'
                          }
                          nameKey="categoryName"
                          cx="50%"
                          cy="50%"
                          innerRadius={64}
                          outerRadius={96}
                          paddingAngle={3}
                          cornerRadius={5}
                          stroke="none"
                          isAnimationActive={false}
                          onMouseEnter={(_, idx) => {
                            const slice = analytics.categoryBreakdown[idx];
                            if (slice) setHighlightedCategoryId(slice.categoryId);
                          }}
                          onMouseLeave={() => setHighlightedCategoryId(null)}
                        >
                          {analytics.categoryBreakdown.map((slice) => {
                            const dimmed =
                              highlightedCategoryId !== null &&
                              highlightedCategoryId !== slice.categoryId;
                            return (
                              <Cell
                                key={slice.categoryId}
                                fill={slice.color}
                                fillOpacity={dimmed ? 0.28 : 1}
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip
                          content={
                            <CategoryDonutTooltip metric={donutMetric} />
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Centered Donut Hole Metric */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-5">
                      <span className="font-mono text-lg font-extrabold text-zinc-950 tabular-nums leading-tight">
                        {activeCategorySlice
                          ? `${(donutMetric === 'units'
                              ? activeCategorySlice.shareUnitsPct
                              : activeCategorySlice.shareRevenuePct
                            )
                              .toFixed(1)
                              .replace('.', ',')}%`
                          : donutMetric === 'units'
                            ? analytics.totalUnitsSold
                            : formatCurrency(analytics.totalCategoryRevenue)}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-medium max-w-[115px] truncate mt-0.5">
                        {activeCategorySlice
                          ? activeCategorySlice.categoryName
                          : donutMetric === 'units'
                            ? 'un. vendidas'
                            : 'total vendas'}
                      </span>
                    </div>
                  </div>

                  {/* Category Share Ranking with Visual Proportion Bars */}
                  <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                    {analytics.categoryBreakdown.slice(0, 6).map((slice) => {
                      const isHighlighted =
                        highlightedCategoryId === slice.categoryId;
                      const pct =
                        donutMetric === 'units'
                          ? slice.shareUnitsPct
                          : slice.shareRevenuePct;
                      return (
                        <div
                          key={slice.categoryId}
                          onMouseEnter={() =>
                            setHighlightedCategoryId(slice.categoryId)
                          }
                          onMouseLeave={() => setHighlightedCategoryId(null)}
                          className={`py-2.5 px-1.5 space-y-1.5 transition-colors rounded-lg ${
                            isHighlighted ? 'bg-zinc-50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-xs shrink-0"
                                style={{ backgroundColor: slice.color }}
                              />
                              <span className="font-semibold text-zinc-900 truncate">
                                {slice.categoryName}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                              <span className="text-zinc-500 text-[11px]">
                                {donutMetric === 'units'
                                  ? `${slice.unitsSold} un.`
                                  : formatCurrency(slice.revenue)}
                              </span>
                              <span className="font-extrabold text-zinc-950 w-12 text-right">
                                {pct.toFixed(1).replace('.', ',')}%
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-200"
                              style={{
                                width: `${Math.min(100, Math.max(2, pct))}%`,
                                backgroundColor: slice.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Bottom Catalog Intelligence Row: Top Products + Delivery & Payment Mix */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Top Products Ranking */}
            <section
              data-testid="sales-top-products-panel"
              className="xl:col-span-7 bg-white rounded-2xl border border-zinc-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h2 className="font-display text-base font-extrabold text-zinc-950">
                    Produtos Mais Vendidos
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Ranking real por volume de saída para apoiar reposição de estoque
                  </p>
                </div>
                <Package className="w-4 h-4 text-zinc-400 shrink-0" />
              </div>

              {analytics.topProducts.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">
                  Nenhum produto contabilizado neste recorte.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[11px] font-semibold text-zinc-500">
                        <th className="py-2 pr-3 font-semibold">#</th>
                        <th className="py-2 pr-3 font-semibold">Produto</th>
                        <th className="py-2 pr-3 font-semibold hidden sm:table-cell">
                          Categoria
                        </th>
                        <th className="py-2 pr-3 text-right font-semibold">
                          Unid.
                        </th>
                        <th className="py-2 text-right font-semibold">
                          Receita
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-xs">
                      {analytics.topProducts.map((item, idx) => (
                        <tr
                          key={item.productKey}
                          className="hover:bg-zinc-50/80 transition-colors"
                        >
                          <td className="py-2.5 pr-3 font-mono font-bold text-zinc-400 tabular-nums w-8">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="py-2.5 pr-3 min-w-[180px]">
                            <p className="font-semibold text-zinc-900 truncate max-w-[260px]">
                              {item.title}
                            </p>
                            <p className="font-mono text-[11px] text-zinc-400">
                              {item.sku} · {item.ordersCount}{' '}
                              {item.ordersCount === 1 ? 'pedido' : 'pedidos'}
                            </p>
                          </td>
                          <td className="py-2.5 pr-3 text-zinc-600 hidden sm:table-cell whitespace-nowrap">
                            {item.categoryName}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono font-bold text-zinc-900 tabular-nums whitespace-nowrap">
                            {item.unitsSold} un.
                          </td>
                          <td className="py-2.5 text-right font-mono font-extrabold text-emerald-700 tabular-nums whitespace-nowrap">
                            {formatCurrency(item.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Delivery & Payment Channels Breakdown */}
            <section
              data-testid="sales-channels-panel"
              className="xl:col-span-5 bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col justify-between gap-6"
            >
              {/* Delivery Mix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-extrabold text-zinc-950">
                    Modalidade de Entrega
                  </h2>
                  <Truck className="w-4 h-4 text-zinc-400 shrink-0" />
                </div>

                <div className="space-y-3">
                  {analytics.deliverySplit.map((ch) => (
                    <div key={ch.key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-zinc-800">
                          {ch.label}
                        </span>
                        <span className="font-mono tabular-nums text-zinc-600">
                          <strong className="text-zinc-950">
                            {ch.ordersCount}
                          </strong>{' '}
                          · {ch.sharePct.toFixed(0)}% ·{' '}
                          {formatCurrency(ch.revenue)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ch.key === 'pickup' ? 'bg-[#EAB308]' : 'bg-zinc-900'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              ch.ordersCount > 0 ? Math.max(4, ch.sharePct) : 0
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Mix */}
              <div className="pt-5 border-t border-zinc-100 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-extrabold text-zinc-950">
                    Formas de Pagamento
                  </h2>
                  <CreditCard className="w-4 h-4 text-zinc-400 shrink-0" />
                </div>

                <div className="divide-y divide-zinc-100">
                  {analytics.paymentSplit.map((pm) => (
                    <div
                      key={pm.key}
                      className="py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-semibold text-zinc-800">
                        {pm.label}
                      </span>
                      <div className="flex items-center gap-3 font-mono tabular-nums">
                        <span className="text-zinc-500">
                          {pm.ordersCount}{' '}
                          {pm.ordersCount === 1 ? 'pedido' : 'pedidos'}
                        </span>
                        <span className="font-bold text-zinc-950">
                          {formatCurrency(pm.revenue)}
                        </span>
                        <span className="text-zinc-500 w-10 text-right">
                          {pm.sharePct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
