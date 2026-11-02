import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ItemsCollection } from './items-collection';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [ItemsCollection],
  templateUrl: './items.html',
  styleUrl: './items.scss',
})
export class Items {
  protected readonly auth = inject(AuthService);
  readonly busy = signal(false);
  readonly error = signal('');

  async signOut(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (!(await this.auth.signOut())) {
        this.error.set('No se pudo cerrar la sesión. Inténtalo de nuevo.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
