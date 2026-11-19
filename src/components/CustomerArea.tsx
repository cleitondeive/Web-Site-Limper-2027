import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Bike,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  FlaskConical,
  Heart,
  HelpCircle,
  Home,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Star,
  Store,
  Tag,
  Trash2,
  Truck,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import {
  CustomerAddress,
  CustomerPrivacyPrefs,
  CustomerProfile,
  CustomerSegment,
  DeliveryCityOption,
  Order,
  Product,
  PromoKit,
  StoreSettings,
} from '../types/commerce';
import {
  CUSTOMER_SEGMENT_LABELS,
  DEFAULT_CUSTOMER_PRIVACY,
  buildWhatsAppOrderUrl,
  deleteCustomerAddress,
  deriveFrequentlyBoughtProducts,
  formatCurrency,
  formatLogisticsModeLabel,
  formatPaymentMethodLabel,
  formatPhone,
  getCustomerAddresses,
  getCustomerLatestActiveOrder,
  getCustomerOrderCardStatusLabel,
  getLogisticsSettings,
  getOrderStageMeta,
  getOrdersForCustomer,
  isCustomerLoggedIn,
  isOrderQuoteOnly,
  isProductPriceVisible,
  normalizePhone,
  setDefaultCustomerAddress,
  upsertCustomerAddress,
} from '../utils/commerce';
import {
  DocumentKind,
  detectDocumentType,
  formatCep,
  formatDocumentByType,
  isValidDocument,
  lookupCepAddress,
  onlyDigits,
} from '../utils/brInputMasks';
import { LIMPER_LOGO_URL } from '../data/initialCatalog';
import { ProductImageWithFallback } from './CategoryIcon';

export type CustomerAreaSection =
  | 'summary'
  | 'profile'
  | 'addresses'
  | 'orders'
  | 'frequently_bought'
  | 'favorites'
  | 'benefits'
  | 'privacy';

interface CustomerQuickDrawerProps {
  isOpen: boolean;
  profile: CustomerProfile;
  orders: Order[];
  favoritesCount: number;
  settings: StoreSettings;
  onClose: () => void;
  onNavigateSection: (section: CustomerAreaSection) => void;
  onOpenAllOrders: () => void;
  onOpenCepModal: () => void;
  onSwitchAccount: () => void;
  onLogout: () => void;
}

export const CustomerQuickDrawer: React.FC<CustomerQuickDrawerProps> = ({
  isOpen,
  profile,
  orders,
  favoritesCount,
  settings,
  onClose,
  onNavigateSection,
  onOpenAllOrders,
  onOpenCepModal,
  onSwitchAccount,
  onLogout,
}) => {
  if (!isOpen) return null;

  const firstName = profile.name?.trim()
    ? profile.name.trim().split(' ')[0]
    : 'Cliente';
  const customerOrders = getOrdersForCustomer(orders, profile.phone);
  const activeOrdersCount = customerOrders.filter(
    (o) => o.status !== 'completed'
  ).length;
  const whatsappHelpUrl = `https://wa.me/${
    normalizePhone(settings.whatsappNumber) || '556530296824'
  }?text=${encodeURIComponent(
    `Olá, equipe Limper MT! Preciso de ajuda com meu cadastro/pedido (${
      profile.name || 'Cliente'
    }).`
  )}`;

  const goSection = (section: CustomerAreaSection) => {
    onClose();
    onNavigateSection(section);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu rápido da conta do cliente"
      className="fixed inset-0 z-50 flex justify-end no-print"
    >
      <div
        className="fixed inset-0 bg-zinc-950/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative w-full max-w-[390px] bg-white h-full shadow-2xl border-l border-zinc-200 flex flex-col overflow-hidden animate-fade-in">
        {/* Top bar */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={LIMPER_LOGO_URL}
              alt="Limper MT"
              className="h-7 w-auto object-contain"
            />
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFBE00] text-zinc-950">
              Cliente
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu da conta"
            className="w-9 h-9 rounded-full hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          {/* Greeting + Resumo da conta */}
          <div className="space-y-3 pt-1">
            <div>
              <span className="text-xs font-medium text-zinc-500 block">
                Boas-vindas!
              </span>
              <button
                type="button"
                onClick={() => goSection('summary')}
                className="mt-0.5 inline-flex items-center gap-2 text-left group cursor-pointer"
              >
                <span className="font-display text-2xl font-extrabold text-zinc-950 group-hover:text-[#E3262E] transition-colors">
                  {firstName}
                </span>
                <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-[#E3262E]" />
              </button>
              {profile.phone && (
                <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                  {formatPhone(profile.phone)} · CEP {profile.cep || '78110-400'}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => goSection('summary')}
              className="px-5 py-2 rounded-full border border-zinc-300 hover:border-zinc-950 text-xs font-bold text-zinc-900 bg-white hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Resumo da conta
            </button>
          </div>

          {/* Bento Quick Tiles */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                if (customerOrders.length > 0) {
                  goSection('orders');
                } else {
                  onClose();
                  onOpenAllOrders();
                }
              }}
              className="w-full p-4 rounded-xl bg-[#F4F5F7] hover:bg-[#ECEEF2] transition-colors text-left flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="space-y-1.5">
                <Package className="w-5 h-5 text-[#BA1826] stroke-[1.9]" />
                <div className="text-xs font-bold text-zinc-900">
                  Acompanhar Pedido
                </div>
                <div className="text-[11px] text-zinc-500">
                  {activeOrdersCount > 0
                    ? `${activeOrdersCount} pedido(s) em andamento`
                    : customerOrders.length > 0
                    ? `${customerOrders.length} pedido(s) no histórico`
                    : 'Acompanhar status dos meus pedidos'}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => goSection('frequently_bought')}
                className="p-4 rounded-xl bg-[#F4F5F7] hover:bg-[#ECEEF2] transition-colors text-left space-y-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5 text-[#BA1826] stroke-[1.9]" />
                <div className="text-xs font-bold text-zinc-900 leading-snug">
                  Você já comprou
                </div>
              </button>

              <button
                type="button"
                onClick={() => goSection('favorites')}
                className="p-4 rounded-xl bg-[#F4F5F7] hover:bg-[#ECEEF2] transition-colors text-left space-y-2 cursor-pointer"
              >
                <Heart className="w-5 h-5 text-[#BA1826] stroke-[1.9]" />
                <div className="text-xs font-bold text-zinc-900 leading-snug">
                  Produtos Salvos
                  {favoritesCount > 0 ? ` (${favoritesCount})` : ''}
                </div>
              </button>

              <button
                type="button"
                onClick={() => goSection('addresses')}
                className="p-4 rounded-xl bg-[#F4F5F7] hover:bg-[#ECEEF2] transition-colors text-left space-y-2 cursor-pointer"
              >
                <MapPin className="w-5 h-5 text-[#BA1826] stroke-[1.9]" />
                <div className="text-xs font-bold text-zinc-900 leading-snug">
                  Meus Endereços
                </div>
              </button>

              <button
                type="button"
                onClick={() => goSection('benefits')}
                className="p-4 rounded-xl bg-[#F4F5F7] hover:bg-[#ECEEF2] transition-colors text-left space-y-2 cursor-pointer"
              >
                <Tag className="w-5 h-5 text-[#BA1826] stroke-[1.9]" />
                <div className="text-xs font-bold text-zinc-900 leading-snug">
                  Benefícios Limper
                </div>
              </button>
            </div>
          </div>

          {/* Help Section */}
          <div className="space-y-2.5 pt-1">
            <h3 className="font-display text-sm font-extrabold text-zinc-900">
              Ajuda
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCepModal();
                }}
                className="p-3.5 rounded-xl bg-[#F4F5F7] hover:bg-[#ECEEF2] transition-colors text-left space-y-1.5 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-zinc-700" />
                <div className="text-xs font-bold text-zinc-900 leading-snug">
                  Entrega & Balcão
                </div>
              </button>

              <a
                href={whatsappHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-[#F4F5F7] hover:bg-[#ECEEF2] transition-colors text-left space-y-1.5 block"
              >
                <MessageCircle className="w-4 h-4 text-[#1DA851]" />
                <div className="text-xs font-bold text-zinc-900 leading-snug">
                  Dúvidas por WhatsApp
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Switch / Logout bar */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-[#FAFAFA] flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSwitchAccount();
            }}
            className="font-bold text-zinc-700 hover:text-zinc-950 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#E3262E]" />
            <span>Trocar cadastro</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="font-bold text-zinc-500 hover:text-[#BA1826] inline-flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </div>
  );
};

interface OrderTrackQuickDrawerProps {
  isOpen: boolean;
  profile: CustomerProfile;
  orders: Order[];
  onClose: () => void;
  onGoToCustomerOrders: (orderId?: string | null) => void;
  onRequireLogin: () => void;
  onOpenStoreRadar: () => void;
}

