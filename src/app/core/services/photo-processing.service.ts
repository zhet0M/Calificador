import { Injectable } from '@angular/core';

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class PhotoProcessingService {
  async compress(file: File): Promise<Blob> {
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 20 * 1024 * 1024
    ) {
      throw new Error('Elige una imagen JPEG, PNG o WebP de hasta 20 MB.');
    }
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    try {
      const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo preparar la imagen.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let result: Blob | null = null;
      for (const quality of [0.86, 0.76, 0.66, 0.56, 0.46]) {
        result = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/webp', quality),
        );
        if (result && result.size <= 300 * 1024) break;
      }
      if (!result || result.type !== 'image/webp' || result.size > MAX_PHOTO_BYTES) {
        throw new Error('No pudimos comprimir esta imagen a WebP. Prueba con otra.');
      }
      return result;
    } finally {
      bitmap.close();
    }
  }
}
