import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crown,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  KeyRound,
  Link2,
  Lock,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  UserCog,
  UserX,
  X,
} from 'lucide-react';
import {
  AdminAppTab,
  AdminRoleLevel,
  AdminUser,
  CreateSecurityAuditEventInput,
  SecurityAuditEvent,
} from '../types/commerce';
import {
  ADMIN_ROLE_META,
  ADMIN_TAB_CATALOG,
  ALL_ADMIN_TABS,
  ASSIGNABLE_NON_MASTER_TABS,
  SECURITY_CATEGORY_LABELS,
  SECURITY_OUTCOME_META,
  filterSecurityAuditEvents,
  formatAdminActorLabel,
  getEffectiveAllowedTabs,
  getUserInitials,
  normalizeAdminUsername,
  validateAdminUserDraft,
} from '../utils/commerce';
import { optimizeUploadedImage } from '../utils/imageUtils';

interface AdminUsersTabProps {
  users: AdminUser[];
  currentUser: AdminUser;
  securityLogs: SecurityAuditEvent[];
  onSaveUsers: (users: AdminUser[]) => void;
  onRecordSecurityEvent: (input: CreateSecurityAuditEventInput) => void;
  onInspectUserLogsInSecurity: (username: string) => void;
}

const ROLE_ORDER: AdminRoleLevel[] = [
  'master',
  'manager',
  'seller',
  'operator',
  'catalog',
  'viewer',
];

const TAB_GROUPS: Array<'Operação' | 'Catálogo & Marketing' | 'Governança'> = [
  'Operação',
  'Catálogo & Marketing',
  'Governança',
];

