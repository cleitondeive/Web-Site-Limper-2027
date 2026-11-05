import React, { useState } from 'react';
import {
  Calculator,
  Check,
  ClipboardList,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import {
  CustomerProfile,
  Order,
  Product,
  StoreSettings,
} from '../types/commerce';
import {
  formatCurrency,
  formatPhone,
  getEffectivePrice,
  normalizePhone,
} from '../utils/commerce';
import { ProductImageWithFallback } from './CategoryIcon';

export function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

const CUIABA_VG_CEP_PRESETS: {
  cep: string;
  neighborhood: string;
  city: 'Cuiabá' | 'Várzea Grande';
  streetHint: string;
  eta: string;
}[] = [
  {
    cep: '78110-400',
    neighborhood: 'Centro Norte',
    city: 'Várzea Grande',
    streetHint: 'Av. Couto Magalhães, 2820 (Região da Loja)',
    eta: 'Entrega Expressa em até 25 min ou Retirada em 15 min',
  },
  {
    cep: '78118-000',
    neighborhood: 'Cristo Rei / Ponte Nova',
    city: 'Várzea Grande',
    streetHint: 'Av. Dom Orlando Chaves / Cristo Rei',
    eta: 'Entrega Rápida em até 40 min',
  },
  {
    cep: '78005-000',
    neighborhood: 'Centro',
    city: 'Cuiabá',
    streetHint: 'Região Central / Getúlio Vargas',
    eta: 'Entrega Rápida em até 50 min',
  },
  {
    cep: '78080-000',
    neighborhood: 'Coxipó / Jardim Itália',
    city: 'Cuiabá',
    streetHint: 'Av. Fernando Corrêa da Costa',
    eta: 'Entrega Rápida em até 1 hora',
  },
  {
    cep: '78055-000',
    neighborhood: 'CPA I / II / III / IV',
    city: 'Cuiabá',
    streetHint: 'Av. Historiador Rubens de Mendonça',
    eta: 'Entrega em até 1h10',
  },
];

interface CustomerAccountModalProps {
  isOpen: boolean;
  profile: CustomerProfile;
  existingOrders: Order[];
  onClose: () => void;
  onSaveProfile: (updated: CustomerProfile) => void;
}

export const CustomerAccountModal: React.FC<CustomerAccountModalProps> = ({
  isOpen,
  profile,
  existingOrders,
  onClose,
  onSaveProfile,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(
    profile.isRegistered ? 'register' : 'register'
  );
  const [name, setName] = useState(profile.name || '');
  const [phone, setPhone] = useState(
    profile.phone ? formatPhone(profile.phone) : ''
  );
  const [email, setEmail] = useState(profile.email || '');
  const [cpfCnpj, setCpfCnpj] = useState(profile.cpfCnpj || '');
  const [cep, setCep] = useState(profile.cep || '78080-000');
  const [street, setStreet] = useState(profile.street || '');
  const [number, setNumber] = useState(profile.number || '');
  const [neighborhood, setNeighborhood] = useState(
    profile.neighborhood || 'Coxipó'
  );
  const [city, setCity] = useState<'Cuiabá' | 'Várzea Grande'>(
    profile.city || 'Cuiabá'
  );
  const [reference, setReference] = useState(profile.reference || '');
  const [clubDiscountActive, setClubDiscountActive] = useState(
    profile.clubDiscountActive !== false
  );
  const [loginPhone, setLoginPhone] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = normalizePhone(loginPhone);
    const matchedOrder = existingOrders.find(
      (o) => normalizePhone(o.customerPhone).includes(digits) && digits.length >= 8
    );
    if (matchedOrder) {
      const updated: CustomerProfile = {
        name: matchedOrder.customerName,
        phone: matchedOrder.customerPhone,
        email: email || 'cliente@limpermt.com.br',
        cpfCnpj: cpfCnpj || '000.000.000-00',
        cep: matchedOrder.address?.cep || '78005-000',
        street: matchedOrder.address?.street || 'Rua das Palmeiras',
        number: matchedOrder.address?.number || '120',
        neighborhood: matchedOrder.address?.neighborhood || 'Centro',
        city: matchedOrder.address?.city || 'Cuiabá',
        reference: matchedOrder.address?.reference || '',
        isRegistered: true,
        clubDiscountActive: true,
      };
      onSaveProfile(updated);
      onClose();
    } else {
      setFeedback(
        'Não encontramos pedido anterior com este telefone. Preencha a aba "Criar / Atualizar Cadastro" ao lado.'
      );
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setFeedback('Informe seu Nome Completo ou Razão Social da Empresa.');
      return;
    }
    if (normalizePhone(phone).length < 10) {
      setFeedback('Informe seu WhatsApp com DDD (ex: 65 99999-9999).');
      return;
    }

    const updated: CustomerProfile = {
      name: name.trim(),
      phone: normalizePhone(phone),
      email: email.trim(),
      cpfCnpj: cpfCnpj.trim(),
      cep: formatCep(cep) || '78080-000',
      street: street.trim(),
      number: number.trim(),
      neighborhood: neighborhood.trim() || 'Centro',
      city,
      reference: reference.trim(),
      isRegistered: true,
      clubDiscountActive,
    };

    onSaveProfile(updated);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-modal-title"
      className="fixed inset-0 z-50 bg-zinc-900/55 backdrop-blur-xs flex items-center justify-center p-4 no-print"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden border border-zinc-200 shadow-2xl">
        {/* Top Modal Header */}
        <div className="px-6 py-4 bg-zinc-950 text-white flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFBE00] text-zinc-950 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFBE00] block">
                CONTA & BENEFÍCIOS LIMPER MT
              </span>
              <h2 id="customer-modal-title" className="font-display text-lg font-extrabold">
                Boas-vindas! Entrar ou Cadastrar
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de cadastro"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 border-b border-zinc-200 bg-[#FAFAFA]">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setFeedback(null);
            }}
            className={`py-3 text-xs font-extrabold border-b-2 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'register'
                ? 'border-[#E3262E] text-zinc-950 bg-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <UserPlus className="w-4 h-4 text-[#E3262E]" />
            <span>Criar / Atualizar Cadastro</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setFeedback(null);
            }}
            className={`py-3 text-xs font-extrabold border-b-2 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'login'
                ? 'border-[#E3262E] text-zinc-950 bg-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-[#D97706]" />
            <span>Já Compro na Limper (Entrar)</span>
          </button>
        </div>

        <div className="p-6 max-h-[78vh] overflow-y-auto">
          {feedback && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {feedback}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleQuickLogin} className="space-y-4">
              <p className="text-xs text-zinc-600 leading-relaxed">
                Digite seu WhatsApp cadastrado para recuperar automaticamente seu nome, endereço de entrega, CEP e histórico de pedidos:
              </p>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  Seu WhatsApp com DDD *
                </label>
                <input
                  type="tel"
                  required
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(formatPhone(e.target.value))}
                  placeholder="(65) 99999-9999"
                  className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm font-mono focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#FDF6E2] border border-[#F3E3B2] text-xs space-y-2">
                <div className="font-bold text-zinc-900">
                  Acesso Rápido de Demonstração (1 Clique):
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setLoginPhone('(65) 99999-9999')}
                    className="px-3 py-1.5 bg-white border border-zinc-300 rounded-lg font-mono text-xs font-bold text-zinc-900 hover:border-[#E3262E] cursor-pointer"
                  >
                    João Silva · (65) 99999-9999
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginPhone('(65) 99244-1122')}
                    className="px-3 py-1.5 bg-white border border-zinc-300 rounded-lg font-mono text-xs font-bold text-zinc-900 hover:border-[#E3262E] cursor-pointer"
                  >
                    Condomínio Solar · (65) 99244-1122
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-sm rounded-xl cursor-pointer shadow-xs"
              >
                Acessar Minha Conta & Carregar Endereço
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Nome Completo ou Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Maria Oliveira / Clínica Vida"
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    WhatsApp (Celular) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(65) 99999-9999"
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    CPF ou CNPJ (Para Nota / Desconto Atacado)
                  </label>
                  <input
                    type="text"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00 ou CNPJ"
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com.br"
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200">
                <div className="text-xs font-extrabold text-zinc-900 mb-2">
                  Endereço Principal & CEP (Para Cálculo de Entrega Expressa)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      CEP *
                    </label>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(formatCep(e.target.value))}
                      placeholder="78080-000"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Coxipó / Centro"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Cidade
                    </label>
                    <select
                      value={city}
                      onChange={(e) =>
                        setCity(e.target.value as 'Cuiabá' | 'Várzea Grande')
                      }
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                    >
                      <option value="Cuiabá">Cuiabá - MT</option>
                      <option value="Várzea Grande">Várzea Grande - MT</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Rua / Avenida
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Av. Fernando Corrêa da Costa"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="2480"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Club Discount Opt-In (Drogasil "Descontos Univers / Stix" Equivalent) */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FFBE00] cursor-pointer">
                <input
                  type="checkbox"
                  checked={clubDiscountActive}
                  onChange={(e) => setClubDiscountActive(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#E3262E]"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-zinc-950 block">
                    Ativar Clube de Descontos & Benefícios Limper MT (Grátis)
                  </span>
                  <span className="text-zinc-600">
                    Libera preços promocionais de atacado em galões de 5L e retirada expressa prioritária no balcão.
                  </span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#E3262E] hover:bg-[#C81E25] text-white text-xs font-extrabold rounded-xl cursor-pointer shadow-xs"
                >
                  Salvar Cadastro & Ativar Benefícios
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

interface CepLocationModalProps {
  isOpen: boolean;
  profile: CustomerProfile;
  settings: StoreSettings;
  onClose: () => void;
  onSaveProfile: (updated: CustomerProfile) => void;
}

export const CepLocationModal: React.FC<CepLocationModalProps> = ({
  isOpen,
  profile,
  settings,
  onClose,
  onSaveProfile,
}) => {
  const [cepInput, setCepInput] = useState(profile.cep || '78080-000');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(
    profile.neighborhood || 'Coxipó'
  );
  const [selectedCity, setSelectedCity] = useState<'Cuiabá' | 'Várzea Grande'>(
    profile.city || 'Cuiabá'
  );

  if (!isOpen) return null;

  const matchedFeeObj = settings.neighborhoodFees.find(
    (n) => n.name.toLowerCase() === selectedNeighborhood.toLowerCase()
  );
  const currentFee = matchedFeeObj ? matchedFeeObj.fee : settings.defaultDeliveryFee;

  const handleApplyCep = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...profile,
      cep: formatCep(cepInput) || '78080-000',
      neighborhood: selectedNeighborhood,
      city: selectedCity,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cep-modal-title"
      className="fixed inset-0 z-50 bg-zinc-900/55 backdrop-blur-xs flex items-center justify-center p-4 no-print"
    >
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden border border-zinc-200 shadow-2xl">
        <div className="px-6 py-4 bg-zinc-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-[#FFBE00]" />
            <h2 id="cep-modal-title" className="font-display text-base font-extrabold">
              Insira seu CEP · Disponibilidade & Frete
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar CEP"
            className="p-1 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApplyCep} className="p-6 space-y-4">
          <p className="text-xs text-zinc-600 leading-relaxed">
            Informe seu CEP em <strong>Cuiabá ou Várzea Grande</strong> para verificar estoque imediato de galões 5L, prazo de entrega rápida e retirada em 15 minutos:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">
                Digite seu CEP
              </label>
              <input
                type="text"
                value={cepInput}
                onChange={(e) => setCepInput(formatCep(e.target.value))}
                placeholder="78080-000"
                className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm font-mono font-bold text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">
                Região / Bairro
              </label>
              <select
                value={selectedNeighborhood}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedNeighborhood(val);
                  const nb = settings.neighborhoodFees.find((n) => n.name === val);
                  if (nb) setSelectedCity(nb.city);
                }}
                className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900"
              >
                {settings.neighborhoodFees.map((nb) => (
                  <option key={nb.id} value={nb.name}>
                    {nb.name} ({nb.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Region Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-500 uppercase">
              Selecione sua região com 1 clique:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CUIABA_VG_CEP_PRESETS.map((preset) => (
                <button
                  key={preset.cep}
                  type="button"
                  onClick={() => {
                    setCepInput(preset.cep);
                    setSelectedNeighborhood(preset.neighborhood);
                    setSelectedCity(preset.city);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                    selectedNeighborhood === preset.neighborhood
                      ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950'
                      : 'bg-[#FAFAFA] border-zinc-200 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {preset.neighborhood} ({preset.cep})
                </button>
              ))}
            </div>
          </div>

          {/* Live Delivery & Pickup Estimate Card */}
          <div className="rounded-xl bg-[#FAFAFA] border border-zinc-200 p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#E3262E]" />
                <span className="font-bold text-zinc-900">
                  Delivery Rápido ({selectedNeighborhood})
                </span>
              </div>
              <span className="font-mono font-extrabold text-zinc-950">
                {formatCurrency(currentFee)} (Grátis acima de {formatCurrency(settings.freeShippingThreshold)})
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-200/80">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-zinc-900">
                  Retirada na Loja (Em até 15min)
                </span>
              </div>
              <span className="font-mono font-extrabold text-emerald-700 uppercase">
                GRÁTIS
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-xs sm:text-sm rounded-xl cursor-pointer shadow-xs"
          >
            Confirmar CEP e Atualizar Catálogo
          </button>
        </form>
      </div>
    </div>
  );
};

interface QuickOrderListModalProps {
  isOpen: boolean;
  products: Product[];
  onClose: () => void;
  onAddMultipleToCart: (entries: { product: Product; quantity: number }[]) => void;
}

export const QuickOrderListModal: React.FC<QuickOrderListModalProps> = ({
  isOpen,
  products,
  onClose,
  onAddMultipleToCart,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'calculator'>('list');
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({
    'prod-casa-3': 1,
    'prod-lav-6': 2,
    'prod-pes-2': 1,
  });

  // Dilution Calculator State
  const [calcProductId, setCalcProductId] = useState('prod-pes-1');
  const [calcAreaM2, setCalcAreaM2] = useState('150');
  const [calcDirtLevel, setCalcDirtLevel] = useState<'light' | 'medium' | 'heavy'>('medium');

  if (!isOpen) return null;

  const activeProducts = products.filter(
    (p) =>
      p.status === 'active' &&
      (search.trim() === '' ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedEntries = products
    .filter((p) => (quantities[p.id] || 0) > 0)
    .map((product) => ({
      product,
      quantity: quantities[product.id],
    }));

  const selectedTotal = selectedEntries.reduce(
    (acc, item) => acc + getEffectivePrice(item.product) * item.quantity,
    0
  );

  const handleSetQty = (productId: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, qty),
    }));
  };

  const handleAddBatch = () => {
    if (selectedEntries.length === 0) return;
    onAddMultipleToCart(selectedEntries);
    onClose();
  };

  // Dilution calculation
  const calcProduct =
    products.find((p) => p.id === calcProductId) || products[0];
  const areaNum = Math.max(10, Number(calcAreaM2) || 100);
  const ratio =
    calcDirtLevel === 'heavy' ? 5 : calcDirtLevel === 'medium' ? 10 : 20;
  const solutionLitersNeeded = Math.ceil(areaNum / 10);
  const concentrateLitersNeeded = Number(
    (solutionLitersNeeded / ratio).toFixed(1)
  );
  const recommendedGallons = Math.max(1, Math.ceil(concentrateLitersNeeded / 5));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-order-title"
      className="fixed inset-0 z-50 bg-zinc-900/55 backdrop-blur-xs flex items-center justify-center p-4 no-print"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden border border-zinc-200 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E3262E] text-white flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFBE00] block">
                REPOSIÇÃO EXPRESSA · CASA, CLÍNICA & CONDOMÍNIO
              </span>
              <h2 id="quick-order-title" className="font-display text-lg font-extrabold">
                Compra Rápida por Lista & Calculadora de Diluição
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar compra rápida"
            className="p-1.5 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="grid grid-cols-2 border-b border-zinc-200 bg-[#FAFAFA]">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`py-3 text-xs font-extrabold border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'list'
                ? 'border-[#E3262E] text-zinc-950 bg-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-[#E3262E]" />
            <span>Lista de Compra Rápida (Atacado/Varejo)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`py-3 text-xs font-extrabold border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'calculator'
                ? 'border-[#E3262E] text-zinc-950 bg-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Calculator className="w-4 h-4 text-[#D97706]" />
            <span>Dose / Diluição Certa Quimiprol</span>
          </button>
        </div>

        {activeTab === 'list' ? (
          <>
            <div className="p-4 border-b border-zinc-200 bg-[#FAFAFA] flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrar lista rápida por nome ou código (ex: Cloro, Quimi 90, Água Sanitária)..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => setQuantities({})}
                className="text-xs font-bold text-zinc-500 hover:text-rose-600 cursor-pointer shrink-0"
              >
                Zerar Seleção
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 px-6 py-2">
              {activeProducts.map((prod) => {
                const qty = quantities[prod.id] || 0;
                const price = getEffectivePrice(prod);
                return (
                  <div
                    key={prod.id}
                    className={`py-2.5 flex items-center justify-between gap-3 text-xs rounded-xl px-2 transition-colors ${
                      qty > 0 ? 'bg-[#FFFBEB]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-xl bg-white border border-zinc-200 overflow-hidden shrink-0">
                        <ProductImageWithFallback
                          src={prod.imageUrl}
                          alt={prod.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-zinc-900 truncate">
                          {prod.title}{' '}
                          <span className="font-mono text-zinc-400">({prod.sku})</span>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Embalagem: <strong className="font-mono">{prod.volumeLabel}</strong> ·{' '}
                          <span className="font-mono font-bold text-zinc-900">
                            {formatCurrency(price)} un.
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSetQty(prod.id, qty - 1)}
                        className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 font-bold text-zinc-800 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-7 text-center font-mono font-extrabold text-zinc-950 tabular-nums">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSetQty(prod.id, qty + 1)}
                        className="w-7 h-7 rounded-lg bg-[#FFBE00] hover:bg-[#F59E0B] font-bold text-zinc-950 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-[#FAFAFA] border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-zinc-500">Itens na lista rápida: </span>
                <strong className="font-mono text-zinc-950">
                  {selectedEntries.reduce((acc, i) => acc + i.quantity, 0)} unidades
                </strong>{' '}
                ·{' '}
                <strong className="font-mono text-base text-[#E3262E]">
                  {formatCurrency(selectedTotal)}
                </strong>
              </div>
              <button
                type="button"
                onClick={handleAddBatch}
                disabled={selectedEntries.length === 0}
                className="px-5 py-2.5 bg-[#FFBE00] hover:bg-[#F59E0B] disabled:bg-zinc-200 text-zinc-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Adicionar Todos à Cesta</span>
              </button>
            </div>
          </>
        ) : (
          <div className="p-6 space-y-5 overflow-y-auto">
            <p className="text-xs text-zinc-600 leading-relaxed">
              Calcule a diluição ideal dos concentrados Quimiprol para não desperdiçar produto e descobrir quantos galões sua residência ou empresa precisa:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  Produto Concentrado
                </label>
                <select
                  value={calcProductId}
                  onChange={(e) => setCalcProductId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.volumeLabel})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  Área Estimada de Limpeza (m²)
                </label>
                <input
                  type="number"
                  value={calcAreaM2}
                  onChange={(e) => setCalcAreaM2(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                Nível de Sujidade / Incrustação
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'light', label: 'Manutenção Diária (1:20)' },
                  { id: 'medium', label: 'Limpeza Geral (1:10)' },
                  { id: 'heavy', label: 'Pesada / Pós-Obra (1:5)' },
                ].map((lv) => (
                  <button
                    key={lv.id}
                    type="button"
                    onClick={() =>
                      setCalcDirtLevel(lv.id as 'light' | 'medium' | 'heavy')
                    }
                    className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                      calcDirtLevel === lv.id
                        ? 'bg-[#FFFBEB] border-[#FFBE00] text-zinc-950'
                        : 'bg-[#FAFAFA] border-zinc-200 text-zinc-600'
                    }`}
                  >
                    {lv.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FDF6E2] border border-[#F3E3B2] space-y-2 text-xs">
              <div className="font-mono font-extrabold text-[#E3262E] uppercase">
                RECOMENDAÇÃO TÉCNICA LIMPER MT
              </div>
              <div className="text-zinc-800">
                Para limpar <strong>{areaNum} m²</strong> na diluição{' '}
                <strong>1:{ratio}</strong>, você precisará de aproximadamente{' '}
                <strong className="font-mono">{concentrateLitersNeeded} L</strong> de produto puro diluídos em{' '}
                <strong className="font-mono">{solutionLitersNeeded} L</strong> de água.
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="font-extrabold text-zinc-950 text-sm">
                  Quantidade sugerida: {recommendedGallons}x {calcProduct.title}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onAddMultipleToCart([
                      { product: calcProduct, quantity: recommendedGallons },
                    ]);
                    onClose();
                  }}
                  className="px-4 py-2 bg-[#E3262E] hover:bg-[#C81E25] text-white font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar {recommendedGallons} un. à Cesta</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
