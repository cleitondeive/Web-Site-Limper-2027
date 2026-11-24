export type UnitOfMeasure = 'L' | 'mL' | 'kg' | 'g' | 'Unid' | 'Kit';

export type ProductStatus = 'active' | 'inactive' | 'out_of_stock';

export type CategoryIconName =
  | 'Home'
  | 'Shirt'
  | 'ShieldAlert'
  | 'Car'
  | 'HandHeart'
  | 'PawPrint'
  | 'Wind'
  | 'Sparkles'
  | 'SprayCan'
  | 'Droplets'
  | 'FlaskConical'
  | 'Beaker'
  | 'Waves'
  | 'Bath'
  | 'ShowerHead'
  | 'Brush'
  | 'PaintBucket'
  | 'Trash2'
  | 'Recycle'
  | 'Utensils'
  | 'ChefHat'
  | 'Hospital'
  | 'Building2'
  | 'Briefcase'
  | 'ShieldCheck'
  | 'Leaf'
  | 'Flower2'
  | 'Package';

export interface Category {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: CategoryIconName;
  order: number;
}

export interface KitComponentSnapshot {
  productId: string;
  sku: string;
  title: string;
  volumeLabel: string;
  quantity: number;
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  description: string;
  categoryId: string;
  price: number; // Preço regular ("De")
  promoPrice?: number | null; // Preço promocional ("Por")
  showPrice?: boolean; // Se false, oculta o preço no catálogo ("Valor sob consulta")
  installmentsCount?: number; // Parcelamento configurado no Admin (ex: 3x, 6x, 12x)
  installmentsNoInterest?: boolean; // true = s/ juros
  unit: UnitOfMeasure;
  volumeLabel: string; // ex: "5L | 2L", "5L", "1L", "500mL"
  status: ProductStatus;
  imageUrl: string;
  featured?: boolean;
  dilutionHint?: string; // ex: "Rende até 50 Litros"
  badgeLabel?: string; // ex: "Ofertas do Mês | Limper MT"
  badgeColor?: string; // Cor HEX personalizada para o Selo de Oferta (padrão #E5B800)
  subBadgeLabel?: string; // ex: "Preço Exclusivo Site | Quimiprol"
  subBadgeColor?: string; // Cor HEX personalizada para o Selo de Destaque (padrão #FF6B00)
  kitItems?: KitComponentSnapshot[]; // Produtos inclusos quando o item é um Kit/Combo
}

export interface DeletedProductEntry {
  product: Product;
  deletedAt: string; // ISO string
  deletedBy: string; // Nome/login do administrador que excluiu
  originalIndex: number; // Posição original no catálogo para restauração fiel
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type DeliveryType = 'delivery' | 'pickup';

export type LogisticsDeliveryMode = 'moto_limper' | 'truck' | 'interior_mt' | 'pickup';

export type DeliveryCityOption = 'Cuiabá' | 'Várzea Grande' | 'Interior de MT';

export type PaymentMethod = 'pix' | 'card' | 'cash' | 'quote';

export type OrderStatus =
  | 'pending_separation' // Pedido Recebido / Na Fila de Separação
  | 'separating'         // Conferindo Galões & Separando no Estoque
  | 'ready_or_out'       // Pronto no Balcão Express / Saiu para Entrega
  | 'completed';         // Pedido Retirado / Entregue

export interface OrderItemSnapshot {
  productId: string;
  sku: string;
  title: string;
  volumeLabel: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  priceHidden?: boolean;
  kitItems?: KitComponentSnapshot[];
}

export type CatalogSortOption =
  | 'featured'
  | 'price_asc'
  | 'price_desc'
  | 'discount_desc'
  | 'name_asc';

export type VolumeFilterOption = 'all' | '5L' | '2L_1L' | 'small';

export type OrderDatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'custom';

export interface OrderStatusHistoryEntry {
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  changedAt: string; // ISO string
  reason?: string;
}

export interface Order {
  id: string; // ex: "#LMP-1042"
  createdAt: string; // ISO string
  customerName: string;
  customerPhone: string; // Apenas dígitos ou formatado
  customerDocument?: string; // CPF ou CNPJ mascarado para NF/cadastro
  customerDocumentType?: 'cpf' | 'cnpj';
  items: OrderItemSnapshot[];
  subtotal: number;
  deliveryFee: number;
  couponCode?: string;
  discountAmount?: number;
  total: number;
  deliveryType: DeliveryType;
  logisticsMode?: LogisticsDeliveryMode;
  pickupCode?: string; // ex: "BALCÃO-42"
  estimatedTime?: string; // ex: "Pronto em 15 min no Balcão Express"
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    city: DeliveryCityOption;
    interiorCityName?: string;
    reference?: string;
    cep?: string;
  };
  paymentMethod: PaymentMethod;
  cardSubType?: 'credit' | 'debit';
  cashChangeFor?: number | null;
  status: OrderStatus;
  statusHistory?: OrderStatusHistoryEntry[];
  notes?: string;
  isQuoteOnly?: boolean; // true quando enviado como lista sem valor (orçamento WhatsApp)
  customerRating?: number; // Avaliação de 1 a 5 estrelas pelo cliente
  customerRatingNote?: string;
}

