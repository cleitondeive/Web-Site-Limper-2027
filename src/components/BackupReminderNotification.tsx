import React, { useEffect } from 'react';
import {
  BellRing,
  Clock,
  Database,
  ExternalLink,
  ShieldAlert,
  X,
} from 'lucide-react';
import { BackupReminderEvaluation, BackupReminderStyle } from '../types/commerce';

interface BackupReminderNotificationProps {
  evaluation: BackupReminderEvaluation;
  styleOverride?: BackupReminderStyle | null;
  isPreview?: boolean;
  onBackupNow: () => void;
  onOpenBackupVault: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}

export const BackupReminderNotification: React.FC<BackupReminderNotificationProps> = ({
  evaluation,
  styleOverride = null,
  isPreview = false,
  onBackupNow,
  onOpenBackupVault,
  onSnooze,
  onDismiss,
}) => {
  const activeStyle: BackupReminderStyle = styleOverride ?? evaluation.style;

  useEffect(() => {
    if (activeStyle !== 'modal') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeStyle, onDismiss]);

  const formattedLastDate = evaluation.lastBackupAt
    ? new Date(evaluation.lastBackupAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const headline =
    evaluation.reason === 'never_backed_up'
      ? 'Nenhum backup do banco de dados realizado ainda'
      : `Último backup realizado ${evaluation.humanElapsedLabel}`;

  const bodyCopy =
    evaluation.reason === 'never_backed_up'
      ? `Proteja seu catálogo, pedidos e clientes criando o primeiro ponto de restauração (alerta configurado para ${evaluation.thresholdHours}h).`
      : `O intervalo de segurança definido (${evaluation.thresholdHours}h) foi ultrapassado. Gere um novo ponto de restauração agora para manter seus dados protegidos.`;

  if (activeStyle === 'modal') {
    return (
      <div
        id="admin-backup-reminder-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-reminder-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onDismiss();
        }}
        className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print"
      >
        <div className="bg-white rounded-2xl border-2 border-[#FFBE00] shadow-2xl max-w-md w-full overflow-hidden my-auto">
          {/* Header */}
          <div className="p-5 pb-4 border-b border-zinc-100 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FFBE00] text-[#B45309] flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[#E3262E] block">
                  {isPreview
                    ? 'PRÉ-VISUALIZAÇÃO · LEMBRETE DE BACKUP'
                    : `LEMBRETE DE BACKUP · +${evaluation.thresholdHours}H`}
                </span>
                <h3
                  id="backup-reminder-modal-title"
                  className="font-display text-base font-extrabold text-zinc-900 leading-snug mt-0.5"
                >
                  Hora de proteger os dados da loja
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Fechar lembrete de backup"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-extrabold text-zinc-950">
                <ShieldAlert className="w-4 h-4 text-[#E3262E] shrink-0" />
                <span>{headline}</span>
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed">{bodyCopy}</p>
              {formattedLastDate && (
                <div className="pt-1 flex items-center gap-1.5 text-[11px] font-mono text-zinc-600">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Último snapshot salvo em: {formattedLastDate}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onBackupNow}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-xs font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <Database className="w-4 h-4" />
                <span>Criar Backup Completo Agora</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenBackupVault}
                  className="py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Central de Backups</span>
                </button>
                <button
                  type="button"
                  onClick={onSnooze}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  Lembrar em 4h
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Toast style (floating non-blocking notification card)
  return (
    <div
      id="admin-backup-reminder-toast"
      role="status"
      aria-live="polite"
      className="fixed bottom-3 right-3 left-3 sm:left-auto sm:bottom-5 sm:right-5 z-40 sm:w-full max-w-sm bg-zinc-950 text-white rounded-2xl border-2 border-[#FFBE00] shadow-2xl p-3 sm:p-4 space-y-2.5 sm:space-y-3 no-print"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FFBE00] text-zinc-950 flex items-center justify-center shrink-0">
            <BellRing className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9.5px] sm:text-[10px] font-mono font-extrabold uppercase tracking-wider text-[#FFBE00] block truncate">
              {isPreview
                ? 'PRÉ-VISUALIZAÇÃO · BACKUP'
                : `LEMBRETE DE BACKUP · +${evaluation.thresholdHours}H`}
            </span>
            <p className="text-[11.5px] sm:text-xs font-extrabold text-white leading-snug mt-0.5">
              {headline}
            </p>
            <p className="hidden sm:block text-[11px] text-zinc-300 leading-relaxed mt-1">
              {formattedLastDate
                ? `Último ponto salvo em ${formattedLastDate}. Faça um backup rápido para garantir a integridade dos dados.`
                : `Mantenha seus dados protegidos gerando um snapshot completo agora.`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dispensar lembrete de backup"
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onBackupNow}
          className="flex-1 min-w-[115px] py-2 px-2 min-[360px]:px-2.5 sm:px-3 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-[11px] sm:text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
        >
          <Database className="w-3.5 h-3.5 shrink-0" />
          <span>Backup Agora</span>
        </button>
        <button
          type="button"
          onClick={onOpenBackupVault}
          className="py-2 px-2 min-[360px]:px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-[11px] sm:text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
        >
          Configurar
        </button>
        <button
          type="button"
          onClick={onSnooze}
          className="py-2 px-2 min-[360px]:px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] sm:text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
        >
          Adiar 4h
        </button>
      </div>
    </div>
  );
};
