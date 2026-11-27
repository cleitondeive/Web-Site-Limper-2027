import {
  AdminUser,
  BackupScheduleConfig,
  CartItem,
  Category,
  CustomerProfile,
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
  SiteBackupSnapshot,
  StoreSettings,
} from '../types/commerce';
import {
  DEFAULT_ADMIN_USERS,
  DEFAULT_BACKUP_REMINDER_CONFIG,
  DEFAULT_BACKUP_SCHEDULE_CONFIG,
  ensureStoreWhatsAppContacts,
  formatStoreWhatsAppDisplay,
  normalizeStoreWhatsAppNumber,
  sortAndDedupeScheduleTimes,
} from './commerce';
import {
  INITIAL_BANNERS,
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_KITS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_STORE_SETTINGS,
} from '../data/initialCatalog';

const STORAGE_KEYS = {
  CATEGORIES: 'limper_mt_categories_v3',
  PRODUCTS: 'limper_mt_products_v4',
  KITS: 'limper_mt_kits_v5',
  COUPONS: 'limper_mt_coupons_v3',
  BANNERS: 'limper_mt_banners_v4',
  ORDERS: 'limper_mt_orders_v5',
  SETTINGS: 'limper_mt_settings_v5',
  CART: 'limper_mt_cart_v3',
  CUSTOMER: 'limper_mt_customer_v3',
  FAVORITES: 'limper_mt_favorites_v3',
  SECURITY_LOGS: 'limper_mt_security_logs_v1',
  ADMIN_USERS: 'limper_mt_admin_users_v1',
  SITE_BACKUPS: 'limper_mt_site_backups_v1',
  BACKUP_SCHEDULE: 'limper_mt_backup_schedule_v1',
  DELETED_PRODUCTS: 'limper_mt_deleted_products_v1',
  SELLER_QUOTES: 'limper_mt_seller_quotes_v1',
  SELLER_CUSTOM_PRODUCTS: 'limper_mt_seller_custom_products_v1',
  MONTHLY_SALES_GOALS: 'limper_mt_monthly_sales_goals_v1',
};

const IDB_NAME = 'LimperMT_Database';
const IDB_VERSION = 3;
const IDB_STORE = 'keyval';

function syncToIndexedDB(key: string, value: unknown): void {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return;
  try {
    const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
    };
  } catch {
    // Fallback to localStorage already completed
  }
}

function readFromIndexedDB<T>(key: string): Promise<T | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const db = request.result;
        try {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const getReq = tx.objectStore(IDB_STORE).get(key);
          getReq.onsuccess = () =>
            resolve((getReq.result as T | undefined) ?? null);
          getReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(fallback));
      syncToIndexedDB(key, fallback);
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;
  // Always persist to IndexedDB first (high capacity) so large image uploads are never silently lost
  syncToIndexedDB(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // IndexedDB backup already scheduled; return false to indicate localStorage mirror quota reached
    return false;
  }
}

export const DEFAULT_CUSTOMER_PROFILE: CustomerProfile = {
  name: '',
  phone: '',
  secondaryPhone: '',
  email: '',
  documentType: 'cpf',
  cpfCnpj: '',
  segment: 'residencial',
  cep: '78110-400',
  street: 'Av. Couto Magalhães',
  number: '',
  neighborhood: 'Centro Norte',
  city: 'Várzea Grande',
  reference: '',
  addresses: [],
  privacy: {
    offersOptIn: true,
    whatsappOptIn: true,
    emailOptIn: true,
    phoneOptIn: false,
    restockRemindersOptIn: true,
  },
  isRegistered: false,
  clubDiscountActive: false,
};

