export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMb?: number;
}

export type OptimizeImageResult =
  | {
      ok: true;
      dataUrl: string;
      originalKb: number;
      optimizedKb: number;
      wasCompressed: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Falha ao ler arquivo de imagem.'));
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Imagem inválida ou corrompida.'));
    img.src = src;
  });
}

/**
 * Validates and automatically downscales/compresses uploaded images via Canvas
 * so product, kit, banner, and avatar uploads stay sharp while saving ~70–90%
 * browser storage space and preventing localStorage quota failures.
 */
export async function optimizeUploadedImage(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<OptimizeImageResult> {
  const maxWidth = options.maxWidth ?? 960;
  const maxHeight = options.maxHeight ?? 960;
  const quality = options.quality ?? 0.84;
  const maxSizeMb = options.maxSizeMb ?? 5;

  if (!ALLOWED_IMAGE_MIMES.has(file.type.toLowerCase())) {
    return {
      ok: false,
      error: 'Formato inválido. Selecione uma imagem JPG, PNG ou WEBP.',
    };
  }

  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `Arquivo muito grande (${(file.size / (1024 * 1024)).toFixed(
        1
      )} MB). Envie uma imagem de até ${maxSizeMb} MB.`,
    };
  }

  const originalKb = Math.max(1, Math.round(file.size / 1024));

  try {
    const rawDataUrl = await readFileAsDataUrl(file);

    // Keep animated GIFs or very small icons (< 60 KB) untouched
    if (file.type === 'image/gif' || file.size < 60 * 1024 || typeof document === 'undefined') {
      return {
        ok: true,
        dataUrl: rawDataUrl,
        originalKb,
        optimizedKb: originalKb,
        wasCompressed: false,
      };
    }

    const img = await loadImageElement(rawDataUrl);
    const ratio = Math.min(1, maxWidth / img.width, maxHeight / img.height);
    const targetW = Math.max(1, Math.round(img.width * ratio));
    const targetH = Math.max(1, Math.round(img.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        ok: true,
        dataUrl: rawDataUrl,
        originalKb,
        optimizedKb: originalKb,
        wasCompressed: false,
      };
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Preserve alpha transparency for PNG/WEBP via WebP; fallback to JPEG for photos
    const preferWebp = canvas.toDataURL('image/webp', quality);
    const outputDataUrl = preferWebp.startsWith('data:image/webp')
      ? preferWebp
      : canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality);

    // Only keep compressed version if it actually reduced size or resized dimensions
    const useOptimized =
      outputDataUrl.length < rawDataUrl.length || ratio < 1;
    const finalDataUrl = useOptimized ? outputDataUrl : rawDataUrl;
    const optimizedKb = Math.max(
      1,
      Math.round((finalDataUrl.length * 0.75) / 1024)
    );

    return {
      ok: true,
      dataUrl: finalDataUrl,
      originalKb,
      optimizedKb,
      wasCompressed: useOptimized && optimizedKb < originalKb,
    };
  } catch {
    return {
      ok: false,
      error: 'Não foi possível processar a imagem selecionada. Tente outro arquivo.',
    };
  }
}

export type ResponsiveImageVariant =
  | 'thumbnail'
  | 'productCard'
  | 'productDetail'
  | 'kitCard'
  | 'bannerSplit'
  | 'bannerWide'
  | 'bannerThumb';

export const RESPONSIVE_IMAGE_WIDTHS = [320, 640, 960, 1280] as const;

export const RESPONSIVE_IMAGE_SIZES: Record<ResponsiveImageVariant, string> = {
  thumbnail: '80px',
  productCard: '(max-width: 639px) 46vw, (max-width: 1023px) 31vw, 240px',
  productDetail: '(max-width: 767px) 92vw, 340px',
  kitCard: '(max-width: 767px) 94vw, 32vw',
  bannerSplit: '(max-width: 1023px) 94vw, 360px',
  bannerWide: '(max-width: 639px) 96vw, (max-width: 1279px) 92vw, 1280px',
  bannerThumb: '(max-width: 639px) 128px, 160px',
};

