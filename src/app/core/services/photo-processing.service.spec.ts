import { TestBed } from '@angular/core/testing';
import { PhotoProcessingService } from './photo-processing.service';
import { vi } from 'vitest';

describe('PhotoProcessingService', () => {
  afterEach(() => vi.restoreAllMocks());
  it('rejects executable/unsupported content and oversized source files', async () => {
    const service = TestBed.inject(PhotoProcessingService);
    await expect(
      service.compress(new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' })),
    ).rejects.toThrow('JPEG');
    const large = new File([], 'x.jpg', { type: 'image/jpeg' });
    Object.defineProperty(large, 'size', { value: 21 * 1024 * 1024 });
    await expect(service.compress(large)).rejects.toThrow('20 MB');
  });
});
