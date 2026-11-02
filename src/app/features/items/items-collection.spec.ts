import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { ItemSummary } from '../../core/models/item.model';
import { ItemsCollection } from './items-collection';

const story: ItemSummary = {
  id: 'a',
  created_at: '2026-01-01',
  tipo: 'serie',
  nombre: 'Una historia',
  estrellas: 4,
  nota_final: 8.5,
  foto_path: 'user/a.webp',
};

describe('ItemsCollection', () => {
  const getItems = vi.fn();
  const getItemPhotoUrls = vi.fn();
  let user: ReturnType<typeof signal<{ id: string } | null>>;
  beforeEach(() => {
    user = signal<{ id: string } | null>({ id: 'user' });
    getItems.mockReset().mockResolvedValue({ items: [], total: 0 });
    getItemPhotoUrls.mockReset().mockResolvedValue({ urls: {}, hasErrors: false });
    TestBed.configureTestingModule({
      imports: [ItemsCollection],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user } },
        { provide: SupabaseService, useValue: { getItems, getItemPhotoUrls } },
      ],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(ItemsCollection);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('distinguishes an empty journal from an empty search', async () => {
    const fixture = await render();
    expect(fixture.nativeElement.textContent).toContain('Tu primera historia');
    fixture.componentInstance.selectType('libro');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ninguna historia coincide');
  });

  it('debounces search and resets pagination', async () => {
    const fixture = await render();
    fixture.componentInstance.searchControl.setValue('  test  ');
    fixture.componentInstance.searchControl.setValue('  historia  ');
    await vi.waitFor(() =>
      expect(getItems).toHaveBeenLastCalledWith(
        { genre: 'all', type: 'all', search: 'historia', page: 0 },
        expect.any(AbortSignal),
      ),
    );
    expect(getItems).toHaveBeenCalledTimes(2);
  });

  it('combines genre, type and search, resets pages and clears all filters', async () => {
    getItems.mockResolvedValue({ items: [story], total: 60 });
    const fixture = await render();
    const collection = fixture.componentInstance;
    collection.selectType('serie');
    collection.searchControl.setValue('bosque');
    await vi.waitFor(() =>
      expect(getItems).toHaveBeenLastCalledWith(
        { type: 'serie', genre: 'all', search: 'bosque', page: 0 },
        expect.any(AbortSignal),
      ),
    );
    collection.changePage(1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(collection.page()).toBe(1);
    collection.genreControl.setValue('romance');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(getItems).toHaveBeenLastCalledWith(
      { type: 'serie', genre: 'romance', search: 'bosque', page: 0 },
      expect.any(AbortSignal),
    );
    collection.clearFilters();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(collection.genreControl.value).toBe('all');
    expect(getItems).toHaveBeenLastCalledWith(
      { type: 'all', genre: 'all', search: '', page: 0 },
      expect.any(AbortSignal),
    );
  });

  it('ignores a late response when filters have changed', async () => {
    let resolve!: (value: { items: ItemSummary[]; total: number }) => void;
    getItems.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const fixture = await render();
    const firstSignal = getItems.mock.calls[0][1] as AbortSignal;
    fixture.componentInstance.selectType('libro');
    fixture.detectChanges();
    await fixture.whenStable();
    resolve({ items: [story], total: 1 });
    await fixture.whenStable();
    expect(firstSignal.aborted).toBe(true);
    expect(fixture.componentInstance.items()).toEqual([]);
  });

  it('keeps cards visible when storage is unavailable', async () => {
    getItems.mockResolvedValue({ items: [story], total: 1 });
    getItemPhotoUrls.mockRejectedValue(new Error('offline'));
    const fixture = await render();
    expect(fixture.componentInstance.error()).toBe('');
    expect(fixture.componentInstance.photoWarning()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Una historia');
  });

  it('shows read errors with retry instead of an empty journal', async () => {
    getItems.mockRejectedValueOnce(new Error('private details'));
    const fixture = await render();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'No pudimos cargar',
    );
    expect(fixture.nativeElement.textContent).not.toContain('private details');
    fixture.componentInstance.reload();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.error()).toBe('');
  });

  it('clears records when the current user disappears', async () => {
    getItems.mockResolvedValue({ items: [story], total: 1 });
    const fixture = await render();
    expect(fixture.componentInstance.items().length).toBe(1);
    user.set(null);
    fixture.detectChanges();
    expect(fixture.componentInstance.items()).toEqual([]);
    expect(fixture.componentInstance.photos()).toEqual({});
  });

  it('renews signed photos without reloading records', async () => {
    getItems.mockResolvedValue({ items: [story], total: 1 });
    const fixture = await render();
    getItemPhotoUrls.mockResolvedValue({
      urls: { 'user/a.webp': 'https://example.test/new' },
      hasErrors: false,
    });
    await fixture.componentInstance.refreshPhotos();
    expect(fixture.componentInstance.photos()['user/a.webp']).toContain('/new');
    expect(getItems).toHaveBeenCalledTimes(1);
  });
});