const LOCAL_RESPONSIVE_BASENAMES = new Set([
  'banner_automotivo_1793895269182',
  'hero_limper_cleaning_1793895267323',
  'limper_mt_fleet_1794516605134',
  'prod_kit_casa_1793895269106',
  'prod_lavanderia_1793895269711',
  'prod_limpeza_pesada_1793895270799',
]);

export interface ResponsiveImageOptions {
  variant?: ResponsiveImageVariant;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'auto' | 'sync';
}

export interface ResponsiveImageAttributes {
  src: string;
  srcSet?: string;
  sizes?: string;
  loading: 'lazy' | 'eager';
  decoding: 'async' | 'auto' | 'sync';
}

function extractLocalImageBasename(src: string): string | null {
  const clean = src.trim().split('?')[0].split('#')[0];
  const match = clean.match(/(?:^|\/)assets\/images\/([a-zA-Z0-9_-]+)\.(?:jpg|jpeg|png|webp)$/i);
  if (!match) return null;
  const base = match[1];
  return LOCAL_RESPONSIVE_BASENAMES.has(base) ? base : null;
}

function buildRemoteResponsiveSrcSet(src: string): string | undefined {
  if (!/^https?:\/\//i.test(src)) return undefined;
  try {
    const parsed = new URL(src);
    const host = parsed.hostname.toLowerCase();

    if (host === 'images.unsplash.com') {
      return RESPONSIVE_IMAGE_WIDTHS.map((w) => {
        const next = new URL(parsed.toString());
        next.searchParams.set('auto', 'format');
        next.searchParams.set('fit', 'crop');
        next.searchParams.set('w', String(w));
        next.searchParams.set('q', w <= 320 ? '75' : '80');
        return `${next.toString()} ${w}w`;
      }).join(', ');
    }

    if (host === 'images.pexels.com') {
      return RESPONSIVE_IMAGE_WIDTHS.map((w) => {
        const next = new URL(parsed.toString());
        next.searchParams.set('auto', 'compress');
        next.searchParams.set('cs', 'tinysrgb');
        next.searchParams.set('w', String(w));
        return `${next.toString()} ${w}w`;
      }).join(', ');
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Generates native lazy-loading and responsive srcset/sizes attributes for
 * local catalog/banner assets (serving pre-sized WebP variants from 320w to 1280w)
 * and supported external image CDNs so mobile viewports download dramatically
 * smaller payloads instead of full desktop images.
 */
export function getResponsiveImageAttributes(
  src: string,
  options: ResponsiveImageOptions = {}
): ResponsiveImageAttributes {
  const variant = options.variant ?? 'productCard';
  const loading = options.loading ?? 'lazy';
  const decoding = options.decoding ?? 'async';
  const sizes = options.sizes ?? RESPONSIVE_IMAGE_SIZES[variant];
  const cleanSrc = (src || '').trim();

  if (!cleanSrc || cleanSrc.startsWith('data:') || cleanSrc.startsWith('blob:')) {
    return {
      src: cleanSrc,
      loading,
      decoding,
    };
  }

  const localBase = extractLocalImageBasename(cleanSrc);
  if (localBase) {
    const srcSet = RESPONSIVE_IMAGE_WIDTHS.map(
      (w) => `/assets/images/responsive/${localBase}-${w}w.webp ${w}w`
    ).join(', ');
    return {
      src: cleanSrc,
      srcSet,
      sizes,
      loading,
      decoding,
    };
  }

  const remoteSrcSet = buildRemoteResponsiveSrcSet(cleanSrc);
  if (remoteSrcSet) {
    return {
      src: cleanSrc,
      srcSet: remoteSrcSet,
      sizes,
      loading,
      decoding,
    };
  }

  return {
    src: cleanSrc,
    loading,
    decoding,
  };
}

