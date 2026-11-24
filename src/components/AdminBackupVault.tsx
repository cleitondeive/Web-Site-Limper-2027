import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Crown,
  Database,
  Download,
  HardDrive,
  Lock,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  AdminUser,
  BackupScheduleConfig,
  CreateSecurityAuditEventInput,
  SiteBackupPayload,
  SiteBackupSnapshot,
} from '../types/commerce';
import {
  DEFAULT_BACKUP_SCHEDULE_CONFIG,
  SITE_BACKUP_TRIGGER_META,
  WEEKDAY_SHORT_LABELS,
  appendSiteBackupSnapshot,
  createSiteBackupSnapshot,
  filterSiteBackupsByDate,
  formatAdminActorLabel,
  formatBackupByteSize,
  formatBrDateFromYmd,
  getNextScheduledBackupInfo,
  normalizeScheduleTime,
  parseImportedSiteBackupJson,
  sortAndDedupeScheduleTimes,
  summarizeSiteBackupDates,
  validateBackupScheduleConfig,
  verifySiteBackupIntegrity,
} from '../utils/commerce';

interface AdminBackupVaultProps {
  currentAdminUser: AdminUser | null;
  backups: SiteBackupSnapshot[];
  backupSchedule?: BackupScheduleConfig;
  currentSitePayload: SiteBackupPayload;
  externalDateFilter?: string;
  onClearExternalDateFilter?: () => void;
  onSaveBackups: (backups: SiteBackupSnapshot[]) => void;
  onSaveBackupSchedule?: (schedule: BackupScheduleConfig) => void;
  onRestoreBackup: (snapshot: SiteBackupSnapshot) => void;
  onRecordSecurityEvent: (input: CreateSecurityAuditEventInput) => void;
}

const QUICK_SCHEDULE_TIME_PRESETS = ['08:00', '12:00', '18:00', '22:00'];

