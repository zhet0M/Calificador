import { TestBed } from '@angular/core/testing';
import { SupabaseClient } from '@supabase/supabase-js';
import { vi } from 'vitest';
import { SupabaseService } from './supabase.service';
import { ItemRecord, ItemSaveCommand, ItemSaveError } from '../models/item-detail.model';
import { createItemForm, itemDraft } from '../../features/items/editor/item-form.model';

describe('Item saves and photo lifecycle', () => {
  let current: ItemRecord | null;
  let failSave: boolean;
  let commitDespiteError: boolean;
  let failReferences: boolean;
  let failUpload: boolean;
  let failRemove: boolean;
  let sessionUser: string;
  let service: SupabaseService;
  let writes: Array<Record<string, unknown>>;
  let events: string[];
  let upload: ReturnType<typeof vi.fn>;
  let remove: ReturnType<typeof vi.fn>;

  function command(photo?: Blob | null): ItemSaveCommand {
    const form = createItemForm();
    form.controls.nombre.setValue('Una historia');
    return { id: 'fixed-id', isNew: !current, userId: 'user', draft: itemDraft(form), photo };
  }

  beforeEach(() => {
    current = null;
    failSave = false;
    commitDespiteError = false;
    failReferences = false;
    failUpload = false;
    failRemove = false;
    sessionUser = 'user';
    writes = [];
    events = [];
    const from = vi.fn(() => {
      let payload: Record<string, unknown> | undefined;
      let path: string | undefined;
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((key: string, value: string) => {
          if (key === 'foto_path') path = value;
          return builder;
        }),
        maybeSingle: vi.fn(async () => ({ data: current, error: null })),
        limit: vi.fn(async () => ({
          data: current && current.foto_path === path ? [{ id: current.id }] : [],
          error: failReferences ? { message: 'offline' } : null,
        })),
        upsert: vi.fn((value: Record<string, unknown>) => {
          payload = value;
          writes.push(value);
          return builder;
        }),
        update: vi.fn((value: Record<string, unknown>) => {
          payload = value;
          writes.push(value);
          return builder;
        }),
        single: vi.fn(async () => {
          events.push('save');
          if (!failSave || commitDespiteError)
            current = {
              ...payload,
              id: 'fixed-id',
              created_at: '2026-01-01',
            } as unknown as ItemRecord;
          return {
            data: failSave ? null : { id: 'fixed-id' },
            error: failSave ? { message: 'offline' } : null,
          };
        }),
      };
      return builder;
    });
    upload = vi.fn(async () => {
      events.push('upload');
      return { error: failUpload ? { message: 'offline' } : null };
    });
    remove = vi.fn(async () => {
      events.push('remove');
      return { error: failRemove ? { message: 'offline' } : null };
    });
    const client = {
      from,
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: { user: { id: sessionUser } } },
          error: null,
        })),
      },
      storage: { from: vi.fn(() => ({ upload, remove })) },
    };
    service = TestBed.inject(SupabaseService);
    vi.spyOn(service, 'client', 'get').mockReturnValue(client as unknown as SupabaseClient);
  });

  it('sends a fixed id and editable fields, never user_id or created_at', async () => {
    const save = command();
    await service.saveItem(save);
    expect(writes[0]?.['id']).toBe('fixed-id');
    expect(writes[0]).not.toHaveProperty('user_id');
    expect(writes[0]).not.toHaveProperty('created_at');
    expect(writes[0]?.['romance']).toBeNull();
  });

  it('uploads a private WebP before saving and removes the old photo only afterwards', async () => {
    current = {
      ...command().draft,
      id: 'fixed-id',
      created_at: '2026-01-01',
      foto_path: 'user/old.webp',
    };
    const result = await service.saveItem(command(new Blob(['photo'], { type: 'image/webp' })));
    expect(upload.mock.calls[0]).toEqual(
      expect.arrayContaining([expect.stringMatching(/^user\/.+\.webp$/)]),
    );
    expect(events).toEqual(['upload', 'save', 'remove']);
    expect(remove).toHaveBeenCalledWith(['user/old.webp']);
    expect(result.cleanupPath).toBeNull();
  });

  it('preserves the stored path when the photo is untouched', async () => {
    current = {
      ...command().draft,
      id: 'fixed-id',
      created_at: '2026-01-01',
      foto_path: 'user/old.webp',
    };
    await service.saveItem(command(undefined));
    expect(writes[0]?.['foto_path']).toBe('user/old.webp');
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes an explicitly cleared photo after the row is saved', async () => {
    current = {
      ...command().draft,
      id: 'fixed-id',
      created_at: '2026-01-01',
      foto_path: 'user/old.webp',
    };
    await service.saveItem(command(null));
    expect(writes[0]?.['foto_path']).toBeNull();
    expect(events).toEqual(['save', 'remove']);
  });

  it('cleans a new upload after a failed save without deleting the original', async () => {
    current = {
      ...command().draft,
      id: 'fixed-id',
      created_at: '2026-01-01',
      foto_path: 'user/old.webp',
    };
    failSave = true;
    await expect(
      service.saveItem(command(new Blob(['photo'], { type: 'image/webp' }))),
    ).rejects.toBeInstanceOf(ItemSaveError);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0]?.[0]).not.toEqual(['user/old.webp']);
    expect(current.foto_path).toBe('user/old.webp');
  });

  it('does not delete an upload when a lost save response actually committed', async () => {
    failSave = true;
    commitDespiteError = true;
    await expect(
      service.saveItem(command(new Blob(['photo'], { type: 'image/webp' }))),
    ).rejects.toBeInstanceOf(ItemSaveError);
    expect(remove).not.toHaveBeenCalled();
  });

  it('reports failed cleanup as saved rather than prompting duplicate saves', async () => {
    current = {
      ...command().draft,
      id: 'fixed-id',
      created_at: '2026-01-01',
      foto_path: 'user/old.webp',
    };
    failRemove = true;
    expect(await service.saveItem(command(null))).toEqual({ cleanupPath: 'user/old.webp' });
    expect(current.foto_path).toBeNull();
  });

  it('never deletes when references cannot be checked or the folder is foreign', async () => {
    failReferences = true;
    expect(await service.removeUnusedPhoto('user/a.webp', 'user')).toBe(false);
    expect(await service.removeUnusedPhoto('other/a.webp', 'user')).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects a changed session and rejects non-WebP uploads before writing', async () => {
    sessionUser = 'other';
    await expect(service.saveItem(command())).rejects.toBeInstanceOf(ItemSaveError);
    sessionUser = 'user';
    await expect(
      service.saveItem(command(new Blob(['x'], { type: 'image/png' }))),
    ).rejects.toBeInstanceOf(ItemSaveError);
    expect(writes).toEqual([]);
    expect(upload).not.toHaveBeenCalled();
  });
});
