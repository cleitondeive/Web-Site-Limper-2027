import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Database,
  Download,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import {
  AdminUser,
  BackupReminderStyle,
  BackupScheduleConfig,
  CreateSecurityAuditEventInput,
  CustomerProfile,
  Order,
  SecurityAuditEvent,
  SecurityEventCategory,
  SecurityEventOutcome,
  SecurityLogDatePreset,
  SiteBackupPayload,
  SiteBackupSnapshot,
} from '../types/commerce';
import {
  ADMIN_ROLE_META,
  SECURITY_CATEGORY_LABELS,
  SECURITY_OUTCOME_META,
  auditCatalogHealth,
  auditCustomerTrackingIsolation,
  buildSecurityAuditCsv,
  filterSecurityAuditEvents,
  formatAdminActorLabel,
  formatBrDateFromYmd,
  resolveCustomerVisibleOrders,
  summarizeSecurityLogDates,
  toDateKeyYmd,
} from '../utils/commerce';
import { AdminBackupVault } from './AdminBackupVault';

interface AdminSecurityTabProps {
  orders: Order[];
  securityLogs: SecurityAuditEvent[];
  adminUsers?: AdminUser[];
  currentAdminUser?: AdminUser | null;
  initialActorFilter?: string;
  onClearInitialActorFilter?: () => void;
  siteBackups?: SiteBackupSnapshot[];
  backupSchedule?: BackupScheduleConfig;
  currentSitePayload?: SiteBackupPayload;
  onSaveSiteBackups?: (backups: SiteBackupSnapshot[]) => void;
  onSaveBackupSchedule?: (schedule: BackupScheduleConfig) => void;
  onPreviewBackupReminder?: (style: BackupReminderStyle) => void;
  onRestoreSiteBackup?: (snapshot: SiteBackupSnapshot) => void;
  onAutoRepairCatalog?: () => string[];
  isolationContext: {
    customerProfile: CustomerProfile;
    sessionOrderIds: string[];
    verifiedLookup: { orderId: string; phone: string } | null;
  };
  onRecordSecurityEvent: (input: CreateSecurityAuditEventInput) => void;
  onClearSecurityLogs: () => void;
}

