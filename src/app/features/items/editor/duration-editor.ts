import { Component, forwardRef, input, signal } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { formatDuration, parseDuration } from './structured-fields.model';

const integral = (control: AbstractControl): ValidationErrors | null =>
  control.value === null || Number.isSafeInteger(control.value) ? null : { integer: true };

@Component({
  selector: 'app-duration-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DurationEditor), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => DurationEditor), multi: true },
  ],
  template: `
    <fieldset [disabled]="disabled">
      <legend>{{ label() }}</legend>
      @if (legacy() !== null) {
        <div class="legacy">
          <p>
            Valor guardado: <strong>{{ legacy() }}</strong>
          </p>
          <button type="button" (click)="replaceLegacy()">Cambiar a horas y minutos</button
          ><small>Se conserva hasta que decidas cambiarlo.</small>
        </div>
      } @else {
        <div class="time-fields" [formGroup]="parts">
          <div>
            <label for="duration-hours">Horas</label>
            <div class="hours-control">
              <button
                type="button"
                aria-label="Restar una hora"
                (click)="stepHours(-1)"
                [disabled]="(parts.controls.hours.value ?? 0) <= 0"
              >
                −</button
              ><input
                id="duration-hours"
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                placeholder="00"
                formControlName="hours"
                (blur)="touched()"
                [attr.aria-invalid]="parts.controls.hours.invalid"
              /><button type="button" aria-label="Sumar una hora" (click)="stepHours(1)">+</button>
            </div>
          </div>
          <span class="colon" aria-hidden="true">:</span>
          <div>
            <label for="duration-minutes">Minutos</label
            ><select id="duration-minutes" formControlName="minutes" (blur)="touched()">
              <option [ngValue]="null">—</option>
              @for (minute of minutes; track minute) {
                <option [ngValue]="minute">{{ minute.toString().padStart(2, '0') }}</option>
              }
            </select>
          </div>
        </div>
        @if (parts.invalid) {
          <p class="error" role="alert">Usa horas enteras desde 0 y minutos entre 00 y 59.</p>
        }
        <div class="duration-foot">
          <small>{{ preview() || 'Sin duración' }} <span>· horas:minutos</span></small>
          @if (preview()) {
            <button type="button" class="clear" (click)="clear()">Quitar duración</button>
          }
        </div>
      }
    </fieldset>
  `,
  styleUrl: './duration-editor.scss',
})
export class DurationEditor implements ControlValueAccessor, Validator {
  readonly label = input('Duración');
  readonly parts = new FormGroup({
    hours: new FormControl<number | null>(null, [Validators.min(0), integral]),
    minutes: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(59),
      integral,
    ]),
  });
  readonly minutes = Array.from({ length: 60 }, (_, index) => index);
  readonly legacy = signal<string | null>(null);
  readonly preview = signal('');
  disabled = false;
  private changed: (value: string) => void = () => {};
  touched: () => void = () => {};
  private validateChanged: () => void = () => {};

  constructor() {
    this.parts.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const value = this.parts.valid ? formatDuration(this.parts.getRawValue()) : '';
      this.preview.set(value);
      this.changed(value);
      this.validateChanged();
    });
  }
  writeValue(value: unknown): void {
    const text = typeof value === 'string' ? value : '';
    const parts = parseDuration(text);
    this.legacy.set(parts === null ? text : null);
    this.parts.reset(parts ?? { hours: null, minutes: null }, { emitEvent: false });
    this.preview.set(parts ? formatDuration(parts) : '');
  }
  registerOnChange(callback: (value: string) => void): void {
    this.changed = callback;
  }
  registerOnTouched(callback: () => void): void {
    this.touched = callback;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) this.parts.disable({ emitEvent: false });
    else this.parts.enable({ emitEvent: false });
  }
  validate(): ValidationErrors | null {
    return this.legacy() === null && this.parts.invalid ? { duration: true } : null;
  }
  registerOnValidatorChange(callback: () => void): void {
    this.validateChanged = callback;
  }
  stepHours(delta: number): void {
    if (this.disabled) return;
    const current = this.parts.controls.hours.value ?? 0;
    this.parts.controls.hours.setValue(Math.max(0, current + delta));
    this.touched();
  }
  clear(): void {
    this.legacy.set(null);
    this.parts.reset({ hours: null, minutes: null });
    this.touched();
  }
  replaceLegacy(): void {
    this.legacy.set(null);
    this.parts.setValue({ hours: 0, minutes: 0 });
    this.touched();
  }
}
