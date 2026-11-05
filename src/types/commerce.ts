export type UnitOfMeasure = 'L' | 'mL' | 'kg' | 'g' | 'Unid';

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

export interface Product {
  id: string;
  sku: string;
  title: string;
  description: string;
  categoryId: string;
  price: number; // Preço regular ("De")
  promoPrice?: number | null; // Preço promocional ("Por")
  showPrice?: boolean; // Se false, oculta o preço no catálogo ("Valor sob consulta")
  unit: UnitOfMeasure;
  volumeLabel: string; // ex: "5L | 2L", "5L", "1L", "500mL"
  status: ProductStatus;
  imageUrl: string;
  featured?: boolean;
  dilutionHint?: string; // ex: "Rende até 50 Litros"
  badgeLabel?: string; // ex: "Ofertas do Mês | Limper MT"
  subBadgeLabel?: string; // ex: "Preço Exclusivo Site | Quimiprol"
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type DeliveryType = 'delivery' | 'pickup';

export type PaymentMethod = 'pix' | 'card' | 'cash';

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
}

export type CatalogSortOption =
  | 'featured'
  | 'price_asc'
  | 'price_desc'
  | 'discount_desc'
  | 'name_asc';

export type VolumeFilterOption = 'all' | '5L' | '2L_1L' | 'small';

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
  pickupCode?: string; // ex: "BALCÃO-42"
  estimatedTime?: string; // ex: "Pronto em 15 min no Balcão Express"
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    city: 'Cuiabá' | 'Várzea Grande';
    reference?: string;
    cep?: string;
  };
  paymentMethod: PaymentMethod;
  cardSubType?: 'credit' | 'debit';
  cashChangeFor?: number | null;
  status: OrderStatus;
  notes?: string;
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
  city: 'Cuiabá' | 'Várzea Grande';
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
  hideAllPrices?: boolean; // Permite ocultar todos os preços da loja (Modo Cotação/Orçamento)
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

