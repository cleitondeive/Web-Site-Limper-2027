import React, { useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'subnav' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'subnav',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Suppress button when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          void install();
        }}
        data-testid="pwa-install-button"
        className={
          variant === 'compact'
            ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0'
            : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#181A20] hover:bg-zinc-800 text-[#FFBE00] text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0'
        }
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          data-testid="pwa-ios-install-button"
          className={
            variant === 'compact'
              ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0'
              : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#181A20] hover:bg-zinc-800 text-[#FFBE00] text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0'
          }
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>Instalar no iPhone</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-ios-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-3 sm:p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-2xl bg-white border border-zinc-200 shadow-2xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FFBE00] text-zinc-950 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono font-extrabold uppercase tracking-wider text-[#E3262E]">
                      APP LIMPER MT · iOS
                    </span>
                    <h3
                      id="pwa-ios-modal-title"
                      className="font-display text-base font-extrabold text-zinc-900"
                    >
                      Instalar na Tela Inicial
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Fechar instruções"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol className="space-y-2.5 text-xs text-zinc-700 leading-relaxed">
                <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
                  <span className="w-5 h-5 rounded-full bg-zinc-950 text-[#FFBE00] font-mono font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Toque no botão{' '}
                    <strong className="inline-flex items-center gap-1 text-zinc-950">
                      <Share className="w-3.5 h-3.5 inline" /> Compartilhar
                    </strong>{' '}
                    na barra inferior do Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
                  <span className="w-5 h-5 rounded-full bg-zinc-950 text-[#FFBE00] font-mono font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Role para baixo e toque em{' '}
                    <strong className="text-zinc-950">Adicionar à Tela de Início</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
                  <span className="w-5 h-5 rounded-full bg-zinc-950 text-[#FFBE00] font-mono font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Confirme em <strong className="text-zinc-950">Adicionar</strong> para acessar o catálogo Limper MT direto da tela inicial.
                  </span>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-xs font-extrabold cursor-pointer transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="pwa-offline-banner"
      className="fixed bottom-16 md:bottom-4 left-3 right-3 sm:right-auto sm:left-4 z-50 flex items-center gap-2 rounded-xl bg-zinc-950 border border-[#FFBE00] px-3.5 py-2 text-xs font-bold text-white shadow-xl no-print"
    >
      <WifiOff className="w-4 h-4 text-[#FFBE00] shrink-0" />
      <span>Modo Offline — Exibindo catálogo salvo em cache.</span>
    </div>
  );
};