export type CustomerSegment =
  | 'residencial'
  | 'condominio'
  | 'clinica'
  | 'lavajato'
  | 'empresa';

export interface CustomerAddress {
  id: string;
  label: string; // ex: "Casa", "Empresa", "Condomínio"
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: DeliveryCityOption;
  interiorCityName?: string;
  reference?: string;
  isDefault?: boolean;
}

export interface CustomerPrivacyPrefs {
  offersOptIn: boolean;
  whatsappOptIn: boolean;
  emailOptIn: boolean;
  phoneOptIn: boolean;
  restockRemindersOptIn: boolean;
}

export interface CustomerProfile {
  name: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  documentType?: 'cpf' | 'cnpj';
  cpfCnpj?: string;
  segment?: CustomerSegment;
  cep?: string;
  street: string;
  number: string;
  neighborhood: string;
  city: DeliveryCityOption;
  interiorCityName?: string;
  reference: string;
  addresses?: CustomerAddress[];
  privacy?: CustomerPrivacyPrefs;
  isRegistered?: boolean;
  clubDiscountActive?: boolean;
}

export interface NeighborhoodFee {
  id: string;
  name: string;
  city: 'Cuiabá' | 'Várzea Grande';
  fee: number;
}

export interface StoreSettings {
  storeName: string;
  whatsappNumber: string; // ex: "5565999887766"
  whatsappDisplay: string; // ex: "(65) 99988-7766"
  pixKey: string;
  pixKeyType: 'CNPJ' | 'Celular' | 'E-mail' | 'Aleatória';
  pixBeneficiary: string;
  bankInfo: string;
  storeAddress: string;
  freeShippingThreshold: number;
  defaultDeliveryFee: number;
  motoLimperVgMin?: number; // Moto Limper pequenos itens - Várzea Grande-MT
  motoLimperCbaMin?: number; // Moto Limper pequenos itens - Cuiabá-MT
  truckVgMin?: number; // Entrega de caminhão - Várzea Grande-MT
  truckCbaMin?: number; // Entrega de caminhão - Cuiabá-MT
  interiorMtNote?: string; // Texto de orientação para restante do estado de MT via WhatsApp
  hideAllPrices?: boolean; // Permite ocultar todos os preços da loja (Modo Cotação/Orçamento)
  defaultInstallmentsCount?: number; // Parcelamento padrão quando preços visíveis
  defaultInstallmentsNoInterest?: boolean; // true = s/ juros
  neighborhoodFees: NeighborhoodFee[];
}

export interface PromoKitItem {
  productId: string;
  quantity: number;
}

export interface PromoKit {
  id: string;
  sku?: string; // Padrão AAA-000 (ex: KIT-101)
  badge: string;
  title: string;
  description: string;
  imageUrl: string;
  items: PromoKitItem[];
  promoPrice: number;
  showPrice?: boolean;
  active: boolean;
}

export interface PromoCoupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderValue?: number;
  active: boolean;
}

export type BannerSlotType = 'hero_carousel' | 'bottom_banner';
export type BannerThemeType =
  | 'yellow_red'
  | 'dark_gold'
  | 'crimson_wine'
  | 'logistics_fleet';

export interface PromoBanner {
  id: string;
  slot: BannerSlotType;
  badge: string;
  title: string;
  subtitle: string;
  ctaText: string;
  theme: BannerThemeType;
  imageUrl: string;
  linkedCategoryId?: string;
  featuredProductIds: string[];
  active: boolean;
  order: number;
}

export type AdminAppTab =
  | 'kanban'
  | 'products'
  | 'kits'
  | 'banners'
  | 'coupons'
  | 'categories'
  | 'customers'
  | 'users'
  | 'security'
  | 'settings';