export const storageService = {
  getCategories: (): Category[] =>
    loadFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES),
  saveCategories: (categories: Category[]) =>
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories),

  getProducts: (): Product[] =>
    loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS),
  saveProducts: (products: Product[]) =>
    saveToStorage(STORAGE_KEYS.PRODUCTS, products),

  getDeletedProducts: (): DeletedProductEntry[] => {
    const loaded = loadFromStorage<DeletedProductEntry[]>(
      STORAGE_KEYS.DELETED_PRODUCTS,
      []
    );
    return Array.isArray(loaded) ? loaded : [];
  },
  saveDeletedProducts: (entries: DeletedProductEntry[]) =>
    saveToStorage(STORAGE_KEYS.DELETED_PRODUCTS, entries),

  getSellerQuotes: (): SellerQuote[] => {
    const loaded = loadFromStorage<SellerQuote[]>(STORAGE_KEYS.SELLER_QUOTES, []);
    return Array.isArray(loaded) ? loaded : [];
  },
  saveSellerQuotes: (quotes: SellerQuote[]) =>
    saveToStorage(STORAGE_KEYS.SELLER_QUOTES, quotes),

  getSellerCustomProducts: (): SellerCustomProduct[] => {
    const loaded = loadFromStorage<SellerCustomProduct[]>(
      STORAGE_KEYS.SELLER_CUSTOM_PRODUCTS,
      []
    );
    return Array.isArray(loaded) ? loaded : [];
  },
  saveSellerCustomProducts: (items: SellerCustomProduct[]) =>
    saveToStorage(STORAGE_KEYS.SELLER_CUSTOM_PRODUCTS, items),

  getMonthlySalesGoals: (): MonthlySalesGoal[] => {
    const loaded = loadFromStorage<MonthlySalesGoal[]>(
      STORAGE_KEYS.MONTHLY_SALES_GOALS,
      []
    );
    return Array.isArray(loaded) ? loaded : [];
  },
  saveMonthlySalesGoals: (goals: MonthlySalesGoal[]) =>
    saveToStorage(STORAGE_KEYS.MONTHLY_SALES_GOALS, goals),

  getOrders: (): Order[] =>
    loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS),
  saveOrders: (orders: Order[]) =>
    saveToStorage(STORAGE_KEYS.ORDERS, orders),

  getSettings: (): StoreSettings => {
    const merged: StoreSettings = {
      ...INITIAL_STORE_SETTINGS,
      ...loadFromStorage<StoreSettings>(STORAGE_KEYS.SETTINGS, INITIAL_STORE_SETTINGS),
    };
    const normalizedWa =
      normalizeStoreWhatsAppNumber(merged.whatsappNumber) ||
      INITIAL_STORE_SETTINGS.whatsappNumber;
    const formattedDisplay =
      formatStoreWhatsAppDisplay(normalizedWa) ||
      merged.whatsappDisplay ||
      INITIAL_STORE_SETTINGS.whatsappDisplay;
    const normalizedSettings: StoreSettings = {
      ...merged,
      whatsappNumber: normalizedWa,
      whatsappDisplay: formattedDisplay,
    };
    return {
      ...normalizedSettings,
      whatsappContacts: ensureStoreWhatsAppContacts(normalizedSettings),
    };
  },
  saveSettings: (settings: StoreSettings) =>
    saveToStorage(STORAGE_KEYS.SETTINGS, settings),

  getCart: (): CartItem[] =>
    loadFromStorage<CartItem[]>(STORAGE_KEYS.CART, []),
  saveCart: (cart: CartItem[]) =>
    saveToStorage(STORAGE_KEYS.CART, cart),

  getCustomerProfile: (): CustomerProfile => {
    const stored = loadFromStorage<CustomerProfile>(
      STORAGE_KEYS.CUSTOMER,
      DEFAULT_CUSTOMER_PROFILE
    );
    return {
      ...DEFAULT_CUSTOMER_PROFILE,
      ...stored,
      privacy: {
        ...DEFAULT_CUSTOMER_PROFILE.privacy!,
        ...(stored.privacy || {}),
      },
      addresses: Array.isArray(stored.addresses) ? stored.addresses : [],
    };
  },
  saveCustomerProfile: (profile: CustomerProfile) =>
    saveToStorage(STORAGE_KEYS.CUSTOMER, profile),

  getFavorites: (): string[] =>
    loadFromStorage<string[]>(STORAGE_KEYS.FAVORITES, ['prod-casa-3', 'prod-lav-1', 'prod-pes-2']),
  saveFavorites: (ids: string[]) =>
    saveToStorage(STORAGE_KEYS.FAVORITES, ids),

  getKits: (): PromoKit[] =>
    loadFromStorage<PromoKit[]>(STORAGE_KEYS.KITS, INITIAL_KITS),
  saveKits: (kits: PromoKit[]) =>
    saveToStorage(STORAGE_KEYS.KITS, kits),

  getCoupons: (): PromoCoupon[] =>
    loadFromStorage<PromoCoupon[]>(STORAGE_KEYS.COUPONS, INITIAL_COUPONS),
  saveCoupons: (coupons: PromoCoupon[]) =>
    saveToStorage(STORAGE_KEYS.COUPONS, coupons),

  getBanners: (): PromoBanner[] => {
    const loaded = loadFromStorage<PromoBanner[]>(STORAGE_KEYS.BANNERS, INITIAL_BANNERS);
    if (typeof window !== 'undefined') {
      const logisticsBanner = INITIAL_BANNERS.find(
        (b) => b.id === 'banner-hero-logistica'
      );
      const seedFlag = 'limper_mt_logistics_banner_seeded_v1';
      let nextBanners = loaded;
      let changed = false;

      if (!window.localStorage.getItem(seedFlag)) {
        window.localStorage.setItem(seedFlag, '1');
        if (
          logisticsBanner &&
          !nextBanners.some(
            (b) => b.id === 'banner-hero-logistica' || b.theme === 'logistics_fleet'
          )
        ) {
          nextBanners = [
            nextBanners[0],
            logisticsBanner,
            ...nextBanners.slice(1),
          ]
            .filter(Boolean)
            .map((b, idx) => ({ ...b, order: idx + 1 }));
          changed = true;
        }
      }

      if (
        logisticsBanner &&
        nextBanners.some(
          (b) =>
            b.imageUrl === '/assets/images/logistics_fleet_banner_1794514263590.jpg'
        )
      ) {
        nextBanners = nextBanners.map((b) =>
          b.imageUrl === '/assets/images/logistics_fleet_banner_1794514263590.jpg'
            ? { ...b, imageUrl: logisticsBanner.imageUrl }
            : b
        );
        changed = true;
      }

      if (changed) {
        saveToStorage(STORAGE_KEYS.BANNERS, nextBanners);
      }
      return nextBanners;
    }
    return loaded;
  },
  saveBanners: (banners: PromoBanner[]) =>
    saveToStorage(STORAGE_KEYS.BANNERS, banners),

  getSecurityLogs: (): SecurityAuditEvent[] => {
    const loaded = loadFromStorage<SecurityAuditEvent[]>(STORAGE_KEYS.SECURITY_LOGS, []);
    return Array.isArray(loaded) ? loaded : [];
  },
  saveSecurityLogs: (logs: SecurityAuditEvent[]) =>
    saveToStorage(STORAGE_KEYS.SECURITY_LOGS, logs),

  getAdminUsers: (): AdminUser[] => {
    const loaded = loadFromStorage<AdminUser[]>(
      STORAGE_KEYS.ADMIN_USERS,
      DEFAULT_ADMIN_USERS
    );
    if (!Array.isArray(loaded) || loaded.length === 0) {
      return DEFAULT_ADMIN_USERS;
    }
    const hasActiveMaster = loaded.some((u) => u.role === 'master' && u.active);
    if (!hasActiveMaster) {
      const merged = [
        DEFAULT_ADMIN_USERS[0],
        ...loaded.filter((u) => u.id !== DEFAULT_ADMIN_USERS[0].id),
      ];
      saveToStorage(STORAGE_KEYS.ADMIN_USERS, merged);
      return merged;
    }
    return loaded;
  },
  saveAdminUsers: (users: AdminUser[]) =>
    saveToStorage(STORAGE_KEYS.ADMIN_USERS, users),

  getSiteBackups: (): SiteBackupSnapshot[] => {
    const loaded = loadFromStorage<SiteBackupSnapshot[]>(
      STORAGE_KEYS.SITE_BACKUPS,
      []
    );
    return Array.isArray(loaded) ? loaded : [];
  },
  loadSiteBackupsFromIndexedDB: async (): Promise<SiteBackupSnapshot[] | null> => {
    const fromIdb = await readFromIndexedDB<SiteBackupSnapshot[]>(
      STORAGE_KEYS.SITE_BACKUPS
    );
    return Array.isArray(fromIdb) ? fromIdb : null;
  },
  saveSiteBackups: (backups: SiteBackupSnapshot[]): void => {
    if (typeof window === 'undefined') return;
    // Always persist full list to IndexedDB first (large quota)
    syncToIndexedDB(STORAGE_KEYS.SITE_BACKUPS, backups);
    // Mirror as many recent snapshots as fit into localStorage for instant sync boot
    for (let count = backups.length; count >= 0; count--) {
      try {
        window.localStorage.setItem(
          STORAGE_KEYS.SITE_BACKUPS,
          JSON.stringify(backups.slice(0, count))
        );
        return;
      } catch {
        // Trim oldest snapshot for localStorage mirror if quota reached
      }
    }
  },
  saveSiteBackupsSyncEmergency: (backups: SiteBackupSnapshot[]): boolean => {
    if (typeof window === 'undefined') return false;
    // During pagehide/beforeunload, commit synchronously to localStorage FIRST so data survives abrupt close
    let persistedSync = false;
    for (let count = backups.length; count >= 1; count--) {
      try {
        window.localStorage.setItem(
          STORAGE_KEYS.SITE_BACKUPS,
          JSON.stringify(backups.slice(0, count))
        );
        persistedSync = true;
        break;
      } catch {
        // Shrink mirror count until it fits synchronously
      }
    }
    // Also enqueue IndexedDB mirror as best-effort secondary durable store
    syncToIndexedDB(STORAGE_KEYS.SITE_BACKUPS, backups);
    return persistedSync;
  },
  getBackupSchedule: (): BackupScheduleConfig => {
    const loaded = loadFromStorage<Partial<BackupScheduleConfig>>(
      STORAGE_KEYS.BACKUP_SCHEDULE,
      DEFAULT_BACKUP_SCHEDULE_CONFIG
    );
    const merged: BackupScheduleConfig = {
      ...DEFAULT_BACKUP_SCHEDULE_CONFIG,
      ...(loaded && typeof loaded === 'object' ? loaded : {}),
    };
    return {
      ...merged,
      times: Array.isArray(merged.times)
        ? sortAndDedupeScheduleTimes(merged.times)
        : DEFAULT_BACKUP_SCHEDULE_CONFIG.times,
      daysOfWeek: Array.isArray(merged.daysOfWeek)
        ? Array.from(
            new Set(
              merged.daysOfWeek.filter(
                (d) => Number.isInteger(d) && d >= 0 && d <= 6
              )
            )
          ).sort((a, b) => a - b)
        : DEFAULT_BACKUP_SCHEDULE_CONFIG.daysOfWeek,
      maxRetention:
        Number.isFinite(merged.maxRetention) &&
        merged.maxRetention >= 5 &&
        merged.maxRetention <= 30
          ? Math.round(merged.maxRetention)
          : DEFAULT_BACKUP_SCHEDULE_CONFIG.maxRetention,
      reminder: {
        ...DEFAULT_BACKUP_REMINDER_CONFIG,
        ...(merged.reminder && typeof merged.reminder === 'object'
          ? merged.reminder
          : {}),
        style:
          merged.reminder?.style === 'modal' || merged.reminder?.style === 'toast'
            ? merged.reminder.style
            : DEFAULT_BACKUP_REMINDER_CONFIG.style,
        thresholdHours:
          Number.isFinite(merged.reminder?.thresholdHours) &&
          (merged.reminder?.thresholdHours ?? 0) >= 1 &&
          (merged.reminder?.thresholdHours ?? 0) <= 168
            ? Math.round(merged.reminder!.thresholdHours)
            : DEFAULT_BACKUP_REMINDER_CONFIG.thresholdHours,
      },
    };
  },
  saveBackupSchedule: (config: BackupScheduleConfig) =>
    saveToStorage(STORAGE_KEYS.BACKUP_SCHEDULE, config),
};





