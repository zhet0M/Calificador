import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-icon-rating',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: ` <fieldset>
    <legend>
      {{ label() }}
      <small>{{ control().value === null ? 'Sin calificar' : control().value + '/5' }}</small>
    </legend>
    <div class="rating-options">
      @for (value of values; track value) {
        <label [class.filled]="value > 0 && value <= (control().value ?? 0)">
          <input
            type="radio"
            [name]="name()"
            [formControl]="control()"
            [value]="value"
            [attr.aria-label]="label() + ': ' + value + ' de 5'"
          />
          @if (value === 0) {
            <span class="zero" aria-hidden="true">0</span>
          } @else if (icon() === 'drop') {
            <svg viewBox="0 0 24 28" aria-hidden="true">
              <path d="M12 2C10 7 3 13 3 18a9 9 0 0 0 18 0c0-5-7-11-9-16Z" />
            </svg>
          } @else {
            <span aria-hidden="true">{{ icon() === 'heart' ? '♥' : '★' }}</span>
          }
        </label>
      }
    </div>
  </fieldset>`,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    fieldset {
      min-width: 0;
      border: 0;
      margin: 0;
      padding: 0.8rem 0;
    }
    legend {
      width: 100%;
      font-size: 0.9rem;
    }
    small {
      float: right;
      font:
        0.65rem 'Trebuchet MS',
        sans-serif;
    }
    .rating-options {
      display: flex;
      justify-content: space-between;
      gap: 0.25rem;
    }
    label {
      position: relative;
      display: grid;
      place-items: center;
      flex: 1;
      min-width: 0;
      height: 2.8rem;
      color: #bdad95;
      cursor: pointer;
      font-size: 1.7rem;
    }
    label.filled {
      color: var(--color-secondary);
    }
    input {
      position: absolute;
      inset: 0;
      opacity: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      cursor: pointer;
    }
    label:has(input:focus-visible) {
      outline: 3px solid var(--color-deep);
      outline-offset: 2px;
      border-radius: 0.4rem;
    }
    label:has(input:checked) .zero {
      background: var(--color-ink);
      color: #fffaf2;
    }
    .zero {
      display: grid;
      place-items: center;
      width: 1.5rem;
      height: 1.5rem;
      border: 1px solid #71423645;
      border-radius: 50%;
      font-size: 0.8rem;
    }
    svg {
      width: 1.4rem;
      height: 1.65rem;
      fill: currentColor;
    }
  `,
})
export class IconRating {
  readonly control = input.required<FormControl<number | null>>();
  readonly label = input.required<string>();
  readonly name = input.required<string>();
  readonly icon = input<'star' | 'heart' | 'drop'>('star');
  readonly values = [0, 1, 2, 3, 4, 5];
}
