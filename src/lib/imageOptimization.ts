import { devLog } from './devLogger';

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number;
  mimeType?: string;
}

export interface CompressedImageResult {
  base64: string; // Full data URL (data:image/jpeg;base64,...)
  cleanBase64: string; // Raw base64 payload without prefix
  file: File;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
  compressionRatio: number; // e.g. 0.85 means 85% reduced
}

const DEFAULT_OPTIONS: Required<ImageCompressionOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82,
  maxSizeBytes: 1.2 * 1024 * 1024, // 1.2 MB upper cap per image
  mimeType: 'image/jpeg',
};

/**
 * Loads an image blob or file into an HTMLImageElement or ImageBitmap
 * with automatic EXIF orientation preservation for mobile cameras.
 */
async function loadImageSource(
  file: File | Blob
): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  // 1. Try modern createImageBitmap with EXIF orientation handling
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      // imageOrientation: 'from-image' correctly orients photos taken from iPhone/Android cameras
      const bitmap = await (createImageBitmap as any)(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          if ('close' in bitmap) {
            (bitmap as ImageBitmap).close();
          }
        },
      };
    } catch {
      // Fall through to HTMLImageElement fallback if createImageBitmap fails on unsupported format
    }
  }

  // 2. Fallback to HTMLImageElement via object URL
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        cleanup: () => {
          URL.revokeObjectURL(objectUrl);
        },
      });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image file: ${err}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Compresses and scales an image file on the client before network upload.
 * Solves Vercel Serverless HTTP 413 (Payload Too Large) by reducing mobile camera
 * 12MP-48MP photos (4MB-15MB) down to optimized, OCR-sharp JPEGs (~200KB-400KB).
 */
export async function compressImageFile(
  file: File | Blob,
  customOptions?: ImageCompressionOptions
): Promise<CompressedImageResult> {
  const options = { ...DEFAULT_OPTIONS, ...customOptions };
  const originalSize = file.size;
  const fileName = (file as File).name || `captured-photo-${Date.now()}.jpg`;

  devLog.info('Image Optimizer', `Starting client-side compression for "${fileName}" (${(originalSize / 1024 / 1024).toFixed(2)} MB)...`);

  const { source, width: origWidth, height: origHeight, cleanup } = await loadImageSource(file);

  try {
    // Calculate aspect-ratio bounded dimensions
    let targetWidth = origWidth;
    let targetHeight = origHeight;

    if (targetWidth > options.maxWidth || targetHeight > options.maxHeight) {
      const ratio = Math.min(options.maxWidth / targetWidth, options.maxHeight / targetHeight);
      targetWidth = Math.max(1, Math.round(targetWidth * ratio));
      targetHeight = Math.max(1, Math.round(targetHeight * ratio));
    }

    // Render to canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas 2D context unavailable for image compression');
    }

    // Fill white background in case source is PNG/transparent
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    // Initial compression
    let currentQuality = options.quality;
    let dataUrl = canvas.toDataURL(options.mimeType, currentQuality);
    let approxBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

    // Progressive re-compression if output still exceeds maxSizeBytes (e.g. extremely complex textures)
    let attempts = 0;
    while (approxBytes > options.maxSizeBytes && attempts < 3 && currentQuality > 0.45) {
      attempts++;
      currentQuality = Math.max(0.45, currentQuality - 0.15);
      dataUrl = canvas.toDataURL(options.mimeType, currentQuality);
      approxBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
    }

    const cleanBase64 = dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    // Reconstruct File object from compressed data
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const compressedBlob = new Blob([byteArray], { type: options.mimeType });
    const compressedFile = new File([compressedBlob], fileName.replace(/\.[^.]+$/, '.jpg'), {
      type: options.mimeType,
      lastModified: Date.now(),
    });

    const savings = Math.max(0, 1 - (compressedBlob.size / originalSize));

    devLog.success(
      'Image Optimizer',
      `Compressed "${fileName}": ${(originalSize / 1024 / 1024).toFixed(2)} MB -> ${(compressedBlob.size / 1024).toFixed(1)} KB (-${(savings * 100).toFixed(1)}%) [${targetWidth}x${targetHeight}]`
    );

    return {
      base64: dataUrl,
      cleanBase64,
      file: compressedFile,
      originalSizeBytes: originalSize,
      compressedSizeBytes: compressedBlob.size,
      width: targetWidth,
      height: targetHeight,
      compressionRatio: savings,
    };
  } finally {
    cleanup();
  }
}

/**
 * Batch compresses multiple image files sequentially or in parallel.
 */
export async function compressImageFiles(
  files: (File | Blob)[] | FileList,
  options?: ImageCompressionOptions
): Promise<CompressedImageResult[]> {
  const fileArray = Array.from(files);
  return Promise.all(fileArray.map((f) => compressImageFile(f, options)));
}
