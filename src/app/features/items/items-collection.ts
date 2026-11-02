import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import {
  ITEM_TYPES,
  ITEM_GENRES,
  ItemGenre,
  ItemListQuery,
  ItemSummary,
  ItemType,
  ITEMS_PAGE_SIZE,
} from '../../core/models/item.model';
import { ItemCard } from './item-card';

@Component({
  selector: 'app-items-collection',
  standalone: true,
  imports: [ReactiveFormsModule, ItemCard, RouterLink],
  templateUrl: './items-collection.html',
  styleUrl: './items-collection.scss',
})
export class ItemsCollection {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly destroyRef = inject(DestroyRef);
  private sequence = 0;
  private readonly reloadKey = signal(0);
  private readonly search = signal('');
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly type = signal<ItemType | 'all'>('all');
  readonly genreControl = new FormControl<ItemGenre | 'all'>('all', { nonNullable: true });
  private readonly genre = signal<ItemGenre | 'all'>('all');
  readonly genres = ITEM_GENRES;
  readonly types = ITEM_TYPES;
  readonly page = signal(0);
  readonly items = signal<ItemSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly photoWarning = signal(false);
  readonly photos = signal<Record<string, string>>({});
  readonly pageCount = computed(() => Math.ceil(this.total() / ITEMS_PAGE_SIZE));
  readonly rangeStart = computed(() => this.page() * ITEMS_PAGE_SIZE + 1);
  readonly rangeEnd = computed(() => this.page() * ITEMS_PAGE_SIZE + this.items().length);
  readonly filtered = computed(
    () => this.type() !== 'all' || this.genre() !== 'all' || !!this.search(),
  );

  constructor() {
    this.genreControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((genre) => {
      this.page.set(0);
      this.genre.set(genre);
    });
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        const search = value.trim();
        if (search === this.search()) return;
        this.page.set(0);
        this.search.set(search);
      });
    effect((onCleanup) => {
      const userId = this.auth.user()?.id;
      const query = {
        type: this.type(),
        genre: this.genre(),
        search: this.search(),
        page: this.page(),
      };
      this.reloadKey();
      const request = ++this.sequence;
      const controller = new AbortController();
      onCleanup(() => controller.abort());
      this.items.set([]);
      this.total.set(0);
      this.photos.set({});
      this.error.set('');
      this.photoWarning.set(false);
      this.loading.set(!!userId);
      if (userId) void this.load(query, request, controller.signal);
    });
    const timer = setInterval(() => {
      if (!document.hidden) void this.refreshPhotos();
    }, 240_000);
    const onVisible = () => {
      if (!document.hidden) void this.refreshPhotos();
    };
    document.addEventListener('visibilitychange', onVisible);
    this.destroyRef.onDestroy(() => {
      this.sequence++;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    });
  }

  selectType(type: ItemType | 'all'): void {
    this.page.set(0);
    this.type.set(type);
  }

  clearFilters(): void {
    this.genreControl.setValue('all');
    this.searchControl.setValue('');
    this.search.set('');
    this.type.set('all');
    this.page.set(0);
  }

  reload(): void {
    this.reloadKey.update((value) => value + 1);
  }

  changePage(delta: number): void {
    this.page.update((page) =>
      Math.min(Math.max(0, page + delta), Math.max(0, this.pageCount() - 1)),
    );
  }

  private async load(query: ItemListQuery, request: number, signal: AbortSignal): Promise<void> {
    try {
      const result = await this.supabase.getItems(query, signal);
      if (request !== this.sequence || signal.aborted) return;
      if (query.page > 0 && result.total > 0 && query.page * ITEMS_PAGE_SIZE >= result.total) {
        this.page.set(Math.ceil(result.total / ITEMS_PAGE_SIZE) - 1);
        return;
      }
      this.items.set(result.items);
      this.total.set(result.total);
      this.loading.set(false);
      await this.refreshPhotos();
    } catch {
      if (request !== this.sequence || signal.aborted) return;
      this.error.set('No pudimos cargar tus historias. Inténtalo de nuevo.');
      this.loading.set(false);
    }
  }

  async refreshPhotos(): Promise<void> {
    const request = this.sequence;
    const userId = this.auth.user()?.id;
    const items = this.items();
    if (!userId || !items.some((item) => item.foto_path)) return;
    try {
      const result = await this.supabase.getItemPhotoUrls(items, userId);
      if (request !== this.sequence) return;
      this.photos.set(result.urls);
      this.photoWarning.set(result.hasErrors);
    } catch {
      if (request === this.sequence) this.photoWarning.set(true);
    }
  }
}
