import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { routes } from '../../app.routes';
import { AuthService } from '../services/auth.service';

describe('Private routes', () => {
  function setup(signedIn: boolean, ready = Promise.resolve()) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            ready,
            hasSession: () => signedIn,
            configurationError: signal(false),
            session: signal(signedIn ? {} : null),
            user: signal({ email: 'journal@example.test' }),
            signIn: vi.fn().mockResolvedValue(false),
          },
        },
      ],
    });
  }

  it('redirects anonymous visits to /items to /login', async () => {
    setup(false);
    const harness = await RouterTestingHarness.create('/items');
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.textContent).toContain('Vuelve a tu journal');
    expect(harness.routeNativeElement?.textContent).not.toContain('Sesión iniciada');
  });

  it.each(['/items/new', '/items/00000000-0000-4000-8000-000000000001/edit'])(
    'protects the editor route %s',
    async (path) => {
      setup(false);
      await RouterTestingHarness.create(path);
      expect(TestBed.inject(Router).url).toBe('/login');
    },
  );

  it('redirects signed-in visits to /login to /items', async () => {
    setup(true);
    await RouterTestingHarness.create('/login');
    expect(TestBed.inject(Router).url).toBe('/items');
  });

  it('protects unknown routes too', async () => {
    setup(false);
    await RouterTestingHarness.create('/unknown');
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('waits for session restoration before showing private content', async () => {
    let resolve!: () => void;
    setup(
      true,
      new Promise<void>((done) => {
        resolve = done;
      }),
    );
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/items');
    await Promise.resolve();
    expect(harness.routeNativeElement?.textContent ?? '').not.toContain('Sesión iniciada');
    resolve();
    await navigation;
    expect(TestBed.inject(Router).url).toBe('/items');
  });
});
