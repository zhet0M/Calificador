import { CanDeactivateFn } from '@angular/router';

export const unsavedItemGuard: CanDeactivateFn<{ canLeave(): boolean }> = (component) =>
  component.canLeave();