export type AdminRoleLevel =
  | 'master'
  | 'manager'
  | 'operator'
  | 'catalog'
  | 'viewer';

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  password: string;
  role: AdminRoleLevel;
  jobTitle?: string;
  email?: string;
  avatarUrl?: string;
  allowedTabs: AdminAppTab[];
  active: boolean;
  createdAt: string;
  createdBy?: string;
  lastLoginAt?: string;
}

export type SecurityEventCategory =
  | 'tracking_access'
  | 'customer_auth'
  | 'admin_auth'
  | 'user_management'
  | 'site_backup'
  | 'order_security'
  | 'catalog_policy';

export type SecurityLogDatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'specific';

export type SecurityEventOutcome = 'allowed' | 'blocked' | 'info';

export interface SecurityAuditEvent {
  id: string;
  timestamp: string;
  category: SecurityEventCategory;
  outcome: SecurityEventOutcome;
  actorLabel: string;
  actorUsername?: string;
  actorRole?: AdminRoleLevel;
  maskedTarget: string;
  orderId?: string;
  summary: string;
  detail: string;
}

export interface CreateSecurityAuditEventInput {
  category: SecurityEventCategory;
  outcome: SecurityEventOutcome;
  actorLabel: string;
  actorUsername?: string;
  actorRole?: AdminRoleLevel;
  rawTarget?: string;
  orderId?: string;
  summary: string;
  detail: string;
  timestamp?: string;
}

export interface CustomerIsolationScopeCheck {
  customerKey: string;
  customerName: string;
  maskedPhone: string;
  expectedOrderIds: string[];
  visibleOrderIds: string[];
  crossCustomerLeakCount: number;
  isolated: boolean;
}

export interface CustomerIsolationAuditReport {
  checkedAt: string;
  totalOrdersCount: number;
  distinctCustomersCount: number;
  guestUnverifiedVisibleCount: number;
  ordersMissingPhoneCount: number;
  totalCrossCustomerLeaks: number;
  isFullyIsolated: boolean;
  activeSessionMode:
    | 'anonymous_locked'
    | 'verified_guest'
    | 'session_checkout'
    | 'logged_in_customer';
  activeSessionLabel: string;
  activeSessionVisibleOrderIds: string[];
  customerChecks: CustomerIsolationScopeCheck[];
}

export type SiteBackupTrigger =
  | 'manual'
  | 'auto_daily'
  | 'auto_scheduled'
  | 'auto_shutdown'
  | 'pre_restore'
  | 'imported';

export interface SiteBackupPayload {
  categories: Category[];
  products: Product[];
  deletedProducts?: DeletedProductEntry[];
  kits: PromoKit[];
  coupons: PromoCoupon[];
  banners: PromoBanner[];
  orders: Order[];
  settings: StoreSettings;
  adminUsers: AdminUser[];
  securityLogs?: SecurityAuditEvent[];
}

export interface SiteBackupSummary {
  categoriesCount: number;
  productsCount: number;
  kitsCount: number;
  bannersCount: number;
  couponsCount: number;
  ordersCount: number;
  adminUsersCount: number;
  securityLogsCount: number;
  sizeBytes: number;
}

export interface SiteBackupSnapshot {
  id: string;
  createdAt: string;
  dateKey: string; // YYYY-MM-DD local calendar day
  label: string;
  trigger: SiteBackupTrigger;
  createdBy: string;
  createdByUsername?: string;
  checksum?: string; // 8-char deterministic FNV-1a integrity fingerprint
  scheduleSlotKey?: string; // e.g. "2026-11-24@18:00"
  summary: SiteBackupSummary;
  payload: SiteBackupPayload;
}

export interface BackupScheduleConfig {
  enabled: boolean;
  times: string[]; // Sorted unique HH:mm 24h strings (e.g. ["09:00", "18:00"])
  daysOfWeek: number[]; // 0=Domingo .. 6=Sábado
  maxRetention: number; // Max snapshots retained (5..30)
  autoBackupOnExit: boolean; // Emergency snapshot on pagehide/beforeunload/tab-hide when data changed
  runMissedOnReopen: boolean; // Run catch-up backup on reopen if browser was closed during a scheduled slot
  lastExecutedSlotKey?: string;
  lastExecutedAt?: string;
  lastShutdownBackupAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SiteBackupIntegrityResult {
  valid: boolean;
  expectedChecksum?: string;
  computedChecksum: string;
  issues: string[];
}




