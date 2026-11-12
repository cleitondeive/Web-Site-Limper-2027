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
  | 'Sparkles';

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
  subBadgeLabel?: string; // ex: "Preço Exclusivo Site | Quimiprol"
  kitItems?: KitComponentSnapshot[]; // Produtos inclusos quando o item é um Kit/Combo
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
}

export interface CustomerProfile {
  name: string;
  phone: string;
  email?: string;
  cpfCnpj?: string;
  cep?: string;
  street: string;
  number: string;
  neighborhood: string;
  city: DeliveryCityOption;
  interiorCityName?: string;
  reference: string;
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


