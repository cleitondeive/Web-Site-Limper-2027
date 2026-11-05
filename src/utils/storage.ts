import {
  CartItem,
  Category,
  CustomerProfile,
  Order,
  Product,
  PromoKit,
  StoreSettings,
} from '../types/commerce';
import {
  INITIAL_CATEGORIES,
  INITIAL_KITS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_STORE_SETTINGS,
} from '../data/initialCatalog';

const STORAGE_KEYS = {
  CATEGORIES: 'limper_mt_categories_v3',
  PRODUCTS: 'limper_mt_products_v3',
  KITS: 'limper_mt_kits_v3',
  ORDERS: 'limper_mt_orders_v3',
  SETTINGS: 'limper_mt_settings_v3',
  CART: 'limper_mt_cart_v3',
  CUSTOMER: 'limper_mt_customer_v3',
  FAVORITES: 'limper_mt_favorites_v3',
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

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    syncToIndexedDB(key, value);
  } catch {
    // Ignore quota errors
  }
}

export const DEFAULT_CUSTOMER_PROFILE: CustomerProfile = {
  name: '',
  phone: '',
  email: '',
  cpfCnpj: '',
  cep: '78110-400',
  street: 'Av. Couto Magalhães',
  number: '',
  neighborhood: 'Centro Norte',
  city: 'Várzea Grande',
  reference: '',
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

  getOrders: (): Order[] =>
    loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS),
  saveOrders: (orders: Order[]) =>
    saveToStorage(STORAGE_KEYS.ORDERS, orders),

  getSettings: (): StoreSettings =>
    loadFromStorage<StoreSettings>(STORAGE_KEYS.SETTINGS, INITIAL_STORE_SETTINGS),
  saveSettings: (settings: StoreSettings) =>
    saveToStorage(STORAGE_KEYS.SETTINGS, settings),

  getCart: (): CartItem[] =>
    loadFromStorage<CartItem[]>(STORAGE_KEYS.CART, []),
  saveCart: (cart: CartItem[]) =>
    saveToStorage(STORAGE_KEYS.CART, cart),

  getCustomerProfile: (): CustomerProfile =>
    loadFromStorage<CustomerProfile>(STORAGE_KEYS.CUSTOMER, DEFAULT_CUSTOMER_PROFILE),
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
};

