import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ItemSaveError } from '../../../core/models/item-detail.model';
import { ItemEditor } from './item-editor';

describe('ItemEditor', () => {
  const saveItem = vi.fn();
  beforeEach(() => {
    saveItem.mockReset().mockResolvedValue({ cleanupPath: null });
    TestBed.configureTestingModule({
      imports: [ItemEditor],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: AuthService, useValue: { user: signal({ id: 'user' }) } },
        {
          provide: SupabaseService,
          useValue: { saveItem, removeUnusedPhoto: vi.fn().mockResolvedValue(true) },
        },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  it('does not save an empty name and keeps changes after a failed write', async () => {
    const editor = TestBed.createComponent(ItemEditor).componentInstance;
    await editor.save();
    expect(saveItem).not.toHaveBeenCalled();
    editor.form.controls.nombre.setValue('Mi historia');
    saveItem.mockRejectedValue(new ItemSaveError());
    await editor.save();
    expect(editor.form.controls.nombre.value).toBe('Mi historia');
    expect(editor.saved()).toBe(false);
    expect(editor.error()).toContain('No pudimos confirmar');
  });
  it('blocks double saves and preserves the id across retries', async () => {
    let resolve!: (value: { cleanupPath: null }) => void;
    saveItem.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const editor = TestBed.createComponent(ItemEditor).componentInstance;
    editor.form.controls.nombre.setValue('Historia');
    const first = editor.save();
    await editor.save();
    expect(saveItem).toHaveBeenCalledTimes(1);
    resolve({ cleanupPath: null });
    await first;
    expect(editor.saved()).toBe(true);
    expect(editor.canLeave()).toBe(true);
  });
  it('warns before leaving a dirty form', () => {
    const editor = TestBed.createComponent(ItemEditor).componentInstance;
    editor.form.markAsDirty();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(editor.canLeave()).toBe(false);
    expect(confirm).toHaveBeenCalled();
    confirm.mockRestore();
  });
  it('treats cleanup failure as an already saved record', async () => {
    saveItem.mockResolvedValue({ cleanupPath: 'user/old.webp' });
    const editor = TestBed.createComponent(ItemEditor).componentInstance;
    editor.form.controls.nombre.setValue('Historia');
    await editor.save();
    await editor.save();
    expect(editor.saved()).toBe(true);
    expect(editor.cleanupPath()).toBe('user/old.webp');
    expect(saveItem).toHaveBeenCalledTimes(1);
  });
});
