import { DeliveryCityOption } from '../types/commerce';

export type DocumentKind = 'cpf' | 'cnpj';

export function onlyDigits(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}

export function formatCep(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatCpf(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatCnpj(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function detectDocumentType(raw?: string): DocumentKind {
  const digits = onlyDigits(raw || '');
  return digits.length > 11 ? 'cnpj' : 'cpf';
}

export function formatDocumentByType(raw: string, docType: DocumentKind): string {
  return docType === 'cnpj' ? formatCnpj(raw) : formatCpf(raw);
}

export function formatCpfOrCnpjAuto(raw: string): string {
  const digits = onlyDigits(raw);
  return digits.length > 11 ? formatCnpj(digits) : formatCpf(digits);
}

export function isValidCpf(raw: string): boolean {
  const digits = onlyDigits(raw);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(digits[10]);
}

export function isValidCnpj(raw: string): boolean {
  const digits = onlyDigits(raw);
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calcDigit = (base: string, weights: number[]): number => {
    const sum = base
      .split('')
      .reduce((acc, ch, idx) => acc + Number(ch) * weights[idx], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const first = calcDigit(
    digits.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );
  if (first !== Number(digits[12])) return false;

  const second = calcDigit(
    digits.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );
  return second === Number(digits[13]);
}

export function isValidDocument(raw: string, docType: DocumentKind): boolean {
  return docType === 'cnpj' ? isValidCnpj(raw) : isValidCpf(raw);
}

export interface CepLookupResult {
  found: boolean;
  cep: string;
  street: string;
  neighborhood: string;
  cityName: string;
  uf: string;
  deliveryCityOption: DeliveryCityOption;
  interiorCityName: string;
  source: 'viacep' | 'local_mt' | 'not_found';
}

export interface ViaCepApiResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

const LOCAL_MT_CEP_PRESETS: Record<
  string,
  { street: string; neighborhood: string; cityName: string; uf: string }
> = {
  '78110400': {
    street: 'Av. Couto Magalhães',
    neighborhood: 'Centro Norte',
    cityName: 'Várzea Grande',
    uf: 'MT',
  },
  '78110000': {
    street: 'Av. Filinto Müller',
    neighborhood: 'Centro Norte',
    cityName: 'Várzea Grande',
    uf: 'MT',
  },
  '78118000': {
    street: 'Av. Dom Orlando Chaves',
    neighborhood: 'Cristo Rei',
    cityName: 'Várzea Grande',
    uf: 'MT',
  },
  '78125000': {
    street: 'Av. Alzira Santana',
    neighborhood: 'Jardim Glória',
    cityName: 'Várzea Grande',
    uf: 'MT',
  },
  '78135000': {
    street: 'Av. Prefeito Murilo Domingos',
    neighborhood: 'Marajoara',
    cityName: 'Várzea Grande',
    uf: 'MT',
  },
  '78005000': {
    street: 'Av. Getúlio Vargas',
    neighborhood: 'Centro',
    cityName: 'Cuiabá',
    uf: 'MT',
  },
  '78015000': {
    street: 'Av. Coronel Escolástico',
    neighborhood: 'Bandeirantes',
    cityName: 'Cuiabá',
    uf: 'MT',
  },
  '78045000': {
    street: 'Av. do CPA',
    neighborhood: 'Alvorada',
    cityName: 'Cuiabá',
    uf: 'MT',
  },
  '78055000': {
    street: 'Av. Historiador Rubens de Mendonça',
    neighborhood: 'CPA',
    cityName: 'Cuiabá',
    uf: 'MT',
  },
  '78060000': {
    street: 'Av. Edgar Vieira',
    neighborhood: 'Boa Esperança',
    cityName: 'Cuiabá',
    uf: 'MT',
  },
  '78068000': {
    street: 'Av. Archimedes Pereira Lima',
    neighborhood: 'Jardim Itália',
    cityName: 'Cuiabá',
    uf: 'MT',
  },
  '78080000': {
    street: 'Av. Fernando Corrêa da Costa',
    neighborhood: 'Coxipó',
    cityName: 'Cuiabá',
    uf: 'MT',
  },
  '78550000': {
    street: 'Av. das Embaúbas',
    neighborhood: 'Centro',
    cityName: 'Sinop',
    uf: 'MT',
  },
  '78700000': {
    street: 'Av. Amazonas',
    neighborhood: 'Centro',
    cityName: 'Rondonópolis',
    uf: 'MT',
  },
  '78890000': {
    street: 'Av. Natalino João Brescansin',
    neighborhood: 'Centro',
    cityName: 'Sorriso',
    uf: 'MT',
  },
  '78455000': {
    street: 'Av. Rio Grande do Sul',
    neighborhood: 'Centro',
    cityName: 'Lucas do Rio Verde',
    uf: 'MT',
  },
};

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function mapCityToDeliveryOption(
  cityName: string,
  uf: string = 'MT'
): { deliveryCityOption: DeliveryCityOption; interiorCityName: string } {
  const normalizedCity = stripAccents(cityName || '').toLowerCase().trim();
  const cleanUf = (uf || 'MT').toUpperCase().trim();

  if (normalizedCity === 'varzea grande' && cleanUf === 'MT') {
    return { deliveryCityOption: 'Várzea Grande', interiorCityName: '' };
  }
  if (normalizedCity === 'cuiaba' && cleanUf === 'MT') {
    return { deliveryCityOption: 'Cuiabá', interiorCityName: '' };
  }
  const cleanCityName = (cityName || '').trim();
  return {
    deliveryCityOption: 'Interior de MT',
    interiorCityName:
      cleanCityName && cleanUf !== 'MT'
        ? `${cleanCityName} - ${cleanUf}`
        : cleanCityName,
  };
}

export function lookupLocalMtCep(rawCep: string): CepLookupResult {
  const digits = onlyDigits(rawCep).slice(0, 8);
  const formattedCep = formatCep(digits);

  if (digits.length !== 8) {
    return {
      found: false,
      cep: formattedCep,
      street: '',
      neighborhood: '',
      cityName: '',
      uf: '',
      deliveryCityOption: 'Cuiabá',
      interiorCityName: '',
      source: 'not_found',
    };
  }

  const exact = LOCAL_MT_CEP_PRESETS[digits];
  if (exact) {
    const mapped = mapCityToDeliveryOption(exact.cityName, exact.uf);
    return {
      found: true,
      cep: formattedCep,
      street: exact.street,
      neighborhood: exact.neighborhood,
      cityName: exact.cityName,
      uf: exact.uf,
      deliveryCityOption: mapped.deliveryCityOption,
      interiorCityName: mapped.interiorCityName,
      source: 'local_mt',
    };
  }

  const prefix5 = Number(digits.slice(0, 5));
  if (prefix5 >= 78000 && prefix5 <= 78109) {
    return {
      found: true,
      cep: formattedCep,
      street: '',
      neighborhood: prefix5 >= 78080 ? 'Coxipó' : 'Centro',
      cityName: 'Cuiabá',
      uf: 'MT',
      deliveryCityOption: 'Cuiabá',
      interiorCityName: '',
      source: 'local_mt',
    };
  }
  if (prefix5 >= 78110 && prefix5 <= 78159) {
    return {
      found: true,
      cep: formattedCep,
      street: '',
      neighborhood: prefix5 >= 78118 && prefix5 <= 78120 ? 'Cristo Rei' : 'Centro Norte',
      cityName: 'Várzea Grande',
      uf: 'MT',
      deliveryCityOption: 'Várzea Grande',
      interiorCityName: '',
      source: 'local_mt',
    };
  }

  return {
    found: false,
    cep: formattedCep,
    street: '',
    neighborhood: '',
    cityName: '',
    uf: '',
    deliveryCityOption: 'Cuiabá',
    interiorCityName: '',
    source: 'not_found',
  };
}

export function mapViaCepResponse(
  rawCep: string,
  data: ViaCepApiResponse
): CepLookupResult {
  const digits = onlyDigits(rawCep).slice(0, 8);
  const formattedCep = formatCep(data.cep || digits);

  if (!data || data.erro === true || data.erro === 'true' || !data.localidade) {
    return {
      found: false,
      cep: formattedCep,
      street: '',
      neighborhood: '',
      cityName: '',
      uf: '',
      deliveryCityOption: 'Cuiabá',
      interiorCityName: '',
      source: 'not_found',
    };
  }

  const mapped = mapCityToDeliveryOption(data.localidade, data.uf || 'MT');
  const localPreset = LOCAL_MT_CEP_PRESETS[digits];

  return {
    found: true,
    cep: formattedCep,
    street: (data.logradouro || '').trim() || localPreset?.street || '',
    neighborhood: (data.bairro || '').trim() || localPreset?.neighborhood || '',
    cityName: data.localidade.trim(),
    uf: (data.uf || 'MT').toUpperCase().trim(),
    deliveryCityOption: mapped.deliveryCityOption,
    interiorCityName: mapped.interiorCityName,
    source: 'viacep',
  };
}

export async function lookupCepAddress(rawCep: string): Promise<CepLookupResult> {
  const digits = onlyDigits(rawCep).slice(0, 8);
  const formattedCep = formatCep(digits);

  if (digits.length !== 8) {
    return {
      found: false,
      cep: formattedCep,
      street: '',
      neighborhood: '',
      cityName: '',
      uf: '',
      deliveryCityOption: 'Cuiabá',
      interiorCityName: '',
      source: 'not_found',
    };
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller?.signal,
    });
    if (timer) clearTimeout(timer);

    if (response.ok) {
      const json = (await response.json()) as ViaCepApiResponse;
      if (json && (json.erro === true || json.erro === 'true')) {
        if (LOCAL_MT_CEP_PRESETS[digits]) {
          return lookupLocalMtCep(digits);
        }
        return mapViaCepResponse(digits, json);
      }
      const mapped = mapViaCepResponse(digits, json);
      if (mapped.found) {
        return mapped;
      }
    }
  } catch {
    if (timer) clearTimeout(timer);
    // Network timeout/offline fallback below
  }

  return lookupLocalMtCep(digits);
}
