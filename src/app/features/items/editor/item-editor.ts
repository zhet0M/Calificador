import { Component, DestroyRef, HostListener, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ItemSaveError } from '../../../core/models/item-detail.model';
import { ITEM_TYPES } from '../../../core/models/item.model';
import { createItemForm, itemDraft, patchItemForm } from './item-form.model';
import { PhotoPicker } from './photo-picker';
import { IconRating } from '../../../shared/controls/icon-rating';
import { GenreEditor } from './genre-editor';
import { CharacterEditor } from './character-editor';
import { DurationEditor } from './duration-editor';

@Component({
  selector: 'app-item-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PhotoPicker,
    IconRating,
    GenreEditor,
    CharacterEditor,
    DurationEditor,
  ],
  templateUrl: './item-editor.html',
  styleUrl: './item-editor.scss',
})
export class ItemEditor {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly ownerId = this.auth.user()?.id ?? '';
  readonly editing = !!this.route.snapshot.paramMap.get('id');
  readonly id = this.route.snapshot.paramMap.get('id') ?? crypto.randomUUID();
  readonly form = createItemForm();
  readonly types = ITEM_TYPES;
  readonly type = toSignal(this.form.controls.tipo.valueChanges, {
    initialValue: this.form.controls.tipo.value,
  });
  readonly typeLabel = computed(
    () => ITEM_TYPES.find((option) => option.value === this.type())?.singular ?? 'Serie',
  );
  readonly book = computed(() => this.type() === 'libro');
  readonly loading = signal(this.editing);
  readonly loadError = signal('');
  readonly error = signal('');
  readonly busy = signal(false);
  readonly processingPhoto = signal(false);
  readonly photo = signal<Blob | null | undefined>(undefined);
  readonly existingPhotoUrl = signal<string | undefined>(undefined);
  readonly existingPhotoPath = signal<string | null>(null);
  readonly cleanupPath = signal<string | null>(null);
  readonly saved = signal(false);
  readonly submitted = signal(false);
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
    });
    if (this.editing) void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const item = await this.api.getItem(this.id);
      if (this.destroyed || this.auth.user()?.id !== this.ownerId) return;
      if (!item) {
        this.loadError.set('Esta ficha no está disponible para tu cuenta.');
        return;
      }
      patchItemForm(this.form, item);
      this.existingPhotoPath.set(item.foto_path);
      if (item.foto_path) {
        try {
          const result = await this.api.getItemPhotoUrls([item], this.ownerId);
          if (!this.destroyed) this.existingPhotoUrl.set(result.urls[item.foto_path]);
        } catch {
          /* Preserve the stored path even if its preview is unavailable. */
        }
      }
    } catch {
      if (!this.destroyed) this.loadError.set('No pudimos abrir esta ficha. Inténtalo de nuevo.');
    } finally {
      if (!this.destroyed) this.loading.set(false);
    }
  }

  photoChanged(photo: Blob | null | undefined): void {
    this.photo.set(photo);
    this.form.markAsDirty();
  }

  async save(): Promise<void> {
    if (this.busy() || this.processingPhoto() || this.loading() || this.loadError() || this.saved())
      return;
    this.submitted.set(true);
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Revisa los campos marcados antes de guardar.');
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('.editor-form .ng-invalid[formcontrolname]')?.focus(),
      );
      return;
    }
    this.busy.set(true);
    try {
      if (this.cleanupPath() && !(await this.cleanup())) {
        this.error.set('No pudimos completar la limpieza anterior. Reintenta antes de guardar.');
        return;
      }
      const result = await this.api.saveItem({
        id: this.id,
        isNew: !this.editing,
        draft: itemDraft(this.form),
        photo: this.photo(),
        userId: this.ownerId,
      });
      if (this.destroyed) return;
      this.form.markAsPristine();
      this.saved.set(true);
      this.cleanupPath.set(result.cleanupPath);
    } catch (error) {
      if (this.destroyed) return;
      this.cleanupPath.set(error instanceof ItemSaveError ? error.cleanupPath : null);
      this.error.set(
        'No pudimos confirmar el guardado. Tus cambios siguen aquí; revisa la conexión y reintenta.',
      );
    } finally {
      if (!this.destroyed) this.busy.set(false);
    }
    if (this.saved() && !this.cleanupPath() && !this.destroyed) {
      await this.router.navigateByUrl('/items');
    }
  }

  async cleanup(): Promise<boolean> {
    const path = this.cleanupPath();
    if (!path) return true;
    const removed = await this.api.removeUnusedPhoto(path, this.ownerId);
    if (removed && !this.destroyed) this.cleanupPath.set(null);
    return removed;
  }

  canLeave(): boolean {
    if (this.auth.user()?.id !== this.ownerId || this.saved()) return true;
    if (this.busy() || this.processingPhoto()) return false;
    return (
      !this.form.dirty || window.confirm('Tienes cambios sin guardar. ¿Quieres salir de la ficha?')
    );
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (!this.saved() && (this.form.dirty || this.busy() || this.processingPhoto())) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
