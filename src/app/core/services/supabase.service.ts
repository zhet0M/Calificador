import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import {
  ItemListQuery,
  ItemSummary,
  ITEMS_PAGE_SIZE,
  PHOTO_URL_SECONDS,
} from '../models/item.model';
import {
  ITEM_DETAIL_FIELDS,
  ItemRecord,
  ItemSaveCommand,
  ItemSaveError,
} from '../models/item-detail.model';
import { MAX_PHOTO_BYTES } from './photo-processing.service';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private instance?: SupabaseClient;

  readonly isConfigured =
    environment.supabaseUrl.startsWith('https://') &&
    !environment.supabaseUrl.includes('TU-PROYECTO') &&
    !['', 'TU-ANON-O-PUBLISHABLE-KEY'].includes(environment.supabasePublishableKey);

  get client(): SupabaseClient {
    if (!this.isConfigured) {
      throw new Error('Falta configurar Supabase en el environment activo.');
    }

    if (environment.supabasePublishableKey.startsWith('sb_secret_')) {
      throw new Error('Usa exclusivamente una clave publica de Supabase.');
    }

    this.instance ??= createClient(environment.supabaseUrl, environment.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });

    return this.instance;
  }

  async getItems(
    query: ItemListQuery,
    signal?: AbortSignal,
  ): Promise<{ items: ItemSummary[]; total: number }> {
    const offset = Math.max(0, query.page) * ITEMS_PAGE_SIZE;
    let request = this.client
      .from('items')
      .select('id,created_at,tipo,nombre,foto_path,estrellas,nota_final', { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (query.type !== 'all') request = request.eq('tipo', query.type);
    // Zero is a recorded score too; only NULL means the genre is unset.
    if (query.genre !== 'all') request = request.not(query.genre, 'is', null);
    const search = query.search.trim();
    if (search) {
      const literal = search.replace(/[\\%_]/g, '\\$&');
      request = request.ilike('nombre', `%${literal}%`);
    }
    request = request.range(offset, offset + ITEMS_PAGE_SIZE - 1);
    if (signal) request = request.abortSignal(signal);
    const { data, count, error } = await request.returns<ItemSummary[]>();
    if (error) throw new Error('No se pudieron cargar las historias.');
    return { items: data ?? [], total: count ?? 0 };
  }

  async getItemPhotoUrls(
    items: ItemSummary[],
    userId: string,
  ): Promise<{ urls: Record<string, string>; hasErrors: boolean }> {
    const requested = [
      ...new Set(items.map((item) => item.foto_path).filter((path): path is string => !!path)),
    ];
    const paths = requested.filter(
      (path) =>
        path.startsWith(`${userId}/`) && path.split('/').length === 2 && !path.includes('..'),
    );
    const urls: Record<string, string> = {};
    if (!paths.length) return { urls, hasErrors: requested.length > 0 };
    const { data, error } = await this.client.storage
      .from('fotos')
      .createSignedUrls(paths, PHOTO_URL_SECONDS);
    if (error) return { urls, hasErrors: true };
    for (const photo of data ?? []) {
      if (photo.path && paths.includes(photo.path) && photo.signedUrl && !photo.error) {
        urls[photo.path] = photo.signedUrl;
      }
    }
    return { urls, hasErrors: requested.some((path) => !urls[path]) };
  }

  async getItem(id: string): Promise<ItemRecord | null> {
    const { data, error } = await this.client
      .from('items')
      .select(ITEM_DETAIL_FIELDS)
      .eq('id', id)
      .maybeSingle<ItemRecord>();
    if (error) throw new Error('No pudimos abrir esta ficha.');
    return data;
  }

  private async requireUser(userId: string): Promise<void> {
    const { data, error } = await this.client.auth.getSession();
    if (error || data.session?.user.id !== userId) throw new Error('La sesión ha cambiado.');
  }

  async removeUnusedPhoto(path: string, userId: string): Promise<boolean> {
    if (!path.startsWith(`${userId}/`) || path.split('/').length !== 2 || path.includes('..'))
      return false;
    try {
      await this.requireUser(userId);
      // Never remove a file if a save might have committed despite a lost response.
      const refs = await this.client.from('items').select('id').eq('foto_path', path).limit(1);
      if (refs.error) return false;
      if (refs.data?.length) return true;
      const { error } = await this.client.storage.from('fotos').remove([path]);
      return !error;
    } catch {
      return false;
    }
  }

  async saveItem(command: ItemSaveCommand): Promise<{ cleanupPath: string | null }> {
    const { id, userId, photo } = command;
    let uploaded: string | null = null;
    let previous: string | null = null;
    try {
      await this.requireUser(userId);
      const current = await this.getItem(id);
      if (!command.isNew && !current) throw new Error('Ficha no disponible.');
      previous = current?.foto_path ?? null;
      let nextPath = previous;
      if (photo === null) nextPath = null;
      if (photo instanceof Blob) {
        if (photo.type !== 'image/webp' || !photo.size || photo.size > MAX_PHOTO_BYTES)
          throw new Error('Foto no válida.');
        uploaded = `${userId}/${crypto.randomUUID()}.webp`;
        const { error } = await this.client.storage
          .from('fotos')
          .upload(uploaded, photo, { contentType: 'image/webp', upsert: false });
        if (error) throw new Error('No pudimos subir la foto.');
        nextPath = uploaded;
      }
      await this.requireUser(userId);
      const payload = { ...command.draft, foto_path: nextPath };
      // Fixed client-generated id makes a new-item retry idempotent.
      const mutation = command.isNew
        ? this.client.from('items').upsert({ ...payload, id }, { onConflict: 'id' })
        : this.client.from('items').update(payload).eq('id', id);
      const result = await mutation.select('id').single<{ id: string }>();
      if (result.error || !result.data) throw new Error('No pudimos guardar.');
      if (previous && previous !== nextPath && !(await this.removeUnusedPhoto(previous, userId))) {
        return { cleanupPath: previous };
      }
      return { cleanupPath: null };
    } catch {
      const pending =
        uploaded && !(await this.removeUnusedPhoto(uploaded, userId)) ? uploaded : null;
      throw new ItemSaveError(pending);
    }
  }
}