export const OrderTrackQuickDrawer: React.FC<OrderTrackQuickDrawerProps> = ({
  isOpen,
  profile,
  orders,
  onClose,
  onGoToCustomerOrders,
  onRequireLogin,
  onOpenStoreRadar,
}) => {
  if (!isOpen) return null;

  const loggedIn = isCustomerLoggedIn(profile);
  const customerOrders = loggedIn
    ? getOrdersForCustomer(orders, profile.phone)
    : [];
  const latestActiveOrder = getCustomerLatestActiveOrder(orders, profile);
  const activeStage = latestActiveOrder
    ? getOrderStageMeta(
        latestActiveOrder.status,
        latestActiveOrder.deliveryType
      )
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Acompanhe seu pedido"
      className="fixed inset-0 z-50 flex justify-end no-print"
    >
      <div
        className="fixed inset-0 bg-zinc-950/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative w-full max-w-[400px] bg-white h-full shadow-2xl border-l border-zinc-200 flex flex-col justify-between overflow-hidden animate-fade-in">
        {/* Top bar */}
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={LIMPER_LOGO_URL}
              alt="Limper MT"
              className="h-6 w-auto object-contain opacity-90"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de acompanhamento"
            className="w-10 h-10 rounded-full hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center Hero Content (Drogasil-inspired clean illustration + single clear CTA) */}
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col items-center justify-center text-center">
          {/* Clean flat-vector basket illustration with emerald check badge */}
          <div
            aria-hidden="true"
            className="w-36 h-32 flex items-center justify-center mb-5"
          >
            <svg
              viewBox="0 0 140 124"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-36 h-32"
            >
              <path
                d="M28 54C16 40 28 16 54 14C78 12 96 6 108 20C120 34 114 68 98 86C82 104 42 102 28 84C20 73 34 62 28 54Z"
                fill="#DDF1E4"
              />
              {/* Basket handles */}
              <path
                d="M50 40L54 19C54.6 15.8 58 15.8 58.8 19L63 40"
                stroke="#52525B"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M77 40L81 19C81.8 15.8 85.2 15.8 85.8 19L90 40"
                stroke="#52525B"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Basket rim */}
              <rect
                x="26"
                y="38"
                width="88"
                height="13"
                rx="6.5"
                fill="#F5F3EC"
                stroke="#E4E1D6"
                strokeWidth="1.5"
              />
              {/* Basket body */}
              <path
                d="M32 51H108L101 88C99.8 94 94.5 98 88.4 98H51.6C45.5 98 40.2 94 39 88L32 51Z"
                fill="#F5F3EC"
                stroke="#E4E1D6"
                strokeWidth="1.5"
              />
              {/* Basket divider */}
              <line
                x1="31"
                y1="51"
                x2="109"
                y2="51"
                stroke="#94A3B8"
                strokeWidth="2.5"
              />
              {/* Basket slots */}
              <rect x="55" y="62" width="7" height="22" rx="3.5" fill="#52525B" />
              <rect x="75" y="62" width="7" height="22" rx="3.5" fill="#52525B" />
              {/* Green confirmation badge */}
              <circle
                cx="99"
                cy="82"
                r="17"
                fill="#009E49"
                stroke="#FFFFFF"
                strokeWidth="3"
              />
              <path
                d="M91.5 82.2L96.8 87.3L106.8 76.8"
                stroke="#FFFFFF"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2 className="font-display text-[22px] font-extrabold text-zinc-950 tracking-tight">
            Acompanhe seu pedido
          </h2>

          <p className="text-sm text-zinc-600 leading-relaxed max-w-[270px] mt-2">
            {loggedIn
              ? 'Acesse a lista de pedidos realizados para ver os detalhes.'
              : 'Entre com seu WhatsApp cadastrado para acessar seus pedidos realizados e acompanhar os detalhes.'}
          </p>

          {loggedIn && latestActiveOrder && activeStage && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToCustomerOrders(latestActiveOrder.id);
              }}
              className="mt-5 w-full max-w-[290px] p-3.5 rounded-xl bg-[#FAFAFA] hover:bg-zinc-100 border border-zinc-200/90 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer group"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs font-extrabold text-[#BA1826] truncate">
                  {activeStage.shortLabel}
                </div>
                <div className="text-xs text-zinc-600 truncate">
                  <span className="font-mono font-bold text-zinc-900">
                    {latestActiveOrder.id}
                  </span>{' '}
                  · {latestActiveOrder.items.length}{' '}
                  {latestActiveOrder.items.length === 1 ? 'item' : 'itens'}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 shrink-0" />
            </button>
          )}

          {loggedIn ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToCustomerOrders(null);
              }}
              className="mt-6 w-full max-w-[260px] py-3.5 px-6 rounded-full bg-[#BA1826] hover:bg-[#9E1420] text-white font-extrabold text-sm shadow-xs transition-colors cursor-pointer"
            >
              Conferir pedidos
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequireLogin();
              }}
              className="mt-6 w-full max-w-[260px] py-3.5 px-6 rounded-full bg-[#BA1826] hover:bg-[#9E1420] text-white font-extrabold text-sm shadow-xs transition-colors cursor-pointer"
            >
              Entrar para conferir pedidos
            </button>
          )}

          {loggedIn && customerOrders.length > 0 && (
            <p className="mt-3 text-xs text-zinc-500">
              {customerOrders.length}{' '}
              {customerOrders.length === 1
                ? 'pedido registrado na sua conta'
                : 'pedidos registrados na sua conta'}
            </p>
          )}
        </div>

        {/* Quiet secondary action */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-[#FAFAFA] text-center">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenStoreRadar();
            }}
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 underline underline-offset-4 cursor-pointer"
          >
            {loggedIn
              ? 'Abrir rastreio ao vivo dos meus pedidos'
              : 'Consultar pedido por código e WhatsApp'}
          </button>
        </div>
      </aside>
    </div>
  );
};

interface CustomerAreaViewProps {
  profile: CustomerProfile;
  activeSection: CustomerAreaSection;
  selectedOrderId: string | null;
  orders: Order[];
  products: Product[];
  kits?: PromoKit[];
  favorites: string[];
  settings: StoreSettings;
  hideAllPrices?: boolean;
  onChangeSection: (section: CustomerAreaSection) => void;
  onSelectOrder: (orderId: string | null) => void;
  onSaveProfile: (updated: CustomerProfile) => void;
  onRateOrder: (orderId: string, rating: number) => void;
  onRepeatOrder: (order: Order) => void;
  onAddToCart: (product: Product) => void;
  onToggleFavorite: (productId: string) => void;
  onOpenQuickOrderModal: () => void;
  onOpenAllOrdersTracking: () => void;
  onSwitchAccount: () => void;
  onLogout: () => void;
  onBackToStore: () => void;
  onShowToast: (msg: string) => void;
}

const SECTION_NAV: {
  id: CustomerAreaSection;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'summary', label: 'Resumo da conta', icon: User },
  { id: 'profile', label: 'Gerenciar perfil', icon: Edit3 },
  { id: 'addresses', label: 'Meus endereços', icon: MapPin },
  { id: 'orders', label: 'Meus pedidos', icon: Package },
  { id: 'frequently_bought', label: 'Você já comprou', icon: RotateCcw },
  { id: 'favorites', label: 'Produtos salvos', icon: Heart },
  { id: 'benefits', label: 'Meus Benefícios', icon: Award },
  { id: 'privacy', label: 'Privacidade de dados', icon: ShieldCheck },
];

