import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ITEM_GENRES, ItemGenre } from '../../../core/models/item.model';
import { ItemForm } from './item-form.model';

const SUBGENRES: Record<ItemGenre, readonly string[]> = {
  romance: ['Contemporáneo', 'Época', 'Juvenil'],
  drama: ['Médico', 'Jurídico', 'Político', 'Histórico'],
  comedia: ['Sitcom', 'Romántica', 'Negra'],
  ciencia_ficcion: ['Cyberpunk', 'Space opera', 'Ucronía', 'Steampunk'],
  suspense_thriller: ['Psicológico', 'Policial', 'Informático'],
  terror: ['Sobrenatural', 'Gore'],
  fantasia: ['Épica', 'Urbana', 'Mitológica'],
  accion_crimen: ['Espionaje', 'Atracos', 'Mafia'],
};

@Component({
  selector: 'app-genre-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="genre-grid">
      @for (genre of genres; track genre.value) {
        <div class="genre-block">
          <label class="genre-toggle"
            ><input
              type="checkbox"
              [checked]="form().controls[genre.value].value !== null"
              (change)="toggleGenre(genre.value, $event)"
            />
            {{ genre.label }}</label
          >
          @if (form().controls[genre.value].value !== null) {
            <div class="genre-score">
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                [formControl]="form().controls[genre.value]"
                [attr.aria-label]="'Nota de ' + genre.label"
              /><output>{{ form().controls[genre.value].value }}/10</output>
            </div>
            <div class="chips" role="group" [attr.aria-label]="'Subgéneros de ' + genre.label">
              @for (subgenre of subgenres[genre.value]; track subgenre) {
                <button
                  type="button"
                  [attr.aria-pressed]="selected(subgenre)"
                  (click)="toggleSubgenre(subgenre)"
                >
                  {{ subgenre }}
                </button>
              }
            </div>
          } @else {
            <small>Sin nota</small>
          }
        </div>
      }
    </div>
    @if (form().controls.subgeneros.value.length) {
      <div class="selected">
        <p>Subgéneros seleccionados</p>
        <div class="chips">
          @for (subgenre of form().controls.subgeneros.value; track subgenre) {
            <button
              type="button"
              (click)="toggleSubgenre(subgenre)"
              [attr.aria-label]="'Quitar subgénero ' + subgenre"
            >
              {{ subgenre }} ×
            </button>
          }
        </div>
      </div>
    }
  `,
  styleUrl: './genre-editor.scss',
})
export class GenreEditor {
  readonly form = input.required<ItemForm>();
  readonly genres = ITEM_GENRES;
  readonly subgenres = SUBGENRES;
  toggleGenre(genre: ItemGenre, event: Event): void {
    const control = this.form().controls[genre];
    control.setValue((event.target as HTMLInputElement).checked ? 0 : null);
    control.markAsDirty();
  }
  selected(value: string): boolean {
    return this.form().controls.subgeneros.value.includes(value);
  }
  toggleSubgenre(value: string): void {
    const control = this.form().controls.subgeneros;
    control.setValue(
      this.selected(value)
        ? control.value.filter((item) => item !== value)
        : [...control.value, value],
    );
    control.markAsDirty();
  }
}
