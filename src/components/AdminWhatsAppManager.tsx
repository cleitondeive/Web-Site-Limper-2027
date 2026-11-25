import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  AdminRoleLevel,
  CreateSecurityAuditEventInput,
  StoreSettings,
  StoreWhatsAppContact,
} from '../types/commerce';
import {
  activateStoreWhatsAppNumber,
  buildStoreWhatsAppHref,
  ensureStoreWhatsAppContacts,
  formatPhone,
  formatStoreWhatsAppDisplay,
  normalizePhone,
  normalizeStoreWhatsAppNumber,
  validateStoreWhatsAppInput,
} from '../utils/commerce';

interface AdminWhatsAppManagerProps {
  settings: StoreSettings;
  actorLabel: string;
  actorUsername?: string;
  actorRole?: AdminRoleLevel;
  onUpdateSettings: (nextSettings: StoreSettings) => void;
  onRecordSecurityEvent: (input: CreateSecurityAuditEventInput) => void;
}

export const AdminWhatsAppManager: React.FC<AdminWhatsAppManagerProps> = ({
  settings,
  actorLabel,
  actorUsername,
  actorRole,
  onUpdateSettings,
  onRecordSecurityEvent,
}) => {
  const activeNormalized =
    normalizeStoreWhatsAppNumber(settings.whatsappNumber) || '556530296824';
  const activeDisplay =
    formatStoreWhatsAppDisplay(activeNormalized) || settings.whatsappDisplay;

  const contacts = useMemo(
    () => ensureStoreWhatsAppContacts(settings),
    [settings]
  );

  const activeContact =
    contacts.find((c) => c.whatsappNumber === activeNormalized) || null;
  const activeLabel =
    settings.activeWhatsAppLabel?.trim() ||
    activeContact?.label ||
    'Central Limper MT';

  const [phoneInput, setPhoneInput] = useState<string>('');
  const [labelInput, setLabelInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [saveToDirectory, setSaveToDirectory] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const activeTestUrl = buildStoreWhatsAppHref(
    activeNormalized,
    `Olá! Teste de conexão do WhatsApp oficial de orçamentos da ${settings.storeName || 'Limper MT'}.`
  );

  const showTemporaryFeedback = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => {
      setFeedback((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const handlePhoneInputChange = (raw: string) => {
    setFormError(null);
    const digits = normalizePhone(raw);
    const localDigits =
      digits.startsWith('55') && digits.length > 11
        ? digits.slice(2, 13)
        : digits.slice(0, 11);
    setPhoneInput(formatPhone(localDigits));
  };

  const handleSubmitWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateStoreWhatsAppInput(phoneInput);
    if (!validation.valid || !validation.normalizedNumber || !validation.formattedDisplay) {
      setFormError(
        validation.error || 'Informe um número de WhatsApp válido com DDD.'
      );
      return;
    }

    const cleanLabel = labelInput.trim() || 'Atendimento Comercial';
    const nextSettings = activateStoreWhatsAppNumber(settings, {
      phoneInput: validation.normalizedNumber,
      label: cleanLabel,
      note: noteInput.trim() || undefined,
      contactId: editingContactId || undefined,
      saveToDirectory,
    });

    onUpdateSettings(nextSettings);
    onRecordSecurityEvent({
      category: 'catalog_policy',
      outcome: 'allowed',
      actorLabel,
      actorUsername,
      actorRole,
      rawTarget: `${validation.formattedDisplay} (${cleanLabel})`,
      summary: `WhatsApp de orçamentos alterado para ${validation.formattedDisplay}`,
      detail: `Novo número ativo (${validation.normalizedNumber} · ${cleanLabel}) aplicado automaticamente no checkout, orçamentos, consulta de frete e canais da loja.`,
    });

    setPhoneInput('');
    setLabelInput('');
    setNoteInput('');
    setEditingContactId(null);
    showTemporaryFeedback(
      `WhatsApp ${validation.formattedDisplay} (${cleanLabel}) ativado! Todos os orçamentos e pedidos da loja já estão direcionados para este número.`
    );
  };

  const handleActivateSavedContact = (contact: StoreWhatsAppContact) => {
    setFormError(null);
    const nextSettings = activateStoreWhatsAppNumber(settings, {
      phoneInput: contact.whatsappNumber,
      label: contact.label,
      note: contact.note,
      contactId: contact.id,
      saveToDirectory: true,
    });
    onUpdateSettings(nextSettings);
    onRecordSecurityEvent({
      category: 'catalog_policy',
      outcome: 'allowed',
      actorLabel,
      actorUsername,
      actorRole,
      rawTarget: `${contact.whatsappDisplay} (${contact.label})`,
      summary: `WhatsApp ativo trocado para ${contact.whatsappDisplay} (${contact.label})`,
      detail: `Troca rápida pela agenda de WhatsApp: todos os orçamentos e pedidos agora chegam em ${contact.whatsappNumber}.`,
    });
    showTemporaryFeedback(
      `Ativo agora: ${contact.whatsappDisplay} (${contact.label}) está recebendo os orçamentos e pedidos do site.`
    );
  };

  const handleStartEditContact = (contact: StoreWhatsAppContact) => {
    setFormError(null);
    setEditingContactId(contact.id);
    setPhoneInput(contact.whatsappDisplay);
    setLabelInput(contact.label);
    setNoteInput(contact.note || '');
    setSaveToDirectory(true);
  };

  const handleRemoveSavedContact = (contact: StoreWhatsAppContact) => {
    setFormError(null);
    if (contact.whatsappNumber === activeNormalized) {
      setFormError(
        'Ative outro número de WhatsApp antes de remover o número que está recebendo os orçamentos atualmente.'
      );
      return;
    }
    const nextContacts = contacts.filter((c) => c.id !== contact.id);
    onUpdateSettings({
      ...settings,
      whatsappContacts: nextContacts,
    });
    if (editingContactId === contact.id) {
      setEditingContactId(null);
      setPhoneInput('');
      setLabelInput('');
      setNoteInput('');
    }
    onRecordSecurityEvent({
      category: 'catalog_policy',
      outcome: 'info',
      actorLabel,
      actorUsername,
      actorRole,
      rawTarget: `${contact.whatsappDisplay} (${contact.label})`,
      summary: `Número removido da agenda de WhatsApp: ${contact.whatsappDisplay}`,
      detail: `Contato "${contact.label}" removido da lista de troca rápida de WhatsApp.`,
    });
    showTemporaryFeedback(
      `Número ${contact.whatsappDisplay} removido da agenda de troca rápida.`
    );
  };

  const handleCopyLink = async () => {
    const directUrl = buildStoreWhatsAppHref(activeNormalized);
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  return (
    <section
      id="admin-whatsapp-manager"
      aria-label="Central de WhatsApp para Orçamentos e Pedidos"
      className="bg-white rounded-2xl border-2 border-emerald-200/90 shadow-2xs overflow-hidden"
    >
      {/* Top Active WhatsApp Strip */}
      <div className="bg-emerald-950 text-white px-5 py-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[#25D366] text-zinc-950 flex items-center justify-center shrink-0 shadow-sm">
            <MessageCircle className="w-6 h-6 fill-zinc-950/10" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-extrabold uppercase tracking-wider text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-[#25D366]" />
                <span>WHATSAPP ATIVO PARA ORÇAMENTOS &amp; PEDIDOS</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-900 border border-emerald-700 text-[10px] font-bold text-emerald-100">
                {activeLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span
                data-testid="active-whatsapp-display"
                className="font-mono text-xl sm:text-2xl font-extrabold text-white tracking-tight"
              >
                {activeDisplay}
              </span>
              <span className="font-mono text-[11px] text-emerald-300/90">
                wa.me/{activeNormalized}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-emerald-100 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#25D366]" />
                <span>Link Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Link</span>
              </>
            )}
          </button>
          <a
            href={activeTestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Testar no WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="font-display text-base sm:text-lg font-extrabold text-zinc-900">
              Cadastro &amp; Troca Rápida de WhatsApp de Recebimento
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Sempre que você cadastrar ou ativar um novo número aqui, <strong>todos os orçamentos, pedidos do carrinho, consultas de frete e botões da loja</strong> passam a enviar automaticamente para o número ativo.
            </p>
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Quick Register / Switch Form */}
          <form
            onSubmit={handleSubmitWhatsApp}
            className="lg:col-span-6 p-4 rounded-2xl bg-[#FAFAFA] border border-zinc-200 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-zinc-900 flex items-center gap-1.5">
                {editingContactId ? (
                  <>
                    <Pencil className="w-3.5 h-3.5 text-amber-600" />
                    <span>Editar &amp; Ativar Número Salvo</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Definir Novo Telefone WhatsApp</span>
                  </>
                )}
              </span>
              {editingContactId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingContactId(null);
                    setPhoneInput('');
                    setLabelInput('');
                    setNoteInput('');
                    setFormError(null);
                  }}
                  className="text-[11px] font-bold text-zinc-500 hover:text-zinc-900 underline cursor-pointer"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="admin-wa-phone-input"
                  className="block text-[11px] font-bold text-zinc-700 mb-1"
                >
                  Telefone WhatsApp (DDD + Número) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold text-zinc-400">
                    +55
                  </span>
                  <input
                    id="admin-wa-phone-input"
                    type="tel"
                    inputMode="numeric"
                    value={phoneInput}
                    onChange={(e) => handlePhoneInputChange(e.target.value)}
                    placeholder="(65) 99988-7766"
                    className="w-full pl-11 pr-3 py-2.5 bg-white border border-zinc-300 focus:border-emerald-600 focus:outline-none rounded-xl text-xs font-mono font-bold text-zinc-900"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  DDI 55 e formatação aplicados automaticamente.
                </p>
              </div>

              <div>
                <label
                  htmlFor="admin-wa-label-input"
                  className="block text-[11px] font-bold text-zinc-700 mb-1"
                >
                  Identificação / Vendedor
                </label>
                <input
                  id="admin-wa-label-input"
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="Ex: Plantão Vendas, Balcão, Lucas..."
                  className="w-full px-3 py-2.5 bg-white border border-zinc-300 focus:border-emerald-600 focus:outline-none rounded-xl text-xs text-zinc-900"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-wa-note-input"
                className="block text-[11px] font-bold text-zinc-700 mb-1"
              >
                Observação opcional (ex: turno ou setor)
              </label>
              <input
                id="admin-wa-note-input"
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Ex: Orçamentos B2B e condomínios · Seg a Sáb"
                className="w-full px-3 py-2 bg-white border border-zinc-300 focus:border-emerald-600 focus:outline-none rounded-xl text-xs text-zinc-900"
              />
            </div>

            <label
              htmlFor="admin-wa-save-directory"
              className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none"
            >
              <input
                id="admin-wa-save-directory"
                type="checkbox"
                checked={saveToDirectory}
                onChange={(e) => setSaveToDirectory(e.target.checked)}
                className="rounded border-zinc-300 accent-emerald-700"
              />
              <span>Salvar na agenda ao lado para alternar em 1 clique depois</span>
            </label>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-colors"
            >
              <MessageCircle className="w-4 h-4 fill-zinc-950/15" />
              <span>
                {editingContactId
                  ? 'Atualizar e Ativar para Orçamentos'
                  : 'Definir como WhatsApp Ativo'}
              </span>
            </button>
          </form>

          {/* Right: Saved WhatsApp Directory for 1-Click Rotation */}
          <div className="lg:col-span-6 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-zinc-900 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                <span>Agenda de Números Cadastrados ({contacts.length})</span>
              </span>
              <span className="text-[11px] text-zinc-500">
                Troque o destinatário em 1 clique
              </span>
            </div>

            <div className="space-y-2 max-h-[290px] overflow-y-auto pr-0.5">
              {contacts.map((contact) => {
                const isActive = contact.whatsappNumber === activeNormalized;
                return (
                  <div
                    key={contact.id}
                    className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isActive
                        ? 'bg-emerald-50/90 border-emerald-300'
                        : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-extrabold text-zinc-900 truncate">
                          {contact.label}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-extrabold uppercase tracking-wide">
                            Ativo nos Orçamentos
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-zinc-800">
                        <Phone className="w-3 h-3 text-emerald-700 shrink-0" />
                        <span>{contact.whatsappDisplay}</span>
                        <span className="text-[10px] font-normal text-zinc-400">
                          (+{contact.whatsappNumber.slice(0, 2)})
                        </span>
                      </div>
                      {contact.note && (
                        <p className="text-[11px] text-zinc-500 truncate">
                          {contact.note}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handleActivateSavedContact(contact)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-[11px] font-extrabold cursor-pointer transition-colors"
                        >
                          Ativar Agora
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEditContact(contact)}
                        title={`Editar ${contact.label}`}
                        aria-label={`Editar ${contact.label}`}
                        className="p-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-600 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSavedContact(contact)}
                          title={`Remover ${contact.label}`}
                          aria-label={`Remover ${contact.label}`}
                          className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 text-zinc-500 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Synchronized Channels Scope Footer */}
        <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-600">
          <span className="font-extrabold text-zinc-800">
            Sincronizado automaticamente em:
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Orçamentos &amp; Pedidos (Carrinho)</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Consulta de Frete Interior MT</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cabeçalho, Balcão &amp; Rodapé</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Meus Pedidos &amp; Área do Cliente</span>
          </span>
        </div>
      </div>
    </section>
  );
};
