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
