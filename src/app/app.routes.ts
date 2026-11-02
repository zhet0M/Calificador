import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { unsavedItemGuard } from './core/guards/unsaved-item.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Entrar · Mi journal',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'items' },
      {
        path: 'items/new',
        title: 'Nueva ficha · Mi journal',
        canDeactivate: [unsavedItemGuard],
        loadComponent: () =>
          import('./features/items/editor/item-editor').then((m) => m.ItemEditor),
      },
      {
        path: 'items/:id/edit',
        title: 'Editar ficha · Mi journal',
        canDeactivate: [unsavedItemGuard],
        loadComponent: () =>
          import('./features/items/editor/item-editor').then((m) => m.ItemEditor),
      },
      {
        path: 'items',
        title: 'Mis historias · Mi journal',
        loadComponent: () => import('./features/items/items').then((m) => m.Items),
      },
      { path: '**', redirectTo: 'items' },
    ],
  },
];
