import React, { useEffect, useRef, useState } from 'react';
import {
  Bike,
  Building2,
  Calculator,
  Check,
  ClipboardList,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  User,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import {
  CustomerProfile,
  DeliveryCityOption,
  Order,
  Product,
  StoreSettings,
} from '../types/commerce';
import {
  buildLogisticsWhatsAppConsultUrl,
  formatCurrency,
  formatPhone,
  getEffectivePrice,
  getLogisticsSettings,
  matchCustomerPhoneExact,
  normalizePhone,
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
import { ProductImageWithFallback } from './CategoryIcon';

export { formatCep };

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
  const initialDocType: DocumentKind =
    profile.documentType || detectDocumentType(profile.cpfCnpj);

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState(profile.name || '');
  const [phone, setPhone] = useState(
    profile.phone ? formatPhone(profile.phone) : ''
  );
  const [email, setEmail] = useState(profile.email || '');
  const [documentType, setDocumentType] = useState<DocumentKind>(initialDocType);
  const [cpfCnpj, setCpfCnpj] = useState(
    profile.cpfCnpj ? formatDocumentByType(profile.cpfCnpj, initialDocType) : ''
  );
  const [cep, setCep] = useState(formatCep(profile.cep || '78110-400'));
  const [street, setStreet] = useState(profile.street || '');
  const [number, setNumber] = useState(profile.number || '');
  const [neighborhood, setNeighborhood] = useState(
    profile.neighborhood || 'Centro Norte'
  );
  const [city, setCity] = useState<DeliveryCityOption>(
    profile.city || 'Várzea Grande'
  );
  const [interiorCityName, setInteriorCityName] = useState(
    profile.interiorCityName || ''
  );
  const [reference, setReference] = useState(profile.reference || '');
  const [clubDiscountActive, setClubDiscountActive] = useState(
    profile.clubDiscountActive !== false
  );
  const [loginPhone, setLoginPhone] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [cepStatus, setCepStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });
  const lastFetchedCepRef = useRef<string>('');
  const numberInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const nextDocType: DocumentKind =
      profile.documentType || detectDocumentType(profile.cpfCnpj);
    setName(profile.name || '');
    setPhone(profile.phone ? formatPhone(profile.phone) : '');
    setEmail(profile.email || '');
    setDocumentType(nextDocType);
    setCpfCnpj(
      profile.cpfCnpj ? formatDocumentByType(profile.cpfCnpj, nextDocType) : ''
    );
    setCep(formatCep(profile.cep || '78110-400'));
    setStreet(profile.street || '');
    setNumber(profile.number || '');
    setNeighborhood(profile.neighborhood || 'Centro Norte');
    setCity(profile.city || 'Várzea Grande');
    setInteriorCityName(profile.interiorCityName || '');
    setReference(profile.reference || '');
    setClubDiscountActive(profile.clubDiscountActive !== false);
    setFeedback(null);
    setCepStatus({ type: 'idle' });
    lastFetchedCepRef.current = onlyDigits(profile.cep || '');
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const runCepLookup = async (rawCepValue: string, force = false) => {
    const digits = onlyDigits(rawCepValue);
    if (digits.length !== 8) {
      if (force) {
        setCepStatus({
          type: 'error',
          message: 'Digite os 8 dígitos do CEP para buscar o endereço.',
        });
      }
      return;
    }
    if (!force && lastFetchedCepRef.current === digits) return;
    lastFetchedCepRef.current = digits;

    setCepStatus({ type: 'loading', message: 'Buscando endereço pelo CEP...' });
    const result = await lookupCepAddress(digits);
    if (result.found) {
      setCep(result.cep);
      if (result.street) setStreet(result.street);
      if (result.neighborhood) setNeighborhood(result.neighborhood);
      setCity(result.deliveryCityOption);
      setInteriorCityName(result.interiorCityName);
      setCepStatus({
        type: 'success',
        message: `Endereço carregado (${result.cep}): ${
          result.street ? `${result.street}, ` : ''
        }${result.neighborhood ? `${result.neighborhood} · ` : ''}${result.cityName}/${result.uf}`,
      });
      setTimeout(() => numberInputRef.current?.focus(), 60);
    } else {
      setCepStatus({
        type: 'error',
        message: 'CEP não localizado automaticamente. Confira os números ou preencha manualmente.',
      });
    }
  };

  const handleCepChange = (value: string) => {
    const masked = formatCep(value);
    setCep(masked);
    const digits = onlyDigits(masked);
    if (digits.length === 8) {
      void runCepLookup(digits);
    } else {
      lastFetchedCepRef.current = '';
      if (cepStatus.type !== 'idle') setCepStatus({ type: 'idle' });
    }
  };

  const handleDocumentTypeSwitch = (nextType: DocumentKind) => {
    setDocumentType(nextType);
    setCpfCnpj((prev) => formatDocumentByType(prev, nextType));
    setFeedback(null);
  };

  const docDigits = onlyDigits(cpfCnpj);
  const expectedDocLen = documentType === 'cnpj' ? 14 : 11;
  const isDocComplete = docDigits.length === expectedDocLen;
  const isDocValid = isDocComplete && isValidDocument(cpfCnpj, documentType);

  const handleQuickLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = normalizePhone(loginPhone);
    if (digits.length < 10) {
      setFeedback('Informe seu WhatsApp completo com DDD (ex: (65) 99999-9999).');
      return;
    }
    const matchedOrder = existingOrders.find((o) =>
      matchCustomerPhoneExact(o.customerPhone, digits)
    );
    if (matchedOrder) {
      const updated: CustomerProfile = {
        name: matchedOrder.customerName,
        phone: matchedOrder.customerPhone,
        email: email || '',
        documentType: matchedOrder.customerDocumentType || 'cpf',
        cpfCnpj: '',
        cep: formatCep(matchedOrder.address?.cep || '78110-400'),
        street: matchedOrder.address?.street || '',
        number: matchedOrder.address?.number || '',
        neighborhood: matchedOrder.address?.neighborhood || 'Centro',
        city: matchedOrder.address?.city || 'Várzea Grande',
        interiorCityName: matchedOrder.address?.interiorCityName || '',
        reference: matchedOrder.address?.reference || '',
        isRegistered: true,
        clubDiscountActive: true,
      };
      onSaveProfile(updated);
      onClose();
    } else {
      setFeedback(
        'Não encontramos pedido anterior com este WhatsApp. Preencha a aba "Criar / Atualizar Cadastro" ao lado.'
      );
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setFeedback(
        documentType === 'cnpj'
          ? 'Informe a Razão Social ou Nome Fantasia da Empresa.'
          : 'Informe seu Nome Completo.'
      );
      return;
    }
    if (normalizePhone(phone).length < 10) {
      setFeedback('Informe seu WhatsApp com DDD (ex: (65) 99999-9999).');
      return;
    }
    if (docDigits.length > 0 && !isValidDocument(cpfCnpj, documentType)) {
      setFeedback(
        documentType === 'cnpj'
          ? 'CNPJ incompleto ou inválido. Preencha os 14 dígitos no formato 00.000.000/0000-00 ou deixe em branco.'
          : 'CPF incompleto ou inválido. Preencha os 11 dígitos no formato 000.000.000-00 ou deixe em branco.'
      );
      return;
    }
    if (onlyDigits(cep).length > 0 && onlyDigits(cep).length < 8) {
      setFeedback('Informe os 8 dígitos do CEP (ex: 78110-400).');
      return;
    }

    const updated: CustomerProfile = {
      name: name.trim(),
      phone: normalizePhone(phone),
      email: email.trim(),
      documentType,
      cpfCnpj: docDigits.length > 0 ? formatDocumentByType(cpfCnpj, documentType) : '',
      cep: formatCep(cep) || '78110-400',
      street: street.trim(),
      number: number.trim(),
      neighborhood: neighborhood.trim() || 'Centro',
      city,
      interiorCityName: city === 'Interior de MT' ? interiorCityName.trim() : '',
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

              <p className="text-xs text-zinc-500 leading-relaxed">
                Por segurança, seus dados fiscais (CPF/CNPJ) nunca são exibidos automaticamente sem que você informe no cadastro.
              </p>

              <button
                type="submit"
                className="w-full py-3 bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 font-extrabold text-sm rounded-xl cursor-pointer shadow-xs"
              >
                Acessar Minha Conta & Meus Pedidos
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-xs font-bold text-zinc-700 mb-1"
                  >
                    {documentType === 'cnpj'
                      ? 'Razão Social ou Nome da Empresa *'
                      : 'Nome Completo *'}
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      documentType === 'cnpj'
                        ? 'Ex: Clínica Vida Ltda / Condomínio Solar'
                        : 'Ex: Maria Oliveira / João Silva'
                    }
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-phone"
                    className="block text-xs font-bold text-zinc-700 mb-1"
                  >
                    WhatsApp (Celular) *
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={15}
                    required
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(65) 99999-9999"
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono tabular-nums focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label
                      htmlFor="reg-document"
                      className="text-xs font-bold text-zinc-700"
                    >
                      {documentType === 'cnpj' ? 'CNPJ da Empresa' : 'CPF do Cliente'}
                    </label>
                    <div
                      role="group"
                      aria-label="Escolher tipo de documento"
                      className="inline-flex rounded-lg bg-zinc-100 p-0.5 border border-zinc-200"
                    >
                      <button
                        type="button"
                        onClick={() => handleDocumentTypeSwitch('cpf')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                          documentType === 'cpf'
                            ? 'bg-zinc-950 text-[#FFBE00] shadow-2xs'
                            : 'text-zinc-600 hover:text-zinc-950'
                        }`}
                      >
                        <User className="w-2.5 h-2.5" />
                        <span>CPF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDocumentTypeSwitch('cnpj')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                          documentType === 'cnpj'
                            ? 'bg-zinc-950 text-[#FFBE00] shadow-2xs'
                            : 'text-zinc-600 hover:text-zinc-950'
                        }`}
                      >
                        <Building2 className="w-2.5 h-2.5" />
                        <span>CNPJ</span>
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      id="reg-document"
                      type="text"
                      inputMode="numeric"
                      maxLength={documentType === 'cnpj' ? 18 : 14}
                      value={cpfCnpj}
                      onChange={(e) =>
                        setCpfCnpj(formatDocumentByType(e.target.value, documentType))
                      }
                      placeholder={
                        documentType === 'cnpj'
                          ? '00.000.000/0000-00'
                          : '000.000.000-00'
                      }
                      className={`w-full px-3 py-2 bg-[#FAFAFA] border rounded-xl text-xs font-mono tabular-nums focus:bg-white focus:outline-none ${
                        isDocComplete
                          ? isDocValid
                            ? 'border-emerald-500 focus:border-emerald-600'
                            : 'border-rose-400 focus:border-rose-500'
                          : 'border-zinc-300 focus:border-[#FFBE00]'
                      }`}
                    />
                  </div>
                  {docDigits.length > 0 && (
                    <span
                      className={`block mt-1 text-[10px] font-bold ${
                        isDocComplete
                          ? isDocValid
                            ? 'text-emerald-700'
                            : 'text-rose-600'
                          : 'text-zinc-500'
                      }`}
                    >
                      {isDocComplete
                        ? isDocValid
                          ? `${documentType.toUpperCase()} válido`
                          : `${documentType.toUpperCase()} inválido — confira os dígitos`
                        : `${docDigits.length}/${expectedDocLen} dígitos (${documentType.toUpperCase()})`}
                    </span>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-bold text-zinc-700 mb-1"
                  >
                    E-mail
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com.br"
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-zinc-900">
                    Endereço Principal & CEP (Preenchimento Automático)
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-500">
                    Digite o CEP primeiro
                  </span>
                </div>

                {/* CEP First with Auto-Lookup */}
                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-zinc-200 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                    <div className="flex-1">
                      <label
                        htmlFor="reg-cep"
                        className="block text-xs font-bold text-zinc-800 mb-1"
                      >
                        1º Informe seu CEP *
                      </label>
                      <input
                        id="reg-cep"
                        type="text"
                        inputMode="numeric"
                        maxLength={9}
                        value={cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-bold tabular-nums focus:border-[#FFBE00] focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void runCepLookup(cep, true)}
                      disabled={cepStatus.type === 'loading'}
                      className="px-3.5 py-2 bg-[#FFBE00] hover:bg-[#F59E0B] disabled:opacity-70 text-zinc-950 font-extrabold text-xs rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {cepStatus.type === 'loading' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {cepStatus.type === 'loading' ? 'Buscando...' : 'Buscar CEP'}
                      </span>
                    </button>
                  </div>

                  {cepStatus.type !== 'idle' && cepStatus.message && (
                    <p
                      role="status"
                      className={`text-[11px] font-semibold ${
                        cepStatus.type === 'success'
                          ? 'text-emerald-700'
                          : cepStatus.type === 'error'
                          ? 'text-rose-600'
                          : 'text-zinc-600'
                      }`}
                    >
                      {cepStatus.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label
                      htmlFor="reg-street"
                      className="block text-xs font-bold text-zinc-700 mb-1"
                    >
                      Rua / Avenida
                    </label>
                    <input
                      id="reg-street"
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Av. Couto Magalhães"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reg-number"
                      className="block text-xs font-bold text-zinc-700 mb-1"
                    >
                      Número
                    </label>
                    <input
                      ref={numberInputRef}
                      id="reg-number"
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="2480"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-mono focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-neighborhood"
                      className="block text-xs font-bold text-zinc-700 mb-1"
                    >
                      Bairro
                    </label>
                    <input
                      id="reg-neighborhood"
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Coxipó / Centro Norte"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reg-city"
                      className="block text-xs font-bold text-zinc-700 mb-1"
                    >
                      Cidade
                    </label>
                    <select
                      id="reg-city"
                      value={city}
                      onChange={(e) =>
                        setCity(e.target.value as DeliveryCityOption)
                      }
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                    >
                      <option value="Cuiabá">Cuiabá - MT</option>
                      <option value="Várzea Grande">Várzea Grande - MT</option>
                      <option value="Interior de MT">Outras Cidades de MT</option>
                    </select>
                  </div>
                </div>

                {city === 'Interior de MT' && (
                  <div>
                    <label
                      htmlFor="reg-interior-city"
                      className="block text-xs font-bold text-zinc-700 mb-1"
                    >
                      Qual sua cidade em Mato Grosso?
                    </label>
                    <input
                      id="reg-interior-city"
                      type="text"
                      value={interiorCityName}
                      onChange={(e) => setInteriorCityName(e.target.value)}
                      placeholder="Ex: Sinop, Sorriso, Rondonópolis, Lucas do Rio Verde..."
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                    />
                  </div>
                )}
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
  const [cepInput, setCepInput] = useState(formatCep(profile.cep || '78110-400'));
  const [streetInput, setStreetInput] = useState(profile.street || '');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(
    profile.neighborhood || 'Centro Norte'
  );
  const [selectedCity, setSelectedCity] = useState<DeliveryCityOption>(
    profile.city || 'Várzea Grande'
  );
  const [interiorCityName, setInteriorCityName] = useState(
    profile.interiorCityName || ''
  );
  const [cepLookingUp, setCepLookingUp] = useState(false);
  const [cepLookupMsg, setCepLookupMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCepInput(formatCep(profile.cep || '78110-400'));
    setStreetInput(profile.street || '');
    setSelectedNeighborhood(profile.neighborhood || 'Centro Norte');
    setSelectedCity(profile.city || 'Várzea Grande');
    setInteriorCityName(profile.interiorCityName || '');
    setCepLookupMsg(null);
    setCepLookingUp(false);
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const logistics = getLogisticsSettings(settings);
  const matchedFeeObj = settings.neighborhoodFees.find(
    (n) => n.name.toLowerCase() === selectedNeighborhood.toLowerCase()
  );
  const currentFee = matchedFeeObj ? matchedFeeObj.fee : settings.defaultDeliveryFee;

  const triggerCepModalLookup = async (digits: string) => {
    if (digits.length !== 8) return;
    setCepLookingUp(true);
    setCepLookupMsg(null);
    const res = await lookupCepAddress(digits);
    setCepLookingUp(false);
    if (res.found) {
      setCepInput(res.cep);
      if (res.street) setStreetInput(res.street);
      if (res.neighborhood) setSelectedNeighborhood(res.neighborhood);
      setSelectedCity(res.deliveryCityOption);
      setInteriorCityName(res.interiorCityName);
      setCepLookupMsg(
        `Localizado: ${res.street ? `${res.street}, ` : ''}${res.neighborhood || res.cityName} (${res.cityName}/${res.uf})`
      );
    } else {
      setCepLookupMsg('CEP não encontrado automaticamente. Selecione o bairro ao lado.');
    }
  };

  const handleApplyCep = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...profile,
      cep: formatCep(cepInput) || '78110-400',
      street: streetInput.trim() || profile.street,
      neighborhood:
        selectedCity === 'Interior de MT'
          ? interiorCityName.trim() || 'Interior de MT'
          : selectedNeighborhood,
      city: selectedCity,
      interiorCityName:
        selectedCity === 'Interior de MT' ? interiorCityName.trim() : '',
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
            Informe seu CEP em <strong>Cuiabá ou Várzea Grande</strong> para carregar o endereço automaticamente, verificar estoque de galões 5L e consultar prazo de entrega:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-cep-input" className="block text-xs font-bold text-zinc-800 mb-1">
                Digite seu CEP
              </label>
              <div className="relative flex items-center gap-1.5">
                <input
                  id="modal-cep-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={cepInput}
                  onChange={(e) => {
                    const masked = formatCep(e.target.value);
                    setCepInput(masked);
                    const digits = onlyDigits(masked);
                    if (digits.length === 8) {
                      void triggerCepModalLookup(digits);
                    }
                  }}
                  placeholder="00000-000"
                  className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-sm font-mono font-bold tabular-nums text-zinc-900 focus:bg-white focus:border-[#FFBE00] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void triggerCepModalLookup(onlyDigits(cepInput))}
                  aria-label="Buscar endereço pelo CEP"
                  className="p-2.5 rounded-xl bg-[#FFBE00] hover:bg-[#F59E0B] text-zinc-950 shrink-0 cursor-pointer"
                >
                  {cepLookingUp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">
                Região / Bairro
              </label>
              <select
                value={selectedCity === 'Interior de MT' ? '__interior_mt__' : selectedNeighborhood}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__interior_mt__') {
                    setSelectedCity('Interior de MT');
                    setSelectedNeighborhood('Interior de MT');
                  } else {
                    setSelectedNeighborhood(val);
                    const nb = settings.neighborhoodFees.find((n) => n.name === val);
                    if (nb) setSelectedCity(nb.city);
                  }
                }}
                className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900"
              >
                {selectedCity !== 'Interior de MT' &&
                  selectedNeighborhood &&
                  !settings.neighborhoodFees.some(
                    (nb) => nb.name.toLowerCase() === selectedNeighborhood.toLowerCase()
                  ) && (
                    <option value={selectedNeighborhood}>
                      {selectedNeighborhood} ({selectedCity})
                    </option>
                  )}
                {settings.neighborhoodFees.map((nb) => (
                  <option key={nb.id} value={nb.name}>
                    {nb.name} ({nb.city})
                  </option>
                ))}
                <option value="__interior_mt__">Outras Cidades de Mato Grosso (MT)</option>
              </select>
            </div>
          </div>

          {cepLookupMsg && (
            <p
              role="status"
              className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2"
            >
              {cepLookupMsg}
            </p>
          )}

          {selectedCity === 'Interior de MT' && (
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">
                Cidade no Interior de Mato Grosso
              </label>
              <input
                type="text"
                value={interiorCityName}
                onChange={(e) => setInteriorCityName(e.target.value)}
                placeholder="Ex: Sinop, Sorriso, Rondonópolis..."
                className="w-full px-3.5 py-2 bg-[#FAFAFA] border border-zinc-300 rounded-xl text-xs text-zinc-900"
              />
            </div>
          )}

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
                    setStreetInput(preset.streetHint);
                    setSelectedNeighborhood(preset.neighborhood);
                    setSelectedCity(preset.city);
                    setCepLookupMsg(
                      `Localizado: ${preset.streetHint} · ${preset.neighborhood} (${preset.city}/MT)`
                    );
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

          {/* Live Delivery & Pickup Estimate Card + Moto Limper & Caminhão Rules */}
          <div className="rounded-xl bg-[#FAFAFA] border border-zinc-200 p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-[#D97706] shrink-0" />
                <span className="font-bold text-zinc-900">
                  Moto Limper (Pequenos itens)
                </span>
              </div>
              <span className="font-mono font-extrabold text-zinc-950 text-right">
                VG &gt; {formatCurrency(logistics.motoVgMin)} · CBA &gt; {formatCurrency(logistics.motoCbaMin)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200/80">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#E3262E] shrink-0" />
                <span className="font-bold text-zinc-900">
                  Entrega de Caminhão (Galões/Lote)
                </span>
              </div>
              <span className="font-mono font-extrabold text-zinc-950 text-right">
                VG &gt; {formatCurrency(logistics.truckVgMin)} · CBA &gt; {formatCurrency(logistics.truckCbaMin)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200/80">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-bold text-zinc-900">
                  Retirada na Loja (Em até 15min)
                </span>
              </div>
              <span className="font-mono font-extrabold text-emerald-700 uppercase">
                GRÁTIS ({formatCurrency(currentFee)} p/ entrega local)
              </span>
            </div>

            <div className="pt-2 border-t border-zinc-200/80 flex items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-600">
                Outras cidades de <strong>Mato Grosso</strong>?
              </span>
              <a
                href={buildLogisticsWhatsAppConsultUrl(settings.whatsappNumber, interiorCityName)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-extrabold text-[11px] shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-zinc-950" />
                <span>Consultar MT no WhatsApp</span>
              </a>
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
  hideAllPrices?: boolean;
  onClose: () => void;
  onAddMultipleToCart: (entries: { product: Product; quantity: number }[]) => void;
}

export const QuickOrderListModal: React.FC<QuickOrderListModalProps> = ({
  isOpen,
  products,
  hideAllPrices = false,
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
    (acc, item) =>
      acc +
      (!hideAllPrices && item.product.showPrice !== false
        ? getEffectivePrice(item.product) * item.quantity
        : 0),
    0
  );
  const selectedHasPriced = selectedEntries.some(
    (item) => !hideAllPrices && item.product.showPrice !== false
  );
  const selectedHasUnpriced = selectedEntries.some(
    (item) => hideAllPrices || item.product.showPrice === false
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
                            {hideAllPrices || prod.showPrice === false
                              ? 'Sob consulta'
                              : `${formatCurrency(price)} un.`}
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
                </strong>
                {selectedHasPriced && (
                  <>
                    {' '}
                    ·{' '}
                    <strong className="font-mono text-base text-[#E3262E]">
                      {formatCurrency(selectedTotal)}
                    </strong>
                    {selectedHasUnpriced && (
                      <span className="text-[11px] text-zinc-500 ml-1">
                        (+ itens sob consulta)
                      </span>
                    )}
                  </>
                )}
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
