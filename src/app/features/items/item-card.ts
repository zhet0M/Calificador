import { Component, computed, input, output, signal, effect } from '@angular/core';
import { ITEM_TYPES, ItemSummary } from '../../core/models/item.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './item-card.html',
  styleUrl: './item-card.scss',
})
export class ItemCard {
  readonly item = input.required<ItemSummary>();
  readonly photoUrl = input<string>();
  readonly photoError = output<void>();
  readonly imageFailed = signal(false);
  readonly label = computed(
    () => ITEM_TYPES.find((type) => type.value === this.item().tipo)?.singular ?? 'Historia',
  );
  readonly stars = computed(() => Math.min(5, Math.max(0, this.item().estrellas ?? 0)));
  readonly starSlots = [1, 2, 3, 4, 5];
  readonly score = computed(() => this.item().nota_final?.toFixed(1).replace('.', ',') ?? '—');

  constructor() {
    effect(() => {
      this.photoUrl();
      this.imageFailed.set(false);
    });
  }

  onImageError(): void {
    this.imageFailed.set(true);
    this.photoError.emit();
  }
}
