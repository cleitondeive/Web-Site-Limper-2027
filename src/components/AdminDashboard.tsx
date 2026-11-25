import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bike,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUp,
  Clock,
  Command,
  Copy,
  Crown,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FlaskConical,
  FolderKanban,
  Gift,
  GripVertical,
  History,
  Image as ImageIcon,
  Layers,
  Link2,
  ListFilter,
  Lock,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  TicketPercent,
  Trash2,
  Truck,
  Upload,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import {
  AdminAppTab,
  AdminUser,
  BackupReminderStyle,
  BackupScheduleConfig,
  BannerSlotType,
  BannerThemeType,
  Category,
  CategoryIconName,
  CreateSecurityAuditEventInput,
  CustomerProfile,
  DeletedProductEntry,
  DeliveryType,
  Order,
  OrderDatePreset,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductStatus,
  PromoBanner,
  PromoCoupon,
  PromoKit,
  SecurityAuditEvent,
  SellerCustomProduct,
  SellerQuote,
  SiteBackupSnapshot,
  StoreSettings,
  UnitOfMeasure,
} from '../types/commerce';
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  ADMIN_ROLE_META,
  DEFAULT_ADMIN_USERS,
  DEFAULT_BACKUP_REMINDER_CONFIG,
  DEFAULT_BACKUP_SCHEDULE_CONFIG,
  DEFAULT_HIGHLIGHT_BADGE_COLOR,
  DEFAULT_PROMO_BADGE_COLOR,
  ORDER_STATUS_META,
  appendSiteBackupSnapshot,
  authenticateAdminUser,
  autoRepairCatalogIntegrity,
  canAdminUserAccessTab,
  createSiteBackupSnapshot,
  duplicateMultipleProducts,
  duplicateProductItem,
  emptyProductTrash,
  evaluateBackupReminderStatus,
  filterOrdersByCriteria,
  formatAdminActorLabel,
  formatAdminDashboardDateTime,
  formatBackupByteSize,
  formatBrDateFromYmd,
  formatCurrency,
  formatLogisticsModeLabel,
  formatPageNumberLabel,
  formatPaymentMethodLabel,
  formatPhone,
  formatStoreWhatsAppDisplay,
  generateAutoSku,
  generateNextOrderNumber,
  getAdjacentOrderStatus,
  getDiscountPercentage,
  getEffectiveAllowedTabs,
  getEffectivePrice,
  getKanbanPeriodLabel,
  getLogisticsSettings,
  getPricePerLiterLabel,
  getProductInstallmentMeta,
  isOrderQuoteOnly,
  isProductPriceVisible,
  moveProductStep,
  moveProductsToTrash,
  normalizeHexColor,
  normalizePhone,
  normalizeStoreWhatsAppNumber,
  paginateItems,
  permanentlyDeleteFromTrash,
  reorderProductsById,
  resolveProductBadgeStyle,
  restoreProductFromTrash,
  summarizeOrdersPeriod,
  toDateKeyYmd,
  transitionOrderStatus,
  validateBannerDraft,
  validateCategoryDraft,
  validateCouponDraft,
  validateKitDraft,
  validateProductDraft,
  validateStoreSettingsDraft,
} from '../utils/commerce';
import { optimizeUploadedImage } from '../utils/imageUtils';
import {
  GENERATED_IMAGES,
  INITIAL_BANNERS,
  INITIAL_COUPONS,
  LIMPER_LOGO_URL,
} from '../data/initialCatalog';
import {
  CATEGORY_ICON_CATALOG,
  CategoryIcon,
  ProductImageWithFallback,
} from './CategoryIcon';
import { AdminCommandPalette } from './AdminCommandPalette';
import { AdminSalesSummary } from './AdminSalesSummary';
import { AdminSecurityTab } from './AdminSecurityTab';
import { AdminSellerArea } from './AdminSellerArea';
import { AdminUserAvatar, AdminUsersTab } from './AdminUsersTab';
import { AdminWhatsAppManager } from './AdminWhatsAppManager';
import { BadgeColorPicker } from './BadgeColorPicker';
import { BackupReminderNotification } from './BackupReminderNotification';
import {
  ProductDeleteConfirmModal,
  ProductTrashPanel,
} from './ProductTrashPanel';
import { DEFAULT_CUSTOMER_PROFILE, storageService } from '../utils/storage';

interface AdminDashboardProps {
  categories: Category[];
  products: Product[];
  kits: PromoKit[];
  coupons?: PromoCoupon[];
  banners?: PromoBanner[];
  orders: Order[];
  settings: StoreSettings;
  securityLogs?: SecurityAuditEvent[];
  adminUsers?: AdminUser[];
  siteBackups?: SiteBackupSnapshot[];
  backupSchedule?: BackupScheduleConfig;
  isolationContext?: {
    customerProfile: CustomerProfile;
    sessionOrderIds: string[];
    verifiedLookup: { orderId: string; phone: string } | null;
  };
  onRecordSecurityEvent?: (input: CreateSecurityAuditEventInput) => void;
  onClearSecurityLogs?: () => void;
  onSaveAdminUsers?: (users: AdminUser[]) => void;
  onSaveSiteBackups?: (backups: SiteBackupSnapshot[]) => void;
  onSaveBackupSchedule?: (schedule: BackupScheduleConfig) => void;
  onRestoreSiteBackup?: (snapshot: SiteBackupSnapshot) => void;
  onSaveCategories: (categories: Category[]) => void;
  onSaveProducts: (products: Product[]) => void;
  onSaveKits: (kits: PromoKit[]) => void;
  onSaveCoupons?: (coupons: PromoCoupon[]) => void;
  onSaveBanners?: (banners: PromoBanner[]) => void;
  onSaveOrders: (orders: Order[]) => void;
  onSaveSettings: (settings: StoreSettings) => void;
  onBackToStore: () => void;
}

