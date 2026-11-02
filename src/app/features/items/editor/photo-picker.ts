import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { PhotoProcessingService } from '../../../core/services/photo-processing.service';

@Component({
  selector: 'app-photo-picker',
  standalone: true,
  template: `
    <div class="photo-frame">
      @if (preview() && !failed()) {
        <img
          [src]="preview()"
          alt="Vista previa de la foto de la ficha"
          (error)="failed.set(true)"
        />
      } @else {
        <div class="placeholder">
          <span aria-hidden="true">✧</span
          ><span>{{ failed() ? 'Foto no disponible' : 'Una foto para recordar' }}</span>
        </div>
      }
    </div>
    <label class="file-label" for="item-photo">{{
      processing() ? 'Preparando imagen…' : 'Elegir foto'
    }}</label>
    <input
      id="item-photo"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      (change)="selectFile($event)"
      [disabled]="disabled() || processing()"
    />
    <p class="photo-help">
      JPEG, PNG o WebP · hasta 20 MB de origen. Se convierte a WebP de hasta 800 px antes de subir.
    </p>
    @if (size()) {
      <p class="photo-help">Lista para subir: {{ size() }} KB</p>
    }
    @if (error()) {
      <p role="alert" class="photo-error">{{ error() }}</p>
    }
    <div class="photo-actions">
      @if (preview() || failed() || (hasExisting() && selection() === undefined)) {
        <button type="button" (click)="remove()" [disabled]="disabled() || processing()">
          Quitar foto
        </button>
      }
      @if (selection() !== undefined && hasExisting()) {
        <button type="button" (click)="restore()" [disabled]="disabled() || processing()">
          Restaurar anterior
        </button>
      }
    </div>
  `,
  styleUrl: './photo-picker.scss',
})
export class PhotoPicker {
  readonly existingUrl = input<string>();
  readonly hasExisting = input(false);
  readonly disabled = input(false);
  readonly changed = output<Blob | null | undefined>();
  readonly processingChange = output<boolean>();
  readonly processing = signal(false);
  readonly error = signal('');
  readonly failed = signal(false);
  readonly selection = signal<Blob | null | undefined>(undefined);
  private readonly localUrl = signal<string | undefined>(undefined);
  readonly preview = computed(() =>
    this.selection() === undefined ? this.existingUrl() : this.localUrl(),
  );
  readonly size = computed(() => {
    const blob = this.selection();
    return blob ? Math.ceil(blob.size / 1024) : 0;
  });
  private readonly processor = inject(PhotoProcessingService);
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.revoke();
    });
  }

  async selectFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.disabled() || this.processing()) return;
    this.processing.set(true);
    this.processingChange.emit(true);
    this.error.set('');
    try {
      const blob = await this.processor.compress(file);
      if (this.destroyed) return;
      this.revoke();
      this.localUrl.set(URL.createObjectURL(blob));
      this.selection.set(blob);
      this.failed.set(false);
      this.changed.emit(blob);
    } catch {
      if (!this.destroyed)
        this.error.set(
          'No pudimos preparar esta foto. Elige una imagen JPEG, PNG o WebP de hasta 20 MB.',
        );
    } finally {
      if (!this.destroyed) {
        this.processing.set(false);
        this.processingChange.emit(false);
      }
    }
  }

  remove(): void {
    this.revoke();
    this.selection.set(null);
    this.failed.set(false);
    this.error.set('');
    this.changed.emit(null);
  }
  restore(): void {
    this.revoke();
    this.selection.set(undefined);
    this.failed.set(false);
    this.error.set('');
    this.changed.emit(undefined);
  }
  private revoke(): void {
    const url = this.localUrl();
    if (url) URL.revokeObjectURL(url);
    this.localUrl.set(undefined);
  }
}
