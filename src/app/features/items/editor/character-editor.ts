import { Component, forwardRef } from '@angular/core';
import {
  ControlValueAccessor,
  FormArray,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { parseCharacters, serializeCharacters } from './structured-fields.model';

@Component({
  selector: 'app-character-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CharacterEditor), multi: true },
  ],
  template: `
    <fieldset [disabled]="disabled">
      <legend>Personajes</legend>
      <div class="characters">
        @for (character of characters.controls; track character; let i = $index) {
          <div class="character-row">
            <label [for]="'character-' + i">{{ i + 1 }}</label>
            <input
              [id]="'character-' + i"
              [formControl]="character"
              [attr.aria-label]="'Personaje ' + (i + 1)"
              placeholder="Nombre del personaje"
              (blur)="touched()"
              (keydown.enter)="addOnEnter($event)"
            />
            <button
              type="button"
              class="remove"
              (click)="remove(i)"
              [attr.aria-label]="'Quitar personaje ' + (i + 1)"
            >
              ×
            </button>
          </div>
        } @empty {
          <p class="empty">Tu elenco favorito, un personaje a la vez.</p>
        }
      </div>
      <button id="add-character" type="button" class="add" (click)="add()">
        + Agregar personaje
      </button>
      <p class="help">Edita cada nombre por separado. Las filas vacías no se guardan.</p>
    </fieldset>
  `,
  styleUrl: './character-editor.scss',
})
export class CharacterEditor implements ControlValueAccessor {
  readonly characters = new FormArray<FormControl<string>>([]);
  disabled = false;
  private changed: (value: string) => void = () => {};
  touched: () => void = () => {};

  constructor() {
    this.characters.valueChanges.pipe(takeUntilDestroyed()).subscribe((values) => {
      this.changed(serializeCharacters(values));
    });
  }

  writeValue(value: unknown): void {
    this.characters.clear({ emitEvent: false });
    for (const name of parseCharacters(typeof value === 'string' ? value : '')) {
      this.characters.push(new FormControl(name, { nonNullable: true }), { emitEvent: false });
    }
    if (this.disabled) this.characters.disable({ emitEvent: false });
  }
  registerOnChange(callback: (value: string) => void): void {
    this.changed = callback;
  }
  registerOnTouched(callback: () => void): void {
    this.touched = callback;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) this.characters.disable({ emitEvent: false });
    else this.characters.enable({ emitEvent: false });
  }
  add(): void {
    if (this.disabled) return;
    this.characters.push(new FormControl('', { nonNullable: true }));
    this.touched();
    const id = `character-${this.characters.length - 1}`;
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }
  remove(index: number): void {
    if (this.disabled) return;
    this.characters.removeAt(index);
    this.touched();
    const id = this.characters.length
      ? `character-${Math.min(index, this.characters.length - 1)}`
      : 'add-character';
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }

  addOnEnter(event: Event): void {
    event.preventDefault();
    this.add();
  }
}
