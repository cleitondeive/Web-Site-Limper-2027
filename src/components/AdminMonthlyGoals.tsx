import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import { MonthlySalesGoal, Order } from '../types/commerce';
import {
  evaluateMonthlySalesGoalProgress,
  formatCurrency,
  validateMonthlySalesGoalDraft,
} from '../utils/commerce';

interface AdminMonthlyGoalsProps {
  orders: readonly Order[];
  monthlySalesGoals: readonly MonthlySalesGoal[];
  onSaveGoal: (goal: MonthlySalesGoal) => void;
  currentActorName?: string;
}

const STATUS_STYLE_MAP = {
  achieved: 'text-emerald-700',
  on_track: 'text-emerald-700',
  in_progress: 'text-amber-700',
  behind: 'text-rose-700',
} as const;

export const AdminMonthlyGoals: React.FC<AdminMonthlyGoalsProps> = ({
  orders,
  monthlySalesGoals,
  onSaveGoal,
  currentActorName,
}) => {
  const report = useMemo(
    () =>
      evaluateMonthlySalesGoalProgress({
        orders,
        goals: monthlySalesGoals,
      }),
    [orders, monthlySalesGoals]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [revenueInput, setRevenueInput] = useState<string>(
    String(report.goal.revenueTarget)
  );
  const [ordersInput, setOrdersInput] = useState<string>(
    String(report.goal.ordersTarget)
  );
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setRevenueInput(String(report.goal.revenueTarget));
      setOrdersInput(String(report.goal.ordersTarget));
    }
  }, [report.goal.revenueTarget, report.goal.ordersTarget, isEditing]);

  useEffect(() => {
    if (!saveFeedback) return;
    const timer = window.setTimeout(() => setSaveFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [saveFeedback]);

  const handleToggleEdit = () => {
    setFormErrors([]);
    if (!isEditing) {
      setRevenueInput(String(report.goal.revenueTarget));
      setOrdersInput(String(report.goal.ordersTarget));
    }
    setIsEditing((prev) => !prev);
  };

  const handleApplyPreset = (revenue: number, ordersCount: number) => {
    setFormErrors([]);
    setRevenueInput(String(Math.round(revenue * 100) / 100));
    setOrdersInput(String(Math.max(1, Math.round(ordersCount))));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRevenue = Number(String(revenueInput).replace(',', '.'));
    const parsedOrders = Number(String(ordersInput).replace(',', '.'));
    const validation = validateMonthlySalesGoalDraft({
      revenueTarget: parsedRevenue,
      ordersTarget: parsedOrders,
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    const nextGoal: MonthlySalesGoal = {
      monthKey: report.monthKey,
      revenueTarget: Math.round(parsedRevenue * 100) / 100,
      ordersTarget: Math.round(parsedOrders),
      updatedAt: new Date().toISOString(),
      updatedBy: currentActorName || 'Administrador',
    };

    onSaveGoal(nextGoal);
    setFormErrors([]);
    setIsEditing(false);
    setSaveFeedback(`Metas de ${report.monthLabel} atualizadas com sucesso.`);
  };

  const suggestedRevenue25 = Math.max(
    1000,
    Math.ceil((report.revenue.realized * 1.25) / 100) * 100
  );
  const suggestedOrders25 = Math.max(
    5,
    Math.ceil(report.orders.realized * 1.25)
  );

  return (
    <section
      id="admin-monthly-goals"
      data-testid="admin-monthly-goals"
      aria-label="Configuração de Metas do Mês"
      className="bg-white rounded-2xl border border-zinc-200 overflow-hidden"
    >
      {/* Header Row */}
      <div className="px-6 py-4 border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-zinc-900 shrink-0" />
            <h2 className="font-display text-base font-extrabold text-zinc-950 tracking-tight">
              Configuração de Metas
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-800">
              {report.monthLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Dia {report.dayOfMonth} de {report.daysInMonth} (
              {report.daysRemaining === 0
                ? 'último dia'
                : `${report.daysRemaining} ${
                    report.daysRemaining === 1 ? 'dia restante' : 'dias restantes'
                  }`}
              )
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {report.isConfigured
                ? `Meta personalizada${
                    report.goal.updatedBy ? ` por ${report.goal.updatedBy}` : ''
                  }`
                : 'Meta inicial sugerida (personalize abaixo)'}
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="toggle-monthly-goals-form-btn"
          onClick={handleToggleEdit}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            isEditing
              ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200'
              : 'bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00]'
          }`}
        >
          {isEditing ? (
            <>
              <X className="w-3.5 h-3.5" />
              <span>Fechar Edição</span>
            </>
          ) : (
            <>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Configurar Metas</span>
            </>
          )}
        </button>
      </div>

      {/* Inline Feedback Banner */}
      {saveFeedback && (
        <div
          role="status"
          data-testid="monthly-goals-saved-toast"
          className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200/80 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveFeedback}</span>
          </span>
          <button
            type="button"
            onClick={() => setSaveFeedback(null)}
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
            aria-label="Fechar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Collapsible Goal Configuration Form */}
      {isEditing && (
        <form
          onSubmit={handleSave}
          data-testid="monthly-goals-form"
          className="px-6 py-5 bg-[#FAFAFA] border-b border-zinc-200/80 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-zinc-900">
                Definir metas para {report.monthLabel}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                O progresso abaixo é recalculado em tempo real sobre todos os pedidos reais registrados neste mês.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(suggestedRevenue25, suggestedOrders25)
                }
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-[11px] font-semibold text-zinc-700 cursor-pointer transition-colors"
              >
                +25% sobre atual
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(2500, 20)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-[11px] font-semibold text-zinc-700 cursor-pointer transition-colors"
              >
                R$ 2.500 / 20 ped.
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(5000, 40)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-[11px] font-semibold text-zinc-700 cursor-pointer transition-colors"
              >
                R$ 5.000 / 40 ped.
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-5 space-y-1">
              <label
                htmlFor="monthly-goal-revenue-input"
                className="block text-xs font-semibold text-zinc-800"
              >
                Meta de Faturamento Mensal (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-zinc-400">
                  R$
                </span>
                <input
                  id="monthly-goal-revenue-input"
                  type="number"
                  min="1"
                  step="0.01"
                  value={revenueInput}
                  onChange={(e) => setRevenueInput(e.target.value)}
                  placeholder="Ex: 3000"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-zinc-300 focus:border-zinc-950 focus:outline-none rounded-xl font-mono text-sm font-bold text-zinc-950 tabular-nums"
                />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-1">
              <label
                htmlFor="monthly-goal-orders-input"
                className="block text-xs font-semibold text-zinc-800"
              >
                Meta de Número de Pedidos
              </label>
              <input
                id="monthly-goal-orders-input"
                type="number"
                min="1"
                step="1"
                value={ordersInput}
                onChange={(e) => setOrdersInput(e.target.value)}
                placeholder="Ex: 25"
                className="w-full px-3 py-2.5 bg-white border border-zinc-300 focus:border-zinc-950 focus:outline-none rounded-xl font-mono text-sm font-bold text-zinc-950 tabular-nums"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-2">
              <button
                type="submit"
                data-testid="save-monthly-goals-btn"
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#FFBE00] hover:bg-[#F5B000] text-zinc-950 text-xs font-extrabold cursor-pointer whitespace-nowrap transition-colors"
              >
                Salvar Metas
              </button>
              <button
                type="button"
                onClick={handleToggleEdit}
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>

          {formErrors.length > 0 && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <ul className="space-y-0.5">
                {formErrors.map((err) => (
                  <li key={err} className="font-medium">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      )}

      {/* 2-Column Live Progress Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200/80">
        {/* Revenue Goal Progress */}
        <div
          data-testid="goal-revenue-progress"
          className="p-6 space-y-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-700">
              Meta de Faturamento
            </span>
            <span
              className={`text-xs font-bold inline-flex items-center gap-1 ${
                STATUS_STYLE_MAP[report.revenue.statusTone]
              }`}
            >
              {report.revenue.achieved && (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{report.revenue.statusLabel}</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
              <span className="font-mono text-2xl font-extrabold text-zinc-950 tabular-nums tracking-tight">
                {formatCurrency(report.revenue.realized)}
              </span>
              <span className="font-mono text-xs text-zinc-500 tabular-nums">
                de {formatCurrency(report.revenue.target)}
              </span>
            </div>
            <span className="font-mono text-lg font-extrabold text-zinc-950 tabular-nums shrink-0">
              {report.revenue.progressPct.toFixed(1).replace('.', ',')}%
            </span>
          </div>

          {/* Progress Track with Calendar Pace Marker */}
          <div className="relative pt-1">
            <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  report.revenue.achieved ? 'bg-emerald-600' : 'bg-[#EAB308]'
                }`}
                style={{ width: `${report.revenue.clampedPct}%` }}
              />
            </div>
            {report.expectedMonthPacePct > 4 &&
              report.expectedMonthPacePct < 98 && (
                <div
                  title={`Ritmo esperado do mês hoje: ${report.expectedMonthPacePct.toFixed(0)}%`}
                  className="absolute top-0 bottom-0 w-0.5 bg-zinc-400/80 pointer-events-none"
                  style={{ left: `${report.expectedMonthPacePct}%` }}
                />
              )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            {report.revenue.achieved ? (
              <span className="font-semibold text-emerald-700 inline-flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  Meta batida
                  {report.revenue.surplus > 0
                    ? ` (+${formatCurrency(report.revenue.surplus)} acima)`
                    : '!'}
                </span>
              </span>
            ) : (
              <span className="font-mono tabular-nums">
                Faltam{' '}
                <strong className="text-zinc-800">
                  {formatCurrency(report.revenue.remaining)}
                </strong>
              </span>
            )}

            <span className="font-mono tabular-nums text-[11px] text-zinc-500">
              {report.revenue.achieved
                ? `Ticket médio mês: ${formatCurrency(report.monthAvgTicket)}`
                : `Necessário: ${formatCurrency(report.revenue.dailyPaceNeeded)}/dia`}
            </span>
          </div>
        </div>

        {/* Orders Count Goal Progress */}
        <div
          data-testid="goal-orders-progress"
          className="p-6 space-y-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-700">
              Meta de Número de Pedidos
            </span>
            <span
              className={`text-xs font-bold inline-flex items-center gap-1 ${
                STATUS_STYLE_MAP[report.orders.statusTone]
              }`}
            >
              {report.orders.achieved && (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{report.orders.statusLabel}</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
              <span className="font-mono text-2xl font-extrabold text-zinc-950 tabular-nums tracking-tight">
                {report.orders.realized}
              </span>
              <span className="font-mono text-xs text-zinc-500 tabular-nums">
                de {report.orders.target}{' '}
                {report.orders.target === 1 ? 'pedido' : 'pedidos'}
              </span>
            </div>
            <span className="font-mono text-lg font-extrabold text-zinc-950 tabular-nums shrink-0">
              {report.orders.progressPct.toFixed(1).replace('.', ',')}%
            </span>
          </div>

          {/* Progress Track with Calendar Pace Marker */}
          <div className="relative pt-1">
            <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  report.orders.achieved ? 'bg-emerald-600' : 'bg-zinc-900'
                }`}
                style={{ width: `${report.orders.clampedPct}%` }}
              />
            </div>
            {report.expectedMonthPacePct > 4 &&
              report.expectedMonthPacePct < 98 && (
                <div
                  title={`Ritmo esperado do mês hoje: ${report.expectedMonthPacePct.toFixed(0)}%`}
                  className="absolute top-0 bottom-0 w-0.5 bg-zinc-400/80 pointer-events-none"
                  style={{ left: `${report.expectedMonthPacePct}%` }}
                />
              )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            {report.orders.achieved ? (
              <span className="font-semibold text-emerald-700 inline-flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  Meta batida
                  {report.orders.surplus > 0
                    ? ` (+${report.orders.surplus} ${
                        report.orders.surplus === 1 ? 'pedido' : 'pedidos'
                      } acima)`
                    : '!'}
                </span>
              </span>
            ) : (
              <span className="font-mono tabular-nums">
                Faltam{' '}
                <strong className="text-zinc-800">
                  {report.orders.remaining}{' '}
                  {report.orders.remaining === 1 ? 'pedido' : 'pedidos'}
                </strong>
              </span>
            )}

            <span className="font-mono tabular-nums text-[11px] text-zinc-500">
              {report.orders.achieved
                ? `${report.monthUnitsSold} un. vendidas no mês`
                : `Necessário: ${report.orders.dailyPaceNeeded
                    .toFixed(1)
                    .replace('.', ',')} ped./dia`}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