export const AdminBackupVault: React.FC<AdminBackupVaultProps> = ({
  currentAdminUser,
  backups,
  backupSchedule = DEFAULT_BACKUP_SCHEDULE_CONFIG,
  currentSitePayload,
  externalDateFilter = '',
  onClearExternalDateFilter,
  onSaveBackups,
  onSaveBackupSchedule,
  onRestoreBackup,
  onRecordSecurityEvent,
}) => {
  const isMaster = currentAdminUser?.role === 'master';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [backupLabel, setBackupLabel] = useState('');
  const [dateFilter, setDateFilter] = useState<string>(externalDateFilter || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  // Local editable draft for automatic backup scheduling
  const [scheduleDraft, setScheduleDraft] = useState<BackupScheduleConfig>(backupSchedule);
  const [newTimeInput, setNewTimeInput] = useState<string>('12:00');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState<number>(() => Date.now());

  useEffect(() => {
    setScheduleDraft((prev) => ({
      ...backupSchedule,
      // Preserve unsaved form edits only if timestamps match, otherwise sync persisted schedule
      lastExecutedAt: backupSchedule.lastExecutedAt ?? prev.lastExecutedAt,
      lastExecutedSlotKey: backupSchedule.lastExecutedSlotKey ?? prev.lastExecutedSlotKey,
      lastShutdownBackupAt:
        backupSchedule.lastShutdownBackupAt ?? prev.lastShutdownBackupAt,
    }));
  }, [backupSchedule]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const nextScheduledInfo = useMemo(
    () => getNextScheduledBackupInfo(backupSchedule, clockTick),
    [backupSchedule, clockTick]
  );

  const hasUnsavedScheduleChanges = useMemo(() => {
    return (
      scheduleDraft.enabled !== backupSchedule.enabled ||
      scheduleDraft.autoBackupOnExit !== backupSchedule.autoBackupOnExit ||
      scheduleDraft.runMissedOnReopen !== backupSchedule.runMissedOnReopen ||
      scheduleDraft.maxRetention !== backupSchedule.maxRetention ||
      scheduleDraft.times.join(',') !== backupSchedule.times.join(',') ||
      scheduleDraft.daysOfWeek.join(',') !== backupSchedule.daysOfWeek.join(',')
    );
  }, [scheduleDraft, backupSchedule]);

  useEffect(() => {
    if (externalDateFilter) {
      setDateFilter(externalDateFilter);
    }
  }, [externalDateFilter]);

  const backupDateChips = useMemo(
    () => summarizeSiteBackupDates(backups, 10),
    [backups]
  );

  const filteredBackups = useMemo(
    () =>
      filterSiteBackupsByDate(backups, {
        specificDate: dateFilter,
        searchQuery,
      }),
    [backups, dateFilter, searchQuery]
  );

  const totalStorageBytes = useMemo(
    () => backups.reduce((acc, b) => acc + (b.summary.sizeBytes || 0), 0),
    [backups]
  );

  const actorLabel = formatAdminActorLabel(currentAdminUser);

  if (!isMaster) {
    return (
      <section
        id="admin-backup-vault"
        aria-label="Cofre de Backups do Site"
        className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              <Crown className="w-3.5 h-3.5 text-[#B45309]" />
              <span>Exclusivo Usuário Master</span>
            </div>
            <h2 className="font-display text-base font-extrabold text-zinc-900">
              Central de Backups & Restauração do Site
            </h2>
            <p className="text-xs text-zinc-500 max-w-xl">
              Por segurança operacional, apenas contas com perfil <strong>Master</strong> podem gerar snapshots completos, baixar arquivos de backup por data ou restaurar versões anteriores do site.
            </p>
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-600 self-start sm:self-center shrink-0">
          {backups.length} backup(s) protegido(s)
        </span>
      </section>
    );
  }

  const handleAddScheduleTime = (timeCandidate?: string) => {
    const raw = timeCandidate ?? newTimeInput;
    const normalized = normalizeScheduleTime(raw);
    if (!normalized) {
      setScheduleError('Informe um horário válido no formato HH:MM (ex: 18:00).');
      return;
    }
    if (scheduleDraft.times.includes(normalized)) {
      setScheduleError(`O horário ${normalized} já está na lista de agendamento.`);
      return;
    }
    if (scheduleDraft.times.length >= 8) {
      setScheduleError('Limite máximo de 8 horários agendados por dia.');
      return;
    }
    setScheduleError(null);
    setScheduleDraft((prev) => ({
      ...prev,
      times: sortAndDedupeScheduleTimes([...prev.times, normalized]),
    }));
  };

  const handleRemoveScheduleTime = (timeToRemove: string) => {
    setScheduleError(null);
    setScheduleDraft((prev) => ({
      ...prev,
      times: prev.times.filter((t) => t !== timeToRemove),
    }));
  };

  const handleToggleScheduleDay = (day: number) => {
    setScheduleError(null);
    setScheduleDraft((prev) => {
      const exists = prev.daysOfWeek.includes(day);
      const nextDays = exists
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b);
      return { ...prev, daysOfWeek: nextDays };
    });
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedConfig: BackupScheduleConfig = {
      ...scheduleDraft,
      times: sortAndDedupeScheduleTimes(scheduleDraft.times),
      daysOfWeek: Array.from(new Set(scheduleDraft.daysOfWeek)).sort((a, b) => a - b),
      updatedAt: new Date().toISOString(),
      updatedBy: actorLabel,
    };
    const validation = validateBackupScheduleConfig(cleanedConfig);
    if (!validation.valid) {
      setScheduleError(validation.error || 'Verifique os campos do agendamento.');
      return;
    }
    setScheduleError(null);
    onSaveBackupSchedule?.(cleanedConfig);
    onRecordSecurityEvent({
      category: 'site_backup',
      outcome: 'allowed',
      actorLabel,
      actorUsername: currentAdminUser?.username,
      actorRole: currentAdminUser?.role,
      rawTarget: cleanedConfig.enabled
        ? `Horários: ${cleanedConfig.times.join(', ')}`
        : 'Agendamento pausado',
      summary: cleanedConfig.enabled
        ? `Agendamento automático de backups salvo (${cleanedConfig.times.join(', ')})`
        : 'Agendamento automático de backups pausado',
      detail: `Proteção ao fechar navegador: ${
        cleanedConfig.autoBackupOnExit ? 'Ativa' : 'Desativada'
      } · Recuperar ao reabrir: ${
        cleanedConfig.runMissedOnReopen ? 'Sim' : 'Não'
      } · Retenção: até ${cleanedConfig.maxRetention} backups.`,
    });
    setFeedback({
      tone: 'success',
      message: cleanedConfig.enabled
        ? `Agendamento salvo! Backups automáticos programados para ${cleanedConfig.times.join(
            ', '
          )} com verificação de integridade.`
        : 'Configurações de agendamento salvas (execução programada pausada).',
    });
  };

  const handleRunScheduledBackupNow = () => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const snapshot = createSiteBackupSnapshot({
      payload: currentSitePayload,
      trigger: 'auto_scheduled',
      label: `Backup agendado executado agora · ${hhmm}`,
      createdBy: actorLabel,
      createdByUsername: currentAdminUser?.username,
    });
    const nextBackups = appendSiteBackupSnapshot(
      backups,
      snapshot,
      backupSchedule.maxRetention
    );
    onSaveBackups(nextBackups);
    onSaveBackupSchedule?.({
      ...backupSchedule,
      lastExecutedAt: snapshot.createdAt,
    });
    onRecordSecurityEvent({
      category: 'site_backup',
      outcome: 'allowed',
      actorLabel,
      actorUsername: currentAdminUser?.username,
      actorRole: currentAdminUser?.role,
      rawTarget: `Backup ${formatBrDateFromYmd(snapshot.dateKey)}`,
      summary: `Backup agendado testado manualmente (${hhmm})`,
      detail: `${snapshot.summary.productsCount} produtos e ${snapshot.summary.ordersCount} pedidos salvos · Integridade #${snapshot.checksum} (${formatBackupByteSize(snapshot.summary.sizeBytes)}).`,
    });
    setFeedback({
      tone: 'success',
      message: `Backup agendado salvo e verificado (#${snapshot.checksum}) com ${formatBackupByteSize(
        snapshot.summary.sizeBytes
      )}.`,
    });
  };

  const handleCreateManualBackup = (e: React.FormEvent) => {
    e.preventDefault();
    const snapshot = createSiteBackupSnapshot({
      payload: currentSitePayload,
      label: backupLabel,
      trigger: 'manual',
      createdBy: actorLabel,
      createdByUsername: currentAdminUser?.username,
    });
    const nextBackups = appendSiteBackupSnapshot(
      backups,
      snapshot,
      backupSchedule.maxRetention
    );
    onSaveBackups(nextBackups);
    onRecordSecurityEvent({
      category: 'site_backup',
      outcome: 'allowed',
      actorLabel,
      actorUsername: currentAdminUser?.username,
      actorRole: currentAdminUser?.role,
      rawTarget: `Backup ${formatBrDateFromYmd(snapshot.dateKey)}`,
      summary: `Backup do site criado: ${snapshot.label}`,
      detail: `${snapshot.summary.productsCount} produtos, ${snapshot.summary.categoriesCount} categorias, ${snapshot.summary.ordersCount} pedidos e ${snapshot.summary.adminUsersCount} usuário(s) salvos · Integridade #${snapshot.checksum} (${formatBackupByteSize(snapshot.summary.sizeBytes)}).`,
    });
    setBackupLabel('');
    setDateFilter('');
    onClearExternalDateFilter?.();
    setFeedback({
      tone: 'success',
      message: `Backup "${snapshot.label}" salvo com sucesso para a data ${formatBrDateFromYmd(snapshot.dateKey)} (${formatBackupByteSize(snapshot.summary.sizeBytes)}).`,
    });
  };

  const handleDownloadBackupJson = (snapshot: SiteBackupSnapshot) => {
    const timeTag = new Date(snapshot.createdAt)
      .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
      .replace(':', 'h');
    const fileContent = JSON.stringify(
      {
        format: 'limper-mt-site-backup-v1',
        exportedAt: new Date().toISOString(),
        id: snapshot.id,
        createdAt: snapshot.createdAt,
        dateKey: snapshot.dateKey,
        label: snapshot.label,
        trigger: snapshot.trigger,
        createdBy: snapshot.createdBy,
        summary: snapshot.summary,
        payload: snapshot.payload,
      },
      null,
      2
    );
    const blob = new Blob([fileContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-limper-mt-${snapshot.dateKey}-${timeTag}.json`;
    link.click();
    URL.revokeObjectURL(url);

    onRecordSecurityEvent({
      category: 'site_backup',
      outcome: 'info',
      actorLabel,
      actorUsername: currentAdminUser?.username,
      actorRole: currentAdminUser?.role,
      rawTarget: `Backup ${formatBrDateFromYmd(snapshot.dateKey)}`,
      summary: `Arquivo JSON de backup exportado (${formatBrDateFromYmd(snapshot.dateKey)})`,
      detail: `Download realizado do snapshot "${snapshot.label}" (${formatBackupByteSize(snapshot.summary.sizeBytes)}).`,
    });
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = parseImportedSiteBackupJson(text, {
        label: actorLabel,
        username: currentAdminUser?.username,
      });
      if (!result.ok) {
        setFeedback({ tone: 'error', message: result.error });
        onRecordSecurityEvent({
          category: 'site_backup',
          outcome: 'blocked',
          actorLabel,
          actorUsername: currentAdminUser?.username,
          actorRole: currentAdminUser?.role,
          rawTarget: file.name,
          summary: 'Importação de backup JSON rejeitada',
          detail: result.error,
        });
        return;
      }
      const nextBackups = appendSiteBackupSnapshot(backups, result.snapshot);
      onSaveBackups(nextBackups);
      onRecordSecurityEvent({
        category: 'site_backup',
        outcome: 'allowed',
        actorLabel,
        actorUsername: currentAdminUser?.username,
        actorRole: currentAdminUser?.role,
        rawTarget: `Backup ${formatBrDateFromYmd(result.snapshot.dateKey)}`,
        summary: `Backup importado para o cofre: ${result.snapshot.label}`,
        detail: `Arquivo "${file.name}" validado (${result.snapshot.summary.productsCount} produtos, ${result.snapshot.summary.ordersCount} pedidos). Pronto para restauração.`,
      });
      setFeedback({
        tone: 'success',
        message: `Backup "${result.snapshot.label}" importado e armazenado na data ${formatBrDateFromYmd(result.snapshot.dateKey)}. Clique em "Restaurar" se desejar aplicá-lo.`,
      });
    };
    reader.onerror = () => {
      setFeedback({
        tone: 'error',
        message: 'Falha ao ler o arquivo JSON selecionado.',
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = (snapshot: SiteBackupSnapshot) => {
    // 0. Verify cryptographic/checksum & structural integrity before overwriting live database
    const integrity = verifySiteBackupIntegrity(snapshot);
    if (!integrity.valid) {
      setConfirmRestoreId(null);
      setFeedback({
        tone: 'error',
        message: `Restauração bloqueada por falha de integridade: ${integrity.issues.join(' ')}`,
      });
      onRecordSecurityEvent({
        category: 'site_backup',
        outcome: 'blocked',
        actorLabel,
        actorUsername: currentAdminUser?.username,
        actorRole: currentAdminUser?.role,
        rawTarget: `Backup ${formatBrDateFromYmd(snapshot.dateKey)}`,
        summary: 'Restauração bloqueada por falha de integridade no snapshot',
        detail: integrity.issues.join(' '),
      });
      return;
    }

    // 1. Always create an automatic safety snapshot before overwriting live data
    const safetySnapshot = createSiteBackupSnapshot({
      payload: currentSitePayload,
      trigger: 'pre_restore',
      label: `Automático pré-restauração (antes de voltar p/ ${formatBrDateFromYmd(snapshot.dateKey)})`,
      createdBy: actorLabel,
      createdByUsername: currentAdminUser?.username,
    });
    const updatedBackups = appendSiteBackupSnapshot(
      backups,
      safetySnapshot,
      backupSchedule.maxRetention
    );
    onSaveBackups(updatedBackups);

    // 2. Restore all site state from selected snapshot
    onRestoreBackup(snapshot);

    // 3. Log restoration in audit trail
    onRecordSecurityEvent({
      category: 'site_backup',
      outcome: 'allowed',
      actorLabel,
      actorUsername: currentAdminUser?.username,
      actorRole: currentAdminUser?.role,
      rawTarget: `Backup ${formatBrDateFromYmd(snapshot.dateKey)}`,
      summary: `Site restaurado para o backup de ${formatBrDateFromYmd(snapshot.dateKey)}`,
      detail: `Snapshot "${snapshot.label}" aplicado (${snapshot.summary.productsCount} produtos, ${snapshot.summary.ordersCount} pedidos). Backup de segurança pré-restauração criado automaticamente.`,
    });

    setConfirmRestoreId(null);
    setFeedback({
      tone: 'success',
      message: `Site restaurado para o backup de ${formatBrDateFromYmd(snapshot.dateKey)}! Um ponto de segurança pré-restauração foi salvo automaticamente caso precise reverter.`,
    });
  };

  const handleConfirmDelete = (snapshot: SiteBackupSnapshot) => {
    const nextBackups = backups.filter((b) => b.id !== snapshot.id);
    onSaveBackups(nextBackups);
    onRecordSecurityEvent({
      category: 'site_backup',
      outcome: 'info',
      actorLabel,
      actorUsername: currentAdminUser?.username,
      actorRole: currentAdminUser?.role,
      rawTarget: `Backup ${formatBrDateFromYmd(snapshot.dateKey)}`,
      summary: `Backup excluído do cofre (${formatBrDateFromYmd(snapshot.dateKey)})`,
      detail: `Snapshot "${snapshot.label}" removido manualmente por ${actorLabel}.`,
    });
    setConfirmDeleteId(null);
    setFeedback({
      tone: 'success',
      message: `Backup "${snapshot.label}" removido do histórico.`,
    });
  };

  return (
    <section
      id="admin-backup-vault"
      aria-label="Central de Backups do Site"
      className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 space-y-5 shadow-2xs"
    >
      {/* Vault Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-zinc-100 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-extrabold uppercase tracking-wider text-[#B45309]">
            <Crown className="w-3.5 h-3.5" />
            <span>Cofre Master · Snapshot & Recuperação por Data</span>
          </div>
          <h2 className="font-display text-base sm:text-lg font-extrabold text-zinc-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#E3262E]" />
            <span>Central de Backups do Site ({backups.length})</span>
          </h2>
          <p className="text-xs text-zinc-500 max-w-2xl">
            Gere pontos de restauração completos do site armazenados por data (produtos, categorias, kits, banners, cupons, pedidos, configurações e equipe), baixe cópias externas em JSON ou restaure qualquer data com segurança.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="px-3 py-2 rounded-xl bg-[#FAFAFA] border border-zinc-200 text-xs flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-zinc-500" />
            <span className="text-zinc-600 font-semibold">
              Armazenado:{' '}
              <strong className="font-mono text-zinc-900 tabular-nums">
                {formatBackupByteSize(totalStorageBytes)}
              </strong>
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportBackupFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-[#E3262E]" />
            <span>Importar JSON</span>
          </button>
        </div>
      </div>

      {/* Feedback Status */}
      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs font-bold flex items-center justify-between gap-3 ${
            feedback.tone === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.tone === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-extrabold underline cursor-pointer shrink-0"
          >
            Ocultar
          </button>
        </div>
      )}

      {/* Automatic Database Backup Scheduler & Unexpected-Close Integrity Guard */}
      <form
        id="admin-backup-scheduler"
        onSubmit={handleSaveSchedule}
        className="rounded-2xl border border-zinc-200 bg-[#FAFAFA] p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-200/80 pb-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-extrabold uppercase tracking-wider text-indigo-700">
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Agendador Automático & Integridade Contínua</span>
            </div>
            <h3 className="font-display text-sm sm:text-base font-extrabold text-zinc-900">
              Agendamento Automático de Backups do Banco de Dados
            </h3>
            <p className="text-xs text-zinc-500 max-w-2xl">
              Defina os horários em que o sistema deve gravar snapshots completos automaticamente e mantenha os dados protegidos caso o navegador seja fechado inesperadamente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={scheduleDraft.enabled}
              aria-label="Ativar agendamento automático de backups"
              onClick={() => {
                setScheduleError(null);
                setScheduleDraft((prev) => ({ ...prev, enabled: !prev.enabled }));
              }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer transition-colors ${
                scheduleDraft.enabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  scheduleDraft.enabled ? 'bg-[#FFBE00]' : 'bg-zinc-400'
                }`}
              />
              <span>
                {scheduleDraft.enabled
                  ? 'Agendamento Ativo'
                  : 'Agendamento Desativado'}
              </span>
            </button>
          </div>
        </div>

        {/* Live Next Run & Last Shutdown Guard Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          <div className="rounded-xl bg-white border border-zinc-200 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] font-mono font-bold uppercase text-zinc-500">
                  Próximo Backup Agendado
                </div>
                <div className="font-bold text-zinc-900 truncate">
                  {nextScheduledInfo
                    ? nextScheduledInfo.label
                    : backupSchedule.enabled
                    ? 'Configure ao menos 1 horário e dia ativo'
                    : 'Ative o agendamento e salve para iniciar'}
                </div>
              </div>
            </div>
            {backupSchedule.lastExecutedAt && (
              <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                Último:{' '}
                {new Date(backupSchedule.lastExecutedAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>

          <div className="rounded-xl bg-white border border-zinc-200 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck
                className={`w-4 h-4 shrink-0 ${
                  backupSchedule.autoBackupOnExit
                    ? 'text-emerald-600'
                    : 'text-zinc-400'
                }`}
              />
              <div className="min-w-0">
                <div className="text-[10px] font-mono font-bold uppercase text-zinc-500">
                  Proteção Contra Fechamento Inesperado
                </div>
                <div className="font-bold text-zinc-900 truncate">
                  {backupSchedule.autoBackupOnExit
                    ? 'Ativa · Gravação síncrona + checksum ao sair'
                    : 'Desativada pelo administrador'}
                </div>
              </div>
            </div>
            {backupSchedule.lastShutdownBackupAt && (
              <span className="text-[10px] font-mono text-emerald-700 font-bold shrink-0">
                Salvo{' '}
                {new Date(backupSchedule.lastShutdownBackupAt).toLocaleTimeString(
                  'pt-BR',
                  { hour: '2-digit', minute: '2-digit' }
                )}
              </span>
            )}
          </div>
        </div>

        {/* Schedule Controls: Times + Weekdays */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Scheduled Time Slots */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="backup-schedule-time-input"
                className="text-xs font-extrabold text-zinc-900"
              >
                Horários Definidos pelo Administrador ({scheduleDraft.times.length}/8)
              </label>
              <div className="flex flex-wrap items-center gap-1">
                {QUICK_SCHEDULE_TIME_PRESETS.map((preset) => {
                  const alreadyAdded = scheduleDraft.times.includes(preset);
                  return (
                    <button
                      key={`preset-${preset}`}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => handleAddScheduleTime(preset)}
                      className={`px-2 py-0.5 rounded-md border font-mono text-[10px] font-bold transition-colors ${
                        alreadyAdded
                          ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
                          : 'bg-[#FFFBEB] hover:bg-[#FFBE00] text-zinc-900 border-[#FDE68A] cursor-pointer'
                      }`}
                    >
                      +{preset}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                id="backup-schedule-time-input"
                type="time"
                value={newTimeInput}
                onChange={(e) => setNewTimeInput(e.target.value)}
                aria-label="Novo horário para backup automático"
                className="px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddScheduleTime()}
                className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Horário</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {scheduleDraft.times.length === 0 ? (
                <span className="text-xs text-zinc-500">
                  Nenhum horário adicionado. Selecione um horário acima e clique em &ldquo;Adicionar Horário&rdquo;.
                </span>
              ) : (
                scheduleDraft.times.map((slot) => (
                  <span
                    key={`slot-${slot}`}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 font-mono text-xs font-extrabold text-indigo-900"
                  >
                    <Clock className="w-3 h-3 text-indigo-600" />
                    <span>{slot}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveScheduleTime(slot)}
                      aria-label={`Remover horário ${slot}`}
                      className="p-0.5 rounded hover:bg-indigo-200/70 text-indigo-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Days of Week + Retention */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-zinc-200 p-3.5 space-y-3">
            <div className="text-xs font-extrabold text-zinc-900">
              Dias da Semana ({scheduleDraft.daysOfWeek.length}/7)
            </div>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_SHORT_LABELS.map((item) => {
                const active = scheduleDraft.daysOfWeek.includes(item.day);
                return (
                  <button
                    key={`wd-${item.day}`}
                    type="button"
                    aria-pressed={active}
                    aria-label={`Agendar para ${item.fullName}`}
                    onClick={() => handleToggleScheduleDay(item.day)}
                    className={`py-2 rounded-lg border text-[11px] font-extrabold transition-colors cursor-pointer ${
                      active
                        ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950'
                        : 'bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-600 border-zinc-200'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="pt-1 flex items-center justify-between gap-2">
              <label
                htmlFor="backup-max-retention"
                className="text-xs font-bold text-zinc-700"
              >
                Retenção máxima no cofre:
              </label>
              <select
                id="backup-max-retention"
                value={scheduleDraft.maxRetention}
                onChange={(e) =>
                  setScheduleDraft((prev) => ({
                    ...prev,
                    maxRetention: Number(e.target.value) || 20,
                  }))
                }
                className="px-2.5 py-1.5 bg-[#FAFAFA] border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900 cursor-pointer"
              >
                <option value={10}>10 backups</option>
                <option value={15}>15 backups</option>
                <option value={20}>20 backups</option>
                <option value={30}>30 backups</option>
              </select>
            </div>
          </div>
        </div>

        {/* Unexpected Browser Close & Catch-up Safeguards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <label
            htmlFor="backup-auto-exit"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 cursor-pointer"
          >
            <input
              id="backup-auto-exit"
              type="checkbox"
              checked={scheduleDraft.autoBackupOnExit}
              onChange={(e) =>
                setScheduleDraft((prev) => ({
                  ...prev,
                  autoBackupOnExit: e.target.checked,
                }))
              }
              className="mt-0.5 rounded border-zinc-300 accent-zinc-950"
            />
            <span className="text-xs leading-relaxed">
              <strong className="text-zinc-900 block">
                Backup automático ao fechar ou sair do navegador
              </strong>
              <span className="text-zinc-500">
                Salva um ponto de restauração verificado por checksum em caso de fechamento inesperado (somente se houver alterações novas).
              </span>
            </span>
          </label>

          <label
            htmlFor="backup-catchup-reopen"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 cursor-pointer"
          >
            <input
              id="backup-catchup-reopen"
              type="checkbox"
              checked={scheduleDraft.runMissedOnReopen}
              onChange={(e) =>
                setScheduleDraft((prev) => ({
                  ...prev,
                  runMissedOnReopen: e.target.checked,
                }))
              }
              className="mt-0.5 rounded border-zinc-300 accent-zinc-950"
            />
            <span className="text-xs leading-relaxed">
              <strong className="text-zinc-900 block">
                Recuperar backup pendente ao reabrir o painel
              </strong>
              <span className="text-zinc-500">
                Se o navegador estava fechado no horário programado, executa o backup automaticamente assim que o sistema for reaberto.
              </span>
            </span>
          </label>
        </div>

        {scheduleError && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-bold text-rose-800 flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{scheduleError}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleRunScheduledBackupNow}
            className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Executar Agendado Agora</span>
          </button>

          <div className="flex items-center gap-2">
            {hasUnsavedScheduleChanges && (
              <span className="text-[11px] font-bold text-amber-700">
                Alterações pendentes
              </span>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Agendamento</span>
            </button>
          </div>
        </div>
      </form>

      {/* Create New Snapshot Bar */}
      <form
        onSubmit={handleCreateManualBackup}
        className="rounded-2xl bg-[#FFFBEB]/70 border border-[#FDE68A] p-4 sm:p-5 space-y-3.5"
      >
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label
              htmlFor="site-backup-label"
              className="block text-xs font-extrabold text-zinc-900"
            >
              Criar Novo Ponto de Backup do Site (opcional: adicione uma etiqueta)
            </label>
            <input
              id="site-backup-label"
              type="text"
              value={backupLabel}
              onChange={(e) => setBackupLabel(e.target.value)}
              placeholder="Ex: Antes da atualização de preços de Novembro / Fechamento do dia..."
              className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-medium text-zinc-900 focus:border-[#FFBE00] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-colors shrink-0"
          >
            <Database className="w-4 h-4" />
            <span>Criar Backup Agora</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-600 pt-1 border-t border-amber-200/70">
          <span className="font-bold text-zinc-800 inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            Conteúdo protegido neste backup:
          </span>
          <span className="font-mono">
            {currentSitePayload.products.length} produtos
          </span>
          <span className="text-amber-300">·</span>
          <span className="font-mono">
            {currentSitePayload.categories.length} categorias
          </span>
          <span className="text-amber-300">·</span>
          <span className="font-mono">
            {currentSitePayload.kits.length} kits
          </span>
          <span className="text-amber-300">·</span>
          <span className="font-mono">
            {currentSitePayload.banners.length} banners
          </span>
          <span className="text-amber-300">·</span>
          <span className="font-mono">
            {currentSitePayload.coupons.length} cupons
          </span>
          <span className="text-amber-300">·</span>
          <span className="font-mono">
            {currentSitePayload.orders.length} pedidos
          </span>
          <span className="text-amber-300">·</span>
          <span className="font-mono">
            {currentSitePayload.adminUsers.length} usuário(s)
          </span>
        </div>
      </form>

      {/* Filter Stored Backups by Date & Search */}
      <div className="space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar backups armazenados"
              placeholder="Buscar backup por etiqueta, usuário ou data (ex: 19/11/2026)..."
              className="w-full pl-9 pr-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="backup-date-filter"
              className="text-xs font-bold text-zinc-600 inline-flex items-center gap-1 whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5 text-[#E3262E]" />
              <span>Data do backup:</span>
            </label>
            <input
              id="backup-date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                if (!e.target.value) onClearExternalDateFilter?.();
              }}
              aria-label="Filtrar backups por data específica"
              className="px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none cursor-pointer"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter('');
                  onClearExternalDateFilter?.();
                }}
                aria-label="Limpar filtro de data dos backups"
                className="px-2.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Clickable Dates with Stored Backups */}
        {backupDateChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-bold text-zinc-500 mr-1">
              Datas com backup salvo:
            </span>
            <button
              type="button"
              onClick={() => {
                setDateFilter('');
                onClearExternalDateFilter?.();
              }}
              className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer transition-colors ${
                !dateFilter
                  ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950'
                  : 'bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-700 border-zinc-200'
              }`}
            >
              Todas ({backups.length})
            </button>
            {backupDateChips.map((chip) => {
              const activeChip = dateFilter === chip.dateKey;
              return (
                <button
                  key={`bkp-chip-${chip.dateKey}`}
                  type="button"
                  onClick={() =>
                    setDateFilter((prev) =>
                      prev === chip.dateKey ? '' : chip.dateKey
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg border font-mono font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
                    activeChip
                      ? 'bg-[#FFBE00] text-zinc-950 border-[#FFBE00]'
                      : 'bg-white hover:bg-[#FFFBEB] text-zinc-700 border-zinc-200'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`px-1 rounded text-[10px] ${
                      activeChip
                        ? 'bg-zinc-950 text-[#FFBE00]'
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

      {/* Stored Snapshots List */}
      {filteredBackups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-[#FAFAFA] p-8 text-center space-y-2">
          <Database className="w-8 h-8 text-zinc-400 mx-auto" />
          <div className="font-display text-sm font-extrabold text-zinc-900">
            {backups.length === 0
              ? 'Nenhum backup do site salvo ainda'
              : `Nenhum backup encontrado para ${
                  dateFilter ? formatBrDateFromYmd(dateFilter) : 'este filtro'
                }`}
          </div>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            {backups.length === 0
              ? 'Clique em "Criar Backup Agora" acima para armazenar um snapshot completo do site vinculado à data de hoje.'
              : 'Limpe o filtro de data para ver todos os pontos de restauração disponíveis ou crie um novo backup.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBackups.map((snap) => {
            const triggerMeta =
              SITE_BACKUP_TRIGGER_META[snap.trigger] ||
              SITE_BACKUP_TRIGGER_META.manual;
            const integrity = verifySiteBackupIntegrity(snap);
            const isConfirmingRestore = confirmRestoreId === snap.id;
            const isConfirmingDelete = confirmDeleteId === snap.id;
            const createdTime = new Date(snap.createdAt).toLocaleTimeString(
              'pt-BR',
              { hour: '2-digit', minute: '2-digit', second: '2-digit' }
            );

            return (
              <div
                key={snap.id}
                className="rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 p-4 sm:p-5 transition-colors space-y-3"
              >
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Calendar Date Pill */}
                    <div className="w-16 shrink-0 rounded-xl bg-zinc-950 text-white px-2 py-2 text-center border border-zinc-900">
                      <div className="font-mono text-[10px] uppercase text-[#FFBE00] font-extrabold">
                        {formatBrDateFromYmd(snap.dateKey).slice(0, 5)}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-400">
                        {snap.dateKey.slice(0, 4)}
                      </div>
                      <div className="mt-1 pt-1 border-t border-zinc-800 font-mono text-[10px] text-zinc-200 tabular-nums inline-flex items-center justify-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-[#FFBE00]" />
                        <span>{createdTime.slice(0, 5)}</span>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-sm font-extrabold text-zinc-900">
                          {snap.label}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${triggerMeta.badgeClass}`}
                        >
                          {triggerMeta.label}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md border font-mono text-[10px] font-extrabold inline-flex items-center gap-1 ${
                            integrity.valid
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {integrity.valid ? (
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                          )}
                          <span>
                            {integrity.valid
                              ? `Integridade OK · #${integrity.computedChecksum}`
                              : 'Integridade Comprometida'}
                          </span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 font-mono text-[10px] font-bold text-zinc-700 tabular-nums">
                          {formatBackupByteSize(snap.summary.sizeBytes)}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                        <span>
                          Criado por{' '}
                          <strong className="text-zinc-800">{snap.createdBy}</strong>
                        </span>
                        <span className="text-zinc-300">·</span>
                        <span className="font-mono text-[11px]">
                          {formatBrDateFromYmd(snap.dateKey)} às {createdTime}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-[#FAFAFA] border border-zinc-200 text-zinc-700 font-semibold">
                          {snap.summary.productsCount} produtos
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#FAFAFA] border border-zinc-200 text-zinc-700 font-semibold">
                          {snap.summary.categoriesCount} categorias
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#FAFAFA] border border-zinc-200 text-zinc-700 font-semibold">
                          {snap.summary.kitsCount} kits
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#FAFAFA] border border-zinc-200 text-zinc-700 font-semibold">
                          {snap.summary.bannersCount} banners
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#FAFAFA] border border-zinc-200 text-zinc-700 font-semibold">
                          {snap.summary.ordersCount} pedidos
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#FAFAFA] border border-zinc-200 text-zinc-700 font-semibold">
                          {snap.summary.adminUsersCount} usuário(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownloadBackupJson(snap)}
                      className="px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#E3262E]" />
                      <span>Baixar JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteId(null);
                        setConfirmRestoreId((prev) =>
                          prev === snap.id ? null : snap.id
                        );
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                        isConfirmingRestore
                          ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950'
                          : 'bg-[#FFFBEB] hover:bg-[#FFBE00] text-zinc-950 border-[#FFBE00]'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restaurar</span>
                    </button>

                    {!isConfirmingDelete ? (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmRestoreId(null);
                          setConfirmDeleteId(snap.id);
                        }}
                        aria-label={`Excluir backup ${snap.label}`}
                        className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-zinc-500 hover:text-rose-700 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1.5 text-xs">
                        <span className="font-bold text-rose-800">Excluir?</span>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(snap)}
                          className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-extrabold cursor-pointer"
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 font-bold cursor-pointer"
                        >
                          Não
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Restore Confirmation Drawer */}
                {isConfirmingRestore && (
                  <div className="rounded-xl bg-[#FFFBEB] border-2 border-[#FFBE00] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-extrabold text-zinc-950">
                        Confirmar restauração para {formatBrDateFromYmd(snap.dateKey)} às{' '}
                        {createdTime}?
                      </div>
                      <p className="text-zinc-600">
                        Os dados atuais serão substituídos por este backup. Um{' '}
                        <strong>Backup Automático Pré-Restauração</strong> será criado antes para sua segurança.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleConfirmRestore(snap)}
                        className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] font-extrabold cursor-pointer"
                      >
                        Sim, Restaurar Site
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRestoreId(null)}
                        className="px-3 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-700 font-bold cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