const KANBAN_COLUMNS: OrderStatus[] = [
  'pending_separation',
  'separating',
  'ready_or_out',
  'completed',
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  categories,
  products,
  kits,
  coupons = INITIAL_COUPONS,
  banners = INITIAL_BANNERS,
  orders,
  settings,
  securityLogs = [],
  adminUsers: adminUsersProp,
  siteBackups: siteBackupsProp,
  backupSchedule: backupScheduleProp,
  isolationContext = {
    customerProfile: DEFAULT_CUSTOMER_PROFILE,
    sessionOrderIds: [],
    verifiedLookup: null,
  },
  onRecordSecurityEvent,
  onClearSecurityLogs,
  onSaveAdminUsers,
  onSaveSiteBackups,
  onSaveBackupSchedule,
  onRestoreSiteBackup,
  onSaveCategories,
  onSaveProducts,
  onSaveKits,
  onSaveCoupons,
  onSaveBanners,
  onSaveOrders,
  onSaveSettings,
  onBackToStore,
}) => {
  const [fallbackAdminUsers, setFallbackAdminUsers] = useState<AdminUser[]>(
    () => DEFAULT_ADMIN_USERS
  );
  const [fallbackSiteBackups, setFallbackSiteBackups] = useState<SiteBackupSnapshot[]>([]);
  const [fallbackBackupSchedule, setFallbackBackupSchedule] =
    useState<BackupScheduleConfig>(() => DEFAULT_BACKUP_SCHEDULE_CONFIG);
  const effectiveAdminUsers =
    adminUsersProp && adminUsersProp.length > 0 ? adminUsersProp : fallbackAdminUsers;
  const effectiveSiteBackups = siteBackupsProp ?? fallbackSiteBackups;
  const effectiveBackupSchedule = backupScheduleProp ?? fallbackBackupSchedule;

  const persistAdminUsers = (updated: AdminUser[]) => {
    if (onSaveAdminUsers) {
      onSaveAdminUsers(updated);
    } else {
      setFallbackAdminUsers(updated);
    }
  };

  const persistSiteBackups = (updated: SiteBackupSnapshot[]) => {
    if (onSaveSiteBackups) {
      onSaveSiteBackups(updated);
    } else {
      setFallbackSiteBackups(updated);
    }
  };

  const persistBackupSchedule = (updated: BackupScheduleConfig) => {
    if (onSaveBackupSchedule) {
      onSaveBackupSchedule(updated);
    } else {
      setFallbackBackupSchedule(updated);
    }
    if (updated.reminder?.enabled && !updated.reminder.snoozedUntil) {
      setReminderDismissedForSession(false);
    }
  };

  const handleRestoreBackupSnapshot = (snapshot: SiteBackupSnapshot) => {
    const p = snapshot.payload;
    if (Array.isArray(p.sellerQuotes)) {
      persistSellerQuotes(p.sellerQuotes);
    }
    if (Array.isArray(p.sellerCustomProducts)) {
      persistSellerCustomProducts(p.sellerCustomProducts);
    }
    if (onRestoreSiteBackup) {
      onRestoreSiteBackup(snapshot);
      return;
    }
    onSaveCategories(p.categories);
    onSaveProducts(p.products);
    onSaveKits(p.kits);
    onSaveCoupons?.(p.coupons);
    onSaveBanners?.(p.banners);
    onSaveOrders(p.orders);
    onSaveSettings(p.settings);
    if (
      Array.isArray(p.adminUsers) &&
      p.adminUsers.some((u) => u.role === 'master' && u.active)
    ) {
      persistAdminUsers(p.adminUsers);
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAdminUserId, setCurrentAdminUserId] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [nowClock, setNowClock] = useState<Date>(() => new Date());
  const [securityActorFilter, setSecurityActorFilter] = useState<string>('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('limper_mt_admin_sidebar_collapsed_v1') === '1';
    } catch {
      return false;
    }
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [reminderDismissedForSession, setReminderDismissedForSession] = useState(false);
  const [previewReminderStyle, setPreviewReminderStyle] =
    useState<BackupReminderStyle | null>(null);
  const [reminderClockTick, setReminderClockTick] = useState<number>(() => Date.now());
  const [quickBackupFeedback, setQuickBackupFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    setReminderClockTick(Date.now());
    const timer = window.setInterval(() => {
      setReminderClockTick(Date.now());
    }, 60000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!quickBackupFeedback) return;
    const timer = window.setTimeout(() => setQuickBackupFeedback(null), 6000);
    return () => window.clearTimeout(timer);
  }, [quickBackupFeedback]);

  const backupReminderEval = useMemo(
    () =>
      evaluateBackupReminderStatus(
        effectiveBackupSchedule.reminder,
        effectiveSiteBackups,
        reminderClockTick
      ),
    [effectiveBackupSchedule.reminder, effectiveSiteBackups, reminderClockTick]
  );

  // Inline CRUD Form Validation & Feedback States
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [kitFormError, setKitFormError] = useState<string | null>(null);
  const [bannerFormError, setBannerFormError] = useState<string | null>(null);
  const [couponFormError, setCouponFormError] = useState<string | null>(null);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [categoryFeedback, setCategoryFeedback] = useState<string | null>(null);
  const [settingsFormError, setSettingsFormError] = useState<string | null>(null);

  const currentAdminUser =
    effectiveAdminUsers.find((u) => u.id === currentAdminUserId) ||
    (isAuthenticated
      ? effectiveAdminUsers.find((u) => u.role === 'master' && u.active) ||
        effectiveAdminUsers[0] ||
        null
      : null);

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          'limper_mt_admin_sidebar_collapsed_v1',
          next ? '1' : '0'
        );
      } catch {
        // Ignore storage errors in restricted contexts
      }
      return next;
    });
  };

  const [activeTab, setActiveTab] = useState<AdminAppTab>('kanban');
  const [adminProductSearch, setAdminProductSearch] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>('all');
  const [adminPriceFilter, setAdminPriceFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | ProductStatus>('all');
  const [adminProductPage, setAdminProductPage] = useState<number>(1);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after'>('before');
  const [productSubView, setProductSubView] = useState<'active' | 'trash'>('active');
  const [deletedProducts, setDeletedProducts] = useState<DeletedProductEntry[]>(() =>
    storageService.getDeletedProducts()
  );
  const [sellerQuotes, setSellerQuotes] = useState<SellerQuote[]>(() =>
    storageService.getSellerQuotes()
  );
  const persistSellerQuotes = (next: SellerQuote[]) => {
    setSellerQuotes(next);
    storageService.saveSellerQuotes(next);
  };
  const [sellerCustomProducts, setSellerCustomProducts] = useState<SellerCustomProduct[]>(
    () => storageService.getSellerCustomProducts()
  );
  const persistSellerCustomProducts = (next: SellerCustomProduct[]) => {
    setSellerCustomProducts(next);
    storageService.saveSellerCustomProducts(next);
  };
  const [pendingDeleteProductIds, setPendingDeleteProductIds] = useState<string[]>([]);
  const [productActionFeedback, setProductActionFeedback] = useState<{
    message: string;
    productIdToEdit?: string;
    undoProducts?: Product[];
    showTrashShortcut?: boolean;
  } | null>(null);

  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  // Manual POS / Walk-in Order State ("Lançar Pedido Balcão / Telefone")
  const [isManualPosOpen, setIsManualPosOpen] = useState(false);
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posDeliveryType, setPosDeliveryType] = useState<DeliveryType>('pickup');
  const [posPaymentMethod, setPosPaymentMethod] = useState<PaymentMethod>('pix');
  const [posProductSearch, setPosProductSearch] = useState('');
  const [posFormError, setPosFormError] = useState<string | null>(null);
  const [posQuantities, setPosQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products
      .filter((p) => p.status === 'active')
      .slice(0, 2)
      .forEach((p) => {
        initial[p.id] = 1;
      });
    return initial;
  });

  // Product Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [prodTitle, setProdTitle] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCatId, setProdCatId] = useState(categories[0]?.id || 'cat-casa');
  const [prodPrice, setProdPrice] = useState('29.90');
  const [prodPromoPrice, setProdPromoPrice] = useState('24.90');
  const [prodInstallmentsCount, setProdInstallmentsCount] = useState<string>('3');
  const [prodInstallmentsNoInterest, setProdInstallmentsNoInterest] = useState<boolean>(true);
  const [prodShowPrice, setProdShowPrice] = useState<boolean>(false);
  const [prodUnit, setProdUnit] = useState<UnitOfMeasure>('L');
  const [prodVolLabel, setProdVolLabel] = useState('5L');
  const [prodStatus, setProdStatus] = useState<ProductStatus>('active');
  const [prodImage, setProdImage] = useState(GENERATED_IMAGES.prodLimpezaPesada);
  const [prodDilution, setProdDilution] = useState('');
  const [prodBadgeLabel, setProdBadgeLabel] = useState('Ofertas do Mês | Limper MT');
  const [prodBadgeColor, setProdBadgeColor] = useState<string>(DEFAULT_PROMO_BADGE_COLOR);
  const [prodSubBadgeLabel, setProdSubBadgeLabel] = useState('MAIS VENDIDO · Limper MT');
  const [prodSubBadgeColor, setProdSubBadgeColor] = useState<string>(
    DEFAULT_HIGHLIGHT_BADGE_COLOR
  );
  const [prodFeatured, setProdFeatured] = useState<boolean>(false);
  const [imageUploadStatus, setImageUploadStatus] = useState<string | null>(null);

  // Category Form State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catShortName, setCatShortName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIcon, setCatIcon] = useState<CategoryIconName>('SprayCan');
  const [catIconSearch, setCatIconSearch] = useState('');

  // Kit & Combo Form State ("Cadastro de Kits com Imagem + Busca na Lupa")
  const [editingKit, setEditingKit] = useState<PromoKit | null>(null);
  const [isKitFormOpen, setIsKitFormOpen] = useState(false);
  const [kitTitle, setKitTitle] = useState('');
  const [kitSku, setKitSku] = useState('');
  const [kitBadge, setKitBadge] = useState('KIT ECONÔMICO LIMPER MT');
  const [kitDesc, setKitDesc] = useState('');
  const [kitPromoPrice, setKitPromoPrice] = useState('59.90');
  const [kitShowPrice, setKitShowPrice] = useState<boolean>(false);
  const [kitActive, setKitActive] = useState<boolean>(true);
  const [kitImage, setKitImage] = useState(GENERATED_IMAGES.prodCasa);
  const [kitImageUploadStatus, setKitImageUploadStatus] = useState<string | null>(null);
  const [kitProductSearchQuery, setKitProductSearchQuery] = useState('');
  const [kitQuantities, setKitQuantities] = useState<Record<string, number>>({
    'prod-casa-1': 1,
    'prod-casa-3': 1,
    'prod-casa-4': 1,
  });

  // Product-to-Banner Placement State ("Escolher em qual banner colocar a promoção")
  const [selectedProductBannerIds, setSelectedProductBannerIds] = useState<string[]>([]);

  // Banner & Promotional Campaign Manager State
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [isBannerFormOpen, setIsBannerFormOpen] = useState(false);
  const [bannerSlot, setBannerSlot] = useState<BannerSlotType>('hero_carousel');
  const [bannerBadge, setBannerBadge] = useState('SEMANA DE OFERTAS · LIMPER MT');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerCtaText, setBannerCtaText] = useState('Aproveitar Ofertas');
  const [bannerTheme, setBannerTheme] = useState<BannerThemeType>('yellow_red');
  const [bannerImage, setBannerImage] = useState(GENERATED_IMAGES.prodLavanderia);
  const [bannerImageUploadStatus, setBannerImageUploadStatus] = useState<string | null>(null);
  const [bannerCategoryId, setBannerCategoryId] = useState<string>('cat-casa');
  const [bannerFeaturedProductIds, setBannerFeaturedProductIds] = useState<string[]>([]);
  const [bannerProductSearch, setBannerProductSearch] = useState('');
  const [bannerActive, setBannerActive] = useState(true);

  // Coupon Manager State ("Cadastrar Cupom na ADM")
  const [editingCoupon, setEditingCoupon] = useState<PromoCoupon | null>(null);
  const [isCouponFormOpen, setIsCouponFormOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDesc, setCouponDesc] = useState('');
  const [couponType, setCouponType] = useState<'percent' | 'fixed'>('percent');
  const [couponValue, setCouponValue] = useState('10');
  const [couponMinOrder, setCouponMinOrder] = useState('0');
  const [couponActive, setCouponActive] = useState(true);

  // Settings Form State
  const [formSettings, setFormSettings] = useState<StoreSettings>(settings);
  const [savedSettingsBanner, setSavedSettingsBanner] = useState(false);
  const [newNeighborhoodName, setNewNeighborhoodName] = useState('');
  const [newNeighborhoodCity, setNewNeighborhoodCity] = useState<'Cuiabá' | 'Várzea Grande'>('Várzea Grande');
  const [newNeighborhoodFee, setNewNeighborhoodFee] = useState('8.00');

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  // Kanban & Order History Filter + Undo State (opens daily on 'Hoje')
  const [todayLocalYmd, setTodayLocalYmd] = useState<string>(() =>
    toDateKeyYmd(new Date(), true)
  );
  const [kanbanViewMode, setKanbanViewMode] = useState<'board' | 'history_table'>('board');
  const [kanbanSearchQuery, setKanbanSearchQuery] = useState('');
  const [kanbanDatePreset, setKanbanDatePreset] = useState<OrderDatePreset>('today');
  const [kanbanStartDate, setKanbanStartDate] = useState('');
  const [kanbanEndDate, setKanbanEndDate] = useState('');
  const [kanbanDeliveryFilter, setKanbanDeliveryFilter] = useState<'all' | DeliveryType>('all');
  const [expandedHistoryOrderId, setExpandedHistoryOrderId] = useState<string | null>(null);
  const [lastStatusMove, setLastStatusMove] = useState<{
    orderId: string;
    customerName: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
  } | null>(null);

  useEffect(() => {
    const syncToday = () => {
      const currentYmd = toDateKeyYmd(new Date(), true);
      setTodayLocalYmd((prev) => (prev === currentYmd ? prev : currentYmd));
    };
    const intervalId = window.setInterval(syncToday, 60_000);
    window.addEventListener('focus', syncToday);
    document.addEventListener('visibilitychange', syncToday);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncToday);
      document.removeEventListener('visibilitychange', syncToday);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setNowClock(new Date());
    const clockId = window.setInterval(() => {
      setNowClock(new Date());
    }, 1_000);
    return () => window.clearInterval(clockId);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !currentAdminUser) return;
    if (!canAdminUserAccessTab(currentAdminUser, activeTab)) {
      const firstAllowed = getEffectiveAllowedTabs(currentAdminUser)[0] || 'kanban';
      setActiveTab(firstAllowed);
    }
  }, [isAuthenticated, currentAdminUser, activeTab]);

  // Global Keyboard Shortcuts: Ctrl+K / Cmd+K opens Admin Command Palette; Escape closes Print Comanda
  useEffect(() => {
    if (!isAuthenticated) return;
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape' && printOrder) {
        e.preventDefault();
        setPrintOrder(null);
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [isAuthenticated, printOrder]);

  const recordAdminAction = (
    input: Omit<
      CreateSecurityAuditEventInput,
      'actorLabel' | 'actorUsername' | 'actorRole'
    > & {
      actorOverride?: AdminUser | null;
    }
  ) => {
    const actor = input.actorOverride ?? currentAdminUser;
    onRecordSecurityEvent?.({
      category: input.category,
      outcome: input.outcome,
      actorLabel: formatAdminActorLabel(actor),
      actorUsername: actor?.username,
      actorRole: actor?.role,
      rawTarget: input.rawTarget,
      orderId: input.orderId,
      summary: input.summary,
      detail: input.detail,
      timestamp: input.timestamp,
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = loginUser.trim().toLowerCase();
    const auth = authenticateAdminUser(effectiveAdminUsers, loginUser, loginPass);

    if (auth.ok) {
      const loggedUser = auth.user;
      const nowIso = new Date().toISOString();
      const firstAllowedTab = getEffectiveAllowedTabs(loggedUser)[0] || 'kanban';

      setCurrentAdminUserId(loggedUser.id);
      setSessionStartedAt(nowIso);
      setNowClock(new Date());
      setActiveTab(firstAllowedTab);
      setIsAuthenticated(true);
      setIsMobileNavOpen(false);
      setReminderDismissedForSession(false);
      setPreviewReminderStyle(null);
      setReminderClockTick(Date.now());
      setLoginError(null);
      setLoginPass('');

      persistAdminUsers(
        effectiveAdminUsers.map((u) =>
          u.id === loggedUser.id ? { ...u, lastLoginAt: nowIso } : u
        )
      );

      recordAdminAction({
        actorOverride: loggedUser,
        category: 'admin_auth',
        outcome: 'allowed',
        rawTarget: `@${loggedUser.username}`,
        summary: `Login autorizado: ${loggedUser.name} (${ADMIN_ROLE_META[loggedUser.role].shortLabel})`,
        detail: `Acesso autenticado à área operacional do Gestor Limper MT com nível ${ADMIN_ROLE_META[loggedUser.role].label}.`,
      });
    } else if (auth.reason === 'inactive_account' && auth.matchedUser) {
      setLoginError(
        'Esta conta administrativa está suspensa. Solicite reativação ao usuário Master.'
      );
      onRecordSecurityEvent?.({
        category: 'admin_auth',
        outcome: 'blocked',
        actorLabel: formatAdminActorLabel(auth.matchedUser),
        actorUsername: auth.matchedUser.username,
        actorRole: auth.matchedUser.role,
        rawTarget: `@${auth.matchedUser.username}`,
        summary: `Login recusado (conta suspensa): ${auth.matchedUser.name}`,
        detail:
          'Tentativa de acesso com conta desativada bloqueada automaticamente pelo controle de acessos.',
      });
    } else {
      setLoginError('Credenciais inválidas. Confira usuário e senha de acesso.');
      onRecordSecurityEvent?.({
        category: 'admin_auth',
        outcome: 'blocked',
        actorLabel: 'Tentativa Externa',
        actorUsername: cleanUser || undefined,
        rawTarget: `Usuário: ${cleanUser || 'vazio'}`,
        summary: 'Tentativa de login administrativo bloqueada',
        detail: 'Credenciais inválidas rejeitadas na tela de acesso restrito.',
      });
    }
  };

  const handleLogoutAdmin = () => {
    recordAdminAction({
      category: 'admin_auth',
      outcome: 'info',
      rawTarget: currentAdminUser ? `@${currentAdminUser.username}` : loginUser.trim() || 'admin',
      summary: currentAdminUser
        ? `Sessão encerrada por ${currentAdminUser.name}`
        : 'Sessão administrativa encerrada',
      detail: 'Usuário desconectado manualmente do Painel Gestor Limper MT.',
    });
    setIsAuthenticated(false);
    setCurrentAdminUserId(null);
    setSessionStartedAt(null);
    setSecurityActorFilter('');
    setIsMobileNavOpen(false);
    setReminderDismissedForSession(false);
    setPreviewReminderStyle(null);
    setLoginPass('');
    setLoginError(null);
  };

  const handleQuickBackupFromReminder = () => {
    const actorLabel = formatAdminActorLabel(currentAdminUser);
    const snapshot = createSiteBackupSnapshot({
      payload: {
        categories,
        products,
        deletedProducts,
        kits,
        coupons,
        banners,
        orders,
        settings,
        adminUsers: effectiveAdminUsers,
        securityLogs,
        sellerQuotes,
        sellerCustomProducts,
      },
      trigger: 'manual',
      label: 'Backup rápido via lembrete de segurança',
      createdBy: actorLabel,
      createdByUsername: currentAdminUser?.username,
    });
    const nextBackups = appendSiteBackupSnapshot(
      effectiveSiteBackups,
      snapshot,
      effectiveBackupSchedule.maxRetention
    );
    persistSiteBackups(nextBackups);

    if (effectiveBackupSchedule.reminder?.snoozedUntil) {
      persistBackupSchedule({
        ...effectiveBackupSchedule,
        reminder: {
          ...DEFAULT_BACKUP_REMINDER_CONFIG,
          ...effectiveBackupSchedule.reminder,
          snoozedUntil: undefined,
        },
      });
    }

    setPreviewReminderStyle(null);
    setReminderDismissedForSession(false);
    setReminderClockTick(Date.now());

    recordAdminAction({
      category: 'site_backup',
      outcome: 'allowed',
      rawTarget: `Snapshot ${snapshot.id} · ${formatBrDateFromYmd(snapshot.dateKey)}`,
      summary: 'Backup criado via lembrete de segurança',
      detail: `Snapshot completo (${formatBackupByteSize(
        snapshot.summary.sizeBytes
      )} · checksum ${snapshot.checksum || 'verificado'}) salvo em 1 clique pelo lembrete de backup.`,
    });

    setQuickBackupFeedback(
      `Backup completo salvo com sucesso! Integridade verificada (${snapshot.checksum || 'OK'}).`
    );
  };

  const handleSnoozeBackupReminder = () => {
    if (previewReminderStyle !== null) {
      setPreviewReminderStyle(null);
      return;
    }
    const snoozedUntil = new Date(Date.now() + 4 * 3_600_000).toISOString();
    persistBackupSchedule({
      ...effectiveBackupSchedule,
      reminder: {
        ...DEFAULT_BACKUP_REMINDER_CONFIG,
        ...(effectiveBackupSchedule.reminder || {}),
        snoozedUntil,
      },
    });
    setReminderClockTick(Date.now());
    recordAdminAction({
      category: 'site_backup',
      outcome: 'info',
      rawTarget: 'Lembrete de backup',
      summary: 'Lembrete de backup adiado por 4 horas',
      detail: 'Administrador adiou temporariamente a notificação de backup desatualizado.',
    });
  };

  const handleOpenBackupVaultFromReminder = () => {
    const activeStyle = previewReminderStyle ?? backupReminderEval.style;
    setPreviewReminderStyle(null);
    if (activeStyle === 'modal') {
      setReminderDismissedForSession(true);
    }
    setActiveTab('security');
    window.setTimeout(() => {
      (
        document.getElementById('admin-backup-reminder-settings') ||
        document.getElementById('admin-backup-scheduler') ||
        document.getElementById('admin-backup-vault')
      )?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 90);
  };

  const handleMoveOrderStatus = (
    orderId: string,
    nextStatus: OrderStatus,
    customReason?: string
  ) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder || targetOrder.status === nextStatus) return;

    const fromStatus = targetOrder.status;
    setLastStatusMove({
      orderId: targetOrder.id,
      customerName: targetOrder.customerName,
      fromStatus,
      toStatus: nextStatus,
    });

    const updated = orders.map((o) =>
      o.id === orderId ? transitionOrderStatus(o, nextStatus, customReason) : o
    );
    onSaveOrders(updated);
    recordAdminAction({
      category: 'order_security',
      outcome: 'info',
      rawTarget: targetOrder.customerPhone,
      orderId: targetOrder.id,
      summary: `Status do pedido ${targetOrder.id} movido para ${ORDER_STATUS_META[nextStatus].shortLabel}`,
      detail: customReason
        ? `Motivo registrado: ${customReason}`
        : `Transição de "${ORDER_STATUS_META[fromStatus].shortLabel}" para "${ORDER_STATUS_META[nextStatus].shortLabel}".`,
    });
  };

  const handleUndoLastStatusMove = () => {
    if (!lastStatusMove) return;
    const { orderId, fromStatus } = lastStatusMove;
    const targetOrder = orders.find((o) => o.id === orderId);
    const updated = orders.map((o) =>
      o.id === orderId
        ? transitionOrderStatus(
            o,
            fromStatus,
            'Desfeito pelo operador (correção de falha humana)'
          )
        : o
    );
    onSaveOrders(updated);
    recordAdminAction({
      category: 'order_security',
      outcome: 'info',
      rawTarget: targetOrder?.customerPhone || orderId,
      orderId,
      summary: `Movimentação do pedido ${orderId} desfeita`,
      detail: `Pedido restaurado para "${ORDER_STATUS_META[fromStatus].shortLabel}" após correção operacional.`,
    });
    setLastStatusMove(null);
  };

  const handleCreatePosOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setPosFormError(null);
    const selectedItems = products
      .filter((p) => (posQuantities[p.id] || 0) > 0)
      .map((p) => {
        const qty = posQuantities[p.id];
        const unitPrice = getEffectivePrice(p);
        return {
          productId: p.id,
          sku: p.sku,
          title: p.title,
          volumeLabel: p.volumeLabel,
          unitPrice,
          quantity: qty,
          subtotal: Math.round(unitPrice * qty * 100) / 100,
        };
      });

    if (selectedItems.length === 0) {
      setPosFormError(
        'Selecione pelo menos 1 produto com quantidade maior que zero para gerar o pedido.'
      );
      return;
    }

    const subtotal = selectedItems.reduce((acc, i) => acc + i.subtotal, 0);
    const nextNum = generateNextOrderNumber(orders);
    const newPosOrder: Order = {
      id: `#LMP-${nextNum}`,
      createdAt: new Date().toISOString(),
      customerName: posCustomerName.trim() || 'Cliente Balcão VG',
      customerPhone: normalizePhone(posCustomerPhone) || '6530296824',
      items: selectedItems,
      subtotal,
      deliveryFee: 0,
      total: subtotal,
      deliveryType: posDeliveryType,
      pickupCode: `BALCÃO-${nextNum}`,
      estimatedTime: 'Atendimento Presencial / Telefone (Av. Couto Magalhães, 2820)',
      paymentMethod: posPaymentMethod,
      status: 'pending_separation',
    };

    onSaveOrders([newPosOrder, ...orders]);
    recordAdminAction({
      category: 'order_security',
      outcome: 'allowed',
      rawTarget: newPosOrder.customerPhone,
      orderId: newPosOrder.id,
      summary: `Pedido balcão/PDV lançado: ${newPosOrder.id}`,
      detail: `${selectedItems.length} item(ns) · ${formatCurrency(subtotal)} para ${newPosOrder.customerName}.`,
    });
    setKanbanDatePreset('today');
    setKanbanStartDate('');
    setKanbanEndDate('');
    setKanbanSearchQuery('');
    setKanbanDeliveryFilter('all');
    setIsManualPosOpen(false);
    setPosCustomerName('');
    setPosCustomerPhone('');
    setPosProductSearch('');
    setPosFormError(null);
    setPrintOrder(newPosOrder);
  };

  const handleExportProductsCsv = () => {
    const headers = ['SKU', 'Produto', 'Volume', 'Preco_Regular', 'Preco_Oferta', 'Status', 'Destaque'];
    const rows = products.map((p) => [
      p.sku,
      `"${p.title.replace(/"/g, '""')}"`,
      p.volumeLabel,
      p.price.toFixed(2),
      p.promoPrice ? p.promoPrice.toFixed(2) : '',
      p.status,
      p.featured ? 'Sim' : 'Nao',
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'catalogo-limper-mt.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportOrdersCsv = () => {
    const headers = ['Pedido', 'Data', 'Cliente', 'Telefone', 'Modalidade', 'Pagamento', 'Total_R$', 'Status'];
    const rows = orders.map((o) => [
      o.id,
      new Date(o.createdAt).toLocaleDateString('pt-BR'),
      `"${o.customerName.replace(/"/g, '""')}"`,
      formatPhone(o.customerPhone),
      o.deliveryType === 'pickup' ? 'Retirada Balcao' : 'Delivery',
      o.paymentMethod.toUpperCase(),
      o.total.toFixed(2),
      o.status,
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pedidos-limper-mt.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleProductFeatured = (product: Product) => {
    onSaveProducts(
      products.map((p) =>
        p.id === product.id ? { ...p, featured: !p.featured } : p
      )
    );
  };

  const buildCustomerWhatsAppStatusUrl = (order: Order): string => {
    const cleanPhone = normalizePhone(order.customerPhone);
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const statusText = ORDER_STATUS_META[order.status].shortLabel;
    const message = [
      `🧼 *ATUALIZAÇÃO DO SEU PEDIDO ${order.id} - LIMPER MT*`,
      `Olá, *${order.customerName}*!`,
      ``,
      `Status atual: *${statusText}*`,
      order.deliveryType === 'pickup'
        ? `📍 *Local de Retirada Expressa:* ${settings.storeAddress}`
        : `🚚 *Entrega Delivery:* ${order.address?.street || ''}, ${order.address?.number || ''} - ${order.address?.neighborhood || ''}`,
      `📞 Central Limper MT: ${settings.whatsappDisplay}`,
    ].join('\n');
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };

  const getAllCatalogSkus = () => [
    ...products.map((p) => p.sku),
    ...kits.map((k) => k.sku || ''),
  ];

  const handleGenerateProductSku = () => {
    const nextSku = generateAutoSku({
      kind: 'product',
      existingSkus: getAllCatalogSkus(),
      currentSku: prodSku,
      preferredPrefix: prodSku,
      mode: 'random',
    });
    setProdSku(nextSku);
    setProductFormError(null);
  };

  const handleGenerateKitSku = () => {
    const nextSku = generateAutoSku({
      kind: 'kit',
      existingSkus: getAllCatalogSkus(),
      currentSku: kitSku,
      preferredPrefix: kitSku,
      mode: 'random',
    });
    setKitSku(nextSku);
    setKitFormError(null);
  };

  const openCreateProduct = () => {
    const nextSku = generateAutoSku({
      kind: 'product',
      existingSkus: getAllCatalogSkus(),
      mode: 'sequential',
    });
    setEditingProduct(null);
    setProdTitle('');
    setProdSku(nextSku);
    setProdDesc('');
    setProdCatId(categories[0]?.id || 'cat-casa');
    setProdPrice('39.90');
    setProdPromoPrice('32.90');
    setProdInstallmentsCount(String(settings.defaultInstallmentsCount ?? 3));
    setProdInstallmentsNoInterest(settings.defaultInstallmentsNoInterest ?? true);
    setProdShowPrice(false);
    setProdUnit('L');
    setProdVolLabel('5L');
    setProdStatus('active');
    setProdImage(GENERATED_IMAGES.prodLimpezaPesada);
    setProdDilution('Alto rendimento profissional');
    setProdBadgeLabel('Ofertas do Mês | Limper MT');
    setProdBadgeColor(DEFAULT_PROMO_BADGE_COLOR);
    setProdSubBadgeLabel('MAIS VENDIDO · Limper MT');
    setProdSubBadgeColor(DEFAULT_HIGHLIGHT_BADGE_COLOR);
    setProdFeatured(false);
    setSelectedProductBannerIds([]);
    setImageUploadStatus(null);
    setProductFormError(null);
    setIsProductFormOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProdTitle(product.title);
    setProdSku(product.sku);
    setProdDesc(product.description);
    setProdCatId(product.categoryId);
    setProdPrice(String(product.price));
    setProdPromoPrice(product.promoPrice ? String(product.promoPrice) : '');
    setProdInstallmentsCount(
      String(product.installmentsCount ?? settings.defaultInstallmentsCount ?? 3)
    );
    setProdInstallmentsNoInterest(
      product.installmentsNoInterest ?? settings.defaultInstallmentsNoInterest ?? true
    );
    setProdShowPrice(isProductPriceVisible(product, settings));
    setProdUnit(product.unit);
    setProdVolLabel(product.volumeLabel);
    setProdStatus(product.status);
    setProdImage(product.imageUrl);
    setProdDilution(product.dilutionHint || '');
    setProdBadgeLabel(product.badgeLabel || 'Ofertas do Mês | Limper MT');
    setProdBadgeColor(normalizeHexColor(product.badgeColor, DEFAULT_PROMO_BADGE_COLOR));
    setProdSubBadgeLabel(product.subBadgeLabel || '');
    setProdSubBadgeColor(
      normalizeHexColor(product.subBadgeColor, DEFAULT_HIGHLIGHT_BADGE_COLOR)
    );
    setProdFeatured(Boolean(product.featured));
    const currentBannerIds = banners
      .filter((b) => b.featuredProductIds.includes(product.id))
      .map((b) => b.id);
    setSelectedProductBannerIds(currentBannerIds);
    setImageUploadStatus(null);
    setProductFormError(null);
    setIsProductFormOpen(true);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const result = await optimizeUploadedImage(file, {
      maxWidth: 960,
      maxHeight: 960,
      quality: 0.84,
      maxSizeMb: 5,
    });

    if (!result.ok) {
      setImageUploadStatus(result.error);
      return;
    }

    setProdImage(result.dataUrl);
    setImageUploadStatus(
      result.wasCompressed
        ? `Imagem "${file.name}" otimizada automaticamente (${result.originalKb} KB → ${result.optimizedKb} KB)!`
        : `Arquivo "${file.name}" (${result.optimizedKb} KB) carregado com sucesso!`
    );
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError(null);

    const parsedPrice = Number(prodPrice.replace(',', '.'));
    const priceNum = Number.isFinite(parsedPrice) ? parsedPrice : -1;
    const promoNum = prodPromoPrice.trim()
      ? Number(prodPromoPrice.replace(',', '.'))
      : null;
    const installmentsCountNum = Math.max(
      1,
      Math.min(12, Math.round(Number(prodInstallmentsCount) || 3))
    );

    const validation = validateProductDraft(
      {
        title: prodTitle,
        sku: prodSku,
        price: priceNum,
        promoPrice: promoNum,
        categoryId: prodCatId,
        installmentsCount: installmentsCountNum,
      },
      products,
      editingProduct?.id || null
    );
    if (!validation.valid) {
      setProductFormError(validation.error || 'Confira os campos do produto.');
      return;
    }

    const targetProdId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;
    const unlockingLegacyGlobalHide = prodShowPrice && settings.hideAllPrices;

    if (unlockingLegacyGlobalHide) {
      const unlockedSettings: StoreSettings = {
        ...settings,
        hideAllPrices: false,
      };
      setFormSettings(unlockedSettings);
      onSaveSettings(unlockedSettings);
      onSaveKits(kits.map((k) => ({ ...k, showPrice: false })));
    }

    const normalizedBadgeColor = normalizeHexColor(
      prodBadgeColor,
      DEFAULT_PROMO_BADGE_COLOR
    );
    const normalizedSubBadgeColor = normalizeHexColor(
      prodSubBadgeColor,
      DEFAULT_HIGHLIGHT_BADGE_COLOR
    );

    if (editingProduct) {
      const updated = products.map((p) => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            title: prodTitle.trim(),
            sku: prodSku.trim(),
            description: prodDesc.trim(),
            categoryId: prodCatId,
            price: priceNum,
            promoPrice: promoNum,
            installmentsCount: installmentsCountNum,
            installmentsNoInterest: prodInstallmentsNoInterest,
            showPrice: prodShowPrice,
            unit: prodUnit,
            volumeLabel: prodVolLabel.trim(),
            status: prodStatus,
            imageUrl: prodImage.trim() || GENERATED_IMAGES.prodLimpezaPesada,
            dilutionHint: prodDilution.trim() || undefined,
            badgeLabel: prodBadgeLabel.trim() || undefined,
            badgeColor:
              normalizedBadgeColor !== DEFAULT_PROMO_BADGE_COLOR
                ? normalizedBadgeColor
                : undefined,
            subBadgeLabel: prodSubBadgeLabel.trim() || undefined,
            subBadgeColor:
              normalizedSubBadgeColor !== DEFAULT_HIGHLIGHT_BADGE_COLOR
                ? normalizedSubBadgeColor
                : undefined,
            featured: prodFeatured,
          };
        }
        return unlockingLegacyGlobalHide ? { ...p, showPrice: false } : p;
      });
      onSaveProducts(updated);
      recordAdminAction({
        category: 'catalog_policy',
        outcome: 'info',
        rawTarget: prodSku.trim() || editingProduct.sku,
        summary: `Produto atualizado: ${prodTitle.trim()}`,
        detail: `Preço: ${formatCurrency(priceNum)}${
          promoNum ? ` · Oferta: ${formatCurrency(promoNum)}` : ''
        } · Exibição: ${prodShowPrice ? 'Preço visível' : 'Sob consulta'}.`,
      });
    } else {
      const newProd: Product = {
        id: targetProdId,
        sku:
          prodSku.trim().toUpperCase() ||
          generateAutoSku({
            kind: 'product',
            existingSkus: getAllCatalogSkus(),
            mode: 'sequential',
          }),
        title: prodTitle.trim(),
        description: prodDesc.trim() || 'Produto da linha profissional Quimiprol.',
        categoryId: prodCatId,
        price: priceNum,
        promoPrice: promoNum,
        installmentsCount: installmentsCountNum,
        installmentsNoInterest: prodInstallmentsNoInterest,
        showPrice: prodShowPrice,
        unit: prodUnit,
        volumeLabel: prodVolLabel.trim() || '5L',
        status: prodStatus,
        imageUrl: prodImage.trim() || GENERATED_IMAGES.prodLimpezaPesada,
        dilutionHint: prodDilution.trim() || undefined,
        badgeLabel: prodBadgeLabel.trim() || undefined,
        badgeColor:
          normalizedBadgeColor !== DEFAULT_PROMO_BADGE_COLOR
            ? normalizedBadgeColor
            : undefined,
        subBadgeLabel: prodSubBadgeLabel.trim() || undefined,
        subBadgeColor:
          normalizedSubBadgeColor !== DEFAULT_HIGHLIGHT_BADGE_COLOR
            ? normalizedSubBadgeColor
            : undefined,
        featured: prodFeatured,
      };
      const baseProducts = unlockingLegacyGlobalHide
        ? products.map((p) => ({ ...p, showPrice: false }))
        : products;
      onSaveProducts([newProd, ...baseProducts]);
      recordAdminAction({
        category: 'catalog_policy',
        outcome: 'allowed',
        rawTarget: newProd.sku,
        summary: `Novo produto cadastrado: ${newProd.title}`,
        detail: `SKU ${newProd.sku} (${newProd.volumeLabel}) · ${formatCurrency(priceNum)}.`,
      });
      setAdminProductPage(1);
    }

    // Update Banner placements if onSaveBanners is wired
    if (onSaveBanners) {
      const updatedBanners = banners.map((b) => {
        const shouldInclude = selectedProductBannerIds.includes(b.id);
        const alreadyIncludes = b.featuredProductIds.includes(targetProdId);
        if (shouldInclude && !alreadyIncludes) {
          return {
            ...b,
            featuredProductIds: [targetProdId, ...b.featuredProductIds],
          };
        }
        if (!shouldInclude && alreadyIncludes) {
          return {
            ...b,
            featuredProductIds: b.featuredProductIds.filter((id) => id !== targetProdId),
          };
        }
        return b;
      });
      onSaveBanners(updatedBanners);
    }

    setProductActionFeedback({
      message: editingProduct
        ? `Alterações em "${prodTitle.trim()}" salvas no catálogo.`
        : `Produto "${prodTitle.trim()}" cadastrado no catálogo (#01).`,
    });
    setIsProductFormOpen(false);
    setEditingProduct(null);
  };

  const handleToggleProductStatus = (product: Product) => {
    const cycle: Record<ProductStatus, ProductStatus> = {
      active: 'out_of_stock',
      out_of_stock: 'inactive',
      inactive: 'active',
    };
    const next = cycle[product.status];
    onSaveProducts(
      products.map((p) => (p.id === product.id ? { ...p, status: next } : p))
    );
  };

  const handleToggleProductPriceVisibility = (product: Product) => {
    const currentlyVisible = isProductPriceVisible(product, settings);
    const nextShow = !currentlyVisible;

    if (settings.hideAllPrices && nextShow) {
      const updatedSettings: StoreSettings = {
        ...settings,
        hideAllPrices: false,
      };
      setFormSettings(updatedSettings);
      onSaveSettings(updatedSettings);
      onSaveKits(kits.map((k) => ({ ...k, showPrice: false })));
      onSaveProducts(
        products.map((p) => ({
          ...p,
          showPrice: p.id === product.id ? true : false,
        }))
      );
      return;
    }

    onSaveProducts(
      products.map((p) =>
        p.id === product.id ? { ...p, showPrice: nextShow } : p
      )
    );
  };

  const handleHideAllProductPrices = () => {
    onSaveProducts(products.map((p) => ({ ...p, showPrice: false })));
    onSaveKits(kits.map((k) => ({ ...k, showPrice: false })));
    if (settings.hideAllPrices) {
      const updatedSettings: StoreSettings = {
        ...settings,
        hideAllPrices: false,
      };
      setFormSettings(updatedSettings);
      onSaveSettings(updatedSettings);
    }
    recordAdminAction({
      category: 'catalog_policy',
      outcome: 'info',
      rawTarget: `${products.length} produtos`,
      summary: 'Todos os preços ocultados (Modo Sob Consulta)',
      detail: 'Vitrine alterada globalmente para orçamento via WhatsApp sem exposição de valores.',
    });
    setSelectedProductIds([]);
  };

  const handleShowAllProductPrices = () => {
    onSaveProducts(products.map((p) => ({ ...p, showPrice: true })));
    onSaveKits(kits.map((k) => ({ ...k, showPrice: true })));
    if (settings.hideAllPrices) {
      const updatedSettings: StoreSettings = {
        ...settings,
        hideAllPrices: false,
      };
      setFormSettings(updatedSettings);
      onSaveSettings(updatedSettings);
    }
    recordAdminAction({
      category: 'catalog_policy',
      outcome: 'info',
      rawTarget: `${products.length} produtos`,
      summary: 'Exibição de preços liberada em todo o catálogo',
      detail: 'Preços em R$ e parcelamento reativados na vitrine pública.',
    });
    setSelectedProductIds([]);
  };

  const handleToggleSelectProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBatchSetProductPrices = (show: boolean) => {
    if (selectedProductIds.length === 0) return;
    const selectedSet = new Set(selectedProductIds);

    if (show && settings.hideAllPrices) {
      const updatedSettings: StoreSettings = {
        ...settings,
        hideAllPrices: false,
      };
      setFormSettings(updatedSettings);
      onSaveSettings(updatedSettings);
      onSaveKits(kits.map((k) => ({ ...k, showPrice: false })));
      onSaveProducts(
        products.map((p) => ({
          ...p,
          showPrice: selectedSet.has(p.id) ? true : false,
        }))
      );
    } else {
      onSaveProducts(
        products.map((p) =>
          selectedSet.has(p.id) ? { ...p, showPrice: show } : p
        )
      );
    }
    setSelectedProductIds([]);
  };

  const persistDeletedProducts = (next: DeletedProductEntry[]) => {
    setDeletedProducts(next);
    storageService.saveDeletedProducts(next);
  };

  const requestDeleteProducts = (ids: string[]) => {
    const validIds = ids.filter((id) => products.some((p) => p.id === id));
    if (validIds.length === 0) return;
    setPendingDeleteProductIds(validIds);
  };

  const handleConfirmDeleteProducts = () => {
    if (pendingDeleteProductIds.length === 0) return;
    const actorLabel = currentAdminUser
      ? formatAdminActorLabel(currentAdminUser)
      : 'Administrador';
    const { nextProducts, nextTrash, movedEntries } = moveProductsToTrash(
      products,
      deletedProducts,
      pendingDeleteProductIds,
      actorLabel
    );
    if (movedEntries.length === 0) {
      setPendingDeleteProductIds([]);
      return;
    }

    const movedIdSet = new Set(movedEntries.map((entry) => entry.product.id));
    if (editingProduct && movedIdSet.has(editingProduct.id)) {
      setIsProductFormOpen(false);
      setEditingProduct(null);
    }

    onSaveProducts(nextProducts);
    persistDeletedProducts(nextTrash);
    setSelectedProductIds((prev) => prev.filter((id) => !movedIdSet.has(id)));
    setPendingDeleteProductIds([]);

    if (movedEntries.length === 1) {
      const target = movedEntries[0].product;
      recordAdminAction({
        category: 'catalog_policy',
        outcome: 'info',
        rawTarget: target.sku,
        summary: `Produto movido para excluídos: ${target.title}`,
        detail: `Item SKU ${target.sku} enviado para a área de Produtos Excluídos (pode ser resgatado ou apagado definitivamente).`,
      });
      setProductActionFeedback({
        message: `Produto "${target.title}" movido para Produtos Excluídos. Você pode resgatá-lo quando quiser.`,
        showTrashShortcut: true,
      });
    } else {
      recordAdminAction({
        category: 'catalog_policy',
        outcome: 'info',
        rawTarget: `${movedEntries.length} produtos`,
        summary: `${movedEntries.length} produtos movidos para excluídos`,
        detail: `Itens enviados em lote para a área de Produtos Excluídos: ${movedEntries
          .slice(0, 5)
          .map((e) => e.product.sku)
          .join(', ')}.`,
      });
      setProductActionFeedback({
        message: `${movedEntries.length} produto(s) movido(s) para Produtos Excluídos.`,
        showTrashShortcut: true,
      });
    }
  };

  const handleRestoreDeletedProduct = (productId: string) => {
    const kitSkus = kits.map((k) => k.sku || '').filter(Boolean);
    const result = restoreProductFromTrash(
      products,
      deletedProducts,
      productId,
      categories,
      kitSkus
    );
    if (!result.restoredProduct) return;

    onSaveProducts(result.nextProducts);
    persistDeletedProducts(result.nextTrash);

    const adjustments: string[] = [];
    if (result.skuReassigned) {
      adjustments.push(`SKU atualizado para ${result.restoredProduct.sku}`);
    }
    if (result.categoryReassigned) {
      adjustments.push('categoria ajustada automaticamente');
    }

    recordAdminAction({
      category: 'catalog_policy',
      outcome: 'allowed',
      rawTarget: result.restoredProduct.sku,
      summary: `Produto resgatado da lixeira: ${result.restoredProduct.title}`,
      detail: `Item SKU ${result.restoredProduct.sku} restaurado para o catálogo ativo.${
        adjustments.length > 0 ? ` (${adjustments.join('; ')})` : ''
      }`,
    });

    setProductActionFeedback({
      message: `Produto "${result.restoredProduct.title}" resgatado com sucesso para o Catálogo Ativo${
        adjustments.length > 0 ? ` (${adjustments.join(', ')})` : ''
      }.`,
    });
  };

  const handleRestoreAllDeletedProducts = () => {
    if (deletedProducts.length === 0) return;
    const kitSkus = kits.map((k) => k.sku || '').filter(Boolean);
    let workingProducts = products;
    let workingTrash = deletedProducts;
    let restoredCount = 0;

    // Restore oldest first so original positions align naturally
    const idsToRestore = [...deletedProducts].reverse().map((entry) => entry.product.id);
    for (const id of idsToRestore) {
      const res = restoreProductFromTrash(
        workingProducts,
        workingTrash,
        id,
        categories,
        kitSkus
      );
      if (res.restoredProduct) {
        workingProducts = res.nextProducts;
        workingTrash = res.nextTrash;
        restoredCount += 1;
      }
    }

    if (restoredCount === 0) return;
    onSaveProducts(workingProducts);
    persistDeletedProducts(workingTrash);
    setProductSubView('active');

    recordAdminAction({
      category: 'catalog_policy',
      outcome: 'allowed',
      rawTarget: `${restoredCount} produtos`,
      summary: `${restoredCount} produto(s) resgatado(s) da área de excluídos`,
      detail: `Todos os ${restoredCount} itens da área de Produtos Excluídos foram devolvidos ao catálogo ativo.`,
    });

    setProductActionFeedback({
      message: `${restoredCount} produto(s) resgatado(s) de volta para o Catálogo Ativo.`,
    });
  };

  const handlePermanentDeleteProduct = (productId: string) => {
    const { nextTrash, removedEntry } = permanentlyDeleteFromTrash(
      deletedProducts,
      productId
    );
    if (!removedEntry) return;

    persistDeletedProducts(nextTrash);
    recordAdminAction({
      category: 'catalog_policy',
      outcome: 'info',
      rawTarget: removedEntry.product.sku,
      summary: `Produto excluído definitivamente: ${removedEntry.product.title}`,
      detail: `Item SKU ${removedEntry.product.sku} removido permanentemente da área de Produtos Excluídos.`,
    });
    setProductActionFeedback({
      message: `Produto "${removedEntry.product.title}" excluído definitivamente.`,
    });
  };

  const handleEmptyProductTrash = () => {
    const { nextTrash, removedCount } = emptyProductTrash(deletedProducts);
    if (removedCount === 0) return;

    persistDeletedProducts(nextTrash);
    recordAdminAction({
      category: 'catalog_policy',
      outcome: 'info',
      rawTarget: `${removedCount} produtos`,
      summary: `Área de produtos excluídos limpa (${removedCount} itens)`,
      detail: `${removedCount} produto(s) removido(s) definitivamente para limpeza da área de exclusão.`,
    });
    setProductActionFeedback({
      message: `Área de exclusão limpa: ${removedCount} produto(s) removido(s) definitivamente.`,
    });
  };

  const handleDuplicateProduct = (product: Product) => {
    const { nextProducts, duplicatedProduct } = duplicateProductItem(
      products,
      product.id
    );
    if (!duplicatedProduct) return;

    onSaveProducts(nextProducts);
    recordAdminAction({
      category: 'catalog_policy',
      outcome: 'info',
      rawTarget: duplicatedProduct.sku,
      summary: `Produto duplicado: ${duplicatedProduct.title}`,
      detail: `Cópia gerada a partir de "${product.title}" (${product.sku}).`,
    });

    // If the duplicate would appear within current filters, jump straight to its page
    const updatedFiltered = nextProducts.filter((p) => {
      const matchesCat =
        adminCategoryFilter === 'all' || p.categoryId === adminCategoryFilter;
      const isVisible = isProductPriceVisible(p, settings);
      const matchesPriceFilter =
        adminPriceFilter === 'all' ||
        (adminPriceFilter === 'visible' ? isVisible : !isVisible);
      const matchesStatus =
        adminStatusFilter === 'all' || p.status === adminStatusFilter;
      const q = adminProductSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      return matchesCat && matchesPriceFilter && matchesStatus && matchesSearch;
    });

    const dupFilteredIdx = updatedFiltered.findIndex(
      (p) => p.id === duplicatedProduct.id
    );
    if (dupFilteredIdx !== -1) {
      const targetPage = Math.floor(dupFilteredIdx / ADMIN_PRODUCTS_PAGE_SIZE) + 1;
      setAdminProductPage(targetPage);
    }

    setProductActionFeedback({
      message: `Produto "${product.title}" duplicado (${duplicatedProduct.sku}).`,
      productIdToEdit: duplicatedProduct.id,
    });
  };

  const handleBatchDuplicateSelected = () => {
    if (selectedProductIds.length === 0) return;
    const { nextProducts, duplicatedProducts } = duplicateMultipleProducts(
      products,
      selectedProductIds
    );
    if (duplicatedProducts.length === 0) return;
    onSaveProducts(nextProducts);
    setSelectedProductIds([]);
    setProductActionFeedback({
      message: `${duplicatedProducts.length} produto(s) duplicado(s) com novos códigos SKU.`,
      productIdToEdit:
        duplicatedProducts.length === 1 ? duplicatedProducts[0].id : undefined,
    });
  };

  const handleBatchSetProductStatus = (nextStatus: ProductStatus) => {
    if (selectedProductIds.length === 0) return;
    const selectedSet = new Set(selectedProductIds);
    onSaveProducts(
      products.map((p) =>
        selectedSet.has(p.id) ? { ...p, status: nextStatus } : p
      )
    );
    const statusLabel =
      nextStatus === 'active'
        ? 'Ativo'
        : nextStatus === 'out_of_stock'
        ? 'Em Falta'
        : 'Inativo';
    setProductActionFeedback({
      message: `${selectedProductIds.length} produto(s) atualizado(s) para "${statusLabel}".`,
    });
    setSelectedProductIds([]);
  };

  const handleMoveProduct = (
    productId: string,
    direction: 'up' | 'down' | 'top' | 'bottom'
  ) => {
    const visibleIds = filteredAdminProducts.map((p) => p.id);
    const reordered = moveProductStep(products, productId, direction, visibleIds);
    if (reordered === products) return;

    onSaveProducts(reordered);

    if (direction === 'top') {
      setAdminProductPage(1);
    } else if (direction === 'up' || direction === 'down') {
      const updatedFilteredIds = reordered
        .filter((p) => visibleIds.includes(p.id))
        .map((p) => p.id);
      const nextFilteredIndex = updatedFilteredIds.indexOf(productId);
      if (nextFilteredIndex !== -1) {
        setAdminProductPage(
          Math.floor(nextFilteredIndex / ADMIN_PRODUCTS_PAGE_SIZE) + 1
        );
      }
    }

    setProductActionFeedback({
      message:
        direction === 'top'
          ? 'Produto movido para o topo (#01) do catálogo e da vitrine.'
          : 'Ordem do catálogo atualizada e salva automaticamente.',
    });
  };

  const handleDropProductRow = (targetProductId: string) => {
    if (!draggedProductId || draggedProductId === targetProductId) {
      setDraggedProductId(null);
      setDragOverProductId(null);
      return;
    }

    const reordered = reorderProductsById(
      products,
      draggedProductId,
      targetProductId,
      dragOverPosition
    );
    if (reordered !== products) {
      onSaveProducts(reordered);
      setProductActionFeedback({
        message: 'Ordem do catálogo atualizada e salva automaticamente na vitrine.',
      });
    }
    setDraggedProductId(null);
    setDragOverProductId(null);
  };

  // Kits & Combos Handlers
  const openCreateKit = () => {
    const nextKitSku = generateAutoSku({
      kind: 'kit',
      existingSkus: getAllCatalogSkus(),
      mode: 'sequential',
    });
    setEditingKit(null);
    setKitTitle('');
    setKitSku(nextKitSku);
    setKitBadge('KIT PROMOCIONAL LIMPER MT');
    setKitDesc('');
    setKitPromoPrice('64.90');
    setKitShowPrice(false);
    setKitActive(true);
    setKitImage(GENERATED_IMAGES.prodCasa);
    setKitImageUploadStatus(null);
    setKitFormError(null);
    const defaultKitItems: Record<string, number> = {};
    products
      .filter((p) => p.status === 'active')
      .slice(0, 2)
      .forEach((p) => {
        defaultKitItems[p.id] = 1;
      });
    setKitQuantities(defaultKitItems);
    setIsKitFormOpen(true);
  };

  const openEditKit = (kit: PromoKit) => {
    setEditingKit(kit);
    setKitTitle(kit.title);
    setKitSku(kit.sku || '');
    setKitBadge(kit.badge);
    setKitDesc(kit.description);
    setKitPromoPrice(String(kit.promoPrice));
    setKitShowPrice(!settings.hideAllPrices && kit.showPrice !== false);
    setKitActive(kit.active);
    setKitImage(kit.imageUrl || GENERATED_IMAGES.prodCasa);
    setKitImageUploadStatus(null);
    setKitFormError(null);
    const map: Record<string, number> = {};
    kit.items.forEach((item) => {
      map[item.productId] = item.quantity;
    });
    setKitQuantities(map);
    setIsKitFormOpen(true);
  };

  const handleKitImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const result = await optimizeUploadedImage(file, {
      maxWidth: 960,
      maxHeight: 960,
      quality: 0.84,
      maxSizeMb: 5,
    });
    if (!result.ok) {
      setKitImageUploadStatus(result.error);
      return;
    }
    setKitImage(result.dataUrl);
    setKitImageUploadStatus(
      result.wasCompressed
        ? `Imagem do Kit "${file.name}" otimizada (${result.originalKb} KB → ${result.optimizedKb} KB)!`
        : `Imagem do Kit "${file.name}" (${result.optimizedKb} KB) carregada com sucesso!`
    );
  };

  const handleSaveKit = (e: React.FormEvent) => {
    e.preventDefault();
    setKitFormError(null);

    const selectedItems = Object.entries(kitQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    const regularSum = selectedItems.reduce((acc, item) => {
      const p = products.find((prod) => prod.id === item.productId);
      return acc + (p ? getEffectivePrice(p) * item.quantity : 0);
    }, 0);

    const promoNum = kitPromoPrice.trim()
      ? Number(kitPromoPrice.replace(',', '.'))
      : regularSum;

    const resolvedKitSku =
      kitSku.trim().toUpperCase() ||
      (editingKit?.sku?.trim().toUpperCase() ||
        generateAutoSku({
          kind: 'kit',
          existingSkus: getAllCatalogSkus(),
          mode: 'sequential',
        }));

    const kitValidation = validateKitDraft(
      {
        title: kitTitle,
        sku: resolvedKitSku,
        promoPrice: promoNum,
        items: selectedItems,
      },
      products,
      kits,
      editingKit?.id || null
    );
    if (!kitValidation.valid) {
      setKitFormError(kitValidation.error || 'Verifique os campos do kit.');
      return;
    }

    const unlockingLegacyGlobalHide = kitShowPrice && settings.hideAllPrices;

    if (unlockingLegacyGlobalHide) {
      const updatedSettings: StoreSettings = {
        ...settings,
        hideAllPrices: false,
      };
      setFormSettings(updatedSettings);
      onSaveSettings(updatedSettings);
      onSaveProducts(products.map((p) => ({ ...p, showPrice: false })));
    }

    if (editingKit) {
      const updated = kits.map((k) => {
        if (k.id === editingKit.id) {
          return {
            ...k,
            sku: resolvedKitSku,
            title: kitTitle.trim(),
            badge: kitBadge.trim() || 'KIT LIMPER MT',
            description: kitDesc.trim(),
            imageUrl: kitImage.trim() || GENERATED_IMAGES.prodCasa,
            items: selectedItems,
            promoPrice: promoNum,
            showPrice: kitShowPrice,
            active: kitActive,
          };
        }
        return unlockingLegacyGlobalHide ? { ...k, showPrice: false } : k;
      });
      onSaveKits(updated);
    } else {
      const newKit: PromoKit = {
        id: `kit-${Date.now()}`,
        sku: resolvedKitSku,
        title: kitTitle.trim(),
        badge: kitBadge.trim() || 'KIT LIMPER MT',
        description:
          kitDesc.trim() ||
          selectedItems
            .map((it) => {
              const p = products.find((prod) => prod.id === it.productId);
              return p ? `${it.quantity}x ${p.title}` : '';
            })
            .filter(Boolean)
            .join(' + '),
        imageUrl: kitImage.trim() || GENERATED_IMAGES.prodCasa,
        items: selectedItems,
        promoPrice: promoNum,
        showPrice: kitShowPrice,
        active: kitActive,
      };
      const baseKits = unlockingLegacyGlobalHide
        ? kits.map((k) => ({ ...k, showPrice: false }))
        : kits;
      onSaveKits([newKit, ...baseKits]);
    }
    recordAdminAction({
      category: 'catalog_policy',
      outcome: 'info',
      rawTarget: resolvedKitSku,
      summary: editingKit
        ? `Kit atualizado: ${kitTitle.trim()}`
        : `Novo kit cadastrado: ${kitTitle.trim()}`,
      detail: `SKU ${resolvedKitSku} · ${selectedItems.length} produto(s) · Valor promocional ${formatCurrency(promoNum)}.`,
    });

    setIsKitFormOpen(false);
    setEditingKit(null);
  };

  const handleToggleKitActive = (kit: PromoKit) => {
    onSaveKits(kits.map((k) => (k.id === kit.id ? { ...k, active: !k.active } : k)));
  };

  const handleToggleKitPriceVisibility = (kit: PromoKit) => {
    const currentlyVisible = !settings.hideAllPrices && kit.showPrice !== false;
    const nextShow = !currentlyVisible;

    if (settings.hideAllPrices && nextShow) {
      const updatedSettings: StoreSettings = {
        ...settings,
        hideAllPrices: false,
      };
      setFormSettings(updatedSettings);
      onSaveSettings(updatedSettings);
      onSaveProducts(products.map((p) => ({ ...p, showPrice: false })));
      onSaveKits(
        kits.map((k) => ({
          ...k,
          showPrice: k.id === kit.id ? true : false,
        }))
      );
      return;
    }

    onSaveKits(
      kits.map((k) => (k.id === kit.id ? { ...k, showPrice: nextShow } : k))
    );
  };

  const handleDeleteKit = (kitId: string) => {
    const target = kits.find((k) => k.id === kitId);
    onSaveKits(kits.filter((k) => k.id !== kitId));
    if (target) {
      recordAdminAction({
        category: 'catalog_policy',
        outcome: 'info',
        rawTarget: target.title,
        summary: `Kit removido: ${target.title}`,
        detail: 'Combo promocional excluído da vitrine.',
      });
    }
  };

  // Banner & Promotional Campaign Handlers
  const openCreateBanner = () => {
    setEditingBanner(null);
    setBannerSlot('hero_carousel');
    setBannerBadge('NOVA CAMPANHA · LIMPER MT');
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerCtaText('Aproveitar Ofertas');
    setBannerTheme('yellow_red');
    setBannerImage(GENERATED_IMAGES.prodLavanderia);
    setBannerImageUploadStatus(null);
    setBannerFormError(null);
    setBannerCategoryId(categories[0]?.id || 'cat-casa');
    setBannerFeaturedProductIds(
      products
        .filter((p) => p.status === 'active')
        .slice(0, 2)
        .map((p) => p.id)
    );
    setBannerProductSearch('');
    setBannerActive(true);
    setIsBannerFormOpen(true);
  };

  const openEditBanner = (banner: PromoBanner) => {
    setEditingBanner(banner);
    setBannerSlot(banner.slot);
    setBannerBadge(banner.badge);
    setBannerTitle(banner.title);
    setBannerSubtitle(banner.subtitle);
    setBannerCtaText(banner.ctaText);
    setBannerTheme(banner.theme);
    setBannerImage(banner.imageUrl);
    setBannerImageUploadStatus(null);
    setBannerFormError(null);
    setBannerCategoryId(banner.linkedCategoryId || '');
    setBannerFeaturedProductIds(banner.featuredProductIds);
    setBannerProductSearch('');
    setBannerActive(banner.active);
    setIsBannerFormOpen(true);
  };

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = await optimizeUploadedImage(file, {
      maxWidth: 1440,
      maxHeight: 900,
      quality: 0.84,
      maxSizeMb: 5,
    });
    if (!result.ok) {
      setBannerImageUploadStatus(result.error);
      return;
    }
    setBannerImage(result.dataUrl);
    setBannerImageUploadStatus(
      result.wasCompressed
        ? `Banner "${file.name}" otimizado (${result.originalKb} KB → ${result.optimizedKb} KB)!`
        : `Banner "${file.name}" (${result.optimizedKb} KB) carregado!`
    );
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    setBannerFormError(null);
    if (!onSaveBanners) return;
    const bannerValidation = validateBannerDraft({ title: bannerTitle });
    if (!bannerValidation.valid) {
      setBannerFormError(bannerValidation.error || 'Confira os campos do banner.');
      return;
    }

    if (editingBanner) {
      const updated = banners.map((b) =>
        b.id === editingBanner.id
          ? {
              ...b,
              slot: bannerSlot,
              badge: bannerBadge.trim() || 'OFERTA LIMPER MT',
              title: bannerTitle.trim(),
              subtitle: bannerSubtitle.trim(),
              ctaText: bannerCtaText.trim() || 'Ver Ofertas',
              theme: bannerTheme,
              imageUrl: bannerImage.trim() || GENERATED_IMAGES.prodLavanderia,
              linkedCategoryId: bannerCategoryId || undefined,
              featuredProductIds: bannerFeaturedProductIds,
              active: bannerActive,
            }
          : b
      );
      onSaveBanners(updated);
    } else {
      const newBanner: PromoBanner = {
        id: `banner-${Date.now()}`,
        slot: bannerSlot,
        badge: bannerBadge.trim() || 'OFERTA LIMPER MT',
        title: bannerTitle.trim(),
        subtitle:
          bannerSubtitle.trim() ||
          'Ofertas exclusivas na linha de limpeza profissional Quimiprol.',
        ctaText: bannerCtaText.trim() || 'Ver Ofertas',
        theme: bannerTheme,
        imageUrl: bannerImage.trim() || GENERATED_IMAGES.prodLavanderia,
        linkedCategoryId: bannerCategoryId || undefined,
        featuredProductIds: bannerFeaturedProductIds,
        active: bannerActive,
        order: banners.length + 1,
      };
      onSaveBanners([...banners, newBanner]);
    }
    recordAdminAction({
      category: 'catalog_policy',
      outcome: 'info',
      rawTarget: bannerTitle.trim(),
      summary: editingBanner
        ? `Banner atualizado: ${bannerTitle.trim()}`
        : `Novo banner cadastrado: ${bannerTitle.trim()}`,
      detail: `Slot: ${bannerSlot} · Status: ${bannerActive ? 'Ativo' : 'Pausado'}.`,
    });

    setIsBannerFormOpen(false);
    setEditingBanner(null);
  };

  const handleToggleBannerActive = (banner: PromoBanner) => {
    if (!onSaveBanners) return;
    onSaveBanners(
      banners.map((b) => (b.id === banner.id ? { ...b, active: !b.active } : b))
    );
  };

  const handleDeleteBanner = (bannerId: string) => {
    if (!onSaveBanners) return;
    const target = banners.find((b) => b.id === bannerId);
    onSaveBanners(banners.filter((b) => b.id !== bannerId));
    if (target) {
      recordAdminAction({
        category: 'catalog_policy',
        outcome: 'info',
        rawTarget: target.title,
        summary: `Banner removido: ${target.title}`,
        detail: `Campanha removida do slot ${target.slot}.`,
      });
    }
  };

  const handleReorderBanner = (bannerId: string, dir: 'up' | 'down') => {
    if (!onSaveBanners) return;
    const sorted = [...banners].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((b) => b.id === bannerId);
    if (idx === -1) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const temp = sorted[idx];
    sorted[idx] = sorted[swapIdx];
    sorted[swapIdx] = temp;
    onSaveBanners(sorted.map((b, i) => ({ ...b, order: i + 1 })));
  };

  // Coupon Handlers ("Cadastrar Cupom na ADM")
  const openCreateCoupon = () => {
    setEditingCoupon(null);
    setCouponCode('');
    setCouponDesc('');
    setCouponType('percent');
    setCouponValue('10');
    setCouponMinOrder('0');
    setCouponActive(true);
    setCouponFormError(null);
    setIsCouponFormOpen(true);
  };

  const openEditCoupon = (cp: PromoCoupon) => {
    setEditingCoupon(cp);
    setCouponCode(cp.code);
    setCouponDesc(cp.description);
    setCouponType(cp.discountType);
    setCouponValue(String(cp.discountValue));
    setCouponMinOrder(String(cp.minOrderValue || 0));
    setCouponActive(cp.active);
    setCouponFormError(null);
    setIsCouponFormOpen(true);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponFormError(null);
    if (!onSaveCoupons) return;

    const cleanCode = couponCode.trim().toUpperCase().replace(/\s+/g, '');
    const valNum = Number(couponValue.replace(',', '.'));
    const minNum = couponMinOrder.trim()
      ? Number(couponMinOrder.replace(',', '.'))
      : 0;

    const validation = validateCouponDraft(
      {
        code: cleanCode,
        discountType: couponType,
        discountValue: valNum,
        minOrderValue: minNum,
      },
      coupons,
      editingCoupon?.id || null
    );
    if (!validation.valid) {
      setCouponFormError(validation.error || 'Verifique os dados do cupom.');
      return;
    }

    if (editingCoupon) {
      const updated = coupons.map((c) =>
        c.id === editingCoupon.id
          ? {
              ...c,
              code: cleanCode,
              description:
                couponDesc.trim() ||
                (couponType === 'percent'
                  ? `${valNum}% OFF Especial Limper MT`
                  : `${formatCurrency(valNum)} OFF Limper MT`),
              discountType: couponType,
              discountValue: valNum,
              minOrderValue: minNum,
              active: couponActive,
            }
          : c
      );
      onSaveCoupons(updated);
    } else {
      const newCoupon: PromoCoupon = {
        id: `cp-${Date.now()}`,
        code: cleanCode,
        description:
          couponDesc.trim() ||
          (couponType === 'percent'
            ? `${valNum}% OFF Especial Limper MT`
            : `${formatCurrency(valNum)} OFF Limper MT`),
        discountType: couponType,
        discountValue: valNum,
        minOrderValue: minNum,
        active: couponActive,
      };
      onSaveCoupons([newCoupon, ...coupons]);
    }
    recordAdminAction({
      category: 'catalog_policy',
      outcome: 'info',
      rawTarget: cleanCode,
      summary: editingCoupon
        ? `Cupom atualizado: ${cleanCode}`
        : `Novo cupom cadastrado: ${cleanCode}`,
      detail: `Desconto: ${couponType === 'percent' ? `${valNum}%` : formatCurrency(valNum)} · Mínimo: ${formatCurrency(minNum)}.`,
    });

    setIsCouponFormOpen(false);
    setEditingCoupon(null);
  };

  const handleToggleCouponActive = (cp: PromoCoupon) => {
    if (!onSaveCoupons) return;
    onSaveCoupons(
      coupons.map((c) => (c.id === cp.id ? { ...c, active: !c.active } : c))
    );
  };

  const handleDeleteCoupon = (cpId: string) => {
    if (!onSaveCoupons) return;
    const target = coupons.find((c) => c.id === cpId);
    onSaveCoupons(coupons.filter((c) => c.id !== cpId));
    if (target) {
      recordAdminAction({
        category: 'catalog_policy',
        outcome: 'info',
        rawTarget: target.code,
        summary: `Cupom removido: ${target.code}`,
        detail: 'Cupom promocional excluído da loja.',
      });
    }
  };

  // Categories Handlers
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryFormError(null);
    setCategoryFeedback(null);

    const validation = validateCategoryDraft(
      { name: catName },
      categories,
      editingCategory?.id || null
    );
    if (!validation.valid) {
      setCategoryFormError(validation.error || 'Confira o nome da categoria.');
      return;
    }

    if (editingCategory) {
      const updated = categories.map((c) =>
        c.id === editingCategory.id
          ? {
              ...c,
              name: catName.trim(),
              shortName: catShortName.trim() || catName.trim(),
              description: catDesc.trim(),
              icon: catIcon,
            }
          : c
      );
      onSaveCategories(updated);
      setEditingCategory(null);
      setCategoryFeedback(`Categoria "${catName.trim()}" atualizada com sucesso.`);
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: catName.trim(),
        shortName: catShortName.trim() || catName.trim(),
        description: catDesc.trim() || 'Linha de produtos Limper MT',
        icon: catIcon,
        order: categories.length + 1,
      };
      onSaveCategories([...categories, newCat]);
      setCategoryFeedback(`Nova categoria "${catName.trim()}" adicionada à vitrine.`);
    }
    recordAdminAction({
      category: 'catalog_policy',
      outcome: 'info',
      rawTarget: catName.trim(),
      summary: editingCategory
        ? `Categoria atualizada: ${catName.trim()}`
        : `Nova categoria criada: ${catName.trim()}`,
      detail: 'Estrutura de categorias da vitrine atualizada.',
    });

    setCatName('');
    setCatShortName('');
    setCatDesc('');
    setCatIcon('Sparkles');
  };

  const handleReorderCategory = (catId: string, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === catId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const temp = sorted[idx];
    sorted[idx] = sorted[swapIdx];
    sorted[swapIdx] = temp;

    const renumbered = sorted.map((c, i) => ({ ...c, order: i + 1 }));
    onSaveCategories(renumbered);
  };

  const handleDeleteCategory = (catId: string) => {
    setCategoryFormError(null);
    setCategoryFeedback(null);
    const target = categories.find((c) => c.id === catId);
    const remaining = categories.filter((c) => c.id !== catId);
    if (remaining.length === 0) {
      setCategoryFormError(
        'O catálogo precisa manter pelo menos 1 categoria ativa.'
      );
      return;
    }

    const fallbackCat = remaining[0];
    const affectedCount = products.filter((p) => p.categoryId === catId).length;
    if (affectedCount > 0) {
      onSaveProducts(
        products.map((p) =>
          p.categoryId === catId ? { ...p, categoryId: fallbackCat.id } : p
        )
      );
    }

    onSaveCategories(remaining);
    if (editingCategory?.id === catId) {
      setEditingCategory(null);
      setCatName('');
      setCatShortName('');
      setCatDesc('');
    }
    if (target) {
      recordAdminAction({
        category: 'catalog_policy',
        outcome: 'info',
        rawTarget: target.name,
        summary: `Categoria removida: ${target.name}`,
        detail:
          affectedCount > 0
            ? `${affectedCount} produto(s) vinculado(s) realocado(s) automaticamente para "${fallbackCat.name}".`
            : 'Linha removida da organização do catálogo.',
      });
      setCategoryFeedback(
        affectedCount > 0
          ? `Categoria "${target.name}" removida. ${affectedCount} produto(s) realocado(s) para "${fallbackCat.name}" sem perda de dados.`
          : `Categoria "${target.name}" removida.`
      );
    }
  };

  const handleAutoRepairCatalog = (): string[] => {
    const repair = autoRepairCatalogIntegrity({
      categories,
      products,
      kits,
      coupons,
      banners,
    });
    if (repair.fixesApplied.length > 0) {
      onSaveProducts(repair.products);
      onSaveKits(repair.kits);
      onSaveCoupons?.(repair.coupons);
      onSaveBanners?.(repair.banners);
      recordAdminAction({
        category: 'catalog_policy',
        outcome: 'allowed',
        rawTarget: `${repair.fixesApplied.length} ajuste(s)`,
        summary: 'Auto-correção de integridade dos cadastros executada',
        detail: repair.fixesApplied.join(' · '),
      });
    }
    return repair.fixesApplied;
  };

  // Settings Handlers
  const handleUpdateWhatsAppSettings = (nextSettings: StoreSettings) => {
    setFormSettings(nextSettings);
    onSaveSettings(nextSettings);
  };

  const handleSaveSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsFormError(null);
    const normalizedWa =
      normalizeStoreWhatsAppNumber(formSettings.whatsappNumber) ||
      formSettings.whatsappNumber;
    const normalizedFormSettings: StoreSettings = {
      ...formSettings,
      whatsappNumber: normalizedWa,
      whatsappDisplay:
        formatStoreWhatsAppDisplay(normalizedWa) || formSettings.whatsappDisplay,
    };
    const validation = validateStoreSettingsDraft(normalizedFormSettings);
    if (!validation.valid) {
      setSettingsFormError(validation.error || 'Confira os valores numéricos de frete e logística.');
      return;
    }
    setFormSettings(normalizedFormSettings);
    onSaveSettings(normalizedFormSettings);
    recordAdminAction({
      category: 'catalog_policy',
      outcome: 'info',
      rawTarget: normalizedFormSettings.storeName || 'Limper MT',
      summary: 'Configurações de WhatsApp, Loja, PIX & Frete atualizadas',
      detail: `Parâmetros operacionais, WhatsApp (${normalizedFormSettings.whatsappDisplay}) e logística salvos no painel.`,
    });
    setSavedSettingsBanner(true);
    setTimeout(() => setSavedSettingsBanner(false), 3000);
  };

  const handleAddNeighborhood = () => {
    setSettingsFormError(null);
    const cleanName = newNeighborhoodName.trim();
    if (!cleanName) return;
    const fee = Math.max(0, Number(newNeighborhoodFee.replace(',', '.')) || 0);
    const alreadyExists = formSettings.neighborhoodFees.some(
      (n) =>
        n.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        n.city === newNeighborhoodCity
    );
    if (alreadyExists) {
      setSettingsFormError(
        `O bairro "${cleanName}" (${newNeighborhoodCity}) já está cadastrado na tabela de frete.`
      );
      return;
    }
    const updated: StoreSettings = {
      ...formSettings,
      neighborhoodFees: [
        ...formSettings.neighborhoodFees,
        {
          id: `nb-${Date.now()}`,
          name: cleanName,
          city: newNeighborhoodCity,
          fee,
        },
      ],
    };
    setFormSettings(updated);
    onSaveSettings(updated);
    setNewNeighborhoodName('');
  };

  const handleRemoveNeighborhood = (id: string) => {
    const updated: StoreSettings = {
      ...formSettings,
      neighborhoodFees: formSettings.neighborhoodFees.filter((n) => n.id !== id),
    };
    setFormSettings(updated);
    onSaveSettings(updated);
  };

  // KPI Metrics Calculation
  const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
  const activeOrdersCount = orders.filter((o) => o.status !== 'completed').length;
  const activeProductsCount = products.filter((p) => p.status === 'active').length;
  const visiblePriceCount = products.filter((p) => isProductPriceVisible(p, settings)).length;

  // Filtered Admin Products
  const filteredAdminProducts = products.filter((p) => {
    const matchesCat = adminCategoryFilter === 'all' || p.categoryId === adminCategoryFilter;
    const isVisible = isProductPriceVisible(p, settings);
    const matchesPriceFilter =
      adminPriceFilter === 'all' ||
      (adminPriceFilter === 'visible' ? isVisible : !isVisible);
    const matchesStatus =
      adminStatusFilter === 'all' || p.status === adminStatusFilter;
    const q = adminProductSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q);
    return matchesCat && matchesPriceFilter && matchesStatus && matchesSearch;
  });

  const paginatedAdminProducts = paginateItems(
    filteredAdminProducts,
    adminProductPage,
    ADMIN_PRODUCTS_PAGE_SIZE
  );

  useEffect(() => {
    setAdminProductPage(1);
  }, [adminProductSearch, adminCategoryFilter, adminPriceFilter, adminStatusFilter]);

  useEffect(() => {
    if (adminProductPage !== paginatedAdminProducts.safePage) {
      setAdminProductPage(paginatedAdminProducts.safePage);
    }
  }, [adminProductPage, paginatedAdminProducts.safePage]);

  const currentPageProducts = paginatedAdminProducts.pageItems;

  const allFilteredSelected =
    filteredAdminProducts.length > 0 &&
    filteredAdminProducts.every((p) => selectedProductIds.includes(p.id));

  const allCurrentPageSelected =
    currentPageProducts.length > 0 &&
    currentPageProducts.every((p) => selectedProductIds.includes(p.id));

  const handleToggleSelectCurrentPage = () => {
    if (allCurrentPageSelected) {
      const pageSet = new Set(currentPageProducts.map((p) => p.id));
      setSelectedProductIds((prev) => prev.filter((id) => !pageSet.has(id)));
    } else {
      setSelectedProductIds((prev) => {
        const merged = new Set(prev);
        currentPageProducts.forEach((p) => merged.add(p.id));
        return Array.from(merged);
      });
    }
  };

  const handleToggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredAdminProducts.map((p) => p.id));
      setSelectedProductIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      setSelectedProductIds((prev) => {
        const merged = new Set(prev);
        filteredAdminProducts.forEach((p) => merged.add(p.id));
        return Array.from(merged);
      });
    }
  };

  // Aggregated Customers for CRM Tab
  const customerMap = new Map<
    string,
    {
      name: string;
      phone: string;
      ordersCount: number;
      totalSpent: number;
      lastOrderId: string;
      lastDeliveryType: 'delivery' | 'pickup';
    }
  >();

  orders.forEach((o) => {
    const key = normalizePhone(o.customerPhone) || o.customerName;
    const existing = customerMap.get(key);
    if (existing) {
      existing.ordersCount += 1;
      existing.totalSpent += o.total;
    } else {
      customerMap.set(key, {
        name: o.customerName,
        phone: o.customerPhone,
        ordersCount: 1,
        totalSpent: o.total,
        lastOrderId: o.id,
        lastDeliveryType: o.deliveryType,
      });
    }
  });
  const customersList = Array.from(customerMap.values());

  if (!isAuthenticated) {
    return (
      <div className="admin-workspace min-h-screen flex flex-col bg-[#F4F5F7]">
        {/* Minimal Clean Top Bar on Admin Login (Logo + Back to Store only) */}
        <header className="h-14 bg-white border-b border-zinc-200 px-4 sm:px-8 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToStore}
            title="Voltar para a Vitrine Limper MT"
            className="group inline-flex items-center gap-2 rounded-xl p-1 -ml-1 hover:bg-amber-50/70 transition-colors cursor-pointer"
          >
            <img
              src={LIMPER_LOGO_URL}
              alt="Limper MT"
              className="h-7 w-auto object-contain"
            />
            <span className="font-display text-[10px] font-extrabold uppercase tracking-wider text-zinc-950 bg-[#FFBE00] group-hover:bg-[#E3262E] group-hover:text-white px-1.5 py-0.5 rounded-md transition-colors">
              MT
            </span>
            <span className="hidden sm:inline-block h-4 w-px bg-zinc-200 ml-0.5" aria-hidden="true" />
            <span className="hidden sm:inline-block font-display text-xs font-bold text-zinc-600">
              Área Administrativa
            </span>
          </button>

          <button
            type="button"
            onClick={onBackToStore}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-800 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#E3262E]" />
            <span>Voltar à Loja</span>
          </button>
        </header>

        <section className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-[400px] bg-white rounded-2xl border border-zinc-200 p-6 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-1.5">
                <img
                  src={LIMPER_LOGO_URL}
                  alt="Limper MT"
                  className="h-7 w-auto object-contain"
                />
                <span className="font-display text-[10px] font-extrabold uppercase tracking-wider text-zinc-950 bg-[#FFBE00] px-1.5 py-0.5 rounded-md">
                  MT
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#FFBE00] text-zinc-950 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <h1 className="font-display text-xl font-extrabold text-zinc-900 mb-1">
              App Gestor Limper MT
            </h1>
            <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
              Central de separação 15min, catálogo Quimiprol e gestão operacional — Av. Couto Magalhães, 2820.
            </p>

            {loginError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label
                  htmlFor="admin-user"
                  className="block text-xs font-bold text-zinc-700 mb-1"
                >
                  Usuário Lojista
                </label>
                <input
                  id="admin-user"
                  type="text"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm font-mono text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-pass"
                  className="block text-xs font-bold text-zinc-700 mb-1"
                >
                  Senha de Acesso
                </label>
                <input
                  id="admin-pass"
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm font-mono text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-sm rounded-xl cursor-pointer shadow-2xs transition-colors"
              >
                Entrar no Painel Lojista
              </button>
            </form>

            <div className="mt-4 pt-3.5 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Acesso restrito à equipe</span>
              <button
                type="button"
                onClick={onBackToStore}
                className="font-bold text-zinc-900 hover:text-[#E3262E] hover:underline cursor-pointer"
              >
                Voltar à Loja
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const allNavItems: {
    id: AdminAppTab;
    label: string;
    shortLabel: string;
    badge?: string | number;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'kanban',
      label: 'Kanban de Separação',
      shortLabel: 'Kanban',
      badge: activeOrdersCount,
      icon: FolderKanban,
    },
    {
      id: 'sales_summary',
      label: 'Resumo de Vendas',
      shortLabel: 'Resumo',
      icon: BarChart3,
    },
    {
      id: 'products',
      label: 'Produtos & Fotos',
      shortLabel: 'Produtos',
      badge: products.length,
      icon: Package,
    },
    {
      id: 'seller_area',
      label: 'Área do Vendedor',
      shortLabel: 'Vendedor',
      badge: sellerQuotes.length > 0 ? sellerQuotes.length : undefined,
      icon: Briefcase,
    },
    {
      id: 'kits',
      label: 'Kits & Combos',
      shortLabel: 'Kits',
      badge: kits.length,
      icon: Gift,
    },
    {
      id: 'banners',
      label: 'Banners & Promoções',
      shortLabel: 'Banners',
      badge: banners.length,
      icon: Megaphone,
    },
    {
      id: 'coupons',
      label: 'Cupons de Desconto',
      shortLabel: 'Cupons',
      badge: coupons.filter((c) => c.active).length,
      icon: TicketPercent,
    },
    {
      id: 'categories',
      label: 'Categorias Quimiprol',
      shortLabel: 'Categorias',
      badge: categories.length,
      icon: Layers,
    },
    {
      id: 'customers',
      label: 'Clientes & Recompra',
      shortLabel: 'Clientes',
      badge: customersList.length,
      icon: Users,
    },
    {
      id: 'users',
      label: 'Usuários & Acessos',
      shortLabel: 'Usuários',
      badge: effectiveAdminUsers.length,
      icon: UserCog,
    },
    {
      id: 'security',
      label: 'Acesso & Segurança',
      shortLabel: 'Segurança',
      badge:
        securityLogs.filter((l) => l.outcome === 'blocked').length > 0
          ? securityLogs.filter((l) => l.outcome === 'blocked').length
          : securityLogs.length || undefined,
      icon: ShieldCheck,
    },
    {
      id: 'settings',
      label: 'WhatsApp, Loja & Frete',
      shortLabel: 'WhatsApp & Loja',
      icon: Settings,
    },
  ];

  const navItems = allNavItems.filter((item) =>
    canAdminUserAccessTab(currentAdminUser, item.id)
  );
  const activeNavItem = navItems.find((item) => item.id === activeTab) || navItems[0];
  const dashboardDateTime = formatAdminDashboardDateTime(nowClock);
  const currentRoleMeta = currentAdminUser
    ? ADMIN_ROLE_META[currentAdminUser.role]
    : ADMIN_ROLE_META.master;

  return (
    <div className="admin-workspace min-h-screen flex flex-col bg-[#F4F5F7] text-zinc-900">
      {/* Clean Dedicated Admin Top Bar (Logo + Sidebar Toggle + Active Workspace Title + User Identity + Ver Loja & Sair) */}
      <header className="sticky top-0 z-30 h-14 bg-white border-b border-zinc-200 px-4 sm:px-6 lg:px-8 no-print">
        <div className="max-w-[1640px] mx-auto h-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Abrir menu administrativo"
              className="md:hidden w-9 h-9 rounded-lg border border-zinc-200 bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-800 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              aria-label={isSidebarCollapsed ? 'Maximizar menu lateral' : 'Minimizar menu lateral'}
              aria-expanded={!isSidebarCollapsed}
              title={isSidebarCollapsed ? 'Maximizar menu lateral' : 'Minimizar menu lateral'}
              className="hidden md:inline-flex h-9 px-2.5 rounded-lg border border-zinc-200 bg-[#FAFAFA] hover:bg-[#FFFBEB] hover:border-[#FFBE00] text-zinc-700 hover:text-zinc-950 items-center justify-center gap-1.5 shrink-0 cursor-pointer text-xs font-bold transition-colors whitespace-nowrap"
            >
              {isSidebarCollapsed ? (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-[#E3262E]" />
                  <span className="hidden lg:inline">Maximizar menu</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 text-zinc-600" />
                  <span className="hidden lg:inline">Minimizar menu</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (navItems[0]) setActiveTab(navItems[0].id);
              }}
              title="Limper MT · Gestor Lojista"
              className="group inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-lg px-1.5 py-1 hover:bg-amber-50/70 transition-colors"
            >
              <img
                src={LIMPER_LOGO_URL}
                alt="Limper MT"
                className="h-7 w-auto object-contain"
              />
              <span className="font-display text-[10px] font-extrabold uppercase tracking-wider text-zinc-950 bg-[#FFBE00] group-hover:bg-[#E3262E] group-hover:text-white px-1.5 py-0.5 rounded-md transition-colors">
                MT
              </span>
            </button>

            <span className="hidden sm:inline-block h-4 w-px bg-zinc-200 shrink-0" aria-hidden="true" />
            <div className="hidden sm:flex items-center gap-2 min-w-0 text-xs">
              <span className="font-display font-extrabold text-zinc-900 whitespace-nowrap">
                Gestor Lojista
              </span>
              <span className="text-zinc-300 shrink-0" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-zinc-600 truncate">
                {activeNavItem?.label || 'Painel'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              aria-label="Abrir busca rápida e comandos (Ctrl+K)"
              title="Busca rápida de produtos, pedidos e ações (Ctrl+K)"
              className="inline-flex items-center gap-2 h-9 px-2.5 sm:px-3 rounded-lg border border-zinc-200 bg-[#FAFAFA] hover:bg-[#FFFBEB] hover:border-[#FFBE00] text-zinc-600 hover:text-zinc-950 text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5 text-[#E3262E]" />
              <span className="hidden md:inline">Busca rápida</span>
              <span className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-zinc-200 font-mono text-[10px] font-extrabold text-zinc-500">
                <Command className="w-2.5 h-2.5" />K
              </span>
            </button>

            {currentAdminUser && (
              <div
                className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#FAFAFA] border border-zinc-200"
                title={`Logado como ${currentAdminUser.name} (@${currentAdminUser.username}) · ${currentRoleMeta.label}`}
              >
                <AdminUserAvatar
                  name={currentAdminUser.name}
                  avatarUrl={currentAdminUser.avatarUrl}
                  sizeClass="w-7 h-7"
                  textClass="text-[10px]"
                  isMaster={currentAdminUser.role === 'master'}
                />
                <div className="leading-tight pr-0.5">
                  <div className="text-xs font-extrabold text-zinc-900 max-w-[140px] truncate">
                    {currentAdminUser.name}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                    <span>{currentRoleMeta.shortLabel}</span>
                    <span>·</span>
                    <span className="tabular-nums">{dashboardDateTime.timeShort}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onBackToStore}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#E3262E]" />
              <span>Ver Loja</span>
            </button>

            <button
              type="button"
              onClick={handleLogoutAdmin}
              aria-label="Sair do Painel Lojista"
              className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Responsive Horizontal Quick-Nav Strip for Mobile (< md) */}
      <nav
        aria-label="Navegação Rápida Lojista"
        className="md:hidden sticky top-14 z-20 bg-white/95 backdrop-blur-xs border-b border-zinc-200 px-3 sm:px-6 py-2 overflow-x-auto no-scrollbar no-print"
      >
        <div className="flex items-center gap-1.5 min-w-max">
          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={`mobile-tab-${item.id}`}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#FFBE00] text-zinc-950 font-extrabold shadow-2xs'
                    : 'bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
                }`}
              >
                <IconComp
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-zinc-950' : 'text-[#E3262E]'
                  }`}
                />
                <span>{item.shortLabel}</span>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded font-mono text-[11px] font-extrabold tabular-nums ${
                      isActive
                        ? 'bg-zinc-950 text-[#FFBE00]'
                        : 'bg-zinc-200/80 text-zinc-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Slide-Over Navigation Drawer on Mobile (< md) */}
      {isMobileNavOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu do Painel Lojista"
          className="fixed inset-0 z-50 md:hidden flex no-print"
        >
          <div
            className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <aside className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col p-5 overflow-y-auto z-10">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <img
                  src={LIMPER_LOGO_URL}
                  alt="Limper MT"
                  className="h-7 w-auto object-contain"
                />
                <span className="font-display text-[10px] font-extrabold uppercase tracking-wider text-zinc-950 bg-[#FFBE00] px-1.5 py-0.5 rounded-md">
                  MT
                </span>
                <span className="font-display text-sm font-extrabold text-zinc-900 ml-0.5">
                  Gestor
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                aria-label="Fechar menu administrativo"
                className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {currentAdminUser && (
              <div className="mb-4 p-3 rounded-xl bg-[#FAFAFA] border border-zinc-200 flex items-center gap-3">
                <AdminUserAvatar
                  name={currentAdminUser.name}
                  avatarUrl={currentAdminUser.avatarUrl}
                  sizeClass="w-10 h-10"
                  textClass="text-xs"
                  isMaster={currentAdminUser.role === 'master'}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-zinc-900 truncate">
                    {currentAdminUser.name}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500 truncate">
                    @{currentAdminUser.username} · {currentRoleMeta.shortLabel}
                  </div>
                </div>
              </div>
            )}

            <nav className="space-y-1.5 flex-1">
              {navItems.map((item) => {
                const IconComp = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={`drawer-tab-${item.id}`}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#FFBE00] text-zinc-950 font-extrabold'
                        : 'text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComp
                        className={`w-5 h-5 ${
                          isActive ? 'text-zinc-950' : 'text-[#E3262E]'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono text-xs font-extrabold tabular-nums ${
                          isActive
                            ? 'bg-zinc-950 text-[#FFBE00]'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 mt-4 border-t border-zinc-200 space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-1.5 text-sm">
                <div className="font-extrabold text-zinc-900">
                  Unidade Várzea Grande - MT
                </div>
                <p className="text-zinc-600 text-xs leading-relaxed">
                  {settings.storeAddress}
                </p>
                <div className="font-mono font-bold text-zinc-900 text-xs">
                  {settings.whatsappDisplay}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onBackToStore}
                  className="py-2.5 px-3 rounded-xl border border-zinc-300 text-zinc-800 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ver Loja</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogoutAdmin}
                  className="py-2.5 px-3 rounded-xl bg-zinc-950 text-[#FFBE00] font-extrabold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <section className="max-w-[1640px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex-1">
        {/* Refined SaaS Workspace Shell (Collapsible Sidebar on Tablet/Desktop md+ + Fluid Main Area) */}
        <div className="flex flex-col md:flex-row gap-4 lg:gap-5 items-start">
          {/* Collapsible Navigation Sidebar (Expanded 224-256px or Minimized 68px Icon Rail) */}
          <aside
            aria-label="Barra lateral administrativa"
            className={`hidden md:flex md:flex-col shrink-0 bg-white rounded-2xl border border-zinc-200/90 shadow-2xs sticky top-18 no-print transition-[width,padding] duration-200 ease-out ${
              isSidebarCollapsed
                ? 'w-[68px] p-2 space-y-3 items-center'
                : 'w-[224px] lg:w-[248px] xl:w-[256px] p-3 space-y-3.5'
            }`}
          >
            {/* Sidebar Top Control Header */}
            <div
              className={`w-full flex items-center pb-2 border-b border-zinc-100 ${
                isSidebarCollapsed ? 'justify-center' : 'justify-between px-1'
              }`}
            >
              {!isSidebarCollapsed && (
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-zinc-400">
                  Menu Gestor
                </span>
              )}
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                aria-label={
                  isSidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'
                }
                title={
                  isSidebarCollapsed ? 'Maximizar menu lateral' : 'Minimizar menu lateral'
                }
                className={`inline-flex items-center gap-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  isSidebarCollapsed
                    ? 'w-10 h-9 justify-center bg-[#FFFBEB] border border-[#FDE68A] text-zinc-900 hover:bg-[#FFBE00]'
                    : 'px-2 py-1 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-[#E3262E]" />
                ) : (
                  <>
                    <PanelLeftClose className="w-3.5 h-3.5" />
                    <span>Minimizar</span>
                  </>
                )}
              </button>
            </div>

            {/* Navigation Menu */}
            <nav
              className={`w-full space-y-1 ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}
              aria-label="Menu do Aplicativo Lojista"
            >
              {navItems.map((item) => {
                const IconComp = item.icon;
                const isActive = activeTab === item.id;
                const numericBadge =
                  item.badge !== undefined ? Number(item.badge) : undefined;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    title={
                      isSidebarCollapsed
                        ? `${item.label}${item.badge !== undefined ? ` (${item.badge})` : ''}`
                        : undefined
                    }
                    className={`group relative flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSidebarCollapsed
                        ? 'w-11 h-11 justify-center p-0'
                        : 'w-full justify-between gap-2 px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-[#FFBE00] text-zinc-950 font-extrabold shadow-2xs'
                        : 'text-zinc-700 hover:bg-[#FAFAFA] hover:text-zinc-950'
                    }`}
                  >
                    <div
                      className={`flex items-center min-w-0 ${
                        isSidebarCollapsed ? 'justify-center' : 'gap-2.5'
                      }`}
                    >
                      <IconComp
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-zinc-950' : 'text-[#E3262E]'
                        }`}
                      />
                      {!isSidebarCollapsed && (
                        <span className="whitespace-nowrap truncate">{item.label}</span>
                      )}
                    </div>

                    {!isSidebarCollapsed && item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] font-extrabold tabular-nums shrink-0 ${
                          isActive
                            ? 'bg-zinc-950 text-[#FFBE00]'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Compact Counter Badge & Hover Tooltip in Minimized Rail Mode */}
                    {isSidebarCollapsed &&
                      numericBadge !== undefined &&
                      !Number.isNaN(numericBadge) &&
                      numericBadge > 0 && (
                        <span
                          className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full font-mono text-[9px] font-extrabold tabular-nums flex items-center justify-center border border-white ${
                            isActive
                              ? 'bg-zinc-950 text-[#FFBE00]'
                              : 'bg-[#E3262E] text-white'
                          }`}
                        >
                          {numericBadge > 99 ? '99+' : numericBadge}
                        </span>
                      )}

                    {isSidebarCollapsed && (
                      <span
                        role="tooltip"
                        className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-40 px-2.5 py-1.5 rounded-lg bg-zinc-950 text-white text-xs font-bold whitespace-nowrap shadow-lg flex items-center gap-2"
                      >
                        <span>{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[#FFBE00] font-mono text-[10px] font-extrabold tabular-nums">
                            {item.badge}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Clean Store Unit Info Block inside Sidebar */}
            {isSidebarCollapsed ? (
              <div
                className="pt-2 border-t border-zinc-100 w-full flex justify-center"
                title={`Unidade Várzea Grande - MT · ${settings.storeAddress} · ${settings.whatsappDisplay}`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#E3262E]">
                  <Store className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2 w-full">
                <div className="flex items-center gap-1.5 font-extrabold text-xs text-zinc-900">
                  <Store className="w-3.5 h-3.5 text-[#E3262E] shrink-0" />
                  <span>Unidade Várzea Grande - MT</span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-snug">
                  {settings.storeAddress}
                </p>
                <div className="pt-1.5 border-t border-amber-200/70 space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-mono uppercase font-extrabold text-emerald-800">
                      WhatsApp Orçamentos
                    </span>
                    {settings.activeWhatsAppLabel && (
                      <span className="text-[10px] font-bold text-zinc-500 truncate max-w-[95px]">
                        {settings.activeWhatsAppLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-zinc-900">
                    <Phone className="w-3 h-3 text-[#16A34A] shrink-0" />
                    <span>{settings.whatsappDisplay}</span>
                  </div>
                  {canAdminUserAccessTab(currentAdminUser, 'settings') && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('settings');
                        window.setTimeout(() => {
                          document
                            .getElementById('admin-whatsapp-manager')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 60);
                      }}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-emerald-50 border border-amber-300 hover:border-emerald-400 text-[11px] font-extrabold text-zinc-900 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Trocar WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Main App Content Workspace */}
          <div className="w-full flex-1 min-w-0 space-y-4">
            {/* Personalized Welcome, Logged-in Operator Identity & Live Date/Time Strip */}
            {currentAdminUser && (
              <div
                data-testid="admin-welcome-bar"
                className="bg-white rounded-2xl border border-zinc-200/90 px-4 py-3.5 sm:px-5 sm:py-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5 no-print"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <AdminUserAvatar
                    name={currentAdminUser.name}
                    avatarUrl={currentAdminUser.avatarUrl}
                    sizeClass="w-11 h-11 sm:w-12 sm:h-12"
                    textClass="text-sm"
                    isMaster={currentAdminUser.role === 'master'}
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-sm sm:text-base font-extrabold text-zinc-950 truncate">
                        {dashboardDateTime.greeting}, {currentAdminUser.name}!
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-extrabold shrink-0 ${currentRoleMeta.badgeClass}`}
                      >
                        {currentAdminUser.role === 'master' && (
                          <Crown className="w-3 h-3" />
                        )}
                        {currentRoleMeta.shortLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-zinc-500">
                      <span className="font-mono font-semibold text-zinc-700">
                        @{currentAdminUser.username}
                      </span>
                      {currentAdminUser.jobTitle && (
                        <>
                          <span className="text-zinc-300">·</span>
                          <span className="truncate">{currentAdminUser.jobTitle}</span>
                        </>
                      )}
                      {sessionStartedAt && (
                        <>
                          <span className="hidden sm:inline text-zinc-300">·</span>
                          <span className="hidden sm:inline">
                            Sessão iniciada às{' '}
                            <strong className="font-mono text-zinc-700 tabular-nums">
                              {new Date(sessionStartedAt).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 pt-2.5 md:pt-0 border-t md:border-t-0 border-zinc-100 shrink-0">
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="leading-tight">
                      <div className="font-bold text-zinc-900">
                        {dashboardDateTime.weekday}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {dashboardDateTime.fullDate}
                      </div>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-zinc-200 hidden sm:block" aria-hidden="true" />

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 text-white">
                    <Clock className="w-3.5 h-3.5 text-[#FFBE00] shrink-0" />
                    <span
                      data-testid="admin-live-clock"
                      className="font-mono text-sm sm:text-base font-extrabold text-[#FFBE00] tabular-nums tracking-tight"
                    >
                      {dashboardDateTime.timeWithSeconds}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Executive KPI Summary Strip — visible exclusively on Kanban tab to keep other workspaces spacious */}
            {activeTab === 'kanban' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 no-print">
              <div className="bg-white rounded-xl border border-zinc-200 p-3.5 sm:p-4 flex items-center justify-between gap-2.5 shadow-2xs">
                <div className="min-w-0">
                  <p className="text-[11px] font-mono uppercase text-zinc-500 font-bold tracking-wide">
                    Volume em Pedidos
                  </p>
                  <p className="font-mono text-xl font-extrabold text-zinc-950 tabular-nums mt-0.5">
                    {formatCurrency(totalRevenue)}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                    {orders.length} pedidos registrados
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-zinc-200 p-3.5 sm:p-4 flex items-center justify-between gap-2.5 shadow-2xs">
                <div className="min-w-0">
                  <p className="text-[11px] font-mono uppercase text-zinc-500 font-bold tracking-wide">
                    Fila de Separação
                  </p>
                  <p className="font-mono text-xl font-extrabold text-[#E3262E] tabular-nums mt-0.5">
                    {activeOrdersCount} ativos
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Balcão 15min & Delivery
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 text-[#E3262E] flex items-center justify-center shrink-0">
                  <FolderKanban className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-zinc-200 p-3.5 sm:p-4 flex items-center justify-between gap-2.5 shadow-2xs">
                <div className="min-w-0">
                  <p className="text-[11px] font-mono uppercase text-zinc-500 font-bold tracking-wide">
                    Catálogo Quimiprol
                  </p>
                  <p className="font-mono text-xl font-extrabold text-zinc-950 tabular-nums mt-0.5">
                    {activeProductsCount} / {products.length}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Em {categories.length} linhas oficiais
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-zinc-200 p-3.5 sm:p-4 flex items-center justify-between gap-2.5 shadow-2xs">
                <div className="min-w-0">
                  <p className="text-[11px] font-mono uppercase text-zinc-500 font-bold tracking-wide">
                    Exibição de Preços
                  </p>
                  <p className="font-mono text-base font-extrabold text-zinc-950 mt-0.5 whitespace-nowrap">
                    {visiblePriceCount === 0
                      ? 'Todos Sem Valor'
                      : `${visiblePriceCount} / ${products.length} visíveis`}
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 mt-1">
                    {canAdminUserAccessTab(currentAdminUser, 'products') ? (
                      <>
                        {visiblePriceCount > 0 ? (
                          <button
                            type="button"
                            onClick={handleHideAllProductPrices}
                            className="text-[11px] font-bold text-[#E3262E] hover:underline cursor-pointer"
                          >
                            Ocultar Todos
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleShowAllProductPrices}
                            className="text-[11px] font-bold text-[#B45309] hover:underline cursor-pointer"
                          >
                            Exibir Todos
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveTab('products')}
                          className="text-[11px] font-bold text-zinc-600 hover:text-zinc-950 hover:underline cursor-pointer"
                        >
                          Escolher Itens
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-zinc-500">
                        Modo da vitrine ativa
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[#FFFBEB] border border-[#FFBE00] text-zinc-950 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              </div>
            )}

          {/* TAB: RESUMO DE VENDAS (ÁREA DEDICADA DE GRÁFICOS & PERFORMANCE DO CATÁLOGO) */}
          {activeTab === 'sales_summary' && (
            <AdminSalesSummary
              orders={orders}
              products={products}
              categories={categories}
              deletedProducts={deletedProducts}
              onOpenManualPos={
                canAdminUserAccessTab(currentAdminUser, 'kanban')
                  ? () => {
                      setActiveTab('kanban');
                      setIsManualPosOpen(true);
                    }
                  : undefined
              }
              onGoToKanban={
                canAdminUserAccessTab(currentAdminUser, 'kanban')
                  ? () => setActiveTab('kanban')
                  : undefined
              }
            />
          )}

          {/* TAB 1: KANBAN DE SEPARAÇÃO DE PEDIDOS + REVERSÃO DE ETAPAS + FILTRO DE DATAS E HISTÓRICO */}
          {activeTab === 'kanban' && (() => {
            const filteredKanbanOrders = filterOrdersByCriteria(orders, {
              searchQuery: kanbanSearchQuery,
              datePreset: kanbanDatePreset,
              startDate: kanbanStartDate,
              endDate: kanbanEndDate,
              deliveryType: kanbanDeliveryFilter,
              useLocalDate: true,
            });
            const periodSummary = summarizeOrdersPeriod(filteredKanbanOrders);
            const dateCounts = new Map<string, number>();
            orders.forEach((o) => {
              const key = toDateKeyYmd(o.createdAt, true);
              if (key) {
                dateCounts.set(key, (dateCounts.get(key) || 0) + 1);
              }
            });
            const distinctDates = Array.from(dateCounts.keys()).sort((a, b) =>
              b.localeCompare(a)
            );
            const todayBr = formatBrDateFromYmd(todayLocalYmd);
            const activePeriodLabel = getKanbanPeriodLabel(kanbanDatePreset, {
              startDate: kanbanStartDate,
              endDate: kanbanEndDate,
              todayYmd: todayLocalYmd,
            });
            const pendingOtherDaysCount = orders.filter(
              (o) =>
                toDateKeyYmd(o.createdAt, true) !== todayLocalYmd &&
                o.status !== 'completed'
            ).length;
            const isDefaultTodayView =
              !kanbanSearchQuery.trim() &&
              kanbanDatePreset === 'today' &&
              !kanbanStartDate &&
              !kanbanEndDate &&
              kanbanDeliveryFilter === 'all';

            return (
              <div className="space-y-4 no-print">
                {/* Top Header & Primary Actions */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-extrabold text-zinc-900">
                        Quadro Operacional de Separação & Histórico
                      </h2>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-950 text-[#FFBE00] font-mono text-[11px] font-extrabold inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{activePeriodLabel}</span>
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Abre diariamente em <strong className="text-zinc-800">Hoje ({todayBr})</strong> com reversão de etapas e auditoria de histórico.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsManualPosOpen((prev) => !prev)}
                      className="px-3 py-1.5 bg-[#E3262E] hover:bg-[#C81E25] text-white font-extrabold text-xs rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{isManualPosOpen ? 'Fechar PDV Balcão' : '+ Pedido Balcão / PDV'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportOrdersCsv}
                      className="px-3 py-1.5 bg-[#FAFAFA] hover:bg-zinc-100 border border-zinc-300 text-zinc-800 font-bold text-xs rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>Exportar Pedidos (CSV)</span>
                    </button>

                    {canAdminUserAccessTab(currentAdminUser, 'kits') && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('kits');
                          openCreateKit();
                        }}
                        className="px-3 py-1.5 bg-[#FFFBEB] hover:bg-[#FFBE00]/40 border border-[#FFBE00] text-zinc-950 font-extrabold text-xs rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Gift className="w-3.5 h-3.5 text-[#E3262E]" />
                        <span>+ Cadastrar Kit</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* HUMAN ERROR UNDO BANNER ("Errou a etapa sem querer? Desfaça com 1 clique") */}
                {lastStatusMove && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="bg-[#FFFBEB] border-2 border-[#FFBE00] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 text-xs">
                      <div className="w-8 h-8 rounded-xl bg-[#E3262E] text-white flex items-center justify-center shrink-0">
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-mono text-[10px] uppercase font-extrabold text-[#E3262E] block">
                          PROTEÇÃO CONTRA FALHA HUMANA · ÚLTIMA MOVIMENTAÇÃO
                        </span>
                        <span className="text-zinc-900">
                          Pedido <strong className="font-mono">{lastStatusMove.orderId}</strong> ({lastStatusMove.customerName}) movido de{' '}
                          <strong>{ORDER_STATUS_META[lastStatusMove.fromStatus].shortLabel}</strong> para{' '}
                          <strong className="text-[#E3262E]">
                            {ORDER_STATUS_META[lastStatusMove.toStatus].shortLabel}
                          </strong>.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleUndoLastStatusMove}
                        className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>
                          Desfazer e Voltar p/ {ORDER_STATUS_META[lastStatusMove.fromStatus].shortLabel}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLastStatusMove(null)}
                        aria-label="Ocultar aviso de desfazer"
                        className="p-1.5 rounded-lg text-zinc-500 hover:bg-amber-200/50 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* FILTER & HISTORICAL DATE CONSULTATION BAR */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3.5 shadow-2xs">
                  {/* Row 1: Wide Search + Compact Modality Segmented Control + View Switcher */}
                  <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                    {/* Search Input (generous width so placeholder never truncates) */}
                    <div className="relative flex-1 min-w-[260px]">
                      <Search className="w-4 h-4 text-[#E3262E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={kanbanSearchQuery}
                        onChange={(e) => setKanbanSearchQuery(e.target.value)}
                        placeholder="Buscar por pedido (#LMP), cliente, WhatsApp, senha ou produto..."
                        aria-label="Buscar pedidos no Kanban"
                        className="w-full pl-9 pr-8 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                      />
                      {kanbanSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setKanbanSearchQuery('')}
                          aria-label="Limpar busca do Kanban"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2 shrink-0">
                      {/* Segmented Modality Filter */}
                      <div
                        role="group"
                        aria-label="Filtrar por modalidade"
                        className="inline-flex rounded-xl bg-[#FAFAFA] p-1 border border-zinc-200"
                      >
                        {[
                          { id: 'all' as const, label: 'Todas' },
                          { id: 'pickup' as const, label: '🏪 Retirada' },
                          { id: 'delivery' as const, label: '🚚 Delivery' },
                        ].map((mod) => (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => setKanbanDeliveryFilter(mod.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                              kanbanDeliveryFilter === mod.id
                                ? 'bg-[#FFBE00] text-zinc-950 shadow-2xs'
                                : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                          >
                            {mod.label}
                          </button>
                        ))}
                      </div>

                      {/* View Mode Switcher: Quadro Kanban vs Histórico Cronológico */}
                      <div className="inline-flex rounded-xl bg-[#FAFAFA] p-1 border border-zinc-200">
                        <button
                          type="button"
                          onClick={() => setKanbanViewMode('board')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                            kanbanViewMode === 'board'
                              ? 'bg-zinc-950 text-[#FFBE00] shadow-2xs'
                              : 'text-zinc-600 hover:text-zinc-900'
                          }`}
                        >
                          <FolderKanban className="w-3.5 h-3.5" />
                          <span>Quadro ({filteredKanbanOrders.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setKanbanViewMode('history_table')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                            kanbanViewMode === 'history_table'
                              ? 'bg-zinc-950 text-[#FFBE00] shadow-2xs'
                              : 'text-zinc-600 hover:text-zinc-900'
                          }`}
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Histórico ({filteredKanbanOrders.length})</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Date Presets (Today First) + Custom Date Range + Quick Reset to Today */}
                  <div className="pt-3 border-t border-zinc-100 space-y-2.5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-zinc-800 mr-0.5">
                          <Calendar className="w-3.5 h-3.5 text-[#E3262E]" />
                          <span>Data:</span>
                        </span>
                        {[
                          {
                            id: 'today' as OrderDatePreset,
                            label: todayBr ? `Hoje (${todayBr.slice(0, 5)})` : 'Hoje',
                          },
                          { id: 'yesterday' as OrderDatePreset, label: 'Ontem' },
                          { id: 'last_7_days' as OrderDatePreset, label: '7 Dias' },
                          { id: 'last_30_days' as OrderDatePreset, label: '30 Dias' },
                          { id: 'all' as OrderDatePreset, label: 'Todas' },
                          { id: 'custom' as OrderDatePreset, label: 'Período' },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setKanbanDatePreset(preset.id);
                              if (preset.id !== 'custom') {
                                setKanbanStartDate('');
                                setKanbanEndDate('');
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                              kanbanDatePreset === preset.id
                                ? 'bg-[#E3262E] border-[#E3262E] text-white font-extrabold shadow-2xs'
                                : 'bg-[#FAFAFA] hover:bg-zinc-100 border-zinc-200 text-zinc-700'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom Calendar Date Inputs (De / Até) + Voltar p/ Hoje */}
                      <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
                        <div className="flex items-center gap-1.5">
                          <label
                            htmlFor="kanban-start-date"
                            className="text-[11px] font-bold text-zinc-600"
                          >
                            De:
                          </label>
                          <input
                            id="kanban-start-date"
                            type="date"
                            value={kanbanStartDate}
                            onChange={(e) => {
                              setKanbanDatePreset('custom');
                              setKanbanStartDate(e.target.value);
                            }}
                            className="px-2.5 py-1.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 focus:border-[#FFBE00] focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label
                            htmlFor="kanban-end-date"
                            className="text-[11px] font-bold text-zinc-600"
                          >
                            Até:
                          </label>
                          <input
                            id="kanban-end-date"
                            type="date"
                            value={kanbanEndDate}
                            onChange={(e) => {
                              setKanbanDatePreset('custom');
                              setKanbanEndDate(e.target.value);
                            }}
                            className="px-2.5 py-1.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 focus:border-[#FFBE00] focus:outline-none"
                          />
                        </div>

                        {!isDefaultTodayView && (
                          <button
                            type="button"
                            onClick={() => {
                              setKanbanSearchQuery('');
                              setKanbanDatePreset('today');
                              setKanbanStartDate('');
                              setKanbanEndDate('');
                              setKanbanDeliveryFilter('all');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Voltar p/ Hoje</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Date Chips for Existing Order Dates */}
                    {distinctDates.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-mono font-semibold text-zinc-400 mr-0.5">
                          Datas c/ pedidos:
                        </span>
                        {distinctDates.slice(0, 8).map((ymd) => {
                          const brLabel = formatBrDateFromYmd(ymd);
                          const count = dateCounts.get(ymd) || 0;
                          const isTodayChip = ymd === todayLocalYmd;
                          const isSelectedDate =
                            (kanbanDatePreset === 'custom' &&
                              kanbanStartDate === ymd &&
                              kanbanEndDate === ymd) ||
                            (kanbanDatePreset === 'today' && isTodayChip);
                          return (
                            <button
                              key={`date-chip-${ymd}`}
                              type="button"
                              onClick={() => {
                                if (isTodayChip) {
                                  setKanbanDatePreset('today');
                                  setKanbanStartDate('');
                                  setKanbanEndDate('');
                                } else {
                                  setKanbanDatePreset('custom');
                                  setKanbanStartDate(ymd);
                                  setKanbanEndDate(ymd);
                                }
                              }}
                              className={`px-2 py-1 rounded-lg font-mono text-[10px] font-extrabold border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                                isSelectedDate
                                  ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950'
                                  : 'bg-[#FAFAFA] hover:bg-[#FFFBEB] text-zinc-700 border-zinc-200'
                              }`}
                            >
                              <span>{isTodayChip ? `Hoje (${brLabel.slice(0, 5)})` : brLabel}</span>
                              <span
                                className={`px-1 rounded text-[9px] tabular-nums ${
                                  isSelectedDate
                                    ? 'bg-[#FFBE00]/20 text-[#FFBE00]'
                                    : 'bg-zinc-200/80 text-zinc-600'
                                }`}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Row 3: Clean 4-Card Stacked KPI Strip (no wrapping awkwardness) */}
                  <div className="pt-3 border-t border-zinc-100 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] border border-zinc-200/90 flex flex-col gap-0.5">
                      <span className="text-[11px] font-semibold text-zinc-500 truncate">
                        Pedidos · {activePeriodLabel}
                      </span>
                      <strong className="font-mono text-base font-extrabold text-zinc-950 tabular-nums">
                        {periodSummary.totalOrders} {periodSummary.totalOrders === 1 ? 'pedido' : 'pedidos'}
                      </strong>
                    </div>
                    <div
                      className={`px-3.5 py-2.5 rounded-xl border flex flex-col gap-0.5 ${
                        periodSummary.totalRevenue > 0
                          ? 'bg-[#FFFBEB]/80 border-[#FDE68A]'
                          : 'bg-[#FAFAFA] border-zinc-200/90'
                      }`}
                    >
                      <span className="text-[11px] font-semibold text-zinc-600">
                        Volume no Período
                      </span>
                      <strong className="font-mono text-base font-extrabold text-zinc-950 tabular-nums">
                        {formatCurrency(periodSummary.totalRevenue)}
                      </strong>
                    </div>
                    <div className="px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] border border-zinc-200/90 flex flex-col gap-0.5">
                      <span className="text-[11px] font-semibold text-zinc-500">
                        Modalidades
                      </span>
                      <strong className="font-mono text-sm font-extrabold text-zinc-900 tabular-nums whitespace-nowrap">
                        {periodSummary.pickupCount} Loja · {periodSummary.deliveryCount} Delivery
                      </strong>
                    </div>
                    <div className="px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] border border-zinc-200/90 flex flex-col gap-0.5">
                      <span className="text-[11px] font-semibold text-zinc-500">
                        Ticket Médio
                      </span>
                      <strong className="font-mono text-base font-extrabold text-emerald-700 tabular-nums">
                        {formatCurrency(periodSummary.averageTicket)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* HELPFUL EMPTY-STATE CALLOUT WHEN TODAY OR CURRENT FILTER HAS 0 ORDERS */}
                {filteredKanbanOrders.length === 0 && (
                  <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="text-xs">
                        <div className="font-display text-sm font-extrabold text-zinc-900">
                          {kanbanSearchQuery.trim()
                            ? `Nenhum pedido encontrado para "${kanbanSearchQuery.trim()}" em ${activePeriodLabel}`
                            : kanbanDatePreset === 'today'
                            ? `Nenhum pedido registrado hoje (${todayBr}) até o momento`
                            : `Nenhum pedido encontrado para ${activePeriodLabel}`}
                        </div>
                        <p className="text-zinc-500 mt-0.5">
                          {kanbanSearchQuery.trim() && kanbanDatePreset !== 'all'
                            ? `A busca está restrita a ${activePeriodLabel}. Amplie para Todas as Datas ou limpe a pesquisa.`
                            : pendingOtherDaysCount > 0
                            ? `Existem ${pendingOtherDaysCount} pedido(s) em aberto de datas anteriores e ${orders.length} no histórico completo.`
                            : orders.length > 0
                            ? `Você possui ${orders.length} pedido(s) registrados em datas anteriores — clique em qualquer data acima ou veja Todas as Datas.`
                            : 'Quando novos pedidos entrarem hoje pelo site ou PDV Balcão, eles aparecerão automaticamente aqui.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {kanbanDatePreset !== 'all' && orders.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setKanbanDatePreset('all');
                            setKanbanStartDate('');
                            setKanbanEndDate('');
                          }}
                          className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>
                            {kanbanSearchQuery.trim()
                              ? 'Buscar em Todas as Datas'
                              : `Ver Todas as Datas (${orders.length})`}
                          </span>
                        </button>
                      )}
                      {kanbanDatePreset === 'today' && !isManualPosOpen && (
                        <button
                          type="button"
                          onClick={() => setIsManualPosOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-[#FFFBEB] hover:bg-[#FFBE00]/40 border border-[#FFBE00] text-zinc-950 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#E3262E]" />
                          <span>Lançar Pedido Hoje (PDV)</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* PDV / Manual Walk-In & Phone Order Form */}
                {isManualPosOpen && (
                  <form
                    onSubmit={handleCreatePosOrder}
                    className="bg-white rounded-2xl border-2 border-[#FFBE00] p-5 shadow-md space-y-4"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                      <div>
                        <span className="text-[10px] font-mono uppercase font-extrabold text-[#E3262E]">
                          PDV RÁPIDO · ATENDIMENTO PRESENCIAL OU TELEFONE {settings.whatsappDisplay}
                        </span>
                        <h3 className="font-display text-base font-extrabold text-zinc-900">
                          Lançar Pedido de Balcão / Telefone (Gera Comanda Automática)
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualPosOpen(false);
                          setPosFormError(null);
                        }}
                        aria-label="Fechar PDV"
                        className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {posFormError && (
                      <div
                        role="alert"
                        className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{posFormError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Nome do Cliente / Empresa
                        </label>
                        <input
                          type="text"
                          value={posCustomerName}
                          onChange={(e) => setPosCustomerName(e.target.value)}
                          placeholder="Ex: Condomínio Solar / Balcão"
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          WhatsApp / Telefone
                        </label>
                        <input
                          type="tel"
                          value={posCustomerPhone}
                          onChange={(e) => setPosCustomerPhone(formatPhone(e.target.value))}
                          placeholder="(65) 99999-9999"
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Modalidade
                        </label>
                        <select
                          value={posDeliveryType}
                          onChange={(e) => setPosDeliveryType(e.target.value as DeliveryType)}
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold"
                        >
                          <option value="pickup">Retirada Balcão (15min)</option>
                          <option value="delivery">Entrega Delivery Local</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Pagamento
                        </label>
                        <select
                          value={posPaymentMethod}
                          onChange={(e) => setPosPaymentMethod(e.target.value as PaymentMethod)}
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold"
                        >
                          <option value="pix">PIX na Loja</option>
                          <option value="card">Cartão (Maquininha)</option>
                          <option value="cash">Dinheiro no Caixa</option>
                        </select>
                      </div>
                    </div>

                    {(() => {
                      const activePosProducts = products.filter((p) => p.status === 'active');
                      const q = posProductSearch.trim().toLowerCase();
                      const filteredPosProducts = q
                        ? activePosProducts.filter(
                            (p) =>
                              p.title.toLowerCase().includes(q) ||
                              p.sku.toLowerCase().includes(q) ||
                              p.volumeLabel.toLowerCase().includes(q)
                          )
                        : activePosProducts;
                      const posSummary = activePosProducts.reduce(
                        (acc, p) => {
                          const qty = posQuantities[p.id] || 0;
                          if (qty > 0) {
                            acc.units += qty;
                            acc.total += getEffectivePrice(p) * qty;
                          }
                          return acc;
                        },
                        { units: 0, total: 0 }
                      );

                      return (
                        <>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="relative flex-1 min-w-[200px]">
                                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="search"
                                  value={posProductSearch}
                                  onChange={(e) => setPosProductSearch(e.target.value)}
                                  placeholder="Buscar qualquer produto do catálogo por nome ou SKU..."
                                  className="w-full pl-8 pr-3 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs"
                                />
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-[#FFFBEB] border border-[#FFBE00] font-mono text-[11px] font-extrabold text-zinc-900">
                                {posSummary.units} un. · {formatCurrency(posSummary.total)}
                              </span>
                            </div>

                            <div className="max-h-52 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100 bg-[#FAFAFA] p-2">
                              {filteredPosProducts.length === 0 ? (
                                <div className="py-4 text-center text-xs text-zinc-500">
                                  Nenhum produto ativo encontrado para &ldquo;{posProductSearch}&rdquo;.
                                </div>
                              ) : (
                                filteredPosProducts.map((p) => {
                                  const qty = posQuantities[p.id] || 0;
                                  return (
                                    <div
                                      key={`pos-${p.id}`}
                                      className={`py-1.5 px-2 flex items-center justify-between gap-2 text-xs rounded-lg ${
                                        qty > 0 ? 'bg-[#FFFBEB]' : ''
                                      }`}
                                    >
                                      <div className="truncate">
                                        <span className="font-mono text-[10px] text-zinc-400 mr-1.5">
                                          {p.sku}
                                        </span>
                                        <strong className="text-zinc-900">{p.title}</strong>{' '}
                                        <span className="font-mono text-zinc-500">
                                          ({p.volumeLabel} · {formatCurrency(getEffectivePrice(p))})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          aria-label={`Diminuir quantidade de ${p.title}`}
                                          onClick={() => {
                                            setPosFormError(null);
                                            setPosQuantities((prev) => ({
                                              ...prev,
                                              [p.id]: Math.max(0, (prev[p.id] || 0) - 1),
                                            }));
                                          }}
                                          className="w-6 h-6 rounded-md bg-white border border-zinc-300 font-bold cursor-pointer"
                                        >
                                          -
                                        </button>
                                        <span className="font-mono font-extrabold w-5 text-center">
                                          {qty}
                                        </span>
                                        <button
                                          type="button"
                                          aria-label={`Adicionar quantidade de ${p.title}`}
                                          onClick={() => {
                                            setPosFormError(null);
                                            setPosQuantities((prev) => ({
                                              ...prev,
                                              [p.id]: (prev[p.id] || 0) + 1,
                                            }));
                                          }}
                                          className="w-6 h-6 rounded-md bg-[#FFBE00] text-zinc-950 font-bold cursor-pointer"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsManualPosOpen(false);
                                setPosFormError(null);
                              }}
                              className="px-4 py-2 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-5 py-2 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl cursor-pointer"
                            >
                              Gerar Pedido & Abrir Comanda ({formatCurrency(posSummary.total)})
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </form>
                )}

                {/* VIEW 1: 4-COLUMN KANBAN BOARD WITH BIDIRECTIONAL STAGE REVERSAL (VOLTAR & AVANÇAR + SELETOR DIRETO 1..4) */}
                {kanbanViewMode === 'board' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
                    {KANBAN_COLUMNS.map((statusKey, colIdx) => {
                      const colMeta = ORDER_STATUS_META[statusKey];
                      const colOrders = filteredKanbanOrders.filter(
                        (o) => o.status === statusKey
                      );

                      return (
                        <div
                          key={statusKey}
                          className="bg-white rounded-2xl p-3.5 border border-zinc-200 flex flex-col min-h-[440px] shadow-2xs"
                        >
                          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-md bg-zinc-950 text-[#FFBE00] font-mono text-[10px] font-extrabold flex items-center justify-center">
                                {colIdx + 1}
                              </span>
                              <h3 className="font-display text-xs font-extrabold text-zinc-900">
                                {colMeta.label}
                              </h3>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDE68A] font-mono text-xs font-extrabold text-[#B45309] tabular-nums">
                              {colOrders.length}
                            </span>
                          </div>

                          <div className="space-y-3 flex-1">
                            {colOrders.length === 0 ? (
                              <div className="h-32 rounded-xl border border-dashed border-zinc-200 flex items-center justify-center text-xs text-zinc-400 text-center px-3">
                                Sem pedidos nesta etapa para o período selecionado
                              </div>
                            ) : (
                              colOrders.map((order) => {
                                const prevStatus = getAdjacentOrderStatus(
                                  order.status,
                                  'prev'
                                );
                                const nextStatus = getAdjacentOrderStatus(
                                  order.status,
                                  'next'
                                );
                                const orderDateFormatted = new Date(
                                  order.createdAt
                                ).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                });
                                const isHistoryExpanded =
                                  expandedHistoryOrderId === order.id;

                                return (
                                  <article
                                    key={order.id}
                                    className="bg-[#FAFAFA] rounded-xl p-3.5 border border-zinc-200/90 space-y-2.5 hover:border-[#FFBE00] transition-colors"
                                  >
                                    {/* Top Row: ID + Date + Total */}
                                    <div className="flex items-center justify-between gap-2 text-xs">
                                      <div>
                                        <span className="font-mono font-extrabold text-zinc-950">
                                          {order.id}
                                        </span>
                                        <span className="block font-mono text-[10px] text-zinc-500">
                                          {orderDateFormatted}
                                        </span>
                                      </div>
                                      {isOrderQuoteOnly(order) ? (
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 font-mono text-[10px] font-extrabold text-emerald-800">
                                          Orçamento s/ Valor
                                        </span>
                                      ) : (
                                        <span className="font-mono font-extrabold text-zinc-950 tabular-nums text-sm">
                                          {formatCurrency(order.total)}
                                        </span>
                                      )}
                                    </div>

                                    {/* Customer & Modality */}
                                    <div className="text-xs">
                                      <div className="font-bold text-zinc-900">
                                        {order.customerName}
                                      </div>
                                      <div className="font-mono text-zinc-500 text-[11px] flex flex-wrap items-center gap-1 mt-0.5">
                                        <span>{formatPhone(order.customerPhone)}</span>
                                        <span>·</span>
                                        <strong
                                          className={
                                            order.deliveryType === 'pickup'
                                              ? 'text-emerald-700'
                                              : 'text-[#E3262E]'
                                          }
                                        >
                                          {order.deliveryType === 'delivery'
                                            ? '🚚 Delivery'
                                            : '🏪 Retirada 15min'}
                                        </strong>
                                        {order.pickupCode && (
                                          <span className="px-1.5 py-0.2 rounded bg-zinc-200/80 text-zinc-800 text-[9px] font-extrabold">
                                            {order.pickupCode}
                                          </span>
                                        )}
                                      </div>
                                      {order.deliveryType === 'delivery' && order.logisticsMode && (
                                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-900">
                                          <span>
                                            {formatLogisticsModeLabel(
                                              order.logisticsMode,
                                              order.address?.interiorCityName
                                            )}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Items List */}
                                    <div className="text-[11px] text-zinc-700 space-y-1.5 bg-white p-2.5 rounded-lg border border-zinc-200/70">
                                      {order.items.map((item, idx) => {
                                        const kitBreakdown =
                                          item.kitItems && item.kitItems.length > 0
                                            ? item.kitItems
                                            : kits
                                                .find((k) => k.id === item.productId)
                                                ?.items.map((ki) => {
                                                  const p = products.find(
                                                    (pr) => pr.id === ki.productId
                                                  );
                                                  return p
                                                    ? {
                                                        productId: p.id,
                                                        sku: p.sku,
                                                        title: p.title,
                                                        volumeLabel: p.volumeLabel,
                                                        quantity: ki.quantity,
                                                      }
                                                    : null;
                                                })
                                                .filter((x): x is NonNullable<typeof x> =>
                                                  Boolean(x)
                                                ) || [];
                                        return (
                                          <div
                                            key={`${order.id}-${idx}`}
                                            className="space-y-0.5"
                                          >
                                            <div className="flex justify-between gap-2">
                                              <span className="truncate font-semibold">
                                                <strong className="font-mono">
                                                  {item.quantity}x
                                                </strong>{' '}
                                                {item.title}
                                              </span>
                                              <span className="font-mono shrink-0">
                                                {item.volumeLabel}
                                              </span>
                                            </div>
                                            {kitBreakdown.length > 0 && (
                                              <div className="pl-2.5 ml-1 border-l-2 border-amber-300 text-[10px] text-zinc-600 space-y-0.5">
                                                {kitBreakdown.map((sub, sIdx) => (
                                                  <div
                                                    key={`${order.id}-${idx}-sub-${sIdx}`}
                                                    className="flex justify-between gap-1.5"
                                                  >
                                                    <span className="truncate">
                                                      +{' '}
                                                      <strong className="font-mono">
                                                        {sub.quantity * item.quantity}x
                                                      </strong>{' '}
                                                      {sub.title}
                                                    </span>
                                                    <span className="font-mono shrink-0">
                                                      {sub.volumeLabel}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* DIRECT 4-STAGE QUICK JUMP PILLS ("Ir direto p/ etapa correta se passou todas sem querer") */}
                                    <div className="bg-white rounded-lg p-1.5 border border-zinc-200/80 space-y-1">
                                      <div className="flex items-center justify-between text-[9px] font-mono uppercase text-zinc-500 font-bold px-0.5">
                                        <span>Mudar Etapa Direto:</span>
                                        {(order.statusHistory?.length || 0) > 0 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setExpandedHistoryOrderId(
                                                isHistoryExpanded ? null : order.id
                                              )
                                            }
                                            className="text-[#E3262E] hover:underline cursor-pointer"
                                          >
                                            {isHistoryExpanded
                                              ? 'Ocultar Log'
                                              : `Log (${order.statusHistory?.length})`}
                                          </button>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 2xl:grid-cols-4 gap-1.5">
                                        {[
                                          { st: 'pending_separation' as OrderStatus, label: '1. Novo' },
                                          { st: 'separating' as OrderStatus, label: '2. Sep.' },
                                          { st: 'ready_or_out' as OrderStatus, label: '3. Pronto' },
                                          { st: 'completed' as OrderStatus, label: '4. Fim' },
                                        ].map((stepBtn) => {
                                          const isCurrent = order.status === stepBtn.st;
                                          return (
                                            <button
                                              key={`${order.id}-jump-${stepBtn.st}`}
                                              type="button"
                                              onClick={() =>
                                                handleMoveOrderStatus(
                                                  order.id,
                                                  stepBtn.st,
                                                  `Movido direto para ${ORDER_STATUS_META[stepBtn.st].shortLabel}`
                                                )
                                              }
                                              title={`Mover pedido ${order.id} para ${ORDER_STATUS_META[stepBtn.st].label}`}
                                              className={`py-1.5 px-1.5 rounded-md text-[10px] font-mono font-extrabold whitespace-nowrap transition-colors cursor-pointer ${
                                                isCurrent
                                                  ? 'bg-zinc-950 text-[#FFBE00]'
                                                  : 'bg-zinc-100 hover:bg-[#FFFBEB] text-zinc-700 border border-zinc-200'
                                              }`}
                                            >
                                              {stepBtn.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Collapsible Audit History Log per Card */}
                                    {isHistoryExpanded &&
                                      order.statusHistory &&
                                      order.statusHistory.length > 0 && (
                                        <div className="p-2 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] space-y-1 text-[10px]">
                                          <div className="font-mono font-extrabold text-zinc-900 uppercase">
                                            Histórico de Movimentações:
                                          </div>
                                          {order.statusHistory.slice(0, 4).map((h, hIdx) => (
                                            <div
                                              key={`${order.id}-hist-${hIdx}`}
                                              className="text-zinc-700 leading-tight border-t border-amber-200/60 pt-1"
                                            >
                                              <span className="font-mono text-zinc-500">
                                                {new Date(h.changedAt).toLocaleTimeString(
                                                  'pt-BR',
                                                  {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                  }
                                                )}
                                              </span>{' '}
                                              ·{' '}
                                              <strong>
                                                {ORDER_STATUS_META[h.fromStatus].shortLabel}
                                              </strong>{' '}
                                              →{' '}
                                              <strong className="text-[#E3262E]">
                                                {ORDER_STATUS_META[h.toStatus].shortLabel}
                                              </strong>
                                              {h.reason && (
                                                <span className="block text-[9px] text-zinc-500">
                                                  {h.reason}
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                    {/* Action Bar: Comanda + Avisar + Bidirectional <- Voltar & Avançar -> */}
                                    <div className="pt-2 border-t border-zinc-200/60 space-y-2">
                                      <div className="flex items-center justify-between gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setPrintOrder(order)}
                                          aria-label={`Imprimir comanda do pedido ${order.id}`}
                                          className="flex-1 py-1.5 px-2 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-900 text-[11px] font-bold rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                          <Printer className="w-3 h-3" />
                                          <span>Comanda</span>
                                        </button>

                                        <a
                                          href={buildCustomerWhatsAppStatusUrl(order)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="Avisar cliente no WhatsApp"
                                          className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg inline-flex items-center justify-center gap-1"
                                        >
                                          <MessageCircle className="w-3 h-3" />
                                          <span>Avisar</span>
                                        </a>
                                      </div>

                                      <div className="flex items-center justify-between gap-1.5">
                                        {prevStatus && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleMoveOrderStatus(
                                                order.id,
                                                prevStatus,
                                                'Voltou etapa anterior (correção operacional)'
                                              )
                                            }
                                            title={`Voltar para ${ORDER_STATUS_META[prevStatus].label}`}
                                            className="flex-1 py-1.5 px-2 bg-white hover:bg-rose-50 border border-zinc-300 hover:border-[#E3262E] text-zinc-800 hover:text-[#E3262E] text-[11px] font-extrabold rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                          >
                                            <ArrowLeft className="w-3 h-3" />
                                            <span>
                                              {order.status === 'completed'
                                                ? 'Voltar Etapa'
                                                : 'Voltar'}
                                            </span>
                                          </button>
                                        )}

                                        {nextStatus && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleMoveOrderStatus(
                                                order.id,
                                                nextStatus,
                                                'Avanço operacional no Kanban'
                                              )
                                            }
                                            className="flex-1 py-1.5 px-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-[11px] font-extrabold rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer"
                                          >
                                            <span>Avançar</span>
                                            <ArrowRight className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </article>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* VIEW 2: CHRONOLOGICAL ORDER HISTORY & AUDIT TABLE ("Consultar histórico por data e corrigir etapas") */
                  <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs">
                    <div className="p-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2 bg-[#FAFAFA]">
                      <div>
                        <h3 className="font-display text-sm font-extrabold text-zinc-900">
                          Relatório Cronológico & Auditoria de Etapas ({filteredKanbanOrders.length} pedidos)
                        </h3>
                        <p className="text-xs text-zinc-500">
                          Consulte pedidos de qualquer data anterior, altere ou reverta a etapa diretamente no seletor e confira o horário da última movimentação.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-white text-[11px] font-mono uppercase text-zinc-500">
                            <th className="py-3 px-4">Pedido · Data/Hora</th>
                            <th className="py-3 px-4">Cliente · Contato</th>
                            <th className="py-3 px-4">Modalidade · Senha</th>
                            <th className="py-3 px-4">Itens</th>
                            <th className="py-3 px-4">Total</th>
                            <th className="py-3 px-4">Etapa Atual (Reversível)</th>
                            <th className="py-3 px-4">Última Auditoria</th>
                            <th className="py-3 px-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-xs">
                          {filteredKanbanOrders.map((ord) => {
                            const lastAudit = ord.statusHistory?.[0];
                            const prevSt = getAdjacentOrderStatus(ord.status, 'prev');
                            const nextSt = getAdjacentOrderStatus(ord.status, 'next');

                            return (
                              <tr key={`table-${ord.id}`} className="hover:bg-zinc-50/80">
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div className="font-mono font-extrabold text-zinc-950">
                                    {ord.id}
                                  </div>
                                  <div className="font-mono text-[11px] text-zinc-500">
                                    {new Date(ord.createdAt).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-zinc-900">
                                    {ord.customerName}
                                  </div>
                                  <div className="font-mono text-[11px] text-zinc-500">
                                    {formatPhone(ord.customerPhone)}
                                  </div>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                      ord.deliveryType === 'pickup'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-rose-50 text-[#E3262E] border border-rose-200'
                                    }`}
                                  >
                                    {ord.deliveryType === 'pickup'
                                      ? '🏪 Retirada na Loja'
                                      : '🚚 Entrega Delivery'}
                                  </span>
                                  {ord.pickupCode && (
                                    <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
                                      Senha: <strong>{ord.pickupCode}</strong>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 max-w-[220px]">
                                  <div className="truncate font-medium text-zinc-800">
                                    {ord.items
                                      .map((i) => `${i.quantity}x ${i.title}`)
                                      .join(', ')}
                                  </div>
                                  <div className="text-[10px] font-mono text-zinc-400">
                                    {ord.items.reduce((a, i) => a + i.quantity, 0)} unid. ·{' '}
                                    {formatPaymentMethodLabel(ord)}
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-mono font-extrabold text-zinc-950 whitespace-nowrap">
                                  {isOrderQuoteOnly(ord) ? (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800">
                                      Orçamento s/ Valor
                                    </span>
                                  ) : (
                                    formatCurrency(ord.total)
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    {prevSt && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleMoveOrderStatus(
                                            ord.id,
                                            prevSt,
                                            'Voltou etapa pela tabela de histórico'
                                          )
                                        }
                                        title="Voltar 1 etapa"
                                        className="p-1 rounded-lg bg-white hover:bg-rose-50 border border-zinc-300 text-zinc-700 hover:text-[#E3262E] cursor-pointer"
                                      >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <select
                                      aria-label={`Alterar etapa do pedido ${ord.id}`}
                                      value={ord.status}
                                      onChange={(e) =>
                                        handleMoveOrderStatus(
                                          ord.id,
                                          e.target.value as OrderStatus,
                                          'Alterado diretamente na tabela de histórico'
                                        )
                                      }
                                      className="px-2.5 py-1.5 rounded-xl bg-[#FFFBEB] border border-[#FFBE00] text-xs font-extrabold text-zinc-950 cursor-pointer"
                                    >
                                      {KANBAN_COLUMNS.map((stKey, idx) => (
                                        <option key={stKey} value={stKey}>
                                          {idx + 1}. {ORDER_STATUS_META[stKey].shortLabel}
                                        </option>
                                      ))}
                                    </select>
                                    {nextSt && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleMoveOrderStatus(
                                            ord.id,
                                            nextSt,
                                            'Avançou etapa pela tabela de histórico'
                                          )
                                        }
                                        title="Avançar 1 etapa"
                                        className="p-1 rounded-lg bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 cursor-pointer"
                                      >
                                        <ArrowRight className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-[11px] text-zinc-600 max-w-[200px]">
                                  {lastAudit ? (
                                    <div>
                                      <span className="font-mono font-bold text-zinc-900">
                                        {ORDER_STATUS_META[lastAudit.fromStatus].shortLabel} →{' '}
                                        {ORDER_STATUS_META[lastAudit.toStatus].shortLabel}
                                      </span>
                                      <span className="block text-[10px] text-zinc-400 truncate">
                                        {lastAudit.reason}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-400">
                                      Aguardando 1ª movimentação
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setPrintOrder(ord)}
                                    className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Printer className="w-3 h-3" />
                                    <span>Comanda</span>
                                  </button>
                                  <a
                                    href={buildCustomerWhatsAppStatusUrl(ord)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>WhatsApp</span>
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 2: GESTÃO DE PRODUTOS (COM UPLOAD DE IMAGEM JPG/PNG/WEBP + LINK URL + BUSCA RÁPIDA) */}
          {activeTab === 'products' && (
            <div className="space-y-5 no-print">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-extrabold text-zinc-900">
                      Catálogo de Produtos Quimiprol ({products.length})
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-md font-mono text-[11px] font-extrabold border tabular-nums ${
                        visiblePriceCount > 0
                          ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {visiblePriceCount} de {products.length} com valor visível
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold bg-zinc-100 border border-zinc-200 text-zinc-700 tabular-nums">
                      Página {formatPageNumberLabel(paginatedAdminProducts.safePage)} de{' '}
                      {formatPageNumberLabel(paginatedAdminProducts.totalPages)} · 30/pág.
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Arraste pela alça ou use as setas para definir a ordem na vitrine, duplique itens parecidos em 1 clique ou edite valores em lote.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportProductsCsv}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-zinc-300 bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-800 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>Exportar CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleHideAllProductPrices}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer ${
                      visiblePriceCount === 0
                        ? 'bg-[#E3262E] text-white border-[#E3262E]'
                        : 'bg-rose-50 hover:bg-rose-100 text-[#E3262E] border-rose-200'
                    }`}
                  >
                    Ocultar Valores de Todos
                  </button>

                  <button
                    type="button"
                    onClick={handleShowAllProductPrices}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer ${
                      visiblePriceCount === products.length && products.length > 0
                        ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950'
                        : 'bg-[#FFFBEB] hover:bg-[#FEF3C7] text-zinc-950 border-[#FFBE00]'
                    }`}
                  >
                    Exibir Valores em Todos
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProductSubView('active');
                      openCreateProduct();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs sm:text-sm rounded-xl cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Produto</span>
                  </button>
                </div>
              </div>

              {/* Sub-view Switcher: Catálogo Ativo vs Produtos Excluídos */}
              <div
                role="tablist"
                aria-label="Visualização do catálogo de produtos"
                className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-zinc-200"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={productSubView === 'active'}
                  onClick={() => setProductSubView('active')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                    productSubView === 'active'
                      ? 'bg-zinc-950 text-[#FFBE00] shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Catálogo Ativo</span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono text-[10px] tabular-nums ${
                      productSubView === 'active'
                        ? 'bg-zinc-800 text-[#FFBE00]'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {products.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={productSubView === 'trash'}
                  onClick={() => setProductSubView('trash')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                    productSubView === 'trash'
                      ? 'bg-[#E3262E] text-white shadow-2xs'
                      : deletedProducts.length > 0
                      ? 'bg-rose-50 text-[#E3262E] hover:bg-rose-100 border border-rose-200'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Produtos Excluídos</span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono text-[10px] tabular-nums ${
                      productSubView === 'trash'
                        ? 'bg-rose-800 text-white'
                        : deletedProducts.length > 0
                        ? 'bg-[#E3262E] text-white'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {deletedProducts.length}
                  </span>
                </button>
              </div>

              {productSubView === 'active' && isProductFormOpen && (() => {
                const basePriceNum = Number(prodPrice.replace(',', '.')) || 0;
                const promoNum = prodPromoPrice.trim()
                  ? Number(prodPromoPrice.replace(',', '.'))
                  : null;
                const previewProduct: Product = {
                  id: editingProduct?.id || 'preview',
                  sku: prodSku.trim() || 'QMP-NEW',
                  title: prodTitle.trim() || 'Nome do Produto Quimiprol',
                  description:
                    prodDesc.trim() || 'Descrição comercial do produto aparece na ficha do cliente.',
                  categoryId: prodCatId,
                  price: basePriceNum,
                  promoPrice: promoNum,
                  installmentsCount: Math.max(
                    1,
                    Math.min(12, Math.round(Number(prodInstallmentsCount) || 3))
                  ),
                  installmentsNoInterest: prodInstallmentsNoInterest,
                  showPrice: prodShowPrice,
                  unit: prodUnit,
                  volumeLabel: prodVolLabel.trim() || '5L',
                  status: prodStatus,
                  imageUrl: prodImage.trim() || GENERATED_IMAGES.prodLimpezaPesada,
                  featured: prodFeatured,
                  dilutionHint: prodDilution.trim() || undefined,
                  badgeLabel: prodBadgeLabel.trim() || undefined,
                  badgeColor: normalizeHexColor(prodBadgeColor, DEFAULT_PROMO_BADGE_COLOR),
                  subBadgeLabel: prodSubBadgeLabel.trim() || undefined,
                  subBadgeColor: normalizeHexColor(
                    prodSubBadgeColor,
                    DEFAULT_HIGHLIGHT_BADGE_COLOR
                  ),
                };
                const previewEffectivePrice = getEffectivePrice(previewProduct);
                const previewDiscountPct = getDiscountPercentage(previewProduct);
                const previewPerLiter = getPricePerLiterLabel(previewProduct);
                const previewInstallment = getProductInstallmentMeta(previewProduct, settings);
                const previewCategory = categories.find((c) => c.id === prodCatId);
                const previewPromoBadgeStyle = resolveProductBadgeStyle(
                  previewProduct.badgeColor,
                  'promo'
                );
                const previewHighlightBadgeStyle = resolveProductBadgeStyle(
                  previewProduct.subBadgeColor,
                  'highlight'
                );

                return (
                  <form
                    onSubmit={handleSaveProduct}
                    className="bg-white rounded-2xl border border-zinc-200 shadow-lg overflow-x-clip"
                  >
                    {/* Studio Editor Top Bar */}
                    <div className="px-5 py-3.5 bg-zinc-950 text-white rounded-t-2xl flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-bold text-[#FFBE00] uppercase tracking-wider block">
                          {editingProduct
                            ? `EDITANDO SKU ${editingProduct.sku}`
                            : 'NOVO CADASTRO DE PRODUTO · CATÁLOGO QUIMIPROL'}
                        </span>
                        <h3 className="font-display text-base font-extrabold text-white truncate">
                          {editingProduct ? editingProduct.title : 'Cadastrar Novo Produto Limper MT'}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsProductFormOpen(false)}
                        aria-label="Fechar editor de produto"
                        className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {productFormError && (
                      <div
                        role="alert"
                        className="mx-5 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{productFormError}</span>
                      </div>
                    )}

                    {/* 2-Column Studio Body: 8 cols Editor + 4 cols Live Storefront Preview */}
                    <div className="p-5 bg-[#F8F9FA] grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                      {/* LEFT COLUMN: STRUCTURED FORM SECTIONS */}
                      <div className="xl:col-span-8 space-y-4">
                        {/* SECTION 1: IDENTIFICAÇÃO & CATEGORIA */}
                        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3.5">
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-100">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-[#E3262E]" />
                              <h4 className="font-display text-sm font-extrabold text-zinc-900">
                                1. Identificação &amp; Classificação
                              </h4>
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400">
                              Campos obrigatórios (*)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-7">
                              <label className="block text-xs font-bold text-zinc-700 mb-1">
                                Título do Produto *
                              </label>
                              <input
                                type="text"
                                required
                                value={prodTitle}
                                onChange={(e) => setProdTitle(e.target.value)}
                                placeholder="Ex: Desengordurante Quimi 90 Ultra Concentrado 5L"
                                className="w-full px-3 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-sm font-semibold text-zinc-900"
                              />
                            </div>
                            <div className="sm:col-span-5">
                              <div className="flex items-center justify-between mb-1">
                                <label
                                  htmlFor="admin-prod-sku-input"
                                  className="block text-xs font-bold text-zinc-700"
                                >
                                  Código SKU / Ref.
                                </label>
                                <span className="text-[10px] font-mono text-zinc-400">
                                  Padrão AAA-000
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  id="admin-prod-sku-input"
                                  type="text"
                                  value={prodSku}
                                  onChange={(e) => setProdSku(e.target.value.toUpperCase())}
                                  placeholder="QMP-102"
                                  className="w-full min-w-0 px-3 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-sm font-mono uppercase text-zinc-900"
                                />
                                <button
                                  type="button"
                                  onClick={handleGenerateProductSku}
                                  aria-label="Gerar SKU automático para o produto"
                                  title="Gerar código SKU automático (3 letras + 3 números, ex: QMP-102)"
                                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FFFBEB] hover:bg-[#FFBE00] border border-[#FFBE00] text-zinc-950 text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-[#E3262E]" />
                                  <span>Gerar SKU</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            <div className="sm:col-span-5">
                              <label className="block text-xs font-bold text-zinc-700 mb-1">
                                Categoria Quimiprol
                              </label>
                              <div className="relative">
                                <select
                                  value={prodCatId}
                                  onChange={(e) => setProdCatId(e.target.value)}
                                  className="w-full appearance-none pl-3 pr-8 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-xs font-semibold text-zinc-900 cursor-pointer"
                                >
                                  {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>

                            <div className="sm:col-span-4">
                              <label className="block text-xs font-bold text-zinc-700 mb-1">
                                Status no Catálogo
                              </label>
                              <div className="relative">
                                <select
                                  value={prodStatus}
                                  onChange={(e) => setProdStatus(e.target.value as ProductStatus)}
                                  className="w-full appearance-none pl-3 pr-8 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-xs font-semibold text-zinc-900 cursor-pointer"
                                >
                                  <option value="active">Ativo (Visível p/ Compra)</option>
                                  <option value="out_of_stock">Em Falta (Esgotado)</option>
                                  <option value="inactive">Inativo (Oculto)</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>

                            <div className="sm:col-span-3">
                              <button
                                type="button"
                                onClick={() => setProdFeatured((prev) => !prev)}
                                className={`w-full py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                                  prodFeatured
                                    ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950'
                                    : 'bg-[#FAFAFA] border-zinc-300 text-zinc-600 hover:bg-zinc-100'
                                }`}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    prodFeatured
                                      ? 'fill-[#FFBE00] text-[#D97706]'
                                      : 'text-zinc-400'
                                  }`}
                                />
                                <span>{prodFeatured ? 'Em Destaque' : 'Destacar'}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 2: DESCRIÇÃO COMERCIAL COMPLETA & RENDIMENTO TÉCNICO */}
                        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-100">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#E3262E]" />
                              <h4 className="font-display text-sm font-extrabold text-zinc-900">
                                2. Descrição Comercial &amp; Rendimento Quimiprol
                              </h4>
                            </div>
                            <span className="font-mono text-[11px] text-zinc-500">
                              {prodDesc.length} caracteres
                            </span>
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                              <label className="text-xs font-bold text-zinc-700">
                                Descrição Detalhada do Produto (Visível na Ficha Técnica)
                              </label>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {[
                                  {
                                    label: '+ Aplicação',
                                    snippet:
                                      'Indicado para limpeza pesada de pisos, cozinhas, áreas externas e condomínios.',
                                  },
                                  {
                                    label: '+ Fragrância/Fórmula',
                                    snippet:
                                      'Fórmula concentrada com alto poder desengordurante e fragrância duradoura.',
                                  },
                                  {
                                    label: '+ Uso Seguro',
                                    snippet:
                                      'Modo de uso: dilua conforme o nível de sujidade, aplique na superfície e enxágue.',
                                  },
                                ].map((tpl) => (
                                  <button
                                    key={tpl.label}
                                    type="button"
                                    onClick={() =>
                                      setProdDesc((prev) =>
                                        prev.trim()
                                          ? `${prev.trim()} ${tpl.snippet}`
                                          : tpl.snippet
                                      )
                                    }
                                    className="px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-[#FFFBEB] border border-zinc-200 hover:border-[#FFBE00] text-[11px] font-semibold text-zinc-700 cursor-pointer transition-colors"
                                  >
                                    {tpl.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <textarea
                              rows={3}
                              value={prodDesc}
                              onChange={(e) => setProdDesc(e.target.value)}
                              placeholder="Descreva benefícios, superfícies indicadas, aroma, concentração e diferenciais do produto para convencer o cliente na loja..."
                              className="w-full px-3 py-2.5 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-sm text-zinc-900 leading-relaxed resize-y min-h-[84px]"
                            />
                          </div>

                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 mb-1">
                              <FlaskConical className="w-3.5 h-3.5 text-[#D97706]" />
                              <span>Rendimento / Informação de Diluição (Exibida no Card)</span>
                            </label>
                            <input
                              type="text"
                              value={prodDilution}
                              onChange={(e) => setProdDilution(e.target.value)}
                              placeholder="Ex: Rende até 50 Litros diluídos · Diluição 1:10"
                              className="w-full px-3 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-xs font-medium text-zinc-900"
                            />
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span className="text-[11px] text-zinc-400">Sugestões:</span>
                              {[
                                'Alto rendimento profissional',
                                'Rende até 50 Litros',
                                'Diluição 1:10 até 1:50',
                                'Pronto Uso · Alta Ação',
                              ].map((hint) => (
                                <button
                                  key={hint}
                                  type="button"
                                  onClick={() => setProdDilution(hint)}
                                  className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-colors ${
                                    prodDilution === hint
                                      ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950 font-bold'
                                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                                  }`}
                                >
                                  {hint}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* SECTION 3: EMBALAGEM, PREÇOS, VISIBILIDADE & PARCELAMENTO */}
                        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-100">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-[#E3262E]" />
                              <h4 className="font-display text-sm font-extrabold text-zinc-900">
                                3. Preços, Embalagem &amp; Exibição no Site
                              </h4>
                            </div>

                            {previewDiscountPct > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 font-mono text-[11px] font-extrabold text-emerald-700">
                                Desconto calculado: {previewDiscountPct}% OFF
                                {previewPerLiter ? ` · ${previewPerLiter}` : ''}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
                            <div className="col-span-1 sm:col-span-3">
                              <label className="block text-xs font-bold text-zinc-700 mb-1">
                                Preço &ldquo;De&rdquo; (R$) *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                required
                                value={prodPrice}
                                onChange={(e) => setProdPrice(e.target.value)}
                                className="w-full px-3 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-sm font-mono font-bold text-zinc-900"
                              />
                            </div>

                            <div className="col-span-1 sm:col-span-3">
                              <label className="block text-xs font-bold text-zinc-700 mb-1">
                                Oferta &ldquo;Por&rdquo; (R$)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={prodPromoPrice}
                                onChange={(e) => setProdPromoPrice(e.target.value)}
                                placeholder="Opcional"
                                className="w-full px-3 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-sm font-mono font-bold text-zinc-900"
                              />
                            </div>

                            <div className="col-span-1 sm:col-span-4">
                              <label className="block text-xs font-bold text-zinc-700 mb-1">
                                Embalagem / Volume
                              </label>
                              <input
                                type="text"
                                value={prodVolLabel}
                                onChange={(e) => setProdVolLabel(e.target.value)}
                                placeholder="Ex: 5L | 2L"
                                className="w-full px-3 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-sm font-mono text-zinc-900"
                              />
                            </div>

                            <div className="col-span-1 sm:col-span-2">
                              <label className="block text-xs font-bold text-zinc-700 mb-1">
                                Unidade
                              </label>
                              <div className="relative">
                                <select
                                  value={prodUnit}
                                  onChange={(e) => setProdUnit(e.target.value as UnitOfMeasure)}
                                  className="w-full appearance-none pl-2.5 pr-7 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-xs font-mono font-bold text-zinc-900 cursor-pointer"
                                >
                                  <option value="L">L</option>
                                  <option value="mL">mL</option>
                                  <option value="kg">kg</option>
                                  <option value="g">g</option>
                                  <option value="Unid">Unid</option>
                                  <option value="Kit">Kit</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>
                          </div>

                          {/* Individual Price Visibility + Clean Installment Row */}
                          <div className="pt-3 border-t border-zinc-100 space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                              <div className="sm:col-span-5">
                                <label className="block text-xs font-bold text-zinc-700 mb-1">
                                  Exibição do Valor deste Item no Site
                                </label>
                                <div
                                  role="group"
                                  aria-label="Exibição do preço no catálogo"
                                  className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#FAFAFA] border border-zinc-200"
                                >
                                  <button
                                    type="button"
                                    onClick={() => setProdShowPrice(false)}
                                    className={`py-1.5 px-2 rounded-md text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                                      !prodShowPrice
                                        ? 'bg-zinc-950 text-[#FFBE00] shadow-2xs'
                                        : 'text-zinc-600 hover:text-zinc-900'
                                    }`}
                                  >
                                    <EyeOff className="w-3.5 h-3.5" />
                                    <span>Sem Valor</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setProdShowPrice(true)}
                                    className={`py-1.5 px-2 rounded-md text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                                      prodShowPrice
                                        ? 'bg-[#FFBE00] text-zinc-950 font-extrabold shadow-2xs'
                                        : 'text-zinc-600 hover:text-zinc-900'
                                    }`}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Exibir R$</span>
                                  </button>
                                </div>
                              </div>

                              <div className="sm:col-span-3">
                                <label className="block text-xs font-bold text-zinc-700 mb-1">
                                  Parcelamento
                                </label>
                                <div className="relative">
                                  <select
                                    value={prodInstallmentsCount}
                                    onChange={(e) => setProdInstallmentsCount(e.target.value)}
                                    className="w-full appearance-none pl-3 pr-8 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-xs font-semibold text-zinc-900 cursor-pointer"
                                  >
                                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                                      <option key={n} value={String(n)}>
                                        {n === 1 ? '1x (Somente à vista)' : `${n}x no Cartão`}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                              </div>

                              <div className="sm:col-span-4">
                                <label className="block text-xs font-bold text-zinc-700 mb-1">
                                  Condição de Juros
                                </label>
                                <div className="relative">
                                  <select
                                    value={prodInstallmentsNoInterest ? 'no_interest' : 'with_card'}
                                    onChange={(e) =>
                                      setProdInstallmentsNoInterest(e.target.value === 'no_interest')
                                    }
                                    className="w-full appearance-none pl-3 pr-8 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-xs font-semibold text-zinc-900 cursor-pointer"
                                  >
                                    <option value="no_interest">Sem juros (s/ juros)</option>
                                    <option value="with_card">Com taxa operadora</option>
                                  </select>
                                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#FFFBEB]/70 border border-[#FDE68A] text-xs">
                              <span className="text-zinc-600">
                                {prodShowPrice
                                  ? 'Este produto exibirá preço e parcelas na loja.'
                                  : 'Este produto exibirá "Envie na lista pelo WhatsApp" (sem preço R$).'}
                              </span>
                              <span className="font-mono font-extrabold text-zinc-950 tabular-nums">
                                Prévia: {previewInstallment.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 4: SELOS COMERCIAIS & BANNERS PROMOCIONAIS */}
                        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-100">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-[#E3262E]" />
                              <h4 className="font-display text-sm font-extrabold text-zinc-900">
                                4. Selos Comerciais &amp; Banners Promocionais
                              </h4>
                            </div>
                            <span className="text-[11px] text-zinc-500">
                              Personalize texto e cor de cada selo (contraste automático)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                            <BadgeColorPicker
                              idPrefix="prod-promo-badge"
                              kind="promo"
                              title="Selo de Oferta"
                              subtitle="Ativo quando o produto exibe preço e valor promocional."
                              labelValue={prodBadgeLabel}
                              onLabelChange={setProdBadgeLabel}
                              labelPlaceholder="Ofertas do Mês | Limper MT"
                              quickLabelSuggestions={[
                                'Ofertas do Mês | Limper MT',
                                'Preço Exclusivo Site',
                                'Combo Econômico 5L',
                                'Direto da Fábrica',
                              ]}
                              colorValue={prodBadgeColor}
                              onColorChange={setProdBadgeColor}
                              previewFallbackText="Preço Exclusivo Site | Limper MT"
                            />

                            <BadgeColorPicker
                              idPrefix="prod-highlight-badge"
                              kind="highlight"
                              title="Selo de Destaque"
                              subtitle="Ativo em destaque geral ou quando o produto está sem valor."
                              labelValue={prodSubBadgeLabel}
                              onLabelChange={setProdSubBadgeLabel}
                              labelPlaceholder={`MAIS VENDIDO · ${previewCategory?.shortName || 'Quimiprol'}`}
                              quickLabelSuggestions={[
                                'MAIS VENDIDO · Limper MT',
                                'USO PROFISSIONAL',
                                'ALTA CONCENTRAÇÃO',
                                'PRONTO USO',
                              ]}
                              colorValue={prodSubBadgeColor}
                              onColorChange={setProdSubBadgeColor}
                              previewFallbackText={`MAIS VENDIDO · ${previewCategory?.shortName || 'Quimiprol'}`}
                              uppercasePreview
                            />
                          </div>

                          {/* Banner Placement Grid */}
                          <div className="pt-3 border-t border-zinc-100 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                                <Megaphone className="w-3.5 h-3.5 text-[#E3262E]" />
                                <span>Vincular aos Banners Promocionais da Loja</span>
                              </div>
                              <span className="text-[11px] font-mono font-bold text-[#B45309]">
                                {selectedProductBannerIds.length} banner(s) marcado(s)
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                              {banners.map((b, idx) => {
                                const isChecked = selectedProductBannerIds.includes(b.id);
                                return (
                                  <button
                                    key={`prod-banner-link-${b.id}`}
                                    type="button"
                                    onClick={() => {
                                      setSelectedProductBannerIds((prev) =>
                                        prev.includes(b.id)
                                          ? prev.filter((id) => id !== b.id)
                                          : [...prev, b.id]
                                      );
                                    }}
                                    className={`p-2 rounded-lg border text-left transition-all flex items-start gap-2 cursor-pointer ${
                                      isChecked
                                        ? 'bg-[#FFFBEB] border-[#E3262E] shadow-2xs'
                                        : 'bg-[#FAFAFA] hover:bg-white border-zinc-200 text-zinc-700'
                                    }`}
                                  >
                                    <div
                                      className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                                        isChecked
                                          ? 'bg-[#E3262E] border-[#E3262E] text-white'
                                          : 'bg-white border-zinc-300'
                                      }`}
                                    >
                                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="block text-[10px] font-mono uppercase font-bold text-[#B45309]">
                                        {b.slot === 'hero_carousel'
                                          ? `Banner Topo #${idx + 1}`
                                          : 'Banner Inferior'}
                                      </span>
                                      <span className="block text-xs font-bold text-zinc-900 truncate">
                                        {b.title}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* SECTION 5: MÍDIA, UPLOAD & GALERIA VISUAL QUIMIPROL */}
                        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-100">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4 text-[#E3262E]" />
                              <h4 className="font-display text-sm font-extrabold text-zinc-900">
                                5. Foto do Produto &amp; Galeria Quimiprol
                              </h4>
                            </div>
                            <span className="text-[11px] text-zinc-500">
                              Formatos aceitos: JPG, PNG, WEBP ou URL direta
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                            <div className="sm:col-span-8 relative">
                              <Link2 className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={prodImage}
                                onChange={(e) => {
                                  setProdImage(e.target.value);
                                  setImageUploadStatus(null);
                                }}
                                placeholder="Cole o link da imagem (https://.../produto.jpg)"
                                className="w-full pl-8 pr-3 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-xs font-mono text-zinc-900"
                              />
                            </div>

                            <div className="sm:col-span-4">
                              <label className="w-full py-2 px-3 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                                <Upload className="w-3.5 h-3.5 text-[#FFBE00]" />
                                <span>Enviar Foto Local</span>
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                  onChange={handleImageFileUpload}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>

                          {/* Visual Preset Thumbnails Grid */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-zinc-500 block">
                              Ou escolha uma foto padrão da linha Quimiprol:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { label: 'Limpeza Pesada', url: GENERATED_IMAGES.prodLimpezaPesada },
                                { label: 'Lavanderia', url: GENERATED_IMAGES.prodLavanderia },
                                { label: 'Casa & Aromas', url: GENERATED_IMAGES.prodCasa },
                                { label: 'Automotiva', url: GENERATED_IMAGES.bannerAutomotivo },
                              ].map((preset) => {
                                const isSelected = prodImage === preset.url;
                                return (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => {
                                      setProdImage(preset.url);
                                      setImageUploadStatus(`Imagem "${preset.label}" selecionada.`);
                                    }}
                                    className={`p-1.5 rounded-lg border flex items-center gap-2 text-left cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-[#FFFBEB] border-[#FFBE00] ring-1 ring-[#FFBE00] text-zinc-950 font-bold'
                                        : 'bg-[#FAFAFA] border-zinc-200 text-zinc-700 hover:bg-white'
                                    }`}
                                  >
                                    <img
                                      src={preset.url}
                                      alt={preset.label}
                                      className="w-9 h-9 rounded-md object-cover bg-white border border-zinc-200 shrink-0"
                                    />
                                    <span className="text-[11px] leading-tight line-clamp-2">
                                      {preset.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {imageUploadStatus && (
                            <p className="text-[11px] font-bold text-emerald-700">
                              {imageUploadStatus}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* RIGHT COLUMN: LIVE STOREFRONT CARD PREVIEW + STICKY ACTIONS */}
                      <div className="xl:col-span-4 space-y-4 xl:sticky xl:top-18">
                        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-100">
                            <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">
                              Prévia na Vitrine
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                prodStatus === 'active'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : prodStatus === 'out_of_stock'
                                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                                  : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                              }`}
                            >
                              {prodStatus === 'active'
                                ? 'Ativo'
                                : prodStatus === 'out_of_stock'
                                ? 'Esgotado'
                                : 'Inativo'}
                            </span>
                          </div>

                          {/* Authentic Storefront Card Mini Preview */}
                          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                            <div className="relative aspect-square max-h-52 w-full bg-[#F8F9FA] p-3 border-b border-zinc-100 flex items-center justify-center">
                              <ProductImageWithFallback
                                src={previewProduct.imageUrl}
                                alt={previewProduct.title}
                                volumeLabel={previewProduct.volumeLabel}
                                className="w-full h-full object-contain rounded-lg"
                              />
                              {prodShowPrice && previewDiscountPct > 0 && (
                                <span
                                  className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold shadow-2xs"
                                  style={{
                                    backgroundColor: previewPromoBadgeStyle.backgroundColor,
                                    color: previewPromoBadgeStyle.color,
                                  }}
                                >
                                  -{previewDiscountPct}% OFF
                                </span>
                              )}
                              <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-white/95 border border-zinc-300 font-mono text-[10px] font-bold text-zinc-700">
                                {previewProduct.volumeLabel}
                              </span>
                            </div>

                            <div className="p-3 space-y-2">
                              <div>
                                {prodShowPrice && previewDiscountPct > 0 ? (
                                  <span
                                    className="inline-block max-w-full py-0.5 px-2 rounded text-[10px] font-extrabold truncate"
                                    style={{
                                      backgroundColor: previewPromoBadgeStyle.backgroundColor,
                                      color: previewPromoBadgeStyle.color,
                                    }}
                                  >
                                    {previewProduct.badgeLabel || 'Preço Exclusivo Site | Limper MT'}
                                  </span>
                                ) : (
                                  <span
                                    className="inline-block max-w-full py-0.5 px-2 rounded text-[10px] font-extrabold uppercase truncate"
                                    style={{
                                      backgroundColor: previewHighlightBadgeStyle.backgroundColor,
                                      color: previewHighlightBadgeStyle.color,
                                    }}
                                  >
                                    {previewProduct.subBadgeLabel ||
                                      `MAIS VENDIDO · ${previewCategory?.shortName || 'Quimiprol'}`}
                                  </span>
                                )}
                              </div>

                              <div className="text-sm font-bold text-zinc-900 leading-snug line-clamp-2">
                                {previewProduct.title}
                              </div>
                              <div className="text-[11px] font-mono text-zinc-400">
                                Ref. {previewProduct.sku} · {previewCategory?.shortName || 'Quimiprol'}
                              </div>

                              <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                                {previewProduct.description}
                              </p>

                              {prodShowPrice ? (
                                <div className="pt-1 border-t border-zinc-100 space-y-0.5">
                                  {previewDiscountPct > 0 && (
                                    <div className="font-mono text-[11px] text-zinc-400 line-through">
                                      {formatCurrency(previewProduct.price)}
                                    </div>
                                  )}
                                  <div className="font-mono text-lg font-extrabold text-zinc-950 tabular-nums">
                                    {formatCurrency(previewEffectivePrice)}
                                  </div>
                                  <div className="text-[11px] text-zinc-500">
                                    ou <strong className="text-zinc-700">{previewInstallment.label}</strong>
                                  </div>
                                </div>
                              ) : (
                                <div className="pt-1.5 border-t border-zinc-100 space-y-1">
                                  {previewProduct.dilutionHint && (
                                    <div className="text-[11px] font-bold text-[#B45309] truncate">
                                      {previewProduct.dilutionHint}
                                    </div>
                                  )}
                                  <div className="px-2 py-1.5 rounded-lg bg-[#ECFDF5] border border-emerald-200 flex items-center gap-1.5 text-emerald-900">
                                    <MessageCircle className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                                    <span className="text-[11px] font-extrabold">
                                      Envie na lista pelo WhatsApp
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Checklist & Save Actions */}
                          <div className="pt-2 space-y-2">
                            <button
                              type="submit"
                              className="w-full py-2.5 px-4 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-xs font-extrabold rounded-lg cursor-pointer shadow-xs transition-colors"
                            >
                              {editingProduct
                                ? 'Salvar Alterações do Produto'
                                : 'Cadastrar Produto & Atualizar Vitrine'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsProductFormOpen(false)}
                              className="w-full py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                            >
                              Cancelar e Fechar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                );
              })()}

              {/* Inline Action Feedback Banner (Duplicate / Reorder / Undo Delete) */}
              {productActionFeedback && (
                <div
                  role="status"
                  className="bg-emerald-50 border border-emerald-200 text-emerald-950 px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{productActionFeedback.message}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {productActionFeedback.productIdToEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          const prodToEdit = products.find(
                            (p) => p.id === productActionFeedback.productIdToEdit
                          );
                          if (prodToEdit) {
                            openEditProduct(prodToEdit);
                          }
                          setProductActionFeedback(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] font-extrabold text-xs cursor-pointer"
                      >
                        Editar Cópia Agora
                      </button>
                    )}
                    {productActionFeedback.showTrashShortcut &&
                      productSubView !== 'trash' && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductSubView('trash');
                            setProductActionFeedback(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Ver Produtos Excluídos ({deletedProducts.length})</span>
                        </button>
                      )}
                    {productActionFeedback.undoProducts && (
                      <button
                        type="button"
                        onClick={() => {
                          onSaveProducts(productActionFeedback.undoProducts!);
                          setProductActionFeedback(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-extrabold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Desfazer</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setProductActionFeedback(null)}
                      aria-label="Fechar aviso"
                      className="p-1 text-emerald-700 hover:text-emerald-950 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {productSubView === 'trash' ? (
                <ProductTrashPanel
                  deletedProducts={deletedProducts}
                  categories={categories}
                  onRestoreProduct={handleRestoreDeletedProduct}
                  onRestoreAllProducts={handleRestoreAllDeletedProducts}
                  onPermanentDeleteProduct={handlePermanentDeleteProduct}
                  onEmptyTrash={handleEmptyProductTrash}
                  onBackToCatalog={() => setProductSubView('active')}
                />
              ) : (
                <>
              {/* Search, Category, Price Visibility, Status Filter & Batch Selection Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-zinc-200 space-y-3">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={adminProductSearch}
                      onChange={(e) => setAdminProductSearch(e.target.value)}
                      placeholder="Filtrar produto no estoque por nome ou SKU (ex: Quimi 90, QMP-103)..."
                      className="w-full pl-9 pr-4 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Filtrar por categoria"
                      value={adminCategoryFilter}
                      onChange={(e) => setAdminCategoryFilter(e.target.value)}
                      className="px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800"
                    >
                      <option value="all">Todas as Categorias ({products.length})</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Filtrar por status do produto"
                      value={adminStatusFilter}
                      onChange={(e) =>
                        setAdminStatusFilter(e.target.value as 'all' | ProductStatus)
                      }
                      className="px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800"
                    >
                      <option value="all">Status: Todos</option>
                      <option value="active">Ativo ({activeProductsCount})</option>
                      <option value="out_of_stock">Em Falta</option>
                      <option value="inactive">Inativo</option>
                    </select>

                    <select
                      aria-label="Filtrar por visibilidade de preço"
                      value={adminPriceFilter}
                      onChange={(e) =>
                        setAdminPriceFilter(e.target.value as 'all' | 'visible' | 'hidden')
                      }
                      className="px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800"
                    >
                      <option value="all">Exibição: Todos ({products.length})</option>
                      <option value="visible">Com Valor Visível ({visiblePriceCount})</option>
                      <option value="hidden">
                        Sem Valor / Sob Consulta ({products.length - visiblePriceCount})
                      </option>
                    </select>
                  </div>
                </div>

                {/* Multi-select Batch Action Bar */}
                <div
                  className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs transition-colors ${
                    selectedProductIds.length > 0
                      ? 'bg-[#FFFBEB] border-[#FFBE00]'
                      : 'bg-[#FAFAFA] border-zinc-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleToggleSelectAllFiltered}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-300 text-xs font-bold text-zinc-800 cursor-pointer"
                    >
                      {allFilteredSelected
                        ? `Desmarcar Lista (${filteredAdminProducts.length})`
                        : `Selecionar Filtrados (${filteredAdminProducts.length})`}
                    </button>
                    <span className="text-zinc-600 font-medium">
                      {selectedProductIds.length > 0 ? (
                        <strong className="text-zinc-950 font-mono tabular-nums">
                          {selectedProductIds.length} produto(s) selecionado(s)
                        </strong>
                      ) : (
                        'Marque itens para alterar valores, status, duplicar ou excluir em lote. Arraste as linhas para reordenar.'
                      )}
                    </span>
                  </div>

                  {selectedProductIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleBatchDuplicateSelected}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-50 border border-zinc-300 text-zinc-900 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#D97706]" />
                        <span>Duplicar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchSetProductPrices(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] font-extrabold text-xs cursor-pointer"
                      >
                        Mostrar Valor
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchSetProductPrices(false)}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-[#E3262E] font-bold text-xs cursor-pointer"
                      >
                        Ocultar Valor
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchSetProductStatus('active')}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs cursor-pointer"
                      >
                        Ativar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchSetProductStatus('out_of_stock')}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs cursor-pointer"
                      >
                        Em Falta
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteProducts(selectedProductIds)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#E3262E] font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir ({selectedProductIds.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedProductIds([])}
                        className="px-2 py-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 font-bold text-xs cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-[#FAFAFA] text-[10px] font-mono uppercase tracking-tight text-zinc-500">
                        <th className="py-2.5 pl-3 pr-1.5 w-8">
                          <input
                            type="checkbox"
                            aria-label="Selecionar todos os produtos desta página"
                            checked={allCurrentPageSelected}
                            onChange={handleToggleSelectCurrentPage}
                            className="w-4 h-4 accent-[#E3262E] rounded cursor-pointer"
                          />
                        </th>
                        <th className="py-2.5 px-1.5 whitespace-nowrap">Ordem</th>
                        <th className="py-2.5 px-2.5 whitespace-nowrap">Foto · SKU · Produto</th>
                        <th className="py-2.5 px-2 whitespace-nowrap">Categoria</th>
                        <th className="py-2.5 px-2 whitespace-nowrap">Emb.</th>
                        <th className="py-2.5 px-2 whitespace-nowrap">De / Por</th>
                        <th className="py-2.5 px-1.5 text-center whitespace-nowrap">Dest.</th>
                        <th className="py-2.5 px-2 whitespace-nowrap">Valor Site</th>
                        <th className="py-2.5 px-2 whitespace-nowrap">Status</th>
                        <th className="py-2.5 pl-2 pr-3 text-right whitespace-nowrap">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-xs">
                      {currentPageProducts.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12 px-4 text-center">
                            <div className="max-w-sm mx-auto space-y-3">
                              <p className="text-sm font-bold text-zinc-800">
                                Nenhum produto encontrado para os filtros aplicados.
                              </p>
                              <p className="text-xs text-zinc-500">
                                Limpe a busca ou ajuste os filtros de categoria, status ou exibição de valor.
                              </p>
                              <div className="flex items-center justify-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdminProductSearch('');
                                    setAdminCategoryFilter('all');
                                    setAdminPriceFilter('all');
                                    setAdminStatusFilter('all');
                                  }}
                                  className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs cursor-pointer"
                                >
                                  Limpar Filtros
                                </button>
                                <button
                                  type="button"
                                  onClick={openCreateProduct}
                                  className="px-3.5 py-2 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs cursor-pointer"
                                >
                                  + Novo Produto
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        currentPageProducts.map((prod, pageIdx) => {
                          const cat = categories.find((c) => c.id === prod.categoryId);
                          const isPriceShown = isProductPriceVisible(prod, settings);
                          const isSelected = selectedProductIds.includes(prod.id);
                          const filteredGlobalIdx =
                            (paginatedAdminProducts.safePage - 1) * ADMIN_PRODUCTS_PAGE_SIZE +
                            pageIdx;
                          const catalogIndex = products.findIndex((p) => p.id === prod.id);
                          const isFirstInFiltered = filteredGlobalIdx === 0;
                          const isLastInFiltered =
                            filteredGlobalIdx === filteredAdminProducts.length - 1;
                          const isDragging = draggedProductId === prod.id;
                          const isDropTarget =
                            dragOverProductId === prod.id &&
                            draggedProductId !== null &&
                            draggedProductId !== prod.id;

                          const dropIndicatorClass = isDropTarget
                            ? dragOverPosition === 'before'
                              ? 'shadow-[inset_0_2px_0_0_#E3262E] bg-amber-50/70'
                              : 'shadow-[inset_0_-2px_0_0_#E3262E] bg-amber-50/70'
                            : '';

                          return (
                            <tr
                              key={prod.id}
                              draggable
                              data-product-id={prod.id}
                              onDragStart={(e) => {
                                setDraggedProductId(prod.id);
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', prod.id);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (!draggedProductId || draggedProductId === prod.id) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const position =
                                  e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                                if (
                                  dragOverProductId !== prod.id ||
                                  dragOverPosition !== position
                                ) {
                                  setDragOverProductId(prod.id);
                                  setDragOverPosition(position);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const fallbackSourceId = e.dataTransfer.getData('text/plain');
                                if (!draggedProductId && fallbackSourceId && fallbackSourceId !== prod.id) {
                                  const reordered = reorderProductsById(
                                    products,
                                    fallbackSourceId,
                                    prod.id,
                                    dragOverPosition
                                  );
                                  onSaveProducts(reordered);
                                  setProductActionFeedback({
                                    message: 'Ordem do catálogo atualizada e salva automaticamente na vitrine.',
                                  });
                                  setDraggedProductId(null);
                                  setDragOverProductId(null);
                                  return;
                                }
                                handleDropProductRow(prod.id);
                              }}
                              onDragEnd={() => {
                                setDraggedProductId(null);
                                setDragOverProductId(null);
                              }}
                              className={`transition-colors ${
                                isDragging
                                  ? 'opacity-45 bg-[#FFFBEB]'
                                  : isSelected
                                  ? 'bg-[#FFFBEB]/60 hover:bg-[#FFFBEB]'
                                  : 'hover:bg-zinc-50/90'
                              } ${dropIndicatorClass}`}
                            >
                              <td className="py-2.5 pl-3 pr-1.5">
                                <input
                                  type="checkbox"
                                  aria-label={`Selecionar ${prod.title}`}
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectProduct(prod.id)}
                                  className="w-4 h-4 accent-[#E3262E] rounded cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-1.5 whitespace-nowrap">
                                <div className="inline-flex items-center gap-0.5">
                                  <span
                                    title="Arraste para mover o produto para cima ou para baixo"
                                    aria-label={`Arrastar ${prod.title}`}
                                    className="p-0.5 rounded text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </span>
                                  <span className="font-mono text-[11px] font-bold text-zinc-500 tabular-nums w-6 text-center">
                                    #{String((catalogIndex >= 0 ? catalogIndex : filteredGlobalIdx) + 1).padStart(2, '0')}
                                  </span>
                                  <div className="inline-flex flex-col">
                                    <button
                                      type="button"
                                      onClick={() => handleMoveProduct(prod.id, 'up')}
                                      disabled={isFirstInFiltered}
                                      title="Mover produto para cima"
                                      aria-label={`Mover ${prod.title} para cima`}
                                      className="p-0.5 rounded text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveProduct(prod.id, 'down')}
                                      disabled={isLastInFiltered}
                                      title="Mover produto para baixo"
                                      aria-label={`Mover ${prod.title} para baixo`}
                                      className="p-0.5 rounded text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-2.5 max-w-[235px]">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
                                    <ProductImageWithFallback
                                      src={prod.imageUrl}
                                      alt={prod.title}
                                      volumeLabel={prod.volumeLabel}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-zinc-900 leading-tight line-clamp-2">
                                      {prod.title}
                                    </div>
                                    <div className="font-mono text-[10px] text-zinc-400 mt-0.5">
                                      {prod.sku}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-zinc-600 text-[11px] whitespace-nowrap">
                                {cat?.shortName || '-'}
                              </td>
                              <td className="py-2.5 px-2 font-mono text-[11px] whitespace-nowrap text-zinc-700">
                                {prod.volumeLabel}
                              </td>
                              <td className="py-2.5 px-2 font-mono tabular-nums whitespace-nowrap text-[11px]">
                                {prod.promoPrice ? (
                                  <div>
                                    <span className="line-through text-zinc-400 mr-1">
                                      {formatCurrency(prod.price)}
                                    </span>
                                    <strong className="text-zinc-900">
                                      {formatCurrency(prod.promoPrice)}
                                    </strong>
                                  </div>
                                ) : (
                                  <strong className="text-zinc-900">
                                    {formatCurrency(prod.price)}
                                  </strong>
                                )}
                                <span className="block text-[10px] text-zinc-500 mt-0.5">
                                  {getProductInstallmentMeta(prod, settings).label}
                                </span>
                              </td>
                              <td className="py-2.5 px-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleProductFeatured(prod)}
                                  title="Destacar na Vitrine Principal"
                                  aria-label={`Destacar ${prod.title}`}
                                  className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                                    prod.featured
                                      ? 'bg-[#FFFBEB] border-[#FFBE00] text-[#D97706]'
                                      : 'bg-white border-zinc-200 text-zinc-300 hover:text-zinc-500'
                                  }`}
                                >
                                  <Star
                                    className={`w-3.5 h-3.5 ${
                                      prod.featured ? 'fill-[#FFBE00] text-[#D97706]' : ''
                                    }`}
                                  />
                                </button>
                              </td>
                              <td className="py-2.5 px-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleToggleProductPriceVisibility(prod)}
                                  aria-label={`${isPriceShown ? 'Ocultar' : 'Mostrar'} valor de ${prod.title}`}
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                                    isPriceShown
                                      ? 'bg-[#FFFBEB] text-zinc-950 border-[#FFBE00]'
                                      : 'bg-rose-50 text-[#E3262E] border-rose-200'
                                  }`}
                                >
                                  {isPriceShown ? 'Visível' : 'Sob Consulta'}
                                </button>
                              </td>
                              <td className="py-2.5 px-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleToggleProductStatus(prod)}
                                  title="Clique para alternar status (Ativo / Em Falta / Inativo)"
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold border cursor-pointer transition-colors ${
                                    prod.status === 'active'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : prod.status === 'out_of_stock'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                      : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                                  }`}
                                >
                                  {prod.status === 'active'
                                    ? 'Ativo'
                                    : prod.status === 'out_of_stock'
                                    ? 'Em Falta'
                                    : 'Inativo'}
                                </button>
                              </td>
                              <td className="py-2.5 pl-2 pr-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveProduct(prod.id, 'top')}
                                    disabled={catalogIndex === 0}
                                    title="Mover para o topo do catálogo (#01)"
                                    aria-label={`Mover ${prod.title} para o topo`}
                                    className="p-1.5 rounded-lg border border-transparent hover:border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 disabled:opacity-25 disabled:pointer-events-none cursor-pointer transition-colors"
                                  >
                                    <ChevronsUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateProduct(prod)}
                                    title="Duplicar produto"
                                    aria-label={`Duplicar ${prod.title}`}
                                    className="p-1.5 rounded-lg border border-transparent hover:border-[#FFBE00] hover:bg-[#FFFBEB] text-zinc-600 hover:text-zinc-950 cursor-pointer transition-colors"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditProduct(prod)}
                                    title="Editar produto"
                                    aria-label={`Editar ${prod.title}`}
                                    className="p-1.5 rounded-lg border border-transparent hover:border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 cursor-pointer transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteProducts([prod.id])}
                                    title="Excluir produto"
                                    aria-label={`Excluir ${prod.title}`}
                                    className="p-1.5 rounded-lg border border-transparent hover:border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-800 cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer Bar (30 products per page) */}
                <div className="px-4 py-3.5 border-t border-zinc-200 bg-[#FAFAFA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-zinc-600 font-medium font-mono tabular-nums">
                    {paginatedAdminProducts.totalItems > 0 ? (
                      <>
                        Mostrando{' '}
                        <strong className="text-zinc-950">
                          {formatPageNumberLabel(paginatedAdminProducts.startIndex)}–
                          {formatPageNumberLabel(paginatedAdminProducts.endIndex)}
                        </strong>{' '}
                        de{' '}
                        <strong className="text-zinc-950">
                          {paginatedAdminProducts.totalItems}
                        </strong>{' '}
                        produtos · Página{' '}
                        <strong className="text-zinc-950">
                          {formatPageNumberLabel(paginatedAdminProducts.safePage)}
                        </strong>{' '}
                        de{' '}
                        <strong className="text-zinc-950">
                          {formatPageNumberLabel(paginatedAdminProducts.totalPages)}
                        </strong>
                      </>
                    ) : (
                      '0 produtos exibidos nesta visualização'
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-mono uppercase text-zinc-500 mr-1">
                      Páginas:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAdminProductPage(Math.max(1, paginatedAdminProducts.safePage - 1))
                      }
                      disabled={paginatedAdminProducts.safePage <= 1}
                      aria-label="Página anterior"
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-700 inline-flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Anterior</span>
                    </button>

                    {Array.from(
                      { length: paginatedAdminProducts.totalPages },
                      (_, idx) => idx + 1
                    ).map((pageNum) => {
                      const isCurrent = pageNum === paginatedAdminProducts.safePage;
                      const formatted = formatPageNumberLabel(pageNum);
                      return (
                        <button
                          key={`prod-page-${pageNum}`}
                          type="button"
                          onClick={() => setAdminProductPage(pageNum)}
                          aria-label={`Página ${formatted}`}
                          aria-current={isCurrent ? 'page' : undefined}
                          className={`min-w-9 px-2.5 py-1.5 rounded-lg border font-mono text-xs tabular-nums transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-zinc-950 text-[#FFBE00] border-zinc-950 font-extrabold shadow-2xs'
                              : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200 font-bold'
                          }`}
                        >
                          {pageNum === 1 ? `Pág ${formatted}` : formatted}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() =>
                        setAdminProductPage(
                          Math.min(
                            paginatedAdminProducts.totalPages,
                            paginatedAdminProducts.safePage + 1
                          )
                        )
                      }
                      disabled={
                        paginatedAdminProducts.safePage >= paginatedAdminProducts.totalPages
                      }
                      aria-label="Próxima página"
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-700 inline-flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      <span>Próxima</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
                </>
              )}
            </div>
          )}

          {/* TAB KITS & COMBOS: CADASTRO DE KITS COM IMAGEM (LINK OU UPLOAD JPG/PNG/WEBP) */}
          {activeTab === 'kits' && (
            <div className="space-y-4 no-print">
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-zinc-900">
                    Kits Prontos & Combos Promocionais ({kits.length})
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Cadastre combos com foto de capa (link ou arquivo JPG/PNG/WEBP), escolha os produtos inclusos e defina o valor promocional exibido na Home.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateKit}
                  className="px-4 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cadastrar Novo Kit com Imagem</span>
                </button>
              </div>

              {isKitFormOpen && (
                <form
                  onSubmit={handleSaveKit}
                  className="bg-white rounded-3xl border-2 border-[#FFBE00] p-6 shadow-md space-y-5"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] border border-[#FFBE00] text-[#E3262E] flex items-center justify-center">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase font-extrabold text-[#E3262E] block">
                          VITRINE HOME · COMBOS EM 1 CLIQUE
                        </span>
                        <h3 className="font-display text-lg font-extrabold text-zinc-900">
                          {editingKit
                            ? `Editar Kit: ${editingKit.title}`
                            : 'Cadastrar Novo Kit Promocional Limper MT'}
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsKitFormOpen(false)}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  {kitFormError && (
                    <div
                      role="alert"
                      className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{kitFormError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-7 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        <div className="sm:col-span-7">
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Nome do Kit / Combo *
                          </label>
                          <input
                            type="text"
                            required
                            value={kitTitle}
                            onChange={(e) => setKitTitle(e.target.value)}
                            placeholder="Ex: Kit Limpeza Pesada Pós-Obra 5L"
                            className="w-full px-3 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs font-semibold text-zinc-900"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <div className="flex items-center justify-between mb-1">
                            <label
                              htmlFor="admin-kit-sku-input"
                              className="block text-xs font-bold text-zinc-700"
                            >
                              Código SKU / Ref.
                            </label>
                            <span className="text-[10px] font-mono text-zinc-400">
                              Padrão AAA-000
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              id="admin-kit-sku-input"
                              type="text"
                              value={kitSku}
                              onChange={(e) => setKitSku(e.target.value.toUpperCase())}
                              placeholder="KIT-101"
                              className="w-full min-w-0 px-3 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs font-mono uppercase text-zinc-900"
                            />
                            <button
                              type="button"
                              onClick={handleGenerateKitSku}
                              aria-label="Gerar SKU automático para o kit"
                              title="Gerar código SKU automático (3 letras + 3 números, ex: KIT-101)"
                              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFFBEB] hover:bg-[#FFBE00] border border-[#FFBE00] text-zinc-950 text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#E3262E]" />
                              <span>Gerar SKU</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Selo / Tag de Destaque *
                          </label>
                          <input
                            type="text"
                            required
                            value={kitBadge}
                            onChange={(e) => setKitBadge(e.target.value)}
                            placeholder="Ex: KIT CASA PERFUMADA · ECONOMIZE R$ 15"
                            className="w-full px-3 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Descrição Comercial do Kit
                          </label>
                          <input
                            type="text"
                            value={kitDesc}
                            onChange={(e) => setKitDesc(e.target.value)}
                            placeholder="Ex: Cloro Concentrado 5L + Limpa Pedras 5L + Detergente Clorado 5L"
                            className="w-full px-3 py-2 bg-[#FAFAFA] focus:bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      {/* Composição de Produtos do Kit com Busca na Lupa ("Puxar item já cadastrado na lupa e adicionar no kit") */}
                      <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-zinc-200 space-y-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-extrabold text-zinc-900 block">
                              1. Pesquisar Produto Cadastrado na Lupa p/ Puxar ao Kit
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              Digite o nome, código SKU ou litragem (ex: Quimi 90, Lavanda, 5L) e clique em &ldquo;+ Puxar p/ Kit&rdquo;
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-[#FFFBEB] border border-[#FFBE00] text-[11px] font-mono font-extrabold text-[#E3262E]">
                            {Object.values(kitQuantities).reduce((a, b) => a + b, 0)} un. no combo
                          </span>
                        </div>

                        {/* Interactive Magnifying Glass Search Input */}
                        <div className="relative">
                          <Search className="w-4 h-4 text-[#E3262E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="search"
                            value={kitProductSearchQuery}
                            onChange={(e) => setKitProductSearchQuery(e.target.value)}
                            placeholder="Pesquisar na lupa produto cadastrado para puxar pro kit..."
                            className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-xl text-xs font-semibold text-zinc-900"
                          />
                        </div>

                        {/* Search Results List to Pull Products into Kit */}
                        <div className="max-h-44 overflow-y-auto divide-y divide-zinc-100 bg-white rounded-xl border border-zinc-200 p-1.5">
                          {products
                            .filter((p) => {
                              if (p.status !== 'active') return false;
                              const q = kitProductSearchQuery.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                p.title.toLowerCase().includes(q) ||
                                p.sku.toLowerCase().includes(q) ||
                                p.volumeLabel.toLowerCase().includes(q)
                              );
                            })
                            .map((prod) => {
                              const qty = kitQuantities[prod.id] || 0;
                              return (
                                <div
                                  key={`kit-search-${prod.id}`}
                                  className={`py-1.5 px-2 flex items-center justify-between gap-2 text-xs rounded-lg transition-colors ${
                                    qty > 0 ? 'bg-[#FFFBEB]/80' : 'hover:bg-zinc-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 overflow-hidden shrink-0">
                                      <ProductImageWithFallback
                                        src={prod.imageUrl}
                                        alt={prod.title}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="truncate">
                                      <strong className="text-zinc-900 block truncate">
                                        {prod.title}
                                      </strong>
                                      <span className="text-[10px] font-mono text-zinc-500">
                                        {prod.sku} · {prod.volumeLabel} ·{' '}
                                        {formatCurrency(getEffectivePrice(prod))}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setKitQuantities((prev) => ({
                                        ...prev,
                                        [prod.id]: (prev[prod.id] || 0) + 1,
                                      }))
                                    }
                                    className={`px-2.5 py-1.5 rounded-lg font-extrabold text-[11px] inline-flex items-center gap-1 shrink-0 cursor-pointer transition-colors ${
                                      qty > 0
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950'
                                    }`}
                                  >
                                    <Plus className="w-3 h-3 stroke-[2.5]" />
                                    <span>
                                      {qty > 0 ? `No Kit (${qty}x)` : 'Puxar p/ Kit'}
                                    </span>
                                  </button>
                                </div>
                              );
                            })}
                        </div>

                        {/* Selected Products Currently Pulled into the Kit */}
                        <div className="space-y-2 pt-1">
                          <span className="text-xs font-extrabold text-zinc-900 block">
                            2. Itens Puxados e Inclusos neste Kit:
                          </span>
                          {Object.entries(kitQuantities).filter(([, q]) => q > 0).length ===
                          0 ? (
                            <div className="p-3 rounded-xl bg-white border border-dashed border-zinc-300 text-center text-xs text-zinc-400">
                              Nenhum produto puxado ainda. Pesquise na lupa acima e clique em &ldquo;+ Puxar p/ Kit&rdquo;.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {Object.entries(kitQuantities)
                                .filter(([, q]) => q > 0)
                                .map(([prodId, qty]) => {
                                  const prod = products.find((p) => p.id === prodId);
                                  if (!prod) return null;
                                  return (
                                    <div
                                      key={`kit-selected-${prod.id}`}
                                      className="p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between gap-2 text-xs"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 overflow-hidden shrink-0">
                                          <ProductImageWithFallback
                                            src={prod.imageUrl}
                                            alt={prod.title}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <div className="truncate">
                                          <strong className="text-zinc-900 block truncate">
                                            {prod.title}
                                          </strong>
                                          <span className="text-[10px] font-mono text-zinc-600">
                                            {prod.volumeLabel} · Subtotal:{' '}
                                            {formatCurrency(getEffectivePrice(prod) * qty)}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setKitQuantities((prev) => ({
                                              ...prev,
                                              [prod.id]: Math.max(0, (prev[prod.id] || 0) - 1),
                                            }))
                                          }
                                          className="w-6 h-6 rounded-md bg-white border border-zinc-300 font-bold cursor-pointer"
                                        >
                                          -
                                        </button>
                                        <span className="w-5 text-center font-mono font-extrabold">
                                          {qty}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setKitQuantities((prev) => ({
                                              ...prev,
                                              [prod.id]: (prev[prod.id] || 0) + 1,
                                            }))
                                          }
                                          className="w-6 h-6 rounded-md bg-[#FFBE00] text-zinc-950 font-bold cursor-pointer"
                                        >
                                          +
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setKitQuantities((prev) => ({
                                              ...prev,
                                              [prod.id]: 0,
                                            }))
                                          }
                                          title="Remover do kit"
                                          className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>

                        {/* Cálculo Automático de Soma Avulsa vs Preço Promocional do Kit */}
                        {(() => {
                          const regularTotal =
                            Math.round(
                              Object.entries(kitQuantities).reduce((acc, [prodId, q]) => {
                                if (q <= 0) return acc;
                                const p = products.find((item) => item.id === prodId);
                                return acc + (p ? getEffectivePrice(p) * q : 0);
                              }, 0) * 100
                            ) / 100;
                          const typedPromo =
                            Math.round(
                              (Number(kitPromoPrice.replace(',', '.')) || 0) * 100
                            ) / 100;
                          const finalCartKitPrice =
                            typedPromo > 0 ? typedPromo : regularTotal;
                          const exactSavings =
                            Math.max(
                              0,
                              Math.round((regularTotal - finalCartKitPrice) * 100) / 100
                            );

                          return (
                            <div className="space-y-2.5 pt-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <div className="p-2.5 rounded-xl bg-white border border-zinc-200">
                                  <span className="block text-[10px] font-mono uppercase text-zinc-500">
                                    Soma Avulsa dos Itens
                                  </span>
                                  <strong className="font-mono text-sm font-extrabold text-zinc-700">
                                    {formatCurrency(regularTotal)}
                                  </strong>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                                    Preço Fechado do Kit na Cesta (R$) *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={kitPromoPrice}
                                    onChange={(e) => setKitPromoPrice(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border-2 border-[#FFBE00] rounded-xl text-xs font-mono font-extrabold text-zinc-950"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                                    Visibilidade do Preço
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setKitShowPrice((prev) => !prev)}
                                    className={`w-full py-2 px-3 rounded-xl border text-xs font-extrabold cursor-pointer ${
                                      kitShowPrice
                                        ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950'
                                        : 'bg-rose-50 border-rose-200 text-[#E3262E]'
                                    }`}
                                  >
                                    {kitShowPrice ? 'Exibir Preço na Home' : 'Ocultar (Sob Consulta)'}
                                  </button>
                                </div>
                              </div>

                              {/* 1-Click Discount Presets + Live Cart Verification */}
                              <div className="p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-zinc-700">
                                    Aplicar Desconto Rápido:
                                  </span>
                                  {[10, 15, 20, 25].map((pct) => (
                                    <button
                                      key={`kit-disc-${pct}`}
                                      type="button"
                                      onClick={() => {
                                        if (regularTotal <= 0) return;
                                        const discounted =
                                          Math.round(regularTotal * (1 - pct / 100) * 10) /
                                          10;
                                        setKitPromoPrice(discounted.toFixed(2));
                                      }}
                                      className="px-2 py-1 rounded-lg bg-white hover:bg-[#FFBE00] border border-zinc-300 font-mono text-[10px] font-extrabold text-zinc-900 cursor-pointer"
                                    >
                                      -{pct}% OFF
                                    </button>
                                  ))}
                                </div>

                                <div className="font-mono text-[11px] font-extrabold text-emerald-800">
                                  Vai entrar na Cesta por{' '}
                                  <span className="text-zinc-950 underline">
                                    {formatCurrency(finalCartKitPrice)}
                                  </span>{' '}
                                  (Economia exata: -{formatCurrency(exactSavings)})
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Kit Image Upload & URL Section ("Colocar uma imagem também para cadastrar kits") */}
                    <div className="lg:col-span-5 p-4 rounded-2xl bg-[#FAFAFA] border border-zinc-200 space-y-3 self-start">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[#E3262E]" />
                        <h4 className="font-display text-sm font-extrabold text-zinc-900">
                          Imagem do Kit (Link ou Upload JPG, PNG, WEBP)
                        </h4>
                      </div>

                      <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-white h-40 flex items-center justify-center relative">
                        <ProductImageWithFallback
                          src={kitImage}
                          alt={kitTitle || 'Preview da imagem do Kit'}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#FFBE00] text-zinc-950 font-mono text-[10px] font-extrabold shadow-xs">
                          {kitBadge || 'KIT LIMPER MT'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          1. Colar Link Direto da Imagem do Kit (URL)
                        </label>
                        <div className="relative">
                          <Link2 className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={kitImage}
                            onChange={(e) => {
                              setKitImage(e.target.value);
                              setKitImageUploadStatus(null);
                            }}
                            placeholder="https://exemplo.com/foto-kit-limper.webp"
                            className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-zinc-700 mb-1">
                          2. Enviar Foto do Computador / Celular (.JPG, .PNG, .WEBP)
                        </span>
                        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-extrabold cursor-pointer transition-colors w-full justify-center">
                          <Upload className="w-4 h-4 text-[#FFBE00]" />
                          <span>Escolher Imagem do Kit (JPG, PNG, WEBP)</span>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                            onChange={handleKitImageFileUpload}
                            className="hidden"
                          />
                        </label>
                        {kitImageUploadStatus && (
                          <p className="text-[11px] font-bold text-emerald-700 mt-1.5">
                            {kitImageUploadStatus}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="block text-[11px] font-bold text-zinc-500 mb-1.5">
                          3. Ou selecione uma Foto Oficial Quimiprol:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: 'Combo Casa & Limpeza', url: GENERATED_IMAGES.prodCasa },
                            { label: 'Combo Lavanderia 5L', url: GENERATED_IMAGES.prodLavanderia },
                            { label: 'Combo Lava-Jato', url: GENERATED_IMAGES.bannerAutomotivo },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setKitImage(preset.url);
                                setKitImageUploadStatus(`Imagem padrão "${preset.label}" aplicada.`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FFFBEB] border border-zinc-300 text-[11px] font-bold text-zinc-700 cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setIsKitFormOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs cursor-pointer shadow-xs"
                    >
                      Salvar Kit na Vitrine da Home
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Kits Cadastrados com Imagem */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {kits.map((kit) => {
                  const resolvedItems = kit.items
                    .map((it) => {
                      const product = products.find((p) => p.id === it.productId);
                      return product ? { product, quantity: it.quantity } : null;
                    })
                    .filter(
                      (entry): entry is { product: Product; quantity: number } =>
                        Boolean(entry)
                    );

                  const regularSum = resolvedItems.reduce(
                    (acc, entry) => acc + getEffectivePrice(entry.product) * entry.quantity,
                    0
                  );

                  return (
                    <div
                      key={kit.id}
                      className={`rounded-2xl border overflow-hidden bg-white flex flex-col justify-between shadow-2xs ${
                        kit.active ? 'border-zinc-200' : 'border-zinc-200 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="relative h-36 bg-zinc-100 border-b border-zinc-100 overflow-hidden">
                          <ProductImageWithFallback
                            src={kit.imageUrl}
                            alt={kit.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#FFBE00] text-zinc-950 font-mono text-[10px] font-extrabold shadow-xs">
                            {kit.badge}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleKitActive(kit)}
                            className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold cursor-pointer ${
                              kit.active
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-700 text-white'
                            }`}
                          >
                            {kit.active ? 'ATIVO NA HOME' : 'OCULTO'}
                          </button>
                        </div>

                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] font-bold text-zinc-600">
                              SKU {kit.sku || `KIT-${kit.id.replace(/^kit-/i, '').toUpperCase()}`}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              {resolvedItems.reduce((acc, e) => acc + e.quantity, 0)} un.
                            </span>
                          </div>
                          <h3 className="font-display text-sm font-extrabold text-zinc-900">
                            {kit.title}
                          </h3>
                          <p className="text-xs text-zinc-500 line-clamp-2">
                            {kit.description}
                          </p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {resolvedItems.map(({ product, quantity }) => (
                              <span
                                key={`${kit.id}-${product.id}`}
                                className="px-2 py-0.5 rounded-md bg-[#FAFAFA] border border-zinc-200 text-[10px] font-bold text-zinc-700"
                              >
                                {quantity}x {product.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border-t border-zinc-100 bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-2">
                        <div>
                          {regularSum > kit.promoPrice && (
                            <span className="block text-[10px] text-zinc-400 line-through font-mono">
                              Avulso: {formatCurrency(regularSum)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleKitPriceVisibility(kit)}
                            className={`mt-0.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border cursor-pointer ${
                              !settings.hideAllPrices && kit.showPrice !== false
                                ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950'
                                : 'bg-rose-50 border-rose-200 text-[#E3262E]'
                            }`}
                          >
                            {!settings.hideAllPrices && kit.showPrice !== false
                              ? `Visível: ${formatCurrency(kit.promoPrice)}`
                              : 'Valor Oculto (Sob Consulta)'}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditKit(kit)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-xs font-bold text-zinc-800 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteKit(kit.id)}
                            aria-label={`Excluir ${kit.title}`}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB BANNERS & PROMOÇÕES AUTOMÁTICAS ("Cadastrar Banner das Promoções Automáticas e Escolher Produtos do Banner") */}
          {activeTab === 'banners' && (
            <div className="space-y-4 no-print">
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-zinc-900">
                    Banners Rotativos & Campanhas de Ofertas ({banners.length})
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Cadastre banners automáticos para o Carrossel do Topo ou Banner Inferior, envie fotos e puxe na lupa quais produtos em oferta aparecem dentro de cada banner.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateBanner}
                  className="px-4 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cadastrar Novo Banner Promocional</span>
                </button>
              </div>

              {isBannerFormOpen && (
                <form
                  onSubmit={handleSaveBanner}
                  className="bg-white rounded-3xl border-2 border-[#FFBE00] p-6 shadow-md space-y-5"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] border border-[#FFBE00] text-[#E3262E] flex items-center justify-center">
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase font-extrabold text-[#E3262E] block">
                          GESTOR DE VITRINE & PROMOÇÃO AUTOMÁTICA
                        </span>
                        <h3 className="font-display text-lg font-extrabold text-zinc-900">
                          {editingBanner
                            ? `Editar Banner: ${editingBanner.title}`
                            : 'Cadastrar Novo Banner de Promoção Automática'}
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBannerFormOpen(false)}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  {bannerFormError && (
                    <div
                      role="alert"
                      className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{bannerFormError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-7 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Onde este Banner vai aparecer? *
                          </label>
                          <select
                            value={bannerSlot}
                            onChange={(e) => setBannerSlot(e.target.value as BannerSlotType)}
                            className="w-full px-3 py-2 bg-[#FFFBEB] border border-[#FFBE00] rounded-xl text-xs font-extrabold text-zinc-900"
                          >
                            <option value="hero_carousel">
                              Carrossel Principal Rotativo (Topo da Home)
                            </option>
                            <option value="bottom_banner">
                              Banner Promocional Destaque (Parte Inferior da Home)
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Estilo Visual / Cores do Banner *
                          </label>
                          <select
                            value={bannerTheme}
                            onChange={(e) => setBannerTheme(e.target.value as BannerThemeType)}
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900"
                          >
                            <option value="yellow_red">
                              Amarelo & Vermelho Multi-Ofertas (Estilo Todimo/Drogasil)
                            </option>
                            <option value="dark_gold">
                              Preto & Ouro Imbatível (Alto Contraste)
                            </option>
                            <option value="crimson_wine">
                              Vinho &amp; Dourado Express (Institucional &amp; Produtos)
                            </option>
                            <option value="logistics_fleet">
                              Logística Limper MT (Moto Limper, Caminhão &amp; MT)
                            </option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Selo Superior (Badge) *
                          </label>
                          <input
                            type="text"
                            required
                            value={bannerBadge}
                            onChange={(e) => setBannerBadge(e.target.value)}
                            placeholder="Ex: SEMANA DE OFERTAS · ATÉ 25% OFF"
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Texto do Botão (CTA)
                          </label>
                          <input
                            type="text"
                            value={bannerCtaText}
                            onChange={(e) => setBannerCtaText(e.target.value)}
                            placeholder="Ex: Aproveitar Ofertas"
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Título Principal da Promoção *
                        </label>
                        <input
                          type="text"
                          required
                          value={bannerTitle}
                          onChange={(e) => setBannerTitle(e.target.value)}
                          placeholder="Ex: Festival de Galões 5L Quimiprol com Preço de Fábrica"
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Subtítulo / Explicação da Campanha
                          </label>
                          <input
                            type="text"
                            value={bannerSubtitle}
                            onChange={(e) => setBannerSubtitle(e.target.value)}
                            placeholder="Ex: Compre online e retire em 15 minutos na Av. Couto Magalhães, 2820"
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1">
                            Categoria Alvo do Botão
                          </label>
                          <select
                            value={bannerCategoryId}
                            onChange={(e) => setBannerCategoryId(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                          >
                            <option value="">Ver Todas as Ofertas</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Search & Link Offer Products into this Banner */}
                      <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-zinc-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-extrabold text-zinc-900 block">
                              Produtos em Oferta Exibidos Dentro Deste Banner (Até 3 Destaques)
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              Pesquise na lupa e selecione os produtos que aparecerão com foto e preço dentro do banner
                            </span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FFBE00] font-mono text-[11px] font-extrabold text-[#E3262E]">
                            {bannerFeaturedProductIds.length} vinculado(s)
                          </span>
                        </div>

                        <div className="relative">
                          <Search className="w-4 h-4 text-[#E3262E] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="search"
                            value={bannerProductSearch}
                            onChange={(e) => setBannerProductSearch(e.target.value)}
                            placeholder="Pesquisar produto na lupa para colocar neste banner..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="max-h-44 overflow-y-auto divide-y divide-zinc-100 bg-white rounded-xl border border-zinc-200 p-1.5">
                          {products
                            .filter((p) => {
                              if (p.status !== 'active') return false;
                              const q = bannerProductSearch.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                p.title.toLowerCase().includes(q) ||
                                p.sku.toLowerCase().includes(q)
                              );
                            })
                            .map((prod) => {
                              const isLinked = bannerFeaturedProductIds.includes(prod.id);
                              return (
                                <div
                                  key={`banner-pick-${prod.id}`}
                                  className={`py-1.5 px-2 flex items-center justify-between gap-2 text-xs rounded-lg ${
                                    isLinked ? 'bg-[#FFFBEB]' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={prod.imageUrl}
                                      alt={prod.title}
                                      className="w-8 h-8 rounded-lg object-cover border border-zinc-200 shrink-0"
                                    />
                                    <div className="truncate">
                                      <strong className="text-zinc-900 block truncate">
                                        {prod.title}
                                      </strong>
                                      <span className="font-mono text-[10px] text-zinc-500">
                                        {prod.volumeLabel} · {formatCurrency(getEffectivePrice(prod))}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBannerFeaturedProductIds((prev) =>
                                        prev.includes(prod.id)
                                          ? prev.filter((id) => id !== prod.id)
                                          : [...prev, prod.id]
                                      );
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                                      isLinked
                                        ? 'bg-[#E3262E] text-white'
                                        : 'bg-zinc-100 hover:bg-[#FFBE00] text-zinc-900'
                                    }`}
                                  >
                                    {isLinked ? '✓ No Banner' : '+ Colocar no Banner'}
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Banner Image Upload & URL */}
                    <div className="lg:col-span-5 p-4 rounded-2xl bg-[#FAFAFA] border border-zinc-200 space-y-3 self-start">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[#E3262E]" />
                        <h4 className="font-display text-sm font-extrabold text-zinc-900">
                          Imagem do Banner (Link ou Upload JPG/PNG/WEBP)
                        </h4>
                      </div>

                      <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-white h-40 relative">
                        <img
                          src={bannerImage}
                          alt={bannerTitle || 'Preview do Banner'}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#FFBE00] text-zinc-950 font-mono text-[10px] font-extrabold shadow-xs">
                          {bannerSlot === 'hero_carousel'
                            ? 'CARROSSEL TOPO'
                            : 'BANNER INFERIOR'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Link Direto da Imagem (URL)
                        </label>
                        <input
                          type="text"
                          value={bannerImage}
                          onChange={(e) => setBannerImage(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-mono"
                        />
                      </div>

                      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-extrabold cursor-pointer w-full justify-center">
                        <Upload className="w-4 h-4 text-[#FFBE00]" />
                        <span>Enviar Imagem do Banner (JPG, PNG, WEBP)</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          onChange={handleBannerImageUpload}
                          className="hidden"
                        />
                      </label>

                      {bannerImageUploadStatus && (
                        <p className="text-[11px] font-bold text-emerald-700">
                          {bannerImageUploadStatus}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setIsBannerFormOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs cursor-pointer shadow-xs"
                    >
                      Salvar Banner Promocional
                    </button>
                  </div>
                </form>
              )}

              {/* List of Registered Banners */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...banners]
                  .sort((a, b) => a.order - b.order)
                  .map((b, idx) => {
                    const linkedProds = b.featuredProductIds
                      .map((id) => products.find((p) => p.id === id))
                      .filter((p): p is Product => Boolean(p));

                    return (
                      <div
                        key={b.id}
                        className={`rounded-2xl border overflow-hidden bg-white flex flex-col justify-between shadow-2xs ${
                          b.active ? 'border-zinc-200' : 'border-zinc-200 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="relative h-36 bg-zinc-900 overflow-hidden">
                            <img
                              src={b.imageUrl}
                              alt={b.title}
                              className="w-full h-full object-cover opacity-85"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                            <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#FFBE00] text-zinc-950 font-mono text-[10px] font-extrabold">
                              {b.slot === 'hero_carousel'
                                ? `SLIDE TOPO #${idx + 1}`
                                : 'BANNER INFERIOR HOME'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleBannerActive(b)}
                              className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-extrabold cursor-pointer ${
                                b.active
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-zinc-700 text-white'
                              }`}
                            >
                              {b.active ? 'ATIVO NA LOJA' : 'PAUSADO'}
                            </button>
                            <div className="absolute bottom-2.5 left-3 right-3 text-white">
                              <span className="text-[10px] font-mono uppercase text-[#FFBE00] font-bold block">
                                {b.badge}
                              </span>
                              <h3 className="font-display text-sm font-extrabold leading-tight truncate">
                                {b.title}
                              </h3>
                            </div>
                          </div>

                          <div className="p-4 space-y-2.5">
                            <p className="text-xs text-zinc-500 line-clamp-2">
                              {b.subtitle}
                            </p>
                            <div>
                              <span className="block text-[10px] font-mono uppercase text-zinc-400 font-bold mb-1">
                                Ofertas exibidas neste banner ({linkedProds.length}):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {linkedProds.map((p) => (
                                  <span
                                    key={`${b.id}-${p.id}`}
                                    className="px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[10px] font-bold text-zinc-900"
                                  >
                                    {p.title} ({formatCurrency(getEffectivePrice(p))})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3.5 border-t border-zinc-100 bg-[#FAFAFA] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleReorderBanner(b.id, 'up')}
                              className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReorderBanner(b.id, 'down')}
                              className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditBanner(b)}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-xs font-bold text-zinc-800 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar / Escolher Ofertas</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBanner(b.id)}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB CUPONS DE DESCONTO ("Cadastrar Cupom na ADM") */}
          {activeTab === 'coupons' && (
            <div className="space-y-4 no-print">
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-zinc-900">
                    Cupons de Desconto & Vouchers Atacado ({coupons.length})
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Crie cupons em porcentagem (%) ou valor fixo (R$). Os cupons ativos aparecem na Home e na Cesta do cliente para aplicação em 1 clique!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateCoupon}
                  className="px-4 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cadastrar Novo Cupom</span>
                </button>
              </div>

              {isCouponFormOpen && (
                <form
                  onSubmit={handleSaveCoupon}
                  className="bg-white rounded-3xl border-2 border-[#FFBE00] p-6 shadow-md space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <TicketPercent className="w-5 h-5 text-[#E3262E]" />
                      <h3 className="font-display text-base font-extrabold text-zinc-900">
                        {editingCoupon
                          ? `Editar Cupom: ${editingCoupon.code}`
                          : 'Cadastrar Novo Cupom Promocional Limper MT'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCouponFormOpen(false)}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  {couponFormError && (
                    <div
                      role="alert"
                      className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{couponFormError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Código do Cupom *
                      </label>
                      <input
                        type="text"
                        required
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Ex: LIMPER15"
                        className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono font-extrabold uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Tipo de Desconto *
                      </label>
                      <select
                        value={couponType}
                        onChange={(e) =>
                          setCouponType(e.target.value as 'percent' | 'fixed')
                        }
                        className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold"
                      >
                        <option value="percent">Porcentagem (% OFF)</option>
                        <option value="fixed">Valor Fixo em Reais (R$ OFF)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        {couponType === 'percent'
                          ? 'Desconto (%)'
                          : 'Valor do Desconto (R$)'}{' '}
                        *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={couponValue}
                        onChange={(e) => setCouponValue(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Pedido Mínimo (R$)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={couponMinOrder}
                        onChange={(e) => setCouponMinOrder(e.target.value)}
                        placeholder="0 = Sem mínimo"
                        className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Descrição Comercial (Aparece na Cesta)
                      </label>
                      <input
                        type="text"
                        value={couponDesc}
                        onChange={(e) => setCouponDesc(e.target.value)}
                        placeholder="Ex: 15% OFF Especial Semana da Limpeza Limper MT"
                        className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl cursor-pointer shadow-xs"
                      >
                        Salvar Cupom na Loja
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {coupons.map((cp) => (
                  <div
                    key={cp.id}
                    className={`rounded-2xl border p-4 bg-white flex flex-col justify-between gap-3 shadow-2xs ${
                      cp.active ? 'border-zinc-200' : 'border-zinc-200 opacity-60'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#FFFBEB] border border-[#FFBE00] font-mono text-xs font-extrabold text-[#E3262E]">
                          {cp.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleCouponActive(cp)}
                          className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold cursor-pointer ${
                            cp.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          {cp.active ? 'ATIVO' : 'INATIVO'}
                        </button>
                      </div>

                      <div className="font-mono text-lg font-black text-zinc-950">
                        {cp.discountType === 'percent'
                          ? `${cp.discountValue}% OFF`
                          : `-${formatCurrency(cp.discountValue)}`}
                      </div>

                      <p className="text-xs text-zinc-600 leading-snug">
                        {cp.description}
                      </p>

                      <div className="text-[11px] font-mono text-zinc-400">
                        {cp.minOrderValue && cp.minOrderValue > 0
                          ? `Pedido mín.: ${formatCurrency(cp.minOrderValue)}`
                          : 'Sem valor mínimo de pedido'}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => openEditCoupon(cp)}
                        className="text-xs font-bold text-zinc-700 hover:text-zinc-950 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(cp.id)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: GESTÃO DE CATEGORIAS */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
              <form
                onSubmit={handleSaveCategory}
                className="lg:col-span-5 bg-white p-6 rounded-2xl border border-zinc-200 space-y-4 self-start"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-extrabold text-zinc-900">
                    {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                  </h2>
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setCatName('');
                        setCatShortName('');
                        setCatDesc('');
                        setCatIcon('SprayCan');
                        setCatIconSearch('');
                      }}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-900 cursor-pointer"
                    >
                      Cancelar edição
                    </button>
                  )}
                </div>

                {categoryFormError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{categoryFormError}</span>
                  </div>
                )}

                {categoryFeedback && (
                  <div
                    role="status"
                    className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{categoryFeedback}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Nome Completo da Linha *
                    </label>
                    <input
                      type="text"
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="Ex: Linha Piscina & Tratamento"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Nome Curto (Ícone Circular) *
                    </label>
                    <input
                      type="text"
                      required
                      value={catShortName}
                      onChange={(e) => setCatShortName(e.target.value)}
                      placeholder="Ex: Piscina"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Prévia na Loja
                    </label>
                    <div className="px-3 py-1.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#FFBE00] text-zinc-950 flex items-center justify-center shrink-0">
                        <CategoryIcon name={catIcon} className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-extrabold text-zinc-900 truncate">
                        {catShortName.trim() || 'Nome Curto'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Descrição da Linha
                  </label>
                  <input
                    type="text"
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Ex: Cloro granulado, algicida, clarificante e limpa bordas."
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-zinc-700">
                      Ícone da Linha ({CATEGORY_ICON_CATALOG.length} opções de limpeza &amp; segmentos)
                    </label>
                    <span className="font-mono text-[10px] font-bold text-[#B45309]">
                      {CATEGORY_ICON_CATALOG.find((i) => i.name === catIcon)?.label || catIcon}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={catIconSearch}
                      onChange={(e) => setCatIconSearch(e.target.value)}
                      placeholder="Buscar ícone (ex: spray, piscina, cloro, cozinha, pet)..."
                      className="w-full pl-8 pr-3 py-1.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                    />
                  </div>

                  {(() => {
                    const q = catIconSearch.trim().toLowerCase();
                    const filteredIcons = CATEGORY_ICON_CATALOG.filter(
                      (item) =>
                        !q ||
                        item.label.toLowerCase().includes(q) ||
                        item.name.toLowerCase().includes(q) ||
                        item.keywords.toLowerCase().includes(q)
                    );

                    if (filteredIcons.length === 0) {
                      return (
                        <div className="p-4 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-center text-xs text-zinc-500">
                          Nenhum ícone encontrado para &ldquo;{catIconSearch}&rdquo;.{' '}
                          <button
                            type="button"
                            onClick={() => setCatIconSearch('')}
                            className="font-bold text-zinc-900 underline cursor-pointer"
                          >
                            Ver todos ({CATEGORY_ICON_CATALOG.length})
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-1">
                        {filteredIcons.map((item) => {
                          const isSelected = catIcon === item.name;
                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => setCatIcon(item.name)}
                              title={`${item.label} (${item.name})`}
                              className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#FFBE00] text-zinc-950 border-[#F59E0B] font-extrabold shadow-2xs'
                                  : 'bg-[#FAFAFA] hover:bg-zinc-100 text-zinc-700 border-zinc-200 font-medium'
                              }`}
                            >
                              <CategoryIcon name={item.name} className="w-5 h-5 shrink-0" />
                              <span className="text-[10px] leading-tight line-clamp-2">
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl cursor-pointer shadow-2xs"
                >
                  {editingCategory ? 'Atualizar Categoria' : 'Adicionar Categoria'}
                </button>
              </form>

              <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200 divide-y divide-zinc-100">
                {[...categories]
                  .sort((a, b) => a.order - b.order)
                  .map((cat, idx) => (
                    <div
                      key={cat.id}
                      className="p-4 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] flex items-center justify-center shrink-0">
                          <CategoryIcon name={cat.icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-900">
                            {idx + 1}. {cat.name}{' '}
                            <span className="text-xs font-normal text-zinc-400">
                              ({cat.shortName})
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">{cat.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReorderCategory(cat.id, 'up')}
                          aria-label={`Subir ${cat.name}`}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 cursor-pointer"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorderCategory(cat.id, 'down')}
                          aria-label={`Descer ${cat.name}`}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 cursor-pointer"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setCatName(cat.name);
                            setCatShortName(cat.shortName);
                            setCatDesc(cat.description);
                            setCatIcon(cat.icon);
                          }}
                          aria-label={`Editar categoria ${cat.name}`}
                          title={`Editar ${cat.name}`}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-900 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          aria-label={`Excluir categoria ${cat.name}`}
                          title={`Excluir ${cat.name}`}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 4: CRM DE CLIENTES & RECOMPRA */}
          {activeTab === 'customers' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4 no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-zinc-900">
                    Base de Clientes & Histórico de Recompra ({customersList.length})
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Acompanhe condomínios, lava-jatos, clínicas e clientes residenciais com contato direto via WhatsApp.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-[#FAFAFA] text-[11px] font-mono uppercase text-zinc-500">
                      <th className="py-3 px-4">Cliente / Empresa</th>
                      <th className="py-3 px-4">WhatsApp</th>
                      <th className="py-3 px-4">Pedidos</th>
                      <th className="py-3 px-4">Modalidade</th>
                      <th className="py-3 px-4">Total Acumulado</th>
                      <th className="py-3 px-4 text-right">Contato Rápido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {customersList.map((cust) => {
                      const clean = normalizePhone(cust.phone);
                      const waPhone = clean.startsWith('55') ? clean : `55${clean}`;
                      return (
                        <tr key={cust.phone + cust.name} className="hover:bg-zinc-50">
                          <td className="py-3 px-4 font-bold text-zinc-900">
                            {cust.name}
                            <span className="block font-mono text-[10px] text-zinc-400">
                              Último pedido: {cust.lastOrderId}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-700">
                            {formatPhone(cust.phone)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            {cust.ordersCount} pedido(s)
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-bold text-[11px]">
                              {cust.lastDeliveryType === 'pickup'
                                ? 'Retirada Balcão'
                                : 'Delivery Local'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-extrabold text-zinc-950 tabular-nums">
                            {formatCurrency(cust.totalSpent)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <a
                              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                                `Olá, ${cust.name}! Aqui é da Limper MT (Av. Couto Magalhães, 2820). Gostaria de repor seu estoque de produtos Quimiprol com desconto?`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Oferecer Reposição</span>
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: CONFIGURAÇÕES GERAIS (WHATSAPP, PIX, FRETE) */}
          {activeTab === 'settings' && (
            <div className="space-y-6 no-print">
              {/* Dedicated WhatsApp Registration & 1-Click Switcher for Quotes/Orders */}
              <AdminWhatsAppManager
                settings={settings}
                actorLabel={formatAdminActorLabel(currentAdminUser)}
                actorUsername={currentAdminUser?.username}
                actorRole={currentAdminUser?.role}
                onUpdateSettings={handleUpdateWhatsAppSettings}
                onRecordSecurityEvent={(input) => onRecordSecurityEvent?.(input)}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleSaveSettingsSubmit}
                className="lg:col-span-7 bg-white p-6 rounded-2xl border border-zinc-200 space-y-4"
              >
                <h2 className="font-display text-lg font-extrabold text-zinc-900">
                  Dados de Recebimento PIX, Endereço &amp; Logística
                </h2>

                {settingsFormError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{settingsFormError}</span>
                  </div>
                )}

                {savedSettingsBanner && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Configurações da Limper MT salvas com sucesso!</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-zinc-700">
                      WhatsApp ativo nos orçamentos:{' '}
                      <strong className="font-mono text-zinc-950">
                        {settings.whatsappDisplay}
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      document
                        .getElementById('admin-whatsapp-manager')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="text-[11px] font-extrabold text-emerald-800 hover:underline cursor-pointer"
                  >
                    Alterar no painel acima
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Tipo de Chave PIX
                    </label>
                    <select
                      value={formSettings.pixKeyType}
                      onChange={(e) =>
                        setFormSettings({
                          ...formSettings,
                          pixKeyType: e.target.value as StoreSettings['pixKeyType'],
                        })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                    >
                      <option value="CNPJ">CNPJ</option>
                      <option value="Celular">Celular</option>
                      <option value="E-mail">E-mail</option>
                      <option value="Aleatória">Chave Aleatória</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Chave PIX da Limper MT
                    </label>
                    <input
                      type="text"
                      value={formSettings.pixKey}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, pixKey: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Favorecido / Razão Social PIX
                  </label>
                  <input
                    type="text"
                    value={formSettings.pixBeneficiary}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, pixBeneficiary: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Endereço Oficial da Loja p/ Retirada no Balcão
                  </label>
                  <input
                    type="text"
                    value={formSettings.storeAddress}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, storeAddress: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Frete Grátis Acima de (R$)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={formSettings.freeShippingThreshold}
                      onChange={(e) =>
                        setFormSettings({
                          ...formSettings,
                          freeShippingThreshold: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Taxa Padrão Outros Bairros (R$)
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      value={formSettings.defaultDeliveryFee}
                      onChange={(e) =>
                        setFormSettings({
                          ...formSettings,
                          defaultDeliveryFee: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                {/* LOGÍSTICA LIMPER MT: MOTO LIMPER, CAMINHÃO & INTERIOR DE MT */}
                {(() => {
                  const currentLog = getLogisticsSettings(formSettings);
                  return (
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-mono uppercase font-extrabold text-[#E3262E] flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5" />
                            <span>REGRAS DE LOGÍSTICA LIMPER MT (BANNER, SITE &amp; CARRINHO)</span>
                          </span>
                          <p className="text-xs text-zinc-600 mt-0.5">
                            Defina os pedidos mínimos da Moto Limper e Entrega de Caminhão para Várzea Grande e Cuiabá. Ao salvar, o banner rotativo, o site e o checkout atualizam automaticamente.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-white border border-amber-200 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-900">
                            <Bike className="w-4 h-4 text-[#D97706]" />
                            <span>Moto Limper (Pequenos itens)</span>
                          </div>
                          <div>
                            <label
                              htmlFor="admin-moto-vg-min"
                              className="block text-[11px] font-bold text-zinc-700 mb-1"
                            >
                              Mínimo Várzea Grande - MT (R$)
                            </label>
                            <input
                              id="admin-moto-vg-min"
                              type="number"
                              min="0"
                              step="1"
                              value={formSettings.motoLimperVgMin ?? currentLog.motoVgMin}
                              onChange={(e) =>
                                setFormSettings({
                                  ...formSettings,
                                  motoLimperVgMin: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="admin-moto-cba-min"
                              className="block text-[11px] font-bold text-zinc-700 mb-1"
                            >
                              Mínimo Cuiabá - MT (R$)
                            </label>
                            <input
                              id="admin-moto-cba-min"
                              type="number"
                              min="0"
                              step="1"
                              value={formSettings.motoLimperCbaMin ?? currentLog.motoCbaMin}
                              onChange={(e) =>
                                setFormSettings({
                                  ...formSettings,
                                  motoLimperCbaMin: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-zinc-200 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-900">
                            <Truck className="w-4 h-4 text-[#E3262E]" />
                            <span>Entrega de Caminhão (Galões / Lotes)</span>
                          </div>
                          <div>
                            <label
                              htmlFor="admin-truck-vg-min"
                              className="block text-[11px] font-bold text-zinc-700 mb-1"
                            >
                              Mínimo Várzea Grande - MT (R$)
                            </label>
                            <input
                              id="admin-truck-vg-min"
                              type="number"
                              min="0"
                              step="1"
                              value={formSettings.truckVgMin ?? currentLog.truckVgMin}
                              onChange={(e) =>
                                setFormSettings({
                                  ...formSettings,
                                  truckVgMin: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="admin-truck-cba-min"
                              className="block text-[11px] font-bold text-zinc-700 mb-1"
                            >
                              Mínimo Cuiabá - MT (R$)
                            </label>
                            <input
                              id="admin-truck-cba-min"
                              type="number"
                              min="0"
                              step="1"
                              value={formSettings.truckCbaMin ?? currentLog.truckCbaMin}
                              onChange={(e) =>
                                setFormSettings({
                                  ...formSettings,
                                  truckCbaMin: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="admin-interior-mt-note"
                          className="block text-[11px] font-bold text-zinc-700 mb-1"
                        >
                          Orientação para Restante do Estado de Mato Grosso (Consulta WhatsApp)
                        </label>
                        <input
                          id="admin-interior-mt-note"
                          type="text"
                          value={formSettings.interiorMtNote ?? currentLog.interiorMtNote}
                          onChange={(e) =>
                            setFormSettings({
                              ...formSettings,
                              interiorMtNote: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  );
                })()}

                  {/* MODO DE CATÁLOGO (CONTROLE GLOBAL + SELETIVO) & PARCELAMENTO PADRÃO */}
                  <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono uppercase font-extrabold text-[#B45309] block">
                          CONTROLE DO CATÁLOGO &amp; PARCELAMENTO PADRÃO
                        </span>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          Você pode ocultar ou mostrar valores de todos os produtos aqui ou escolher itens específicos na aba &ldquo;Produtos &amp; Fotos&rdquo;.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 font-mono text-[11px] font-bold text-zinc-800">
                        {visiblePriceCount}/{products.length} produtos c/ valor
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleHideAllProductPrices}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#E3262E] text-xs font-extrabold cursor-pointer"
                      >
                        Ocultar Valores de Todos os Produtos
                      </button>
                      <button
                        type="button"
                        onClick={handleShowAllProductPrices}
                        className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#FFBE00] text-xs font-extrabold cursor-pointer"
                      >
                        Exibir Valores em Todos os Produtos
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Parcelamento Padrão da Loja
                        </label>
                        <select
                          value={String(formSettings.defaultInstallmentsCount ?? 3)}
                          onChange={(e) =>
                            setFormSettings({
                              ...formSettings,
                              defaultInstallmentsCount: Number(e.target.value) || 3,
                            })
                          }
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900"
                        >
                          {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                            <option key={n} value={String(n)}>
                              {n === 1 ? '1x (À vista)' : `Até ${n}x no cartão`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Condição Padrão de Juros
                        </label>
                        <select
                          value={
                            (formSettings.defaultInstallmentsNoInterest ?? true)
                              ? 'no_interest'
                              : 'with_card'
                          }
                          onChange={(e) =>
                            setFormSettings({
                              ...formSettings,
                              defaultInstallmentsNoInterest: e.target.value === 'no_interest',
                            })
                          }
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900"
                        >
                          <option value="no_interest">Sem juros (s/ juros)</option>
                          <option value="with_card">No cartão (c/ taxa)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs rounded-xl cursor-pointer"
                  >
                    Salvar Configurações da Loja
                  </button>
                </form>

              {/* Neighborhood Fees Table */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-zinc-200 space-y-4 self-start">
                <h3 className="font-display text-base font-extrabold text-zinc-900">
                  Tabela de Taxas de Entrega por Bairro
                </h3>

                <div className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={newNeighborhoodName}
                    onChange={(e) => setNewNeighborhoodName(e.target.value)}
                    placeholder="Nome do Bairro"
                    className="col-span-5 px-2.5 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-lg text-xs"
                  />
                  <select
                    value={newNeighborhoodCity}
                    onChange={(e) =>
                      setNewNeighborhoodCity(e.target.value as 'Cuiabá' | 'Várzea Grande')
                    }
                    className="col-span-3 px-2 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-lg text-xs"
                  >
                    <option value="Várzea Grande">Várzea Grande</option>
                    <option value="Cuiabá">Cuiabá</option>
                  </select>
                  <input
                    type="number"
                    step="0.50"
                    value={newNeighborhoodFee}
                    onChange={(e) => setNewNeighborhoodFee(e.target.value)}
                    className="col-span-2 px-2 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddNeighborhood}
                    className="col-span-2 bg-[#FFBE00] text-zinc-950 font-extrabold text-xs rounded-lg flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="divide-y divide-zinc-100 text-xs">
                  {formSettings.neighborhoodFees.map((nb) => (
                    <div
                      key={nb.id}
                      className="py-2.5 flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-zinc-900">{nb.name}</strong>{' '}
                        <span className="text-zinc-400">({nb.city})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-zinc-900 tabular-nums">
                          {formatCurrency(nb.fee)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveNeighborhood(nb.id)}
                          aria-label={`Remover bairro ${nb.name}`}
                          title={`Remover ${nb.name}`}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </div>
          )}

          {/* TAB: ÁREA DO VENDEDOR (ORÇAMENTOS COM PDF E WHATSAPP) */}
          {activeTab === 'seller_area' && (
            <AdminSellerArea
              currentAdminUser={currentAdminUser}
              products={products}
              kits={kits}
              categories={categories}
              settings={settings}
              quotes={sellerQuotes}
              onSaveQuotes={persistSellerQuotes}
              sellerCustomProducts={sellerCustomProducts}
              onSaveSellerCustomProducts={persistSellerCustomProducts}
              onRecordSecurityEvent={(input) => onRecordSecurityEvent?.(input)}
            />
          )}

          {/* TAB: USUÁRIOS & ACESSOS (EXCLUSIVO MASTER) */}
          {activeTab === 'users' && currentAdminUser && (
            <AdminUsersTab
              users={effectiveAdminUsers}
              currentUser={currentAdminUser}
              securityLogs={securityLogs}
              onSaveUsers={persistAdminUsers}
              onRecordSecurityEvent={(input) => onRecordSecurityEvent?.(input)}
              onInspectUserLogsInSecurity={(targetUsername) => {
                setSecurityActorFilter(targetUsername);
                setActiveTab('security');
              }}
            />
          )}

          {/* TAB: RELATÓRIOS DE ACESSO E SEGURANÇA */}
          {activeTab === 'security' && (
            <AdminSecurityTab
              orders={orders}
              securityLogs={securityLogs}
              adminUsers={effectiveAdminUsers}
              currentAdminUser={currentAdminUser}
              initialActorFilter={securityActorFilter}
              onClearInitialActorFilter={() => setSecurityActorFilter('')}
              siteBackups={effectiveSiteBackups}
              backupSchedule={effectiveBackupSchedule}
              currentSitePayload={{
                categories,
                products,
                deletedProducts,
                kits,
                coupons,
                banners,
                orders,
                settings,
                adminUsers: effectiveAdminUsers,
                securityLogs,
                sellerQuotes,
                sellerCustomProducts,
              }}
              onSaveSiteBackups={persistSiteBackups}
              onSaveBackupSchedule={persistBackupSchedule}
              onPreviewBackupReminder={(style) => setPreviewReminderStyle(style)}
              onRestoreSiteBackup={handleRestoreBackupSnapshot}
              onAutoRepairCatalog={handleAutoRepairCatalog}
              isolationContext={isolationContext}
              onRecordSecurityEvent={(input) => onRecordSecurityEvent?.(input)}
              onClearSecurityLogs={() => onClearSecurityLogs?.()}
            />
          )}
        </div>
      </div>

      {/* GLOBAL ADMIN COMMAND PALETTE (CTRL+K / CMD+K) */}
      <AdminCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        currentUser={currentAdminUser}
        products={products}
        orders={orders}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onQuickCreateProduct={() => {
          setActiveTab('products');
          openCreateProduct();
        }}
        onQuickCreateKit={() => {
          setActiveTab('kits');
          openCreateKit();
        }}
        onQuickCreateBanner={() => {
          setActiveTab('banners');
          openCreateBanner();
        }}
        onQuickCreateCoupon={() => {
          setActiveTab('coupons');
          openCreateCoupon();
        }}
        onEditProduct={(prod) => {
          setActiveTab('products');
          openEditProduct(prod);
        }}
        onOpenOrderInKanban={(orderId) => {
          setActiveTab('kanban');
          setKanbanDatePreset('all');
          setKanbanSearchQuery(orderId);
        }}
        onOpenBackupVault={() => {
          setActiveTab('security');
          window.setTimeout(() => {
            document
              .getElementById('admin-backup-vault')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 80);
        }}
      />

      {/* PRINTABLE PICKING COMMAND MODAL (COMANDA DE SEPARAÇÃO) */}
      {printOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="picking-slip-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPrintOrder(null);
          }}
          className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0 print:block"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-zinc-300 shadow-2xl space-y-4 my-auto print:shadow-none print:border-0 print:max-w-full print:p-4">
            <div className="flex items-start justify-between border-b border-dashed border-zinc-300 pb-3">
              <div>
                <p className="text-[11px] font-mono uppercase text-zinc-500">
                  COMANDA INTERNA DE SEPARAÇÃO · LIMPER MT
                </p>
                <h2
                  id="picking-slip-title"
                  className="font-mono text-xl font-extrabold text-zinc-900"
                >
                  Pedido {printOrder.id}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPrintOrder(null)}
                aria-label="Fechar comanda"
                className="p-1 text-zinc-400 hover:text-zinc-700 no-print cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs font-mono space-y-1 text-zinc-900 border-b border-dashed border-zinc-300 pb-3">
              <div>CLIENTE: {printOrder.customerName}</div>
              {printOrder.customerDocument && printOrder.customerDocument.trim() && (
                <div>
                  {printOrder.customerDocumentType === 'cnpj' ||
                  printOrder.customerDocument.replace(/\D/g, '').length > 11
                    ? 'CNPJ'
                    : 'CPF'}
                  : {printOrder.customerDocument}
                </div>
              )}
              <div>WHATSAPP: {formatPhone(printOrder.customerPhone)}</div>
              <div>
                TIPO:{' '}
                {printOrder.deliveryType === 'delivery'
                  ? 'ENTREGA DELIVERY'
                  : 'RETIRADA NO BALCÃO (AV. COUTO MAGALHÃES, 2820)'}
              </div>
              {printOrder.deliveryType === 'delivery' && printOrder.logisticsMode && (
                <div>
                  LOGÍSTICA:{' '}
                  {formatLogisticsModeLabel(
                    printOrder.logisticsMode,
                    printOrder.address?.interiorCityName
                  )}
                </div>
              )}
              {printOrder.address && (
                <div>
                  ENDEREÇO: {printOrder.address.street}, {printOrder.address.number} -{' '}
                  {printOrder.address.neighborhood} (
                  {printOrder.address.city === 'Interior de MT'
                    ? `${printOrder.address.interiorCityName || 'Interior'} - MT`
                    : `${printOrder.address.city}/MT`}
                  ){printOrder.address.cep ? ` · CEP ${printOrder.address.cep}` : ''}
                </div>
              )}
              <div>PAGAMENTO: {formatPaymentMethodLabel(printOrder)}</div>
              {printOrder.notes && printOrder.notes.trim() && (
                <div>OBS.: {printOrder.notes.trim()}</div>
              )}
            </div>

            <div className="space-y-2 border-b border-dashed border-zinc-300 pb-3">
              <div className="text-xs font-mono font-bold text-zinc-900">
                CHECKLIST DE ESTOQUE:
              </div>
              {printOrder.items.map((item, idx) => {
                const kitBreakdown =
                  item.kitItems && item.kitItems.length > 0
                    ? item.kitItems
                    : kits
                        .find((k) => k.id === item.productId)
                        ?.items.map((ki) => {
                          const p = products.find((pr) => pr.id === ki.productId);
                          return p
                            ? {
                                productId: p.id,
                                sku: p.sku,
                                title: p.title,
                                volumeLabel: p.volumeLabel,
                                quantity: ki.quantity,
                              }
                            : null;
                        })
                        .filter((x): x is NonNullable<typeof x> => Boolean(x)) || [];

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-start justify-between gap-2 text-xs font-mono text-zinc-900">
                      <span className="font-semibold">
                        [ ] {item.quantity}x {item.title} ({item.volumeLabel})
                        {item.sku ? ` [Ref: ${item.sku}]` : ''}
                      </span>
                      <span className="tabular-nums shrink-0 font-bold">
                        {isOrderQuoteOnly(printOrder) || item.priceHidden
                          ? 'Sob consulta'
                          : formatCurrency(item.subtotal)}
                      </span>
                    </div>
                    {kitBreakdown.length > 0 && (
                      <div className="pl-4 ml-1 border-l-2 border-dashed border-zinc-300 space-y-0.5 text-[11px] font-mono text-zinc-700">
                        <div className="text-[10px] uppercase font-bold text-zinc-500">
                          Itens inclusos no kit (separar):
                        </div>
                        {kitBreakdown.map((sub, subIdx) => (
                          <div key={`${idx}-sub-${subIdx}`} className="leading-snug">
                            [ ] {sub.quantity * item.quantity}x {sub.title} (
                            {sub.volumeLabel})
                            {item.quantity > 1 ? ` · ${sub.quantity}x/kit` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between font-mono text-sm font-extrabold text-zinc-900">
              <span>
                {isOrderQuoteOnly(printOrder)
                  ? 'MODO DO PEDIDO:'
                  : 'TOTAL A CONFERIR:'}
              </span>
              <span className="tabular-nums">
                {isOrderQuoteOnly(printOrder)
                  ? 'LISTA S/ VALOR (WHATSAPP)'
                  : formatCurrency(printOrder.total)}
              </span>
            </div>

            <div className="pt-2 flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#FFBE00] text-zinc-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comanda Agora</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintOrder(null)}
                className="px-4 py-2.5 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      <ProductDeleteConfirmModal
        productsToDelete={products.filter((p) =>
          pendingDeleteProductIds.includes(p.id)
        )}
        categories={categories}
        onConfirm={handleConfirmDeleteProducts}
        onCancel={() => setPendingDeleteProductIds([])}
      />

      {/* BACKUP REMINDER NOTIFICATION (TOAST OR MODAL WHEN LAST BACKUP > THRESHOLD) */}
      {isAuthenticated &&
        currentAdminUser?.role === 'master' &&
        (previewReminderStyle !== null ||
          (backupReminderEval.shouldNotify && !reminderDismissedForSession)) && (
          <BackupReminderNotification
            evaluation={backupReminderEval}
            styleOverride={previewReminderStyle}
            isPreview={previewReminderStyle !== null}
            onBackupNow={handleQuickBackupFromReminder}
            onOpenBackupVault={handleOpenBackupVaultFromReminder}
            onSnooze={handleSnoozeBackupReminder}
            onDismiss={() => {
              if (previewReminderStyle !== null) {
                setPreviewReminderStyle(null);
              } else {
                setReminderDismissedForSession(true);
              }
            }}
          />
        )}

      {/* 1-CLICK QUICK BACKUP CONFIRMATION TOAST */}
      {quickBackupFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-40 max-w-sm bg-emerald-950 text-emerald-50 border border-emerald-500/60 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2.5 text-xs font-bold no-print"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="leading-snug">{quickBackupFeedback}</span>
          <button
            type="button"
            onClick={() => setQuickBackupFeedback(null)}
            aria-label="Fechar confirmação de backup"
            className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </section>
  </div>
  );
};