export const CustomerAreaView: React.FC<CustomerAreaViewProps> = ({
  profile,
  activeSection,
  selectedOrderId,
  orders,
  products,
  kits = [],
  favorites,
  settings,
  hideAllPrices,
  onChangeSection,
  onSelectOrder,
  onSaveProfile,
  onRateOrder,
  onRepeatOrder,
  onAddToCart,
  onToggleFavorite,
  onOpenQuickOrderModal,
  onOpenAllOrdersTracking,
  onSwitchAccount,
  onLogout,
  onBackToStore,
  onShowToast,
}) => {
  const customerOrders = getOrdersForCustomer(orders, profile.phone);
  const [ordersTab, setOrdersTab] = useState<'all' | 'active' | 'completed'>(
    'all'
  );
  const addresses = getCustomerAddresses(profile);
  const primaryAddress =
    addresses.find((a) => a.isDefault) || addresses[0] || null;
  const frequentlyBought = deriveFrequentlyBoughtProducts(
    orders,
    products,
    profile.phone
  );
  const savedProducts = products.filter(
    (p) => favorites.includes(p.id) && p.status !== 'inactive'
  );
  const logistics = getLogisticsSettings(settings);

  // Profile form state
  const initialDocType: DocumentKind =
    profile.documentType || detectDocumentType(profile.cpfCnpj);
  const [profName, setProfName] = useState(profile.name || '');
  const [profEmail, setProfEmail] = useState(profile.email || '');
  const [profDocType, setProfDocType] = useState<DocumentKind>(initialDocType);
  const [profDoc, setProfDoc] = useState(
    profile.cpfCnpj ? formatDocumentByType(profile.cpfCnpj, initialDocType) : ''
  );
  const [profPhone, setProfPhone] = useState(
    profile.phone ? formatPhone(profile.phone) : ''
  );
  const [profSecPhone, setProfSecPhone] = useState(
    profile.secondaryPhone ? formatPhone(profile.secondaryPhone) : ''
  );
  const [profSegment, setProfSegment] = useState<CustomerSegment>(
    profile.segment || 'residencial'
  );
  const [profClub, setProfClub] = useState(profile.clubDiscountActive !== false);
  const [profError, setProfError] = useState<string | null>(null);

  useEffect(() => {
    const nextType: DocumentKind =
      profile.documentType || detectDocumentType(profile.cpfCnpj);
    setProfName(profile.name || '');
    setProfEmail(profile.email || '');
    setProfDocType(nextType);
    setProfDoc(
      profile.cpfCnpj ? formatDocumentByType(profile.cpfCnpj, nextType) : ''
    );
    setProfPhone(profile.phone ? formatPhone(profile.phone) : '');
    setProfSecPhone(
      profile.secondaryPhone ? formatPhone(profile.secondaryPhone) : ''
    );
    setProfSegment(profile.segment || 'residencial');
    setProfClub(profile.clubDiscountActive !== false);
    setProfError(null);
  }, [profile]);

  // Address form state
  const [isAddrFormOpen, setIsAddrFormOpen] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [addrLabel, setAddrLabel] = useState('Casa');
  const [addrCep, setAddrCep] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrNumber, setAddrNumber] = useState('');
  const [addrNeighborhood, setAddrNeighborhood] = useState('');
  const [addrCity, setAddrCity] = useState<DeliveryCityOption>('Várzea Grande');
  const [addrInteriorCity, setAddrInteriorCity] = useState('');
  const [addrRef, setAddrRef] = useState('');
  const [addrDefault, setAddrDefault] = useState(true);
  const [addrCepStatus, setAddrCepStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });
  const [addrError, setAddrError] = useState<string | null>(null);
  const lastAddrCepRef = useRef('');
  const addrNumRef = useRef<HTMLInputElement>(null);

  // Order detail expand products state
  const [showOrderItemDetails, setShowOrderItemDetails] = useState(true);

  const selectedOrder =
    isCustomerLoggedIn(profile) && selectedOrderId
      ? customerOrders.find((o) => o.id === selectedOrderId) || null
      : null;

  const currentSectionLabel =
    activeSection === 'orders' && selectedOrder
      ? 'Detalhes do pedido'
      : SECTION_NAV.find((s) => s.id === activeSection)?.label ||
        'Resumo da conta';

  const handleSaveProfileForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (profName.trim().length < 3) {
      setProfError('Informe seu nome completo ou Razão Social.');
      return;
    }
    if (normalizePhone(profPhone).length < 10) {
      setProfError('Informe um número de Celular / WhatsApp válido com DDD.');
      return;
    }
    const digits = onlyDigits(profDoc);
    if (digits.length > 0 && !isValidDocument(profDoc, profDocType)) {
      setProfError(
        profDocType === 'cnpj'
          ? 'O CNPJ informado é inválido. Confira os 14 dígitos.'
          : 'O CPF informado é inválido. Confira os 11 dígitos.'
      );
      return;
    }

    setProfError(null);
    onSaveProfile({
      ...profile,
      name: profName.trim(),
      email: profEmail.trim(),
      documentType: profDocType,
      cpfCnpj: digits.length > 0 ? formatDocumentByType(profDoc, profDocType) : '',
      phone: normalizePhone(profPhone),
      secondaryPhone: profSecPhone.trim() ? normalizePhone(profSecPhone) : '',
      segment: profSegment,
      clubDiscountActive: profClub,
      isRegistered: true,
    });
    onShowToast('Dados do perfil atualizados com sucesso!');
  };

  const openNewAddressForm = () => {
    setEditingAddrId(null);
    setAddrLabel(addresses.length === 0 ? 'Casa' : 'Empresa');
    setAddrCep('');
    setAddrStreet('');
    setAddrNumber('');
    setAddrNeighborhood('');
    setAddrCity('Várzea Grande');
    setAddrInteriorCity('');
    setAddrRef('');
    setAddrDefault(addresses.length === 0);
    setAddrCepStatus({ type: 'idle' });
    setAddrError(null);
    lastAddrCepRef.current = '';
    setIsAddrFormOpen(true);
  };

  const openEditAddressForm = (addr: CustomerAddress) => {
    setEditingAddrId(addr.id);
    setAddrLabel(addr.label || 'Principal');
    setAddrCep(formatCep(addr.cep || ''));
    setAddrStreet(addr.street || '');
    setAddrNumber(addr.number || '');
    setAddrNeighborhood(addr.neighborhood || '');
    setAddrCity(addr.city || 'Várzea Grande');
    setAddrInteriorCity(addr.interiorCityName || '');
    setAddrRef(addr.reference || '');
    setAddrDefault(Boolean(addr.isDefault));
    setAddrCepStatus({ type: 'idle' });
    setAddrError(null);
    lastAddrCepRef.current = onlyDigits(addr.cep || '');
    setIsAddrFormOpen(true);
  };

  const runAddrCepLookup = async (raw: string, force = false) => {
    const digits = onlyDigits(raw);
    if (digits.length !== 8) {
      if (force) {
        setAddrCepStatus({
          type: 'error',
          message: 'Digite os 8 dígitos do CEP para carregar o endereço.',
        });
      }
      return;
    }
    if (!force && lastAddrCepRef.current === digits) return;
    lastAddrCepRef.current = digits;

    setAddrCepStatus({ type: 'loading', message: 'Buscando endereço pelo CEP...' });
    const res = await lookupCepAddress(digits);
    if (res.found) {
      setAddrCep(res.cep);
      if (res.street) setAddrStreet(res.street);
      if (res.neighborhood) setAddrNeighborhood(res.neighborhood);
      setAddrCity(res.deliveryCityOption);
      setAddrInteriorCity(res.interiorCityName);
      setAddrCepStatus({
        type: 'success',
        message: `Endereço carregado: ${
          res.street ? `${res.street}, ` : ''
        }${res.neighborhood ? `${res.neighborhood} · ` : ''}${res.cityName}/${res.uf}`,
      });
      setTimeout(() => addrNumRef.current?.focus(), 60);
    } else {
      setAddrCepStatus({
        type: 'error',
        message: 'CEP não localizado automaticamente. Preencha os campos abaixo.',
      });
    }
  };

  const handleSaveAddressForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (onlyDigits(addrCep).length !== 8) {
      setAddrError('Informe os 8 dígitos do CEP (ex: 78110-400).');
      return;
    }
    if (!addrStreet.trim() || !addrNumber.trim() || !addrNeighborhood.trim()) {
      setAddrError('Preencha Rua/Av., Número e Bairro.');
      return;
    }
    if (addrCity === 'Interior de MT' && addrInteriorCity.trim().length < 2) {
      setAddrError('Informe o nome da cidade em Mato Grosso.');
      return;
    }

    const updated = upsertCustomerAddress(profile, {
      id: editingAddrId || undefined,
      label: addrLabel.trim() || 'Endereço',
      cep: addrCep,
      street: addrStreet,
      number: addrNumber,
      neighborhood: addrNeighborhood,
      city: addrCity,
      interiorCityName: addrInteriorCity,
      reference: addrRef,
      isDefault: addrDefault,
    });
    onSaveProfile(updated);
    setIsAddrFormOpen(false);
    onShowToast(
      editingAddrId
        ? 'Endereço atualizado com sucesso!'
        : 'Novo endereço salvo na sua conta!'
    );
  };

  const privacyPrefs: CustomerPrivacyPrefs = {
    ...DEFAULT_CUSTOMER_PRIVACY,
    ...(profile.privacy || {}),
  };

  const updatePrivacyField = (
    key: keyof CustomerPrivacyPrefs,
    value: boolean
  ) => {
    onSaveProfile({
      ...profile,
      privacy: {
        ...privacyPrefs,
        [key]: value,
      },
    });
    onShowToast('Preferência de privacidade atualizada.');
  };

  const handleOrderSupportWhatsApp = (order: Order) => {
    const cleanPhone = normalizePhone(settings.whatsappNumber) || '556530296824';
    const msg = `Olá, equipe Limper MT! Preciso de atendimento referente ao Pedido ${order.id} (Cliente: ${order.customerName}).`;
    const link = document.createElement('a');
    link.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  return (
    <div className="bg-[#F7F8FA] min-h-[70vh]">
      {/* Breadcrumb Bar */}
      <div className="bg-white border-b border-zinc-200/80">
        <div className="max-w-[1260px] mx-auto px-4 sm:px-6 h-11 flex items-center gap-2 text-xs text-zinc-500 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button
            type="button"
            onClick={onBackToStore}
            className="hover:text-[#E3262E] font-medium cursor-pointer"
          >
            Página inicial
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <button
            type="button"
            onClick={() => {
              onSelectOrder(null);
              onChangeSection('summary');
            }}
            className={`hover:text-[#E3262E] cursor-pointer ${
              activeSection === 'summary' && !selectedOrder
                ? 'font-bold text-zinc-900'
                : 'font-medium'
            }`}
          >
            Resumo da conta
          </button>
          {(activeSection !== 'summary' || selectedOrder) && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="font-bold text-zinc-900">
                {currentSectionLabel}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Mobile Section Strip (< lg) */}
      <div className="lg:hidden bg-white border-b border-zinc-200 px-4 py-2.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {SECTION_NAV.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={`mob-nav-${item.id}`}
                type="button"
                onClick={() => {
                  onSelectOrder(null);
                  onChangeSection(item.id);
                }}
                className={`px-3.5 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer transition-colors ${
                  active
                    ? 'bg-zinc-950 text-[#FFBE00]'
                    : 'bg-[#F4F5F7] text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-[1260px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-8 items-start">
          {/* Desktop Left Sidebar */}
          <aside className="hidden lg:flex flex-col gap-1 sticky top-32">
            {SECTION_NAV.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={`side-nav-${item.id}`}
                  type="button"
                  onClick={() => {
                    onSelectOrder(null);
                    onChangeSection(item.id);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-left text-[13px] flex items-center gap-3 transition-colors cursor-pointer ${
                    active
                      ? 'bg-white text-zinc-950 font-extrabold shadow-2xs border border-zinc-200/80'
                      : 'text-zinc-600 font-medium hover:text-zinc-950 hover:bg-white/70'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-[#BA1826]' : 'text-zinc-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            <div className="my-2 border-t border-zinc-200" />

            <button
              type="button"
              onClick={onOpenQuickOrderModal}
              className="w-full px-3.5 py-2.5 rounded-xl text-left text-[13px] text-zinc-600 font-medium hover:text-zinc-950 hover:bg-white/70 flex items-center gap-3 cursor-pointer"
            >
              <FlaskConical className="w-4 h-4 text-[#D97706] shrink-0" />
              <span>Calculadora de Diluição</span>
            </button>

            <button
              type="button"
              onClick={onSwitchAccount}
              className="w-full px-3.5 py-2.5 rounded-xl text-left text-[13px] text-zinc-600 font-medium hover:text-zinc-950 hover:bg-white/70 flex items-center gap-3 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>Trocar cadastro</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full px-3.5 py-2.5 rounded-xl text-left text-[13px] text-zinc-500 font-medium hover:text-[#BA1826] hover:bg-rose-50/70 flex items-center gap-3 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sair da conta</span>
            </button>
          </aside>

          {/* Main Section Canvas */}
          <section aria-live="polite" className="min-w-0 space-y-6">
            {/* 1. RESUMO DA CONTA */}
            {activeSection === 'summary' && (
              <div className="space-y-6">
                {/* Warm Header Banner */}
                <div className="rounded-2xl bg-[#EFECE3] border border-[#E3DED1] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <h1 className="font-display text-xl sm:text-2xl font-extrabold text-zinc-950 uppercase tracking-tight break-words">
                      {profile.name || 'Cliente Limper MT'}
                    </h1>
                    <p className="text-xs text-zinc-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>
                        {CUSTOMER_SEGMENT_LABELS[profile.segment || 'residencial']}
                      </span>
                      {profile.cpfCnpj && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">
                            {profile.documentType === 'cnpj' ? 'CNPJ' : 'CPF'}{' '}
                            {profile.cpfCnpj}
                          </span>
                        </>
                      )}
                      {profile.phone && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">
                            WhatsApp {formatPhone(profile.phone)}
                          </span>
                        </>
                      )}
                      {profile.clubDiscountActive !== false && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-bold text-emerald-800">
                            Clube Limper Ativo
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onChangeSection('profile')}
                    className="px-5 py-2.5 rounded-full bg-[#BA1826] hover:bg-[#9E1420] text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Gerenciar perfil</span>
                  </button>
                </div>

                {/* 2-Column Bento */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-5 items-start">
                  {/* Left: Últimos Pedidos */}
                  <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display text-lg font-extrabold text-zinc-950">
                        Últimos Pedidos
                      </h2>
                      {customerOrders.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectOrder(null);
                            onChangeSection('orders');
                          }}
                          className="text-xs font-bold text-[#BA1826] hover:underline cursor-pointer"
                        >
                          Ver todos ({customerOrders.length})
                        </button>
                      )}
                    </div>

                    {customerOrders.length === 0 ? (
                      <div className="py-8 text-center space-y-3 bg-[#F7F8FA] rounded-xl border border-zinc-200/70 px-4">
                        <Package className="w-8 h-8 text-zinc-400 mx-auto" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-800">
                            Você ainda não tem pedidos registrados neste WhatsApp.
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            Monte sua lista de produtos de limpeza ou envie um orçamento pelo WhatsApp.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={onBackToStore}
                          className="px-4 py-2 rounded-full bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-xs font-extrabold cursor-pointer"
                        >
                          Explorar Catálogo
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customerOrders.slice(0, 4).map((order) => {
                          const stage = getOrderStageMeta(
                            order.status,
                            order.deliveryType
                          );
                          const quoteOnly = isOrderQuoteOnly(order);
                          const createdStr = new Date(
                            order.createdAt
                          ).toLocaleDateString('pt-BR');

                          return (
                            <button
                              key={`summary-order-${order.id}`}
                              type="button"
                              onClick={() => {
                                onSelectOrder(order.id);
                                onChangeSection('orders');
                              }}
                              className="w-full p-4 rounded-xl border border-zinc-200 hover:border-zinc-400 bg-white hover:bg-[#FAFAFA] transition-all text-left flex items-center justify-between gap-3 cursor-pointer group"
                            >
                              <div className="space-y-1 min-w-0">
                                <div
                                  className={`text-xs font-extrabold ${
                                    order.status === 'completed'
                                      ? 'text-emerald-700'
                                      : 'text-[#BA1826]'
                                  }`}
                                >
                                  {stage.shortLabel}
                                </div>
                                <div className="text-xs font-bold text-zinc-900 font-mono">
                                  Nº do pedido: {order.id}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  Feito em {createdStr} ·{' '}
                                  {quoteOnly
                                    ? `Lista s/ valor (${order.items.length} itens)`
                                    : `Total ${formatCurrency(order.total)}`}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Endereço principal + Reposição & Logística */}
                  <div className="space-y-5">
                    <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 space-y-4">
                      <h2 className="font-display text-lg font-extrabold text-zinc-950">
                        Endereço principal
                      </h2>

                      {primaryAddress ? (
                        <div className="p-4 rounded-xl bg-[#F4F5F7] text-xs space-y-1">
                          <div className="font-bold text-zinc-900">
                            {primaryAddress.street}
                            {primaryAddress.number
                              ? `, ${primaryAddress.number}`
                              : ''}
                          </div>
                          <div className="text-zinc-600">
                            {primaryAddress.neighborhood} -{' '}
                            {primaryAddress.city === 'Interior de MT'
                              ? `${
                                  primaryAddress.interiorCityName || 'Interior'
                                }, MT`
                              : `${primaryAddress.city}, MT`}
                          </div>
                          <div className="font-mono text-zinc-500 pt-0.5">
                            CEP {primaryAddress.cep}
                            {primaryAddress.label
                              ? ` · ${primaryAddress.label}`
                              : ''}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-[#F4F5F7] text-xs text-zinc-500">
                          Nenhum endereço principal cadastrado ainda.
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => onChangeSection('addresses')}
                        className="text-xs font-bold text-zinc-900 underline hover:text-[#BA1826] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Alterar endereço</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 space-y-3.5">
                      <h2 className="font-display text-lg font-extrabold text-zinc-950">
                        Reposição & Logística
                      </h2>
                      <div className="p-4 rounded-xl bg-[#F4F5F7] space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-zinc-900">
                            Balcão Express (15 min)
                          </span>
                          <span className="font-extrabold text-emerald-700">
                            Grátis
                          </span>
                        </div>
                        <p className="text-zinc-600 leading-relaxed">
                          Moto Limper acima de {formatCurrency(logistics.motoVgMin)}{' '}
                          (VG) / {formatCurrency(logistics.motoCbaMin)} (CBA).
                          Caminhão acima de {formatCurrency(logistics.truckVgMin)}{' '}
                          (VG) / {formatCurrency(logistics.truckCbaMin)} (CBA).
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onChangeSection('frequently_bought')}
                          className="flex-1 py-2.5 px-4 rounded-full border border-zinc-300 hover:border-zinc-950 text-xs font-bold text-zinc-900 bg-white hover:bg-zinc-50 cursor-pointer text-center"
                        >
                          Você já comprou ({frequentlyBought.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => onChangeSection('benefits')}
                          className="py-2.5 px-4 rounded-full bg-[#FFBE00] hover:bg-[#F59E0B] text-xs font-extrabold text-zinc-950 cursor-pointer"
                        >
                          Ver Benefícios
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. GERENCIAR PERFIL */}
            {activeSection === 'profile' && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-8 space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onChangeSection('summary')}
                    className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-zinc-950 hover:text-[#BA1826] cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Gerenciar Perfil</span>
                  </button>
                </div>

                {profError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                    {profError}
                  </div>
                )}

                <form onSubmit={handleSaveProfileForm} className="space-y-5">
                  <div>
                    <label
                      htmlFor="area-prof-name"
                      className="block text-xs font-bold text-zinc-700 mb-1.5"
                    >
                      {profDocType === 'cnpj'
                        ? 'Razão Social / Nome da Empresa *'
                        : 'Nome completo *'}
                    </label>
                    <input
                      id="area-prof-name"
                      type="text"
                      required
                      value={profName}
                      onChange={(e) => setProfName(e.target.value)}
                      placeholder="Nome completo ou empresa"
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="area-prof-email"
                      className="block text-xs font-bold text-zinc-700 mb-1.5"
                    >
                      E-mail
                    </label>
                    <input
                      id="area-prof-email"
                      type="email"
                      value={profEmail}
                      onChange={(e) => setProfEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com.br"
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* CPF / CNPJ with toggle */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label
                          htmlFor="area-prof-doc"
                          className="text-xs font-bold text-zinc-700"
                        >
                          {profDocType === 'cnpj' ? 'CNPJ' : 'CPF'}
                        </label>
                        <div
                          role="group"
                          aria-label="Selecionar CPF ou CNPJ no perfil"
                          className="inline-flex rounded-lg bg-zinc-100 p-0.5 border border-zinc-200"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setProfDocType('cpf');
                              setProfDoc((prev) =>
                                formatDocumentByType(prev, 'cpf')
                              );
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold cursor-pointer ${
                              profDocType === 'cpf'
                                ? 'bg-zinc-950 text-[#FFBE00]'
                                : 'text-zinc-600'
                            }`}
                          >
                            CPF
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProfDocType('cnpj');
                              setProfDoc((prev) =>
                                formatDocumentByType(prev, 'cnpj')
                              );
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold cursor-pointer ${
                              profDocType === 'cnpj'
                                ? 'bg-zinc-950 text-[#FFBE00]'
                                : 'text-zinc-600'
                            }`}
                          >
                            CNPJ
                          </button>
                        </div>
                      </div>
                      <input
                        id="area-prof-doc"
                        type="text"
                        inputMode="numeric"
                        maxLength={profDocType === 'cnpj' ? 18 : 14}
                        value={profDoc}
                        onChange={(e) =>
                          setProfDoc(
                            formatDocumentByType(e.target.value, profDocType)
                          )
                        }
                        placeholder={
                          profDocType === 'cnpj'
                            ? '00.000.000/0000-00'
                            : '000.000.000-00'
                        }
                        className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-sm font-mono tabular-nums text-zinc-900 focus:border-zinc-950 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="area-prof-phone"
                        className="block text-xs font-bold text-zinc-700 mb-1.5"
                      >
                        Celular / WhatsApp *
                      </label>
                      <input
                        id="area-prof-phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={15}
                        required
                        value={profPhone}
                        onChange={(e) => setProfPhone(formatPhone(e.target.value))}
                        placeholder="(65) 99999-9999"
                        className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-sm font-mono tabular-nums text-zinc-900 focus:border-zinc-950 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="area-prof-sec-phone"
                        className="block text-xs font-bold text-zinc-700 mb-1.5"
                      >
                        Telefone secundário
                      </label>
                      <input
                        id="area-prof-sec-phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={15}
                        value={profSecPhone}
                        onChange={(e) =>
                          setProfSecPhone(formatPhone(e.target.value))
                        }
                        placeholder="(65) 3029-6824"
                        className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-sm font-mono tabular-nums text-zinc-900 focus:border-zinc-950 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                      <label
                        htmlFor="area-prof-segment"
                        className="block text-xs font-bold text-zinc-700 mb-1.5"
                      >
                        Perfil de Compra
                      </label>
                      <select
                        id="area-prof-segment"
                        value={profSegment}
                        onChange={(e) =>
                          setProfSegment(e.target.value as CustomerSegment)
                        }
                        className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none"
                      >
                        {Object.entries(CUSTOMER_SEGMENT_LABELS).map(
                          ([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <label className="flex items-center gap-3 p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] cursor-pointer mt-2 sm:mt-5">
                      <input
                        type="checkbox"
                        checked={profClub}
                        onChange={(e) => setProfClub(e.target.checked)}
                        className="w-4 h-4 accent-[#BA1826]"
                      />
                      <div className="text-xs">
                        <span className="font-extrabold text-zinc-950 block">
                          Clube de Descontos Limper MT
                        </span>
                        <span className="text-zinc-600">
                          Retirada prioritária 15min e condições em galões 5L.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={onSwitchAccount}
                      className="text-xs font-bold text-zinc-600 hover:text-zinc-950 underline cursor-pointer text-left"
                    >
                      Entrar com outro WhatsApp / Trocar conta
                    </button>

                    <button
                      type="submit"
                      className="px-8 py-3 rounded-full bg-[#BA1826] hover:bg-[#9E1420] text-white text-xs font-extrabold cursor-pointer shadow-xs"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. MEUS ENDEREÇOS */}
            {activeSection === 'addresses' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onChangeSection('summary')}
                    className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-zinc-950 hover:text-[#BA1826] cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Meus endereços</span>
                  </button>
                </div>

                {addresses.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-3">
                    <MapPin className="w-8 h-8 text-zinc-400 mx-auto" />
                    <p className="text-sm font-bold text-zinc-900">
                      Nenhum endereço salvo ainda.
                    </p>
                    <p className="text-xs text-zinc-500">
                      Informe seu CEP para preencher rua, bairro e cidade automaticamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2 className="text-sm font-extrabold text-zinc-950">
                            {addr.isDefault
                              ? 'Endereço principal'
                              : addr.label || 'Endereço salvo'}
                          </h2>
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = setDefaultCustomerAddress(
                                  profile,
                                  addr.id
                                );
                                onSaveProfile(updated);
                                onShowToast(
                                  `CEP ${addr.cep} definido como endereço principal!`
                                );
                              }}
                              className="text-xs font-bold text-[#BA1826] hover:underline cursor-pointer"
                            >
                              Definir como principal
                            </button>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-[#F4F5F7] text-xs space-y-1">
                          <div className="font-bold text-zinc-900">
                            {addr.street}
                            {addr.number ? `, ${addr.number}` : ''}
                            {addr.label ? ` · ${addr.label}` : ''}
                          </div>
                          <div className="text-zinc-600">
                            {addr.neighborhood} -{' '}
                            {addr.city === 'Interior de MT'
                              ? `${addr.interiorCityName || 'Interior'}, MT`
                              : `${addr.city}, MT`}
                          </div>
                          <div className="font-mono text-zinc-500">
                            CEP {addr.cep}
                            {addr.reference ? ` · ${addr.reference}` : ''}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-1">
                          <button
                            type="button"
                            onClick={() => openEditAddressForm(addr)}
                            className="text-xs font-extrabold text-zinc-900 hover:text-[#BA1826] cursor-pointer"
                          >
                            Alterar endereço
                          </button>

                          {addresses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = deleteCustomerAddress(
                                  profile,
                                  addr.id
                                );
                                onSaveProfile(updated);
                                onShowToast('Endereço removido da sua lista.');
                              }}
                              className="text-xs font-bold text-zinc-500 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remover</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isAddrFormOpen ? (
                  <button
                    type="button"
                    onClick={openNewAddressForm}
                    className="px-6 py-2.5 rounded-full border border-zinc-300 bg-white hover:border-zinc-950 text-xs font-extrabold text-zinc-900 inline-flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo endereço</span>
                  </button>
                ) : (
                  <form
                    onSubmit={handleSaveAddressForm}
                    className="bg-white rounded-2xl border-2 border-[#FFBE00] p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-base font-extrabold text-zinc-950">
                        {editingAddrId ? 'Alterar endereço' : 'Cadastrar novo endereço'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsAddrFormOpen(false)}
                        aria-label="Cancelar edição de endereço"
                        className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {addrError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                        {addrError}
                      </div>
                    )}

                    {/* CEP-first lookup */}
                    <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-zinc-200 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                        <div className="flex-1">
                          <label
                            htmlFor="addr-cep"
                            className="block text-xs font-bold text-zinc-800 mb-1"
                          >
                            1º Informe o CEP (Carregamento automático) *
                          </label>
                          <input
                            id="addr-cep"
                            type="text"
                            inputMode="numeric"
                            maxLength={9}
                            required
                            value={addrCep}
                            onChange={(e) => {
                              const masked = formatCep(e.target.value);
                              setAddrCep(masked);
                              const digits = onlyDigits(masked);
                              if (digits.length === 8) {
                                void runAddrCepLookup(digits);
                              } else {
                                lastAddrCepRef.current = '';
                                if (addrCepStatus.type !== 'idle') {
                                  setAddrCepStatus({ type: 'idle' });
                                }
                              }
                            }}
                            placeholder="00000-000"
                            className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm font-mono font-bold tabular-nums focus:border-zinc-950 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => void runAddrCepLookup(addrCep, true)}
                          disabled={addrCepStatus.type === 'loading'}
                          className="px-4 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-xs font-extrabold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {addrCepStatus.type === 'loading' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          <span>Buscar CEP</span>
                        </button>
                      </div>

                      {addrCepStatus.type !== 'idle' && addrCepStatus.message && (
                        <p
                          role="status"
                          className={`text-xs font-semibold ${
                            addrCepStatus.type === 'success'
                              ? 'text-emerald-700'
                              : addrCepStatus.type === 'error'
                              ? 'text-rose-600'
                              : 'text-zinc-600'
                          }`}
                        >
                          {addrCepStatus.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label
                          htmlFor="addr-label"
                          className="block text-xs font-bold text-zinc-700 mb-1"
                        >
                          Identificação
                        </label>
                        <input
                          id="addr-label"
                          type="text"
                          value={addrLabel}
                          onChange={(e) => setAddrLabel(e.target.value)}
                          placeholder="Casa, Empresa, Condomínio"
                          className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs focus:border-zinc-950 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="addr-city"
                          className="block text-xs font-bold text-zinc-700 mb-1"
                        >
                          Cidade / Região
                        </label>
                        <select
                          id="addr-city"
                          value={addrCity}
                          onChange={(e) =>
                            setAddrCity(e.target.value as DeliveryCityOption)
                          }
                          className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs focus:border-zinc-950 focus:outline-none"
                        >
                          <option value="Várzea Grande">Várzea Grande - MT</option>
                          <option value="Cuiabá">Cuiabá - MT</option>
                          <option value="Interior de MT">
                            Outras Cidades de MT
                          </option>
                        </select>
                      </div>
                    </div>

                    {addrCity === 'Interior de MT' && (
                      <div>
                        <label
                          htmlFor="addr-interior"
                          className="block text-xs font-bold text-zinc-700 mb-1"
                        >
                          Nome da Cidade em Mato Grosso *
                        </label>
                        <input
                          id="addr-interior"
                          type="text"
                          value={addrInteriorCity}
                          onChange={(e) => setAddrInteriorCity(e.target.value)}
                          placeholder="Ex: Sinop, Sorriso, Rondonópolis..."
                          className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs focus:border-zinc-950 focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label
                          htmlFor="addr-street"
                          className="block text-xs font-bold text-zinc-700 mb-1"
                        >
                          Rua / Avenida *
                        </label>
                        <input
                          id="addr-street"
                          type="text"
                          required
                          value={addrStreet}
                          onChange={(e) => setAddrStreet(e.target.value)}
                          placeholder="Rua / Av."
                          className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs focus:border-zinc-950 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="addr-number"
                          className="block text-xs font-bold text-zinc-700 mb-1"
                        >
                          Número *
                        </label>
                        <input
                          ref={addrNumRef}
                          id="addr-number"
                          type="text"
                          required
                          value={addrNumber}
                          onChange={(e) => setAddrNumber(e.target.value)}
                          placeholder="120"
                          className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-mono focus:border-zinc-950 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="addr-neighborhood"
                          className="block text-xs font-bold text-zinc-700 mb-1"
                        >
                          Bairro *
                        </label>
                        <input
                          id="addr-neighborhood"
                          type="text"
                          required
                          value={addrNeighborhood}
                          onChange={(e) => setAddrNeighborhood(e.target.value)}
                          placeholder="Bairro"
                          className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs focus:border-zinc-950 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="addr-ref"
                          className="block text-xs font-bold text-zinc-700 mb-1"
                        >
                          Complemento / Ponto de referência
                        </label>
                        <input
                          id="addr-ref"
                          type="text"
                          value={addrRef}
                          onChange={(e) => setAddrRef(e.target.value)}
                          placeholder="Portão cinza, Bloco B, Sala 3..."
                          className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs focus:border-zinc-950 focus:outline-none"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 text-xs font-bold text-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addrDefault}
                        onChange={(e) => setAddrDefault(e.target.checked)}
                        className="w-4 h-4 accent-[#BA1826]"
                      />
                      <span>Definir como endereço principal</span>
                    </label>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddrFormOpen(false)}
                        className="px-4 py-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-700 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-full bg-[#BA1826] hover:bg-[#9E1420] text-white text-xs font-extrabold cursor-pointer"
                      >
                        Salvar endereço
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 4. MEUS PEDIDOS (Grid 2 colunas com miniaturas + Adicionar à cesta, estilo Drogasil) */}
            {activeSection === 'orders' && !selectedOrder && (() => {
              const filteredCustomerOrders = customerOrders.filter((o) => {
                if (ordersTab === 'active') return o.status !== 'completed';
                if (ordersTab === 'completed') return o.status === 'completed';
                return true;
              });
              const activeCount = customerOrders.filter(
                (o) => o.status !== 'completed'
              ).length;
              const completedCount = customerOrders.length - activeCount;

              return (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onChangeSection('summary')}
                      className="inline-flex items-center gap-2 font-display text-xl sm:text-2xl font-extrabold text-zinc-950 hover:text-[#BA1826] cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      <span>Meus pedidos</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {customerOrders.length > 1 && (
                        <div
                          role="group"
                          aria-label="Filtrar meus pedidos"
                          className="inline-flex items-center gap-1 p-1 bg-white border border-zinc-200 rounded-xl"
                        >
                          <button
                            type="button"
                            onClick={() => setOrdersTab('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              ordersTab === 'all'
                                ? 'bg-zinc-950 text-white'
                                : 'text-zinc-600 hover:text-zinc-950'
                            }`}
                          >
                            Todos ({customerOrders.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrdersTab('active')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              ordersTab === 'active'
                                ? 'bg-zinc-950 text-white'
                                : 'text-zinc-600 hover:text-zinc-950'
                            }`}
                          >
                            Em andamento ({activeCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrdersTab('completed')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              ordersTab === 'completed'
                                ? 'bg-zinc-950 text-white'
                                : 'text-zinc-600 hover:text-zinc-950'
                            }`}
                          >
                            Concluídos ({completedCount})
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={onOpenAllOrdersTracking}
                        className="px-4 py-2 rounded-full border border-zinc-300 bg-white hover:border-zinc-950 text-xs font-bold text-zinc-900 cursor-pointer"
                      >
                        Rastreio ao vivo
                      </button>
                    </div>
                  </div>

                  {customerOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-3">
                      <Package className="w-9 h-9 text-zinc-400 mx-auto" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-zinc-900">
                          Nenhum pedido encontrado para {formatPhone(profile.phone || '')}.
                        </p>
                        <p className="text-xs text-zinc-500">
                          Quando você enviar sua lista pelo WhatsApp ou finalizar um pedido, ele aparecerá aqui.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onBackToStore}
                        className="px-5 py-2.5 rounded-full bg-[#FFBE00] hover:bg-[#F59E0B] text-xs font-extrabold text-zinc-950 cursor-pointer"
                      >
                        Montar meu primeiro pedido
                      </button>
                    </div>
                  ) : filteredCustomerOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-3">
                      <p className="text-sm font-bold text-zinc-900">
                        Nenhum pedido nesta categoria no momento.
                      </p>
                      <button
                        type="button"
                        onClick={() => setOrdersTab('all')}
                        className="px-4 py-2 rounded-full border border-zinc-300 hover:border-zinc-950 text-xs font-bold text-zinc-900 cursor-pointer"
                      >
                        Mostrar todos os pedidos
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                      {filteredCustomerOrders.map((order) => {
                        const quoteOnly = isOrderQuoteOnly(order);
                        const dateLabel = new Date(
                          order.createdAt
                        ).toLocaleDateString('pt-BR');
                        const statusHeadline =
                          getCustomerOrderCardStatusLabel(order);
                        const visibleItems = order.items.slice(0, 4);
                        const overflowCount = Math.max(
                          0,
                          order.items.length - visibleItems.length
                        );

                        return (
                          <article
                            key={`cust-order-${order.id}`}
                            className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs hover:shadow-md hover:border-zinc-300 transition-all flex flex-col justify-between overflow-hidden"
                          >
                            {/* Clickable Top Header */}
                            <button
                              type="button"
                              onClick={() => onSelectOrder(order.id)}
                              className="p-5 flex items-start justify-between gap-3 text-left w-full cursor-pointer group"
                            >
                              <div className="space-y-1 min-w-0">
                                <div
                                  className={`text-sm font-extrabold ${
                                    order.status === 'completed'
                                      ? 'text-emerald-700'
                                      : 'text-[#BA1826]'
                                  }`}
                                >
                                  {statusHeadline}
                                </div>
                                <div className="text-[13px] text-zinc-600 tabular-nums">
                                  <span>Feito em {dateLabel}</span>
                                  <span aria-hidden="true" className="mx-1.5">
                                    •
                                  </span>
                                  <span>
                                    {quoteOnly
                                      ? `Lista s/ valor (${order.items.length} ${
                                          order.items.length === 1
                                            ? 'item'
                                            : 'itens'
                                        })`
                                      : `Total ${formatCurrency(order.total)}`}
                                  </span>
                                  <span aria-hidden="true" className="mx-1.5">
                                    ·
                                  </span>
                                  <span className="font-mono font-semibold text-zinc-800">
                                    {order.id}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-950 shrink-0 mt-0.5 transition-colors" />
                            </button>

                            {/* Product Thumbnail Strip with dark 1x quantity pill */}
                            <div className="px-5 py-4 border-t border-zinc-100 flex items-center gap-3 flex-wrap">
                              {visibleItems.map((item, idx) => {
                                const catalogMatch = products.find(
                                  (p) => p.id === item.productId
                                );
                                const kitMatch = kits.find(
                                  (k) => k.id === item.productId
                                );
                                const thumbSrc =
                                  catalogMatch?.imageUrl ||
                                  kitMatch?.imageUrl ||
                                  '';

                                return (
                                  <button
                                    key={`card-thumb-${order.id}-${item.productId}-${idx}`}
                                    type="button"
                                    onClick={() => onSelectOrder(order.id)}
                                    title={`${item.quantity}x ${item.title}`}
                                    className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#FAFAFA] border border-zinc-200/80 overflow-hidden shrink-0 cursor-pointer hover:border-zinc-400 transition-colors"
                                  >
                                    <ProductImageWithFallback
                                      src={thumbSrc}
                                      alt={item.title}
                                      volumeLabel={item.volumeLabel}
                                      className="w-full h-full object-cover"
                                    />
                                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-zinc-950 text-white font-mono text-[10px] font-extrabold leading-none shadow-2xs tabular-nums">
                                      {item.quantity}x
                                    </span>
                                  </button>
                                );
                              })}

                              {overflowCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => onSelectOrder(order.id)}
                                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#F4F5F7] border border-zinc-200 text-xs font-extrabold text-zinc-700 hover:bg-zinc-200 flex items-center justify-center shrink-0 cursor-pointer tabular-nums"
                                >
                                  +{overflowCount}
                                </button>
                              )}
                            </div>

                            {/* Bottom Action Row */}
                            <div className="px-5 pb-4 pt-1 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => onRepeatOrder(order)}
                                className="text-[13px] font-extrabold text-zinc-950 underline underline-offset-4 hover:text-[#BA1826] cursor-pointer py-1"
                              >
                                Adicionar à cesta
                              </button>

                              <button
                                type="button"
                                onClick={() => onSelectOrder(order.id)}
                                className={`text-xs font-bold inline-flex items-center gap-0.5 cursor-pointer py-1 ${
                                  order.status !== 'completed'
                                    ? 'text-[#BA1826] hover:underline'
                                    : 'text-zinc-500 hover:text-zinc-900'
                                }`}
                              >
                                <span>
                                  {order.status !== 'completed'
                                    ? 'Acompanhar pedido'
                                    : 'Ver detalhes'}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 4B. DETALHES DO PEDIDO (Drogasil 13.26.57 inspired) */}
            {activeSection === 'orders' && selectedOrder && (
              <div className="space-y-5">
                <div>
                  <button
                    type="button"
                    onClick={() => onSelectOrder(null)}
                    className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-zinc-950 hover:text-[#BA1826] cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Detalhes do pedido</span>
                  </button>
                  <p className="text-xs text-zinc-500 mt-1 font-mono">
                    Pedido {selectedOrder.id} ·{' '}
                    {new Date(selectedOrder.createdAt).toLocaleDateString(
                      'pt-BR'
                    )}
                  </p>
                </div>

                {(() => {
                  const stage = getOrderStageMeta(
                    selectedOrder.status,
                    selectedOrder.deliveryType
                  );
                  const quoteOnly = isOrderQuoteOnly(selectedOrder);
                  const currentRating = selectedOrder.customerRating || 0;

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-5 items-start">
                      {/* Left Column */}
                      <div className="space-y-4">
                        {/* Avalie o seu pedido */}
                        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 text-center space-y-3">
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#BA1826]">
                              <Package className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-extrabold text-zinc-950">
                                Avalie o seu pedido
                              </div>
                              <div className="text-xs text-zinc-500">
                                {currentRating > 0
                                  ? `Você avaliou com ${currentRating} de 5 estrelas!`
                                  : 'Como foi a sua experiência com a Limper MT?'}
                              </div>
                            </div>
                          </div>

                          <div
                            role="group"
                            aria-label="Avaliação de 1 a 5 estrelas"
                            className="flex items-center justify-center gap-2 py-1"
                          >
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={`rate-star-${star}`}
                                type="button"
                                aria-label={`Avaliar com ${star} estrela${
                                  star > 1 ? 's' : ''
                                }`}
                                onClick={() => {
                                  onRateOrder(selectedOrder.id, star);
                                  onShowToast(
                                    `Obrigado por avaliar o pedido ${selectedOrder.id} (${star}/5)!`
                                  );
                                }}
                                className="p-1.5 rounded-lg hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBE00] transition-transform active:scale-90 cursor-pointer"
                              >
                                <Star
                                  className={`w-6 h-6 transition-colors ${
                                    star <= currentRating
                                      ? 'fill-[#FFBE00] text-[#FFBE00]'
                                      : 'text-zinc-300 hover:text-[#FFBE00]'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-zinc-100">
                            <button
                              type="button"
                              onClick={() =>
                                handleOrderSupportWhatsApp(selectedOrder)
                              }
                              className="text-xs font-bold text-zinc-800 underline hover:text-[#BA1826] cursor-pointer"
                            >
                              Preciso de ajuda com o meu pedido
                            </button>
                          </div>
                        </div>

                        {/* Status Card */}
                        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 space-y-4">
                          <h2 className="font-display text-base font-extrabold text-zinc-950">
                            {stage.cleaningStageTitle}
                          </h2>

                          <div className="p-3.5 rounded-xl bg-[#F4F5F7] flex items-start gap-3">
                            <Check className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                            <div className="space-y-1 text-xs">
                              <div className="font-extrabold text-zinc-900">
                                {stage.shortLabel}
                              </div>
                              <p className="text-zinc-600 leading-relaxed">
                                {stage.cleaningStageDesc}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            {stage.stepCards.map((st, idx) => {
                              const done = idx + 1 <= stage.step;
                              return (
                                <div
                                  key={st.status}
                                  className={`p-2 rounded-lg text-[10px] border ${
                                    done
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                                      : 'bg-zinc-50 border-zinc-200 text-zinc-500'
                                  }`}
                                >
                                  {st.shortTitle}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Produtos Card */}
                        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <h2 className="font-display text-base font-extrabold text-zinc-950">
                              Produtos ({selectedOrder.items.length})
                            </h2>
                            <button
                              type="button"
                              onClick={() =>
                                setShowOrderItemDetails((prev) => !prev)
                              }
                              className="text-xs font-bold text-zinc-800 underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>
                                {showOrderItemDetails
                                  ? 'Ocultar detalhes'
                                  : 'Exibir detalhes'}
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform ${
                                  showOrderItemDetails ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </div>

                          {/* Product Thumbnail Strip (like screenshot 13.26.57) */}
                          <div className="flex flex-wrap gap-3">
                            {selectedOrder.items.map((item, idx) => {
                              const catalogMatch = products.find(
                                (p) => p.id === item.productId
                              );
                              return (
                                <div
                                  key={`thumb-${item.productId}-${idx}`}
                                  className="relative w-16 h-16 rounded-xl bg-zinc-50 border border-zinc-200 overflow-hidden"
                                >
                                  <ProductImageWithFallback
                                    src={catalogMatch?.imageUrl || ''}
                                    alt={item.title}
                                    volumeLabel={item.volumeLabel}
                                    className="w-full h-full object-cover"
                                  />
                                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-zinc-950 text-white font-mono text-[10px] font-extrabold">
                                    {item.quantity}x
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {showOrderItemDetails && (
                            <div className="divide-y divide-zinc-100 border-t border-zinc-100 pt-2">
                              {selectedOrder.items.map((item, idx) => (
                                <div
                                  key={`detail-row-${item.productId}-${idx}`}
                                  className="py-2.5 text-xs space-y-1.5"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="font-bold text-zinc-900">
                                        {item.quantity}x {item.title}
                                      </div>
                                      <div className="text-[11px] text-zinc-500">
                                        {item.volumeLabel}
                                        {item.sku ? ` · Ref: ${item.sku}` : ''}
                                      </div>
                                    </div>
                                    <div className="font-mono font-bold text-zinc-900 shrink-0 tabular-nums">
                                      {quoteOnly || item.priceHidden
                                        ? 'Sob consulta'
                                        : formatCurrency(item.subtotal)}
                                    </div>
                                  </div>

                                  {item.kitItems && item.kitItems.length > 0 && (
                                    <div className="ml-3 pl-3 border-l-2 border-amber-300 text-[11px] text-zinc-600 space-y-0.5">
                                      <div className="font-bold text-zinc-800">
                                        Itens inclusos no kit:
                                      </div>
                                      {item.kitItems.map((kitSub) => (
                                        <div key={kitSub.productId}>
                                          • {kitSub.quantity * item.quantity}x{' '}
                                          {kitSub.title} ({kitSub.volumeLabel})
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="text-zinc-500">
                              Fornecido e separado por{' '}
                              <strong className="text-zinc-900">
                                Limper MT
                              </strong>
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onRepeatOrder(selectedOrder)}
                                className="px-4 py-2 rounded-full bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Repetir Pedido</span>
                              </button>
                              <a
                                href={buildWhatsAppOrderUrl(
                                  settings.whatsappNumber,
                                  selectedOrder,
                                  settings.storeAddress
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 rounded-full bg-[#1DA851] hover:bg-[#168F43] text-white font-extrabold inline-flex items-center gap-1.5"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Retirada/Entrega, Pagamento, Resumo, Ajuda */}
                      <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 space-y-3">
                          <h3 className="font-display text-sm font-extrabold text-zinc-950">
                            {selectedOrder.deliveryType === 'pickup'
                              ? 'Retirada na loja'
                              : 'Entrega Delivery'}
                          </h3>
                          {selectedOrder.deliveryType === 'pickup' ? (
                            <div className="p-3.5 rounded-xl bg-[#F4F5F7] text-xs space-y-1">
                              <div className="font-extrabold text-zinc-950">
                                Limper MT — Couto Magalhães
                              </div>
                              <div className="text-emerald-700 font-bold">
                                Retirada Balcão Express Grátis · 15 min
                              </div>
                              <div className="text-zinc-600">
                                {settings.storeAddress}
                              </div>
                              {selectedOrder.pickupCode && (
                                <div className="font-mono font-bold text-zinc-900 pt-1">
                                  Senha: {selectedOrder.pickupCode}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3.5 rounded-xl bg-[#F4F5F7] text-xs space-y-1">
                              <div className="font-extrabold text-zinc-950">
                                {formatLogisticsModeLabel(
                                  selectedOrder.logisticsMode,
                                  selectedOrder.address?.interiorCityName,
                                  selectedOrder.deliveryType
                                )}
                              </div>
                              {selectedOrder.address && (
                                <div className="text-zinc-600">
                                  {selectedOrder.address.street},{' '}
                                  {selectedOrder.address.number} —{' '}
                                  {selectedOrder.address.neighborhood} (
                                  {selectedOrder.address.city === 'Interior de MT'
                                    ? `${
                                        selectedOrder.address.interiorCityName ||
                                        'Interior'
                                      } - MT`
                                    : `${selectedOrder.address.city} - MT`}
                                  )
                                  {selectedOrder.address.cep
                                    ? ` · CEP ${selectedOrder.address.cep}`
                                    : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 space-y-2.5">
                          <h3 className="font-display text-sm font-extrabold text-zinc-950">
                            Forma de Pagamento
                          </h3>
                          <div className="p-3.5 rounded-xl bg-[#F4F5F7] text-xs font-bold text-zinc-900">
                            {formatPaymentMethodLabel(selectedOrder)}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-display text-sm font-extrabold text-zinc-950">
                              Resumo de valores
                            </h3>
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="text-xs font-bold text-zinc-700 underline hover:text-zinc-950 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Imprimir comanda</span>
                            </button>
                          </div>

                          {quoteOnly ? (
                            <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs space-y-1">
                              <div className="font-extrabold text-zinc-950">
                                Lista de Orçamento sem Valor
                              </div>
                              <p className="text-zinc-600">
                                Os valores finais e condições são confirmados pela equipe Limper MT direto no WhatsApp.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between text-zinc-600">
                                <span>Subtotal dos produtos</span>
                                <span className="font-mono font-bold text-zinc-900 tabular-nums">
                                  {formatCurrency(selectedOrder.subtotal)}
                                </span>
                              </div>
                              <div className="flex justify-between text-zinc-600">
                                <span>Frete</span>
                                <span className="font-mono font-bold text-emerald-700 tabular-nums">
                                  {selectedOrder.deliveryFee === 0
                                    ? 'Grátis'
                                    : formatCurrency(selectedOrder.deliveryFee)}
                                </span>
                              </div>
                              {selectedOrder.discountAmount &&
                              selectedOrder.discountAmount > 0 ? (
                                <div className="flex justify-between text-emerald-700">
                                  <span>Descontos</span>
                                  <span className="font-mono font-bold tabular-nums">
                                    -{formatCurrency(selectedOrder.discountAmount)}
                                  </span>
                                </div>
                              ) : null}
                              <div className="pt-2 border-t border-zinc-200 flex justify-between font-extrabold text-sm text-zinc-950">
                                <span>Total</span>
                                <span className="font-mono tabular-nums">
                                  {formatCurrency(selectedOrder.total)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleOrderSupportWhatsApp(selectedOrder)
                          }
                          className="w-full bg-white rounded-2xl border border-zinc-200/90 hover:border-zinc-400 p-4 flex items-center justify-between text-xs font-extrabold text-zinc-900 cursor-pointer"
                        >
                          <span>Ajuda com este pedido (WhatsApp)</span>
                          <ChevronRight className="w-4 h-4 text-zinc-500" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 5. VOCÊ JÁ COMPROU (RECOMPRA RÁPIDA) */}
            {activeSection === 'frequently_bought' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onChangeSection('summary')}
                    className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-zinc-950 hover:text-[#BA1826] cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Você já comprou ({frequentlyBought.length})</span>
                  </button>
                </div>

                {frequentlyBought.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-3">
                    <RotateCcw className="w-8 h-8 text-zinc-400 mx-auto" />
                    <p className="text-sm font-bold text-zinc-900">
                      Seus itens de reposição frequente aparecerão aqui.
                    </p>
                    <p className="text-xs text-zinc-500">
                      Assim que você fizer seus primeiros pedidos, poderá recomprar seus galões de 5L e essências com 1 clique.
                    </p>
                    <button
                      type="button"
                      onClick={onBackToStore}
                      className="px-5 py-2.5 rounded-full bg-[#FFBE00] text-zinc-950 text-xs font-extrabold cursor-pointer"
                    >
                      Explorar Catálogo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {frequentlyBought.map((entry) => {
                      const showPrice =
                        !hideAllPrices &&
                        isProductPriceVisible(entry.product, settings);
                      return (
                        <div
                          key={`freq-${entry.product.id}`}
                          className="bg-white rounded-2xl border border-zinc-200/90 p-4 flex flex-col justify-between gap-3"
                        >
                          <div className="flex gap-3">
                            <div className="w-16 h-16 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0">
                              <ProductImageWithFallback
                                src={entry.product.imageUrl}
                                alt={entry.product.title}
                                volumeLabel={entry.product.volumeLabel}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="text-[11px] font-bold text-[#BA1826]">
                                Pedido {entry.orderCount}x · {entry.totalUnits}{' '}
                                unid.
                              </div>
                              <h3 className="text-xs font-extrabold text-zinc-900 line-clamp-2">
                                {entry.product.title}
                              </h3>
                              <div className="text-[11px] text-zinc-500">
                                {entry.product.volumeLabel}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
                            <span className="text-xs font-mono font-bold text-zinc-900">
                              {showPrice
                                ? formatCurrency(entry.product.promoPrice || entry.product.price)
                                : 'Lista s/ valor'}
                            </span>
                            <button
                              type="button"
                              onClick={() => onAddToCart(entry.product)}
                              className="px-3.5 py-2 rounded-full bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <ShoppingBasket className="w-3.5 h-3.5" />
                              <span>Adicionar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 6. PRODUTOS SALVOS */}
            {activeSection === 'favorites' && (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => onChangeSection('summary')}
                  className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-zinc-950 hover:text-[#BA1826] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Produtos salvos ({savedProducts.length})</span>
                </button>

                {savedProducts.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-3">
                    <Heart className="w-8 h-8 text-zinc-400 mx-auto" />
                    <p className="text-sm font-bold text-zinc-900">
                      Você ainda não salvou produtos favoritos.
                    </p>
                    <p className="text-xs text-zinc-500">
                      Toque no coração de qualquer produto no catálogo para montar sua lista fixa de reposição.
                    </p>
                    <button
                      type="button"
                      onClick={onBackToStore}
                      className="px-5 py-2.5 rounded-full bg-[#FFBE00] text-zinc-950 text-xs font-extrabold cursor-pointer"
                    >
                      Ver Produtos Quimiprol
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedProducts.map((prod) => {
                      const showPrice =
                        !hideAllPrices && isProductPriceVisible(prod, settings);
                      return (
                        <div
                          key={`fav-${prod.id}`}
                          className="bg-white rounded-2xl border border-zinc-200/90 p-4 flex flex-col justify-between gap-3"
                        >
                          <div className="flex gap-3">
                            <div className="w-16 h-16 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0">
                              <ProductImageWithFallback
                                src={prod.imageUrl}
                                alt={prod.title}
                                volumeLabel={prod.volumeLabel}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="text-[11px] font-mono text-zinc-500">
                                {prod.sku} · {prod.volumeLabel}
                              </div>
                              <h3 className="text-xs font-extrabold text-zinc-900 line-clamp-2">
                                {prod.title}
                              </h3>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
                            <button
                              type="button"
                              onClick={() => onToggleFavorite(prod.id)}
                              className="text-xs font-bold text-zinc-500 hover:text-[#BA1826] cursor-pointer"
                            >
                              Remover
                            </button>

                            <div className="flex items-center gap-2">
                              {showPrice && (
                                <span className="text-xs font-mono font-bold text-zinc-900">
                                  {formatCurrency(prod.promoPrice || prod.price)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => onAddToCart(prod)}
                                className="px-3.5 py-2 rounded-full bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Lista</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 7. MEUS BENEFÍCIOS LIMPER MT */}
            {activeSection === 'benefits' && (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => onChangeSection('summary')}
                  className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-zinc-950 hover:text-[#BA1826] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Meus Benefícios Limper MT</span>
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2 font-display text-base font-extrabold text-zinc-950">
                        <Award className="w-5 h-5 text-[#BA1826]" />
                        <span>Clube de Descontos Limper MT</span>
                      </div>
                      <span
                        className={`text-[11px] font-extrabold ${
                          profile.clubDiscountActive !== false
                            ? 'text-emerald-700'
                            : 'text-zinc-500'
                        }`}
                      >
                        {profile.clubDiscountActive !== false
                          ? 'Ativo'
                          : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Condições especiais para galões Quimiprol 5L, cotação rápida via WhatsApp para empresas e condomínios e prioridade no Balcão Express.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !(profile.clubDiscountActive !== false);
                        onSaveProfile({ ...profile, clubDiscountActive: next });
                        onShowToast(
                          next
                            ? 'Clube de Descontos Limper MT ativado!'
                            : 'Clube de Descontos desativado.'
                        );
                      }}
                      className="px-4 py-2 rounded-full border border-zinc-300 hover:border-zinc-950 text-xs font-bold text-zinc-900 cursor-pointer"
                    >
                      {profile.clubDiscountActive !== false
                        ? 'Desativar Clube'
                        : 'Ativar Clube Grátis'}
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 space-y-3">
                    <div className="inline-flex items-center gap-2 font-display text-base font-extrabold text-zinc-950">
                      <Store className="w-5 h-5 text-emerald-700" />
                      <span>Retirada Grátis no Balcão (15 min)</span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Qualquer item ou lista sem pedido mínimo pode ser retirada gratuitamente na {settings.storeAddress}. Separação expressa em ~15 minutos.
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 space-y-2.5">
                    <div className="inline-flex items-center gap-2 font-display text-base font-extrabold text-zinc-950">
                      <Bike className="w-5 h-5 text-[#BA1826]" />
                      <span>Moto Limper (Pequenos Itens)</span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Entrega ágil para frascos 500mL, 1L e itens que cabem na moto acima de{' '}
                      <strong className="font-mono text-zinc-900">
                        {formatCurrency(logistics.motoVgMin)}
                      </strong>{' '}
                      (Várzea Grande) e{' '}
                      <strong className="font-mono text-zinc-900">
                        {formatCurrency(logistics.motoCbaMin)}
                      </strong>{' '}
                      (Cuiabá).
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 space-y-2.5">
                    <div className="inline-flex items-center gap-2 font-display text-base font-extrabold text-zinc-950">
                      <Truck className="w-5 h-5 text-[#D97706]" />
                      <span>Caminhão Limper & Interior MT</span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Galões de 5L e volumes maiores acima de{' '}
                      <strong className="font-mono text-zinc-900">
                        {formatCurrency(logistics.truckVgMin)}
                      </strong>{' '}
                      (VG) e{' '}
                      <strong className="font-mono text-zinc-900">
                        {formatCurrency(logistics.truckCbaMin)}
                      </strong>{' '}
                      (Cuiabá). Demais cidades de MT sob consulta direta no WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 8. PRIVACIDADE DE DADOS (Drogasil 13.26.27 inspired) */}
            {activeSection === 'privacy' && (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => onChangeSection('summary')}
                  className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-zinc-950 hover:text-[#BA1826] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Privacidade de dados</span>
                </button>

                <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-7 space-y-5">
                  <h2 className="font-display text-base font-extrabold text-zinc-950">
                    Ofertas personalizadas, orçamentos e canais de comunicação
                  </h2>

                  {/* Card 1 */}
                  <div className="p-4 sm:p-5 rounded-xl bg-[#F4F5F7] space-y-3">
                    <div className="text-xs font-extrabold text-zinc-900">
                      Aceita receber ofertas exclusivas de galões, kits e tabelas atacado?
                    </div>
                    <div className="space-y-2 text-xs font-medium text-zinc-800">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="priv-offers"
                          checked={privacyPrefs.offersOptIn}
                          onChange={() => updatePrivacyField('offersOptIn', true)}
                          className="w-4 h-4 accent-zinc-950"
                        />
                        <span>Aceito</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="priv-offers"
                          checked={!privacyPrefs.offersOptIn}
                          onChange={() => updatePrivacyField('offersOptIn', false)}
                          className="w-4 h-4 accent-zinc-950"
                        />
                        <span>Não aceito</span>
                      </label>
                    </div>
                  </div>

                  {/* Card 2: Channels */}
                  <div className="p-4 sm:p-5 rounded-xl bg-[#F4F5F7] space-y-3">
                    <div className="text-xs font-extrabold text-zinc-900">
                      Por onde aceita receber atendimento e notificações?
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
                      <div className="space-y-2">
                        <div className="font-bold text-zinc-800">
                          WhatsApp / Mensagens
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="priv-whatsapp"
                            checked={privacyPrefs.whatsappOptIn}
                            onChange={() =>
                              updatePrivacyField('whatsappOptIn', true)
                            }
                            className="w-4 h-4 accent-zinc-950"
                          />
                          <span>Aceito</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="priv-whatsapp"
                            checked={!privacyPrefs.whatsappOptIn}
                            onChange={() =>
                              updatePrivacyField('whatsappOptIn', false)
                            }
                            className="w-4 h-4 accent-zinc-950"
                          />
                          <span>Não aceito</span>
                        </label>
                      </div>

                      <div className="space-y-2">
                        <div className="font-bold text-zinc-800">E-mail</div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="priv-email"
                            checked={privacyPrefs.emailOptIn}
                            onChange={() =>
                              updatePrivacyField('emailOptIn', true)
                            }
                            className="w-4 h-4 accent-zinc-950"
                          />
                          <span>Aceito</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="priv-email"
                            checked={!privacyPrefs.emailOptIn}
                            onChange={() =>
                              updatePrivacyField('emailOptIn', false)
                            }
                            className="w-4 h-4 accent-zinc-950"
                          />
                          <span>Não aceito</span>
                        </label>
                      </div>

                      <div className="space-y-2">
                        <div className="font-bold text-zinc-800">
                          Ligações telefônicas
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="priv-phone"
                            checked={privacyPrefs.phoneOptIn}
                            onChange={() =>
                              updatePrivacyField('phoneOptIn', true)
                            }
                            className="w-4 h-4 accent-zinc-950"
                          />
                          <span>Aceito</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="priv-phone"
                            checked={!privacyPrefs.phoneOptIn}
                            onChange={() =>
                              updatePrivacyField('phoneOptIn', false)
                            }
                            className="w-4 h-4 accent-zinc-950"
                          />
                          <span>Não aceito</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Restock reminders */}
                  <div className="p-4 sm:p-5 rounded-xl bg-[#F4F5F7] space-y-3">
                    <div className="text-xs font-extrabold text-zinc-900">
                      Aceita lembretes inteligentes de reposição mensal para galões 5L e insumos de limpeza?
                    </div>
                    <div className="space-y-2 text-xs font-medium text-zinc-800">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="priv-restock"
                          checked={privacyPrefs.restockRemindersOptIn}
                          onChange={() =>
                            updatePrivacyField('restockRemindersOptIn', true)
                          }
                          className="w-4 h-4 accent-zinc-950"
                        />
                        <span>Aceito</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="priv-restock"
                          checked={!privacyPrefs.restockRemindersOptIn}
                          onChange={() =>
                            updatePrivacyField('restockRemindersOptIn', false)
                          }
                          className="w-4 h-4 accent-zinc-950"
                        />
                        <span>Não aceito</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile quick account actions (visible only on < lg) */}
            <div className="lg:hidden pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/80 text-xs">
              <button
                type="button"
                onClick={onSwitchAccount}
                className="py-2 font-bold text-zinc-700 hover:text-zinc-950 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-[#E3262E]" />
                <span>Trocar cadastro</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="py-2 font-bold text-zinc-500 hover:text-[#BA1826] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da conta</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
