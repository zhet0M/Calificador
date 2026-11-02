import { TestBed } from '@angular/core/testing';
import { SupabaseClient } from '@supabase/supabase-js';
import { vi } from 'vitest';
import { ITEM_GENRES, ItemSummary, PHOTO_URL_SECONDS } from '../models/item.model';
import { SupabaseService } from './supabase.service';

describe('Supabase item reads', () => {
  let service: SupabaseService;
  let request: Record<string, ReturnType<typeof vi.fn>>;
  let sign: ReturnType<typeof vi.fn>;
  let storageFrom: ReturnType<typeof vi.fn>;
  const item = (path: string | null) => ({ foto_path: path }) as ItemSummary;

  beforeEach(() => {
    service = TestBed.inject(SupabaseService);
    request = {};
    for (const name of ['select', 'order', 'eq', 'ilike', 'range', 'abortSignal', 'not'])
      request[name] = vi.fn(() => request);
    request['returns'] = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    sign = vi.fn();
    storageFrom = vi.fn(() => ({ createSignedUrls: sign }));
    const client = { from: vi.fn(() => request), storage: { from: storageFrom } };
    vi.spyOn(service, 'client', 'get').mockReturnValue(client as unknown as SupabaseClient);
  });

  it('reads a stable page with exact count and no user_id write', async () => {
    request['returns'].mockResolvedValue({ data: [], count: 30, error: null });
    const result = await service.getItems({ genre: 'all', type: 'all', search: '', page: 1 });
    expect(request['range']).toHaveBeenCalledWith(24, 47);
    expect(request['select']).toHaveBeenCalledWith(
      'id,created_at,tipo,nombre,foto_path,estrellas,nota_final',
      { count: 'exact' },
    );
    expect(request['order']).toHaveBeenCalledWith('id', { ascending: false });
    expect(request['eq']).not.toHaveBeenCalled();
    expect(request['not']).not.toHaveBeenCalled();
    expect(result.total).toBe(30);
  });

  it('filters type and treats wildcard characters as literal search text', async () => {
    const controller = new AbortController();
    await service.getItems(
      { genre: 'all', type: 'libro', search: '  100%_  ', page: 0 },
      controller.signal,
    );
    expect(request['eq']).toHaveBeenCalledWith('tipo', 'libro');
    expect(request['ilike']).toHaveBeenCalledWith('nombre', '%100\\%\\_%');
    expect(request['abortSignal']).toHaveBeenCalledWith(controller.signal);
  });

  it.each(ITEM_GENRES)('filters $value by non-NULL scores, including zero', async (genre) => {
    await service.getItems({ type: 'serie', genre: genre.value, search: 'bosque', page: 0 });
    expect(request['not']).toHaveBeenCalledWith(genre.value, 'is', null);
    expect(request['eq']).toHaveBeenCalledWith('tipo', 'serie');
    expect(request['ilike']).toHaveBeenCalledWith('nombre', '%bosque%');
  });

  it('does not turn a failed query into an empty collection', async () => {
    request['returns'].mockResolvedValue({
      data: null,
      count: null,
      error: { message: 'private details' },
    });
    await expect(
      service.getItems({ genre: 'all', type: 'all', search: '', page: 0 }),
    ).rejects.toThrow('No se pudieron cargar');
  });

  it('only signs unique paths in the current user folder', async () => {
    sign.mockResolvedValue({
      data: [{ path: 'user/a.webp', signedUrl: 'https://example.test/signed', error: null }],
      error: null,
    });
    const result = await service.getItemPhotoUrls(
      [
        item('user/a.webp'),
        item('user/a.webp'),
        item('other/a.webp'),
        item('user/../other/a.webp'),
      ],
      'user',
    );
    expect(storageFrom).toHaveBeenCalledWith('fotos');
    expect(sign).toHaveBeenCalledWith(['user/a.webp'], PHOTO_URL_SECONDS);
    expect(result.urls['user/a.webp']).toBe('https://example.test/signed');
    expect(result.hasErrors).toBe(true);
  });

  it('keeps partial signing failures separate from the records', async () => {
    sign.mockResolvedValue({
      data: [
        { path: 'user/a.webp', signedUrl: 'https://example.test/a', error: null },
        { path: 'user/b.webp', error: 'missing' },
      ],
      error: null,
    });
    const result = await service.getItemPhotoUrls(
      [item('user/a.webp'), item('user/b.webp')],
      'user',
    );
    expect(Object.keys(result.urls)).toEqual(['user/a.webp']);
    expect(result.hasErrors).toBe(true);
  });

  it('does not request storage when there are no photos', async () => {
    expect(await service.getItemPhotoUrls([item(null)], 'user')).toEqual({
      urls: {},
      hasErrors: false,
    });
    expect(sign).not.toHaveBeenCalled();
  });
});