export const AdminSecurityTab: React.FC<AdminSecurityTabProps> = ({
  orders,
  securityLogs,
  adminUsers = [],
  currentAdminUser = null,
  initialActorFilter = '',
  onClearInitialActorFilter,
  siteBackups = [],
  backupSchedule,
  currentSitePayload,
  onSaveSiteBackups,
  onSaveBackupSchedule,
  onPreviewBackupReminder,
  onRestoreSiteBackup,
  onAutoRepairCatalog,
  isolationContext,
  onRecordSecurityEvent,
  onClearSecurityLogs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | SecurityEventCategory>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | SecurityEventOutcome>('all');
  const [actorFilter, setActorFilter] = useState<string>(initialActorFilter || 'all');
  const [logDatePreset, setLogDatePreset] = useState<SecurityLogDatePreset>('all');
  const [logSpecificDate, setLogSpecificDate] = useState<string>('');
  const [backupJumpDate, setBackupJumpDate] = useState<string>('');
  const [selectedAuditSubject, setSelectedAuditSubject] = useState<string>('anonymous');
  const [auditRefreshTick, setAuditRefreshTick] = useState<number>(() => Date.now());
  const [confirmClearLogs, setConfirmClearLogs] = useState(false);
  const [auditFeedback, setAuditFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialActorFilter) {
      setActorFilter(initialActorFilter);
    }
  }, [initialActorFilter]);

  const isolationReport = useMemo(
    () => auditCustomerTrackingIsolation(orders, isolationContext, auditRefreshTick),
    [orders, isolationContext, auditRefreshTick]
  );

  const catalogHealth = useMemo(() => {
    if (!currentSitePayload) return null;
    return auditCatalogHealth({
      categories: currentSitePayload.categories,
      products: currentSitePayload.products,
      kits: currentSitePayload.kits,
      coupons: currentSitePayload.coupons,
      banners: currentSitePayload.banners,
      adminUsers: currentSitePayload.adminUsers,
      siteBackups,
    });
  }, [currentSitePayload, siteBackups]);

  const handleRunAutoRepair = () => {
    if (!onAutoRepairCatalog) return;
    const fixes = onAutoRepairCatalog();
    if (fixes.length > 0) {
      setAuditFeedback(`Auto-correção aplicada: ${fixes.join(' · ')}.`);
    } else {
      setAuditFeedback('Nenhuma inconsistência encontrada nos cadastros do sistema.');
    }
  };

  const logDateChips = useMemo(
    () => summarizeSecurityLogDates(securityLogs, 8),
    [securityLogs]
  );

  const filteredLogs = useMemo(
    () =>
      filterSecurityAuditEvents(securityLogs, {
        searchQuery,
        category: categoryFilter,
        outcome: outcomeFilter,
        actorUsername: actorFilter,
        datePreset: logDatePreset,
        specificDate: logSpecificDate,
      }),
    [
      securityLogs,
      searchQuery,
      categoryFilter,
      outcomeFilter,
      actorFilter,
      logDatePreset,
      logSpecificDate,
    ]
  );

  const activeLogDateKey = useMemo(() => {
    if (logDatePreset === 'specific' && logSpecificDate) return logSpecificDate;
    if (logDatePreset === 'today') return toDateKeyYmd(new Date(), true);
    if (logDatePreset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return toDateKeyYmd(y, true);
    }
    return '';
  }, [logDatePreset, logSpecificDate]);

  const matchingDateBackupsCount = useMemo(() => {
    if (!activeLogDateKey) return 0;
    return siteBackups.filter((b) => b.dateKey === activeLogDateKey).length;
  }, [siteBackups, activeLogDateKey]);

  const allowedCount = useMemo(
    () => securityLogs.filter((l) => l.outcome === 'allowed').length,
    [securityLogs]
  );
  const blockedCount = useMemo(
    () => securityLogs.filter((l) => l.outcome === 'blocked').length,
    [securityLogs]
  );

  const simulatedScopeView = useMemo(() => {
    if (selectedAuditSubject === 'anonymous') {
      const visible = resolveCustomerVisibleOrders({
        orders,
        customerProfile: null,
        sessionOrderIds: [],
        verifiedLookup: null,
      });
      return {
        label: 'Visitante Anônimo (Sem Login e Sem Consulta)',
        maskedTarget: 'Sem sessão identificada',
        visibleOrderIds: visible.map((o) => o.id),
        hiddenOtherOrdersCount: Math.max(0, orders.length - visible.length),
        isSafe: visible.length === 0,
      };
    }

    if (selectedAuditSubject === 'current_session') {
      const ids = isolationReport.activeSessionVisibleOrderIds;
      return {
        label: `Sessão Ativa na Vitrine (${isolationReport.activeSessionLabel})`,
        maskedTarget: isolationReport.activeSessionLabel,
        visibleOrderIds: ids,
        hiddenOtherOrdersCount: Math.max(0, orders.length - ids.length),
        isSafe: true,
      };
    }

    const check = isolationReport.customerChecks.find(
      (c) => c.customerKey === selectedAuditSubject
    );
    if (!check) {
      return {
        label: 'Visitante Anônimo (Sem Login)',
        maskedTarget: 'Sem sessão identificada',
        visibleOrderIds: [] as string[],
        hiddenOtherOrdersCount: orders.length,
        isSafe: true,
      };
    }

    return {
      label: `${check.customerName} (${check.maskedPhone})`,
      maskedTarget: check.maskedPhone,
      visibleOrderIds: check.visibleOrderIds,
      hiddenOtherOrdersCount: Math.max(0, orders.length - check.visibleOrderIds.length),
      isSafe: check.isolated,
    };
  }, [selectedAuditSubject, orders, isolationReport]);

  const handleRunManualAudit = () => {
    const now = Date.now();
    setAuditRefreshTick(now);
    const freshReport = auditCustomerTrackingIsolation(orders, isolationContext, now);
    onRecordSecurityEvent({
      category: 'tracking_access',
      outcome: freshReport.isFullyIsolated ? 'allowed' : 'blocked',
      actorLabel: currentAdminUser ? formatAdminActorLabel(currentAdminUser) : 'Administrador',
      actorUsername: currentAdminUser?.username,
      actorRole: currentAdminUser?.role,
      rawTarget: `${freshReport.distinctCustomersCount} clientes · ${freshReport.totalOrdersCount} pedidos`,
      summary: freshReport.isFullyIsolated
        ? 'Auditoria manual de isolamento concluída (100% isolado)'
        : 'Auditoria manual detectou falha de isolamento',
      detail: `Visitante anônimo: ${freshReport.guestUnverifiedVisibleCount} pedidos expostos; vazamentos cruzados: ${freshReport.totalCrossCustomerLeaks}.`,
      timestamp: new Date(now).toISOString(),
    });
    setAuditFeedback(
      freshReport.isFullyIsolated
        ? `Verificação concluída: ${freshReport.distinctCustomersCount} clientes testados sobre ${freshReport.totalOrdersCount} pedidos com 0 vazamentos.`
        : `Atenção: ${freshReport.ordersMissingPhoneCount} pedido(s) sem telefone válido para isolamento.`
    );
  };

  const handleExportCsv = () => {
    const source = filteredLogs.length > 0 ? filteredLogs : securityLogs;
    if (source.length === 0) return;
    const csvContent = buildSecurityAuditCsv(source);
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeLogDateKey
      ? `logs-acesso-seguranca-limper-mt-${activeLogDateKey}.csv`
      : 'relatorio-acesso-seguranca-limper-mt.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const scrollToSection = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getOutcomeBadgeClass = (outcome: SecurityEventOutcome) => {
    if (outcome === 'blocked') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (outcome === 'allowed') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#E3262E]">
              <ShieldCheck className="w-4 h-4" />
              <span>Governança LGPD · Auditoria por Data & Backups do Site</span>
            </div>
            <h1 className="font-display text-lg sm:text-xl font-extrabold text-zinc-900">
              Relatórios de Acesso, Segurança & Backups
            </h1>
            <p className="text-sm text-zinc-500 max-w-2xl">
              Pesquise atividades por dia específico ou usuário, gerencie backups completos do site armazenados por data e audite o isolamento de rastreio de clientes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleRunManualAudit}
              className="px-4 py-2.5 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Executar Verificação de Isolamento</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={securityLogs.length === 0}
              className="px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-800 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-[#E3262E]" />
              <span>Exportar Logs CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Section Navigation Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-100 text-xs">
          <span className="text-[11px] font-mono uppercase font-bold text-zinc-400 mr-1">
            Acesso rápido:
          </span>
          <button
            type="button"
            onClick={() => scrollToSection('admin-security-logs')}
            className="px-3 py-1.5 rounded-lg bg-[#FAFAFA] hover:bg-[#FFFBEB] border border-zinc-200 hover:border-[#FFBE00] text-zinc-800 font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-[#E3262E]" />
            <span>Logs por Data ({securityLogs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('admin-backup-vault')}
            className="px-3 py-1.5 rounded-lg bg-[#FAFAFA] hover:bg-[#FFFBEB] border border-zinc-200 hover:border-[#FFBE00] text-zinc-800 font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-[#B45309]" />
            <span>Backups do Site ({siteBackups.length})</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('admin-isolation-audit')}
            className="px-3 py-1.5 rounded-lg bg-[#FAFAFA] hover:bg-[#FFFBEB] border border-zinc-200 hover:border-[#FFBE00] text-zinc-800 font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
            <span>Isolamento LGPD</span>
          </button>
        </div>
      </div>

      {auditFeedback && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-xs font-bold flex items-center justify-between gap-3 ${
            isolationReport.isFullyIsolated
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {isolationReport.isFullyIsolated ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{auditFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setAuditFeedback(null)}
            className="text-xs font-extrabold underline cursor-pointer shrink-0"
          >
            Ocultar
          </button>
        </div>
      )}

      {/* 4-Column KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
            <span>Isolamento de Rastreio</span>
            {isolationReport.isFullyIsolated ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div
            className={`font-display text-lg font-extrabold ${
              isolationReport.isFullyIsolated ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isolationReport.isFullyIsolated ? '100% Isolado' : 'Requer Atenção'}
          </div>
          <p className="text-xs text-zinc-500">
            {isolationReport.totalCrossCustomerLeaks === 0
              ? '0 vazamentos cruzados entre titulares'
              : `${isolationReport.totalCrossCustomerLeaks} divergência(s) detectada(s)`}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
            <span>Acessos Autorizados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-mono text-xl font-extrabold text-zinc-900 tabular-nums">
            {allowedCount}
          </div>
          <p className="text-xs text-zinc-500">
            Consultas privadas e sessões validadas
          </p>
        </div>

        <div
          className={`rounded-2xl border p-4 space-y-1.5 shadow-2xs ${
            blockedCount > 0
              ? 'bg-rose-50/70 border-rose-200'
              : 'bg-white border-zinc-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-zinc-600">
            <span>Tentativas Bloqueadas</span>
            <Lock
              className={`w-4 h-4 ${
                blockedCount > 0 ? 'text-rose-600' : 'text-zinc-400'
              }`}
            />
          </div>
          <div
            className={`font-mono text-xl font-extrabold tabular-nums ${
              blockedCount > 0 ? 'text-rose-700' : 'text-zinc-900'
            }`}
          >
            {blockedCount}
          </div>
          <p className="text-xs text-zinc-500">
            Consultas incompatíveis ou logins negados
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
            <span>Backups Salvos (Site)</span>
            <Database className="w-4 h-4 text-[#B45309]" />
          </div>
          <div className="font-mono text-xl font-extrabold text-zinc-900 tabular-nums">
            {siteBackups.length}
          </div>
          <p className="text-xs text-zinc-500">
            {siteBackups.length > 0
              ? `Último em ${formatBrDateFromYmd(siteBackups[0].dateKey)}`
              : `${isolationReport.distinctCustomersCount} titulares isolados · crie o 1º backup`}
          </p>
        </div>
      </div>

      {/* Customer Tracking Isolation Guarantee Panel */}
      <div
        id="admin-isolation-audit"
        className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 space-y-5 shadow-2xs"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div className="space-y-1">
            <h2 className="font-display text-base font-extrabold text-zinc-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#E3262E]" />
              <span>Garantia de Isolamento no Rastreio por Cliente</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Audite em tempo real quais pedidos ficam visíveis para visitantes anônimos, sessão atual e cada titular cadastrado.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-500 shrink-0">
            Última checagem:{' '}
            {new Date(isolationReport.checkedAt).toLocaleTimeString('pt-BR')}
          </span>
        </div>

        {/* 4 Active Policy Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-zinc-200/80 flex items-start gap-3">
            <EyeOff className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <div className="font-extrabold text-zinc-900">
                Vitrine Anônima Trancada ({isolationReport.guestUnverifiedVisibleCount} expostos)
              </div>
              <p className="text-zinc-500">
                Sem login ou validação de comanda, nenhum pedido da loja é listado para visitantes públicos.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-zinc-200/80 flex items-start gap-3">
            <KeyRound className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <div className="font-extrabold text-zinc-900">
                Dupla Validação (Código + WhatsApp)
              </div>
              <p className="text-zinc-500">
                A consulta sem cadastro exige correspondência exata do código do pedido e do DDD + WhatsApp do comprador.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-zinc-200/80 flex items-start gap-3">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <div className="font-extrabold text-zinc-900">
                Escopo Estrito na Conta do Cliente
              </div>
              <p className="text-zinc-500">
                Na Área do Cliente, apenas pedidos com o mesmo telefone canônico do titular logado são exibidos.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-zinc-200/80 flex items-start gap-3">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <div className="font-extrabold text-zinc-900">
                Limpeza Automática de Sessão no Logout
              </div>
              <p className="text-zinc-500">
                Ao sair da conta ou trocar de titular, consultas avulsas e tokens de sessão anteriores são apagados.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Scope Simulator */}
        <div className="rounded-2xl bg-[#FFFBEB]/60 border border-[#FDE68A] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div className="flex-1 space-y-1.5">
              <label
                htmlFor="security-scope-simulator"
                className="block text-xs font-extrabold text-zinc-900"
              >
                Simulador / Inspetor de Visibilidade por Titular:
              </label>
              <select
                id="security-scope-simulator"
                value={selectedAuditSubject}
                onChange={(e) => setSelectedAuditSubject(e.target.value)}
                className="w-full md:max-w-lg px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900 focus:border-[#FFBE00] focus:outline-none cursor-pointer"
              >
                <option value="anonymous">
                  Visitante Não Logado (Anônimo — Sem consulta)
                </option>
                <option value="current_session">
                  Sessão Atual deste Navegador na Vitrine
                </option>
                {isolationReport.customerChecks.map((check) => (
                  <option key={check.customerKey} value={check.customerKey}>
                    Cliente: {check.customerName} ({check.maskedPhone}) · {check.expectedOrderIds.length} pedido(s)
                  </option>
                ))}
              </select>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-extrabold">
              {simulatedScopeView.isSafe ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Escopo Verificado</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span className="text-rose-700">Vazamento Detectado</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-white rounded-xl border border-zinc-200 p-3.5 space-y-1.5">
              <div className="font-bold text-zinc-500">
                Pedidos visíveis para esta identidade:
              </div>
              {simulatedScopeView.visibleOrderIds.length === 0 ? (
                <div className="font-mono font-bold text-zinc-900">
                  0 pedido(s) — Acesso bloqueado até validação privada
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {simulatedScopeView.visibleOrderIds.map((id) => (
                    <span
                      key={id}
                      className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-extrabold text-[11px]"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 p-3.5 space-y-1.5">
              <div className="font-bold text-zinc-500">
                Pedidos de terceiros protegidos (ocultos):
              </div>
              <div className="font-mono font-extrabold text-zinc-900">
                {simulatedScopeView.hiddenOtherOrdersCount} de {isolationReport.totalOrdersCount} pedido(s) ocultos
              </div>
            </div>
          </div>
        </div>

        {/* Customer Isolation Matrix Table */}
        <div className="overflow-x-auto border border-zinc-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-zinc-200 text-zinc-600 font-extrabold">
                <th className="py-2.5 px-3.5">Titular</th>
                <th className="py-2.5 px-3.5">WhatsApp (LGPD)</th>
                <th className="py-2.5 px-3.5">Pedidos Autorizados</th>
                <th className="py-2.5 px-3.5">Vazamento Cruzado</th>
                <th className="py-2.5 px-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isolationReport.customerChecks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-500">
                    Nenhum pedido registrado ainda para auditar.
                  </td>
                </tr>
              ) : (
                isolationReport.customerChecks.map((check) => (
                  <tr key={check.customerKey} className="hover:bg-zinc-50/80">
                    <td className="py-2.5 px-3.5 font-bold text-zinc-900">
                      {check.customerName}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-zinc-600">
                      {check.maskedPhone}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-zinc-800">
                      {check.visibleOrderIds.join(', ')}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-zinc-700">
                      {check.crossCustomerLeakCount}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-extrabold ${
                          check.isolated
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}
                      >
                        {check.isolated ? 'Isolado' : 'Falha'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity & Security Logs Feed */}
      <div
        id="admin-security-logs"
        className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 space-y-4 shadow-2xs"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="font-display text-base font-extrabold text-zinc-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#E3262E]" />
              <span>Logs de Atividades Recentes ({filteredLogs.length})</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Histórico em tempo real de autenticações, consultas de rastreio, movimentação de pedidos, alterações de catálogo e backups — com pesquisa por dia específico.
            </p>
          </div>

          {securityLogs.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              {!confirmClearLogs ? (
                <button
                  type="button"
                  onClick={() => setConfirmClearLogs(true)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 hover:border-rose-300 hover:bg-rose-50 text-xs font-bold text-zinc-600 hover:text-rose-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Histórico</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 text-xs">
                  <span className="font-bold text-rose-800">Confirmar limpeza?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearSecurityLogs();
                      setConfirmClearLogs(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-extrabold cursor-pointer"
                  >
                    Sim, limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearLogs(false)}
                    className="px-2 py-1 rounded-lg bg-white border border-zinc-200 text-zinc-700 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Log Filters Row 1: Search, Category, User, Outcome */}
        <div className="flex flex-col xl:flex-row xl:items-center gap-2.5 pt-1">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar nos logs de segurança"
              placeholder="Buscar por evento, usuário, telefone mascarado ou #pedido..."
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
            />
          </div>

          <div className="w-full xl:w-48 shrink-0">
            <select
              aria-label="Filtrar categoria de log"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as 'all' | SecurityEventCategory)
              }
              className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 focus:bg-white focus:border-[#FFBE00] focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as categorias</option>
              <option value="site_backup">Backup & Restauração</option>
              <option value="user_management">Usuários & Permissões</option>
              <option value="admin_auth">Acesso Administrativo</option>
              <option value="order_security">Custódia de Pedidos</option>
              <option value="catalog_policy">Política de Catálogo</option>
              <option value="tracking_access">Rastreio de Pedido</option>
              <option value="customer_auth">Conta & Sessão Cliente</option>
            </select>
          </div>

          {adminUsers.length > 0 && (
            <div className="w-full xl:w-52 shrink-0">
              <select
                aria-label="Filtrar logs por usuário"
                value={actorFilter}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setActorFilter(nextVal);
                  if (nextVal === 'all') {
                    onClearInitialActorFilter?.();
                  }
                }}
                className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 focus:bg-white focus:border-[#FFBE00] focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os usuários</option>
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.username}>
                    {u.name} (@{u.username}) · {ADMIN_ROLE_META[u.role].shortLabel}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'allowed', label: 'Autorizados' },
                { id: 'blocked', label: 'Bloqueados' },
                { id: 'info', label: 'Registros' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setOutcomeFilter(opt.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors whitespace-nowrap ${
                  outcomeFilter === opt.id
                    ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950 font-extrabold'
                    : 'bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Log Filters Row 2: Dedicated Date Search Bar */}
        <div className="rounded-xl bg-[#FAFAFA] border border-zinc-200 p-3 space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-zinc-800 mr-1">
                <Calendar className="w-3.5 h-3.5 text-[#E3262E]" />
                <span>Pesquisar por data:</span>
              </span>
              {(
                [
                  { id: 'all', label: 'Todas as datas' },
                  { id: 'today', label: 'Hoje' },
                  { id: 'yesterday', label: 'Ontem' },
                  { id: 'last7', label: 'Últimos 7 dias' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setLogDatePreset(preset.id);
                    setLogSpecificDate('');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                    logDatePreset === preset.id
                      ? 'bg-[#E3262E] text-white border-[#E3262E]'
                      : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="security-log-specific-date"
                className="text-xs font-bold text-zinc-600 whitespace-nowrap"
              >
                Escolher dia:
              </label>
              <input
                id="security-log-specific-date"
                type="date"
                value={logSpecificDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setLogSpecificDate(val);
                  setLogDatePreset(val ? 'specific' : 'all');
                }}
                aria-label="Pesquisar logs por data específica"
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold cursor-pointer focus:outline-none ${
                  logDatePreset === 'specific' && logSpecificDate
                    ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950'
                    : 'bg-white border-zinc-300 text-zinc-800 focus:border-[#FFBE00]'
                }`}
              />

              {(logDatePreset !== 'all' || logSpecificDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setLogDatePreset('all');
                    setLogSpecificDate('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar data</span>
                </button>
              )}

              {activeLogDateKey && matchingDateBackupsCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBackupJumpDate(activeLogDateKey);
                    scrollToSection('admin-backup-vault');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FFFBEB] hover:bg-[#FFBE00] border border-[#FFBE00] text-zinc-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Database className="w-3.5 h-3.5 text-[#E3262E]" />
                  <span>
                    Ver {matchingDateBackupsCount} backup(s) de{' '}
                    {formatBrDateFromYmd(activeLogDateKey)}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Clickable Recorded Log Dates */}
          {logDateChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-200/80 text-[11px]">
              <span className="font-bold text-zinc-500 mr-1">
                Dias com registros:
              </span>
              {logDateChips.map((chip) => {
                const isSelected =
                  logDatePreset === 'specific' && logSpecificDate === chip.dateKey;
                return (
                  <button
                    key={`log-day-${chip.dateKey}`}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setLogDatePreset('all');
                        setLogSpecificDate('');
                      } else {
                        setLogSpecificDate(chip.dateKey);
                        setLogDatePreset('specific');
                      }
                    }}
                    className={`px-2 py-0.5 rounded-md border font-mono font-bold cursor-pointer inline-flex items-center gap-1 transition-colors ${
                      isSelected
                        ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950'
                        : 'bg-white hover:bg-[#FFFBEB] text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span
                      className={`px-1 rounded text-[10px] ${
                        isSelected
                          ? 'bg-[#FFBE00] text-zinc-950'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Log Entries */}
        {filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-[#FAFAFA] p-8 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-zinc-400 mx-auto" />
            <div className="font-display text-sm font-extrabold text-zinc-900">
              {securityLogs.length === 0
                ? 'Nenhuma atividade registrada ainda nesta sessão'
                : 'Nenhum log encontrado para o filtro selecionado'}
            </div>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              {securityLogs.length === 0
                ? 'Tentativas de login, consultas de rastreio de pedido na loja, movimentações do Kanban e alterações de preços aparecerão aqui automaticamente.'
                : 'Limpe os filtros ou clique em "Executar Verificação de Isolamento" acima para registrar um novo evento.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto border border-zinc-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-zinc-200 text-zinc-600 font-extrabold">
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Data / Hora</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Categoria</th>
                    <th className="py-2.5 px-3.5">Evento / Detalhes</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Origem / Alvo (LGPD)</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Pedido</th>
                    <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredLogs.map((ev) => (
                    <tr key={ev.id} className="hover:bg-zinc-50/70 align-top">
                      <td className="py-3 px-3.5 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                        {new Date(ev.timestamp).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-[11px]">
                          {SECURITY_CATEGORY_LABELS[ev.category] || ev.category}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 space-y-0.5 max-w-md">
                        <div className="font-extrabold text-zinc-900">{ev.summary}</div>
                        <div className="text-zinc-500 leading-relaxed">{ev.detail}</div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-zinc-800">{ev.actorLabel}</div>
                        <div className="font-mono text-[11px] text-zinc-500">
                          {ev.maskedTarget}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-zinc-800 whitespace-nowrap">
                        {ev.orderId || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-extrabold ${getOutcomeBadgeClass(
                            ev.outcome
                          )}`}
                        >
                          {SECURITY_OUTCOME_META[ev.outcome]?.label || ev.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2.5">
              {filteredLogs.map((ev) => (
                <div
                  key={`m-${ev.id}`}
                  className="p-3.5 rounded-xl border border-zinc-200 bg-[#FAFAFA] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-zinc-700 font-bold text-[11px]">
                      {SECURITY_CATEGORY_LABELS[ev.category] || ev.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[11px] font-extrabold ${getOutcomeBadgeClass(
                        ev.outcome
                      )}`}
                    >
                      {SECURITY_OUTCOME_META[ev.outcome]?.label || ev.outcome}
                    </span>
                  </div>
                  <div className="font-extrabold text-zinc-900">{ev.summary}</div>
                  <p className="text-zinc-600 leading-relaxed">{ev.detail}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-zinc-200/80 text-[11px] text-zinc-500">
                    <span>
                      <strong className="text-zinc-800">{ev.actorLabel}</strong> ·{' '}
                      <span className="font-mono">{ev.maskedTarget}</span>
                    </span>
                    <span className="font-mono">
                      {ev.orderId ? `${ev.orderId} · ` : ''}
                      {new Date(ev.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Real-Time Catalog & Data Integrity Diagnostics */}
      {catalogHealth && (
        <section
          id="admin-catalog-health"
          className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 space-y-4 shadow-2xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auditoria Técnica de Cadastros em Tempo Real</span>
              </div>
              <h2 className="font-display text-base font-extrabold text-zinc-900">
                Saúde & Integridade dos Dados ({catalogHealth.passedCount}/{catalogHealth.checks.length} verificações OK)
              </h2>
              <p className="text-xs text-zinc-500">
                Validação contínua de SKUs únicos, vínculo de categorias, preços De/Por, referências de kits/banners, cupons e governança Master.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {catalogHealth.autoFixableCount > 0 && onAutoRepairCatalog ? (
                <button
                  type="button"
                  onClick={handleRunAutoRepair}
                  className="px-3.5 py-2 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Auto-Corrigir ({catalogHealth.autoFixableCount})</span>
                </button>
              ) : (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold ${
                    catalogHealth.status === 'ok'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : catalogHealth.status === 'warning'
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {catalogHealth.status === 'ok' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>
                    {catalogHealth.status === 'ok'
                      ? 'Cadastros 100% Saudáveis'
                      : `${catalogHealth.criticalCount + catalogHealth.warningCount} ponto(s) de atenção`}
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {catalogHealth.checks.map((check) => (
              <div
                key={check.id}
                className={`rounded-xl border p-3.5 space-y-1 ${
                  check.severity === 'ok'
                    ? 'bg-[#FAFAFA] border-zinc-200'
                    : check.severity === 'warning'
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-zinc-900">
                    {check.label}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-extrabold uppercase ${
                      check.severity === 'ok'
                        ? 'text-emerald-700'
                        : check.severity === 'warning'
                        ? 'text-amber-800'
                        : 'text-rose-700'
                    }`}
                  >
                    {check.severity === 'ok'
                      ? 'OK'
                      : check.severity === 'warning'
                      ? 'Atenção'
                      : 'Crítico'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  {check.detail}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Site Backup & Restore Vault (Master-Only) */}
      {currentSitePayload && onSaveSiteBackups && onRestoreSiteBackup && (
        <AdminBackupVault
          currentAdminUser={currentAdminUser}
          backups={siteBackups}
          backupSchedule={backupSchedule}
          currentSitePayload={currentSitePayload}
          externalDateFilter={backupJumpDate}
          onClearExternalDateFilter={() => setBackupJumpDate('')}
          onSaveBackups={onSaveSiteBackups}
          onSaveBackupSchedule={onSaveBackupSchedule}
          onPreviewBackupReminder={onPreviewBackupReminder}
          onRestoreBackup={onRestoreSiteBackup}
          onRecordSecurityEvent={onRecordSecurityEvent}
        />
      )}
    </div>
  );
};