export const AdminUserAvatar: React.FC<{
  name: string;
  avatarUrl?: string;
  sizeClass?: string;
  textClass?: string;
  isMaster?: boolean;
}> = ({
  name,
  avatarUrl,
  sizeClass = 'w-11 h-11',
  textClass = 'text-xs',
  isMaster = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const cleanUrl = (avatarUrl || '').trim();
  const showImage = Boolean(cleanUrl) && !imgFailed;

  React.useEffect(() => {
    setImgFailed(false);
  }, [cleanUrl]);

  return (
    <div
      className={`relative rounded-full shrink-0 overflow-hidden flex items-center justify-center font-display font-extrabold select-none border ${
        isMaster
          ? 'bg-zinc-950 text-[#FFBE00] border-[#FFBE00]'
          : 'bg-[#FFFBEB] text-zinc-900 border-amber-300'
      } ${sizeClass} ${textClass}`}
    >
      {showImage ? (
        <img
          src={cleanUrl}
          alt={name}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{getUserInitials(name)}</span>
      )}
    </div>
  );
};

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  currentUser,
  securityLogs,
  onSaveUsers,
  onRecordSecurityEvent,
  onInspectUserLogsInSecurity,
}) => {
  const isMaster = currentUser.role === 'master';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminRoleLevel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Create/Edit Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRoleLevel>('operator');
  const [allowedTabs, setAllowedTabs] = useState<AdminAppTab[]>(
    ADMIN_ROLE_META.operator.defaultTabs
  );
  const [active, setActive] = useState(true);
  const [avatarMode, setAvatarMode] = useState<'upload' | 'url'>('upload');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // UI feedback / inline log drawer / inline delete confirm
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const [expandedLogsUserId, setExpandedLogsUserId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  const actorLabel = formatAdminActorLabel(currentUser);

  const activeMastersCount = useMemo(
    () => users.filter((u) => u.role === 'master' && u.active).length,
    [users]
  );
  const activeUsersCount = useMemo(
    () => users.filter((u) => u.active).length,
    [users]
  );
  const nonMasterUsersCount = useMemo(
    () => users.filter((u) => u.role !== 'master').length,
    [users]
  );

  const userLogsMap = useMemo(() => {
    const map = new Map<string, SecurityAuditEvent[]>();
    for (const u of users) {
      map.set(
        u.id,
        filterSecurityAuditEvents(securityLogs, { actorUsername: u.username })
      );
    }
    return map;
  }, [users, securityLogs]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.active) return false;
      if (statusFilter === 'inactive' && u.active) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.jobTitle || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        ADMIN_ROLE_META[u.role].label.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  if (!isMaster) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="font-display text-lg font-extrabold text-zinc-900">
          Área Exclusiva do Usuário Master
        </h2>
        <p className="text-sm text-zinc-600 max-w-md mx-auto">
          Somente contas com nível <strong>Master</strong> podem cadastrar novos operadores, promover outros usuários Master ou alterar permissões de visualização do painel.
        </p>
      </div>
    );
  }

  const resetForm = () => {
    setEditingUserId(null);
    setName('');
    setJobTitle('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setEmail('');
    setRole('operator');
    setAllowedTabs([...ADMIN_ROLE_META.operator.defaultTabs]);
    setActive(true);
    setAvatarMode('upload');
    setAvatarUrl('');
    setAvatarError(null);
    setFormError(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
    setFeedback(null);
  };

  const openEditForm = (user: AdminUser) => {
    setEditingUserId(user.id);
    setName(user.name);
    setJobTitle(user.jobTitle || '');
    setUsername(user.username);
    setPassword(user.password);
    setShowPassword(false);
    setEmail(user.email || '');
    setRole(user.role);
    setAllowedTabs(
      user.role === 'master' ? [...ALL_ADMIN_TABS] : getEffectiveAllowedTabs(user)
    );
    setActive(user.active);
    setAvatarMode(user.avatarUrl?.startsWith('data:image/') ? 'upload' : 'url');
    setAvatarUrl(user.avatarUrl || '');
    setAvatarError(null);
    setFormError(null);
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleSelectRole = (nextRole: AdminRoleLevel) => {
    setRole(nextRole);
    setFormError(null);
    if (nextRole === 'master') {
      setAllowedTabs([...ALL_ADMIN_TABS]);
    } else {
      setAllowedTabs([...ADMIN_ROLE_META[nextRole].defaultTabs]);
    }
  };

  const handleToggleAllowedTab = (tabId: AdminAppTab) => {
    if (role === 'master' || tabId === 'users') return;
    setAllowedTabs((prev) =>
      prev.includes(tabId)
        ? prev.filter((t) => t !== tabId)
        : [...prev, tabId]
    );
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError(null);
    const result = await optimizeUploadedImage(file, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.85,
      maxSizeMb: 4,
    });
    if (!result.ok) {
      setAvatarError(result.error);
      return;
    }
    setAvatarUrl(result.dataUrl);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const normalizedUser = normalizeAdminUsername(username);
    const effectiveTabs =
      role === 'master'
        ? [...ALL_ADMIN_TABS]
        : allowedTabs.filter(
            (t) => t !== 'users' && ASSIGNABLE_NON_MASTER_TABS.includes(t)
          );

    const isKeepingExistingServerPassword =
      Boolean(editingUserId) && password.trim().length === 0;

    const validation = validateAdminUserDraft(
      {
        name,
        username: normalizedUser,
        password: isKeepingExistingServerPassword ? '__KEEP_SERVER_HASH__' : password,
        role,
        allowedTabs: effectiveTabs,
        active,
        avatarUrl,
      },
      users,
      editingUserId
    );

    if (!validation.valid) {
      setFormError(validation.error || 'Verifique os campos obrigatórios.');
      return;
    }

    const cleanAvatar = avatarUrl.trim() || undefined;
    const nowIso = new Date().toISOString();

    if (editingUserId) {
      const previous = users.find((u) => u.id === editingUserId);
      const updatedUsers = users.map((u) =>
        u.id === editingUserId
          ? {
              ...u,
              name: name.trim(),
              jobTitle: jobTitle.trim() || undefined,
              username: normalizedUser,
              password: password.trim(),
              email: email.trim() || undefined,
              avatarUrl: cleanAvatar,
              role,
              allowedTabs: effectiveTabs,
              active,
            }
          : u
      );
      onSaveUsers(updatedUsers);
      onRecordSecurityEvent({
        category: 'user_management',
        outcome: 'allowed',
        actorLabel,
        actorUsername: currentUser.username,
        actorRole: currentUser.role,
        rawTarget: `@${normalizedUser}`,
        summary: `Usuário "${name.trim()}" (@${normalizedUser}) atualizado`,
        detail: `Nível: ${ADMIN_ROLE_META[role].shortLabel}${
          previous && previous.role !== role
            ? ` (alterado de ${ADMIN_ROLE_META[previous.role].shortLabel})`
            : ''
        } · Status: ${active ? 'Ativo' : 'Suspenso'} · ${
          role === 'master'
            ? 'Acesso total (todos os módulos + gestão de usuários)'
            : `${effectiveTabs.length} módulo(s) liberado(s): ${effectiveTabs
                .map((t) => ADMIN_TAB_CATALOG.find((c) => c.id === t)?.shortLabel || t)
                .join(', ')}`
        }.`,
      });
      setFeedback({
        tone: 'success',
        message: `Conta de ${name.trim()} (@${normalizedUser}) atualizada e registrada no log do sistema.`,
      });
    } else {
      const newUser: AdminUser = {
        id: `adm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        jobTitle: jobTitle.trim() || undefined,
        username: normalizedUser,
        password: password.trim(),
        email: email.trim() || undefined,
        avatarUrl: cleanAvatar,
        role,
        allowedTabs: effectiveTabs,
        active,
        createdAt: nowIso,
        createdBy: actorLabel,
      };
      onSaveUsers([...users, newUser]);
      onRecordSecurityEvent({
        category: 'user_management',
        outcome: 'allowed',
        actorLabel,
        actorUsername: currentUser.username,
        actorRole: currentUser.role,
        rawTarget: `@${normalizedUser}`,
        summary: `Novo usuário ${ADMIN_ROLE_META[role].shortLabel} criado: ${newUser.name} (@${normalizedUser})`,
        detail:
          role === 'master'
            ? `Conta Master criada por ${actorLabel} com acesso irrestrito a todos os módulos.`
            : `Conta criada por ${actorLabel} com acesso liberado a ${effectiveTabs.length} módulo(s): ${effectiveTabs
                .map((t) => ADMIN_TAB_CATALOG.find((c) => c.id === t)?.shortLabel || t)
                .join(', ')}.`,
      });
      setFeedback({
        tone: 'success',
        message: `Usuário ${newUser.name} (@${normalizedUser}) cadastrado com sucesso! Já pode acessar o painel.`,
      });
    }

    setIsFormOpen(false);
    resetForm();
  };

  const handleToggleActive = (target: AdminUser) => {
    if (target.id === currentUser.id) {
      setFeedback({
        tone: 'error',
        message: 'Você não pode suspender a própria conta enquanto estiver logado.',
      });
      return;
    }
    const nextActive = !target.active;
    if (!nextActive && target.role === 'master' && activeMastersCount <= 1) {
      setFeedback({
        tone: 'error',
        message: 'Não é possível suspender o único usuário Master ativo do sistema.',
      });
      return;
    }
    onSaveUsers(
      users.map((u) => (u.id === target.id ? { ...u, active: nextActive } : u))
    );
    onRecordSecurityEvent({
      category: 'user_management',
      outcome: nextActive ? 'allowed' : 'blocked',
      actorLabel,
      actorUsername: currentUser.username,
      actorRole: currentUser.role,
      rawTarget: `@${target.username}`,
      summary: nextActive
        ? `Acesso reativado para ${target.name} (@${target.username})`
        : `Acesso suspenso para ${target.name} (@${target.username})`,
      detail: nextActive
        ? `Conta liberada novamente para autenticação no Gestor Limper MT.`
        : `Conta bloqueada por ${actorLabel}; novas tentativas de login serão recusadas.`,
    });
    setFeedback({
      tone: 'success',
      message: nextActive
        ? `Acesso de ${target.name} (@${target.username}) reativado.`
        : `Acesso de ${target.name} (@${target.username}) suspenso.`,
    });
  };

  const handleDeleteUser = (target: AdminUser) => {
    if (target.id === currentUser.id) {
      setFeedback({
        tone: 'error',
        message: 'Você não pode excluir a própria conta logada.',
      });
      setConfirmDeleteUserId(null);
      return;
    }
    if (target.role === 'master' && target.active && activeMastersCount <= 1) {
      setFeedback({
        tone: 'error',
        message: 'Não é possível excluir o único usuário Master ativo.',
      });
      setConfirmDeleteUserId(null);
      return;
    }
    onSaveUsers(users.filter((u) => u.id !== target.id));
    onRecordSecurityEvent({
      category: 'user_management',
      outcome: 'info',
      actorLabel,
      actorUsername: currentUser.username,
      actorRole: currentUser.role,
      rawTarget: `@${target.username}`,
      summary: `Usuário removido: ${target.name} (@${target.username})`,
      detail: `Conta de nível ${ADMIN_ROLE_META[target.role].shortLabel} excluída definitivamente por ${actorLabel}.`,
    });
    setConfirmDeleteUserId(null);
    setFeedback({
      tone: 'success',
      message: `Usuário ${target.name} (@${target.username}) removido com registro em auditoria.`,
    });
  };

  const previewTabs =
    role === 'master'
      ? ALL_ADMIN_TABS
      : allowedTabs.filter((t) => t !== 'users');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#E3262E]">
            <Crown className="w-4 h-4 text-[#B45309]" />
            <span>Governança Master · Controle de Equipe & Permissões</span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-extrabold text-zinc-900">
            Usuários Administrativos & Níveis de Acesso
          </h1>
          <p className="text-sm text-zinc-500 max-w-2xl">
            Cadastre novos usuários <strong>Master</strong> ou contas com níveis personalizados, defina exatamente quais telas cada operador pode visualizar e acompanhe os logs de atividade por usuário.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => (isFormOpen ? setIsFormOpen(false) : openCreateForm())}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors ${
              isFormOpen
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300'
                : 'bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950'
            }`}
          >
            {isFormOpen ? (
              <>
                <X className="w-4 h-4" />
                <span>Fechar Formulário</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Novo Usuário</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-xs font-bold flex items-center justify-between gap-3 ${
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
            Fechar
          </button>
        </div>
      )}

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center justify-between gap-3 shadow-2xs">
          <div>
            <p className="text-[11px] font-mono uppercase font-bold text-zinc-500">
              Total de Contas
            </p>
            <p className="font-mono text-xl font-extrabold text-zinc-950 tabular-nums mt-0.5">
              {users.length}
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              {activeUsersCount} ativa(s)
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] flex items-center justify-center shrink-0">
            <UserCog className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center justify-between gap-3 shadow-2xs">
          <div>
            <p className="text-[11px] font-mono uppercase font-bold text-zinc-500">
              Contas Master
            </p>
            <p className="font-mono text-xl font-extrabold text-zinc-950 tabular-nums mt-0.5">
              {activeMastersCount}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Acesso irrestrito + equipe
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-950 text-[#FFBE00] flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center justify-between gap-3 shadow-2xs">
          <div>
            <p className="text-[11px] font-mono uppercase font-bold text-zinc-500">
              Contas com Nível
            </p>
            <p className="font-mono text-xl font-extrabold text-zinc-950 tabular-nums mt-0.5">
              {nonMasterUsersCount}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Telas sob medida por função
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center justify-between gap-3 shadow-2xs">
          <div>
            <p className="text-[11px] font-mono uppercase font-bold text-zinc-500">
              Logs Auditáveis
            </p>
            <p className="font-mono text-xl font-extrabold text-zinc-950 tabular-nums mt-0.5">
              {securityLogs.length}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Rastreio por operador logado
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 text-[#E3262E] flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Create / Edit User Studio */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmitForm}
          className="bg-white rounded-2xl border-2 border-[#FFBE00] p-5 sm:p-6 shadow-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200">
            <div>
              <span className="text-[11px] font-mono uppercase font-extrabold tracking-wider text-[#B45309]">
                {editingUserId ? 'Edição de Credenciais & Permissões' : 'Novo Cadastro de Equipe'}
              </span>
              <h2 className="font-display text-lg font-extrabold text-zinc-900">
                {editingUserId
                  ? `Editando ${name || 'usuário'}`
                  : 'Cadastrar Usuário Administrativo'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100 self-start sm:self-auto cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left 8 Columns: Credentials + Photo + Role + Module Permissions */}
            <div className="xl:col-span-8 space-y-6">
              {/* Section 1: Dados & Credenciais */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-zinc-900 uppercase tracking-wide">
                  <span className="w-5 h-5 rounded-md bg-zinc-950 text-[#FFBE00] font-mono text-[11px] flex items-center justify-center">
                    1
                  </span>
                  <span>Identificação & Credenciais de Login</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="adm-user-name"
                      className="block text-xs font-bold text-zinc-700 mb-1"
                    >
                      Nome Completo *
                    </label>
                    <input
                      id="adm-user-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Carla Souza"
                      className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="adm-user-job"
                      className="block text-xs font-bold text-zinc-700 mb-1"
                    >
                      Cargo / Setor
                    </label>
                    <input
                      id="adm-user-job"
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Ex: Líder de Expedição · Balcão VG"
                      className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="adm-user-login"
                      className="block text-xs font-bold text-zinc-700 mb-1"
                    >
                      Login de Acesso (@usuário) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm">
                        @
                      </span>
                      <input
                        id="adm-user-login"
                        type="text"
                        required
                        value={username}
                        onChange={(e) =>
                          setUsername(normalizeAdminUsername(e.target.value))
                        }
                        placeholder="carla.operacao"
                        className="w-full pl-8 pr-3.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm font-mono text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="adm-user-pass"
                      className="block text-xs font-bold text-zinc-700 mb-1"
                    >
                      Senha de Acesso *
                    </label>
                    <div className="relative">
                      <input
                        id="adm-user-pass"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm font-mono text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-zinc-900 cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="adm-user-email"
                      className="block text-xs font-bold text-zinc-700 mb-1"
                    >
                      E-mail Corporativo (opcional)
                    </label>
                    <input
                      id="adm-user-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="carla@limpermt.com.br"
                      className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-[#FAFAFA] cursor-pointer">
                      <div>
                        <div className="text-xs font-extrabold text-zinc-900">
                          Status da Conta
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {active
                            ? 'Ativa — pode entrar no painel'
                            : 'Suspensa — login bloqueado'}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                        className="w-4 h-4 accent-[#E3262E] cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 2: Foto do Usuário (Upload do Computador OU Link) */}
              <div className="space-y-3 pt-4 border-t border-zinc-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-zinc-900 uppercase tracking-wide">
                    <span className="w-5 h-5 rounded-md bg-zinc-950 text-[#FFBE00] font-mono text-[11px] flex items-center justify-center">
                      2
                    </span>
                    <span>Foto de Perfil (Computador ou Link URL)</span>
                  </div>

                  <div className="inline-flex rounded-xl border border-zinc-200 bg-[#FAFAFA] p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarMode('upload');
                        setAvatarError(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                        avatarMode === 'upload'
                          ? 'bg-zinc-950 text-[#FFBE00]'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload do Computador</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarMode('url');
                        setAvatarError(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                        avatarMode === 'url'
                          ? 'bg-zinc-950 text-[#FFBE00]'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Link da Imagem (URL)</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-zinc-200 space-y-3">
                  {avatarMode === 'upload' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFFBEB] border border-dashed border-zinc-400 hover:border-[#FFBE00] text-xs font-extrabold text-zinc-800 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <ImageIcon className="w-4 h-4 text-[#E3262E]" />
                        <span>Escolher Foto do Computador (JPG, PNG, WEBP)</span>
                      </button>
                      <span className="text-[11px] text-zinc-500">
                        Até 3 MB · Salvo diretamente no perfil do usuário.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="adm-user-avatar-url"
                        className="block text-xs font-bold text-zinc-700"
                      >
                        Cole o link direto da foto (https://...)
                      </label>
                      <input
                        id="adm-user-avatar-url"
                        type="url"
                        value={avatarUrl.startsWith('data:image/') ? '' : avatarUrl}
                        onChange={(e) => {
                          setAvatarError(null);
                          setAvatarUrl(e.target.value);
                        }}
                        placeholder="https://exemplo.com/foto-operador.jpg"
                        className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 focus:border-[#FFBE00] focus:outline-none"
                      />
                    </div>
                  )}

                  {avatarError && (
                    <p className="text-xs font-bold text-rose-700">{avatarError}</p>
                  )}

                  {avatarUrl && (
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-200/80">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AdminUserAvatar
                          name={name || 'Usuário'}
                          avatarUrl={avatarUrl}
                          sizeClass="w-9 h-9"
                          isMaster={role === 'master'}
                        />
                        <span className="text-xs font-semibold text-zinc-700 truncate">
                          {avatarUrl.startsWith('data:image/')
                            ? 'Imagem carregada do computador'
                            : avatarUrl}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="text-xs font-bold text-rose-600 hover:underline shrink-0 cursor-pointer"
                      >
                        Remover foto
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Nível de Acesso */}
              <div className="space-y-3 pt-4 border-t border-zinc-100">
                <div className="flex items-center gap-2 text-xs font-extrabold text-zinc-900 uppercase tracking-wide">
                  <span className="w-5 h-5 rounded-md bg-zinc-950 text-[#FFBE00] font-mono text-[11px] flex items-center justify-center">
                    3
                  </span>
                  <span>Nível Hierárquico do Usuário</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {ROLE_ORDER.map((level) => {
                    const meta = ADMIN_ROLE_META[level];
                    const selected = role === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        data-role={level}
                        onClick={() => handleSelectRole(level)}
                        className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                          selected
                            ? level === 'master'
                              ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                              : 'bg-[#FFFBEB] border-[#FFBE00] ring-2 ring-[#FFBE00]/30 text-zinc-900'
                            : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-extrabold flex items-center gap-1.5 ${
                              selected && level === 'master'
                                ? 'text-[#FFBE00]'
                                : 'text-zinc-900'
                            }`}
                          >
                            {level === 'master' && <Crown className="w-3.5 h-3.5" />}
                            {meta.shortLabel}
                          </span>
                          {selected && (
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                level === 'master'
                                  ? 'bg-[#FFBE00] text-zinc-950'
                                  : 'bg-zinc-950 text-[#FFBE00]'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] leading-snug ${
                            selected && level === 'master'
                              ? 'text-zinc-300'
                              : 'text-zinc-500'
                          }`}
                        >
                          {meta.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Seleção Exata de Telas / Módulos */}
              <div className="space-y-3 pt-4 border-t border-zinc-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-zinc-900 uppercase tracking-wide">
                    <span className="w-5 h-5 rounded-md bg-zinc-950 text-[#FFBE00] font-mono text-[11px] flex items-center justify-center">
                      4
                    </span>
                    <span>O que este usuário pode ver no painel</span>
                  </div>

                  {role !== 'master' && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setAllowedTabs([...ASSIGNABLE_NON_MASTER_TABS])}
                        className="font-bold text-zinc-700 hover:text-zinc-950 underline cursor-pointer"
                      >
                        Marcar Todas
                      </button>
                      <span className="text-zinc-300">·</span>
                      <button
                        type="button"
                        onClick={() => setAllowedTabs(['seller_area'])}
                        className="font-bold text-amber-700 hover:text-zinc-950 underline cursor-pointer"
                      >
                        Somente Vendedor
                      </button>
                      <span className="text-zinc-300">·</span>
                      <button
                        type="button"
                        onClick={() => setAllowedTabs(['kanban'])}
                        className="font-bold text-zinc-700 hover:text-zinc-950 underline cursor-pointer"
                      >
                        Somente Kanban
                      </button>
                    </div>
                  )}
                </div>

                {role === 'master' ? (
                  <div className="p-4 rounded-xl bg-zinc-950 text-white border border-zinc-800 flex items-start gap-3">
                    <Crown className="w-5 h-5 text-[#FFBE00] shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <div className="font-extrabold text-[#FFBE00]">
                        Acesso Master Total Habilitado Automaticamente
                      </div>
                      <p className="text-zinc-300 leading-relaxed">
                        Este usuário poderá visualizar e gerenciar <strong>todos os 10 módulos</strong> do sistema, incluindo criar/editar outros usuários Master, definir permissões da equipe e auditar todos os logs de segurança.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {TAB_GROUPS.map((group) => {
                      const items = ADMIN_TAB_CATALOG.filter(
                        (t) => t.group === group && !t.masterOnly
                      );
                      if (items.length === 0) return null;
                      return (
                        <div key={group} className="space-y-2">
                          <div className="text-[11px] font-mono uppercase font-bold text-zinc-400">
                            {group}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {items.map((tab) => {
                              const checked = allowedTabs.includes(tab.id);
                              return (
                                <label
                                  key={tab.id}
                                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                    checked
                                      ? 'bg-[#FFFBEB] border-[#FFBE00]'
                                      : 'bg-[#FAFAFA] border-zinc-200 hover:border-zinc-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleToggleAllowedTab(tab.id)}
                                    className="mt-0.5 w-4 h-4 accent-zinc-950 cursor-pointer shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-extrabold text-zinc-900">
                                      {tab.label}
                                    </div>
                                    <div className="text-[11px] text-zinc-500 leading-snug">
                                      {tab.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>
                        A aba <strong>Usuários & Acessos</strong> permanece bloqueada para contas que não sejam <strong>Master</strong>.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 Columns: Live Profile Preview Card & Submit */}
            <div className="xl:col-span-4 xl:sticky xl:top-20 space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-[#FAFAFA] p-5 space-y-4">
                <div className="text-[11px] font-mono uppercase font-bold text-zinc-400">
                  Pré-visualização do Crachá & Escopo
                </div>

                <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <AdminUserAvatar
                      name={name || 'Novo Usuário'}
                      avatarUrl={avatarUrl}
                      sizeClass="w-14 h-14"
                      textClass="text-base"
                      isMaster={role === 'master'}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-sm font-extrabold text-zinc-900 truncate">
                        {name.trim() || 'Nome do Usuário'}
                      </div>
                      <div className="text-xs font-mono text-zinc-500 truncate">
                        @{username || 'login.usuario'}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${ADMIN_ROLE_META[role].badgeClass}`}
                        >
                          {role === 'master' && <Crown className="w-3 h-3" />}
                          {ADMIN_ROLE_META[role].shortLabel}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                            active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {active ? 'Ativo' : 'Suspenso'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {jobTitle.trim() && (
                    <div className="text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                      {jobTitle.trim()}
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-100 space-y-1.5">
                    <div className="text-[11px] font-bold text-zinc-500">
                      Módulos visíveis ({previewTabs.length}):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {previewTabs.map((tabId) => {
                        const meta = ADMIN_TAB_CATALOG.find((t) => t.id === tabId);
                        return (
                          <span
                            key={`prev-${tabId}`}
                            className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-800 text-[10px] font-bold"
                          >
                            {meta?.shortLabel || tabId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-zinc-700 leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                  <span>
                    Ao salvar, o sistema registra automaticamente esta operação nos <strong>Logs de Acesso & Segurança</strong> com seu nome e horário exato.
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {editingUserId ? 'Salvar Alterações do Usuário' : 'Cadastrar Usuário Agora'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      resetForm();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Users Directory & Per-User Activity Logs */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-extrabold text-zinc-900">
              Equipe Cadastrada ({filteredUsers.length})
            </h2>
            <p className="text-xs text-zinc-500">
              Clique em <strong>Logs Recentes</strong> em qualquer usuário para acompanhar tudo o que ele fez no sistema.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar usuários cadastrados"
                placeholder="Buscar por nome, @login ou cargo..."
                className="w-full pl-9 pr-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
              />
            </div>

            <select
              aria-label="Filtrar por nível de acesso"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | AdminRoleLevel)}
              className="px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 focus:bg-white focus:border-[#FFBE00] focus:outline-none cursor-pointer"
            >
              <option value="all">Todos os níveis</option>
              {ROLE_ORDER.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {ADMIN_ROLE_META[lvl].shortLabel}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por status da conta"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
              }
              className="px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 focus:bg-white focus:border-[#FFBE00] focus:outline-none cursor-pointer"
            >
              <option value="all">Todos os status</option>
              <option value="active">Somente ativos</option>
              <option value="inactive">Somente suspensos</option>
            </select>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-[#FAFAFA] p-8 text-center space-y-2">
            <UserCog className="w-8 h-8 text-zinc-400 mx-auto" />
            <div className="font-display text-sm font-extrabold text-zinc-900">
              Nenhum usuário encontrado com os filtros atuais
            </div>
            <p className="text-xs text-zinc-500">
              Limpe os filtros ou clique em <strong>Novo Usuário</strong> para adicionar um membro à equipe.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const roleMeta = ADMIN_ROLE_META[user.role];
              const effectiveTabs = getEffectiveAllowedTabs(user);
              const userLogs = userLogsMap.get(user.id) || [];
              const latestLog = userLogs[0];
              const isSelf = user.id === currentUser.id;
              const isExpanded = expandedLogsUserId === user.id;
              const isConfirmingDelete = confirmDeleteUserId === user.id;

              return (
                <div
                  key={user.id}
                  className={`rounded-2xl border transition-colors ${
                    user.active
                      ? 'bg-white border-zinc-200 hover:border-zinc-300'
                      : 'bg-zinc-50/80 border-zinc-200/90 opacity-90'
                  }`}
                >
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* User Identity */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <AdminUserAvatar
                        name={user.name}
                        avatarUrl={user.avatarUrl}
                        sizeClass="w-12 h-12"
                        textClass="text-sm"
                        isMaster={user.role === 'master'}
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-sm sm:text-base font-extrabold text-zinc-900">
                            {user.name}
                          </h3>
                          <span className="font-mono text-xs font-bold text-zinc-500">
                            @{user.username}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-extrabold ${roleMeta.badgeClass}`}
                          >
                            {user.role === 'master' && <Crown className="w-3 h-3" />}
                            {roleMeta.shortLabel}
                          </span>
                          {isSelf && (
                            <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FFBE00] text-zinc-950 text-[10px] font-extrabold">
                              Você (Sessão Atual)
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${
                              user.active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {user.active ? 'Ativo' : 'Suspenso'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                          {user.jobTitle && <span>{user.jobTitle}</span>}
                          {user.email && <span className="font-mono text-[11px]">{user.email}</span>}
                          <span>
                            Último acesso:{' '}
                            <strong className="font-mono text-zinc-700">
                              {user.lastLoginAt
                                ? new Date(user.lastLoginAt).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Ainda não acessou'}
                            </strong>
                          </span>
                        </div>

                        {/* Allowed Modules */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-bold text-zinc-500 mr-0.5">
                            Permissões:
                          </span>
                          {user.role === 'master' ? (
                            <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-[#FFBE00] text-[11px] font-bold">
                              Acesso Total (Todos os módulos + Gestão de Usuários)
                            </span>
                          ) : (
                            effectiveTabs.map((tabId) => {
                              const tabMeta = ADMIN_TAB_CATALOG.find((t) => t.id === tabId);
                              return (
                                <span
                                  key={`${user.id}-${tabId}`}
                                  className="px-2 py-0.5 rounded-md bg-[#FAFAFA] border border-zinc-200 text-zinc-700 text-[11px] font-bold"
                                >
                                  {tabMeta?.shortLabel || tabId}
                                </span>
                              );
                            })
                          )}
                        </div>

                        {latestLog && (
                          <div className="text-[11px] text-zinc-500 pt-0.5">
                            Última atividade:{' '}
                            <span className="font-semibold text-zinc-800">
                              {latestLog.summary}
                            </span>{' '}
                            <span className="font-mono text-zinc-400">
                              (
                              {new Date(latestLog.timestamp).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              )
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLogsUserId((prev) =>
                            prev === user.id ? null : user.id
                          )
                        }
                        aria-expanded={isExpanded}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                          isExpanded
                            ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950'
                            : 'bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-800 border-zinc-200'
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Logs ({userLogs.length})</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditForm(user)}
                        aria-label={`Editar usuário ${user.name}`}
                        className="px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-[#FFFBEB] hover:border-[#FFBE00] text-zinc-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#E3262E]" />
                        <span>Editar</span>
                      </button>

                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                            user.active
                              ? 'border-zinc-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-zinc-700'
                              : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {user.active ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>Suspender</span>
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Reativar</span>
                            </>
                          )}
                        </button>
                      )}

                      {!isSelf &&
                        (!isConfirmingDelete ? (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUserId(user.id)}
                            aria-label={`Excluir usuário ${user.name}`}
                            className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-zinc-500 hover:text-rose-700 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1.5 text-xs">
                            <span className="font-bold text-rose-800">Excluir?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-extrabold cursor-pointer"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteUserId(null)}
                              className="px-2 py-0.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 font-bold cursor-pointer"
                            >
                              Não
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Inline Expandable User Audit Log Drawer */}
                  {isExpanded && (
                    <div className="border-t border-zinc-200 bg-[#FAFAFA] rounded-b-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-xs font-extrabold text-zinc-900 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-[#E3262E]" />
                          <span>
                            Histórico de Ações de {user.name} (@{user.username})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onInspectUserLogsInSecurity(user.username)}
                          className="text-xs font-extrabold text-[#E3262E] hover:underline inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                        >
                          <span>Abrir todos em Acesso & Segurança</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {userLogs.length === 0 ? (
                        <div className="rounded-xl bg-white border border-dashed border-zinc-300 p-4 text-xs text-zinc-500 text-center">
                          Nenhuma atividade registrada para <strong>@{user.username}</strong> ainda. Assim que este usuário fizer login ou operar no painel, os logs aparecerão aqui.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {userLogs.slice(0, 6).map((ev) => (
                            <div
                              key={ev.id}
                              className="bg-white rounded-xl border border-zinc-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-[10px]">
                                    {SECURITY_CATEGORY_LABELS[ev.category] || ev.category}
                                  </span>
                                  <span className="font-extrabold text-zinc-900">
                                    {ev.summary}
                                  </span>
                                </div>
                                <p className="text-zinc-500 leading-snug">{ev.detail}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${
                                    ev.outcome === 'blocked'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : ev.outcome === 'allowed'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                                  }`}
                                >
                                  {SECURITY_OUTCOME_META[ev.outcome]?.label || ev.outcome}
                                </span>
                                <span className="font-mono text-[11px] text-zinc-500">
                                  {new Date(ev.timestamp).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
