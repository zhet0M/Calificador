import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { vi } from 'vitest';
import { App } from './app';
import { AuthService } from './core/services/auth.service';

describe('App session changes', () => {
  it('redirects to login when the SDK removes the active session', async () => {
    const session = signal<Session | null>({} as Session);
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { session, initialized: signal(true) } },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(navigate).not.toHaveBeenCalled();
    session.set(null);
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });
});
