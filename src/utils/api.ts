import type {
  AdminUser,
  BackupScheduleConfig,
  Category,
  DeletedProductEntry,
  MonthlySalesGoal,
  Order,
  Product,
  PromoBanner,
  PromoCoupon,
  PromoKit,
  SecurityAuditEvent,
  SellerCustomProduct,
  SellerQuote,
  SiteBackupPayload,
  SiteBackupSnapshot,
  StoreSettings,
} from '../types/commerce';

export type ServerCollectionName =
  | 'categories'
  | 'products'
  | 'deletedProducts'
  | 'kits'
  | 'coupons'
  | 'banners'
  | 'orders'
  | 'settings'
  | 'adminUsers'
  | 'securityLogs'
  | 'siteBackups'
  | 'backupSchedule'
  | 'sellerQuotes'
  | 'sellerCustomProducts'
  | 'monthlySalesGoals';

export interface PublicStorefrontBootstrapResponse {
  categories: Category[];
  products: Product[];
  kits: PromoKit[];
  coupons: PromoCoupon[];
  banners: PromoBanner[];
  settings: StoreSettings;
}

export interface ServerDatabaseStatus {
  engine: 'postgresql' | 'local_file';
  connected: boolean;
  schemaVersion: number;
  seedCompletedAt: string | null;
  nonDestructiveMigrations: boolean;
  latencyMs: number | null;
  counts: {
    categories: number;
    products: number;
    orders: number;
    kits: number;
    coupons: number;
    banners: number;
    adminUsers: number;
    sellerQuotes: number;
    siteBackups: number;
  };
}

export interface AdminBootstrapResponse {
  categories: Category[];
  products: Product[];
  deletedProducts: DeletedProductEntry[];
  kits: PromoKit[];
  coupons: PromoCoupon[];
  banners: PromoBanner[];
  orders: Order[];
  settings: StoreSettings;
  adminUsers: AdminUser[];
  securityLogs: SecurityAuditEvent[];
  siteBackups: SiteBackupSnapshot[];
  backupSchedule: BackupScheduleConfig;
  sellerQuotes: SellerQuote[];
  sellerCustomProducts: SellerCustomProduct[];
  monthlySalesGoals: MonthlySalesGoal[];
  dbStatus: ServerDatabaseStatus;
}

export interface AdminAuthStatusResponse {
  needsInitialSetup: boolean;
  hasEnvPasscode: boolean;
  databaseEngine: 'postgresql' | 'local_file';
  defaultMasterUsername: string;
}

export interface AdminLoginResult {
  ok: boolean;
  token?: string;
  user?: AdminUser;
  reason?: 'invalid_credentials' | 'inactive_account';
  matchedUser?: AdminUser;
  error?: string;
}

// Keep admin session token strictly in React/JS memory — never in localStorage or sessionStorage
let inMemoryAdminToken: string | null = null;

export function setAdminAuthToken(token: string | null): void {
  inMemoryAdminToken = token && token.trim().length > 0 ? token.trim() : null;
}

export function getAdminAuthToken(): string | null {
  return inMemoryAdminToken;
}

export function clearAdminAuthToken(): void {
  inMemoryAdminToken = null;
}

function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (inMemoryAdminToken) {
    headers.Authorization = `Bearer ${inMemoryAdminToken}`;
  }
  return headers;
}

export const apiClient = {
  async fetchStorefrontBootstrap(): Promise<PublicStorefrontBootstrapResponse | null> {
    try {
      const res = await fetch('/api/storefront/bootstrap', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      return (await res.json()) as PublicStorefrontBootstrapResponse;
    } catch {
      return null;
    }
  },

  async createOrder(order: Order): Promise<Order | null> {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { order?: Order };
      return data.order || null;
    } catch {
      return null;
    }
  },

  async lookupCustomerOrders(phone: string, orderId?: string): Promise<Order[] | null> {
    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, orderId }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { orders?: Order[] };
      return Array.isArray(data.orders) ? data.orders : [];
    } catch {
      return null;
    }
  },

  async getAdminAuthStatus(): Promise<AdminAuthStatusResponse | null> {
    try {
      const res = await fetch('/api/admin/auth/status', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      return (await res.json()) as AdminAuthStatusResponse;
    } catch {
      return null;
    }
  },

  async setupInitialAdmin(username: string, password: string): Promise<AdminLoginResult> {
    try {
      const res = await fetch('/api/admin/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        user?: AdminUser;
        error?: string;
      };
      if (!res.ok || !data.token || !data.user) {
        return {
          ok: false,
          error: data.error || 'Não foi possível concluir a configuração inicial.',
        };
      }
      setAdminAuthToken(data.token);
      return { ok: true, token: data.token, user: data.user };
    } catch {
      return { ok: false, error: 'Erro de conexão com o servidor.' };
    }
  },

  async loginAdmin(username: string, password: string): Promise<AdminLoginResult> {
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        user?: AdminUser;
        reason?: 'invalid_credentials' | 'inactive_account';
        matchedUser?: AdminUser;
        error?: string;
      };
      if (!res.ok || !data.token || !data.user) {
        return {
          ok: false,
          reason: data.reason,
          matchedUser: data.matchedUser,
          error: data.error || 'Credenciais inválidas. Confira usuário e senha de acesso.',
        };
      }
      setAdminAuthToken(data.token);
      return { ok: true, token: data.token, user: data.user };
    } catch {
      return { ok: false, error: 'Erro de conexão com o servidor ao autenticar.' };
    }
  },

  async fetchAdminBootstrap(): Promise<AdminBootstrapResponse | null> {
    if (!inMemoryAdminToken) return null;
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'GET',
        headers: buildAuthHeaders({ Accept: 'application/json' }),
      });
      if (!res.ok) return null;
      return (await res.json()) as AdminBootstrapResponse;
    } catch {
      return null;
    }
  },

  async saveCollection<T>(
    collection: ServerCollectionName,
    data: T
  ): Promise<{ ok: boolean; error?: string }> {
    if (!inMemoryAdminToken) {
      return { ok: false, error: 'Sessão administrativa não autenticada.' };
    }
    try {
      const res = await fetch(`/api/admin/collections/${collection}`, {
        method: 'PUT',
        headers: buildAuthHeaders(),
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: body.error || 'Erro ao salvar no banco de dados.' };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'Sem resposta do servidor ao salvar.' };
    }
  },

  async restoreBackup(payload: SiteBackupPayload): Promise<{ ok: boolean; error?: string }> {
    if (!inMemoryAdminToken) {
      return { ok: false, error: 'Sessão administrativa não autenticada.' };
    }
    try {
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({ payload }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: body.error || 'Erro ao restaurar backup.' };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'Erro de conexão ao restaurar backup.' };
    }
  },
};
