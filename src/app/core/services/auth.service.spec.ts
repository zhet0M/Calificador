import { TestBed } from '@angular/core/testing';
import { Session } from '@supabase/supabase-js';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export const testSession = {
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'test-user', email: 'journal@example.test' },
} as Session;

describe('AuthService', () => {
  let listener: (event: string, session: Session | null) => void;
  let client: {
    auth: {
      onAuthStateChange: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
      signInWithPassword: ReturnType<typeof vi.fn>;
      signOut: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    client = {
      auth: {
        onAuthStateChange: vi.fn((callback) => {
          listener = callback;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        getSession: vi.fn().mockResolvedValue({ data: { session: testSession }, error: null }),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
      },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: { client } }],
    });
  });

  it('restores the SDK session before deciding access', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.ready;
    expect(auth.initialized()).toBe(true);
    expect(auth.hasSession()).toBe(true);
    expect(auth.user()?.id).toBe('test-user');
  });

  it('tracks signout from another tab', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.ready;
    listener('SIGNED_OUT', null);
    expect(auth.hasSession()).toBe(false);
  });

  it('does not overwrite a newer auth event with an old restore result', async () => {
    let restore!: (result: unknown) => void;
    client.auth.getSession.mockReturnValue(
      new Promise((resolve) => {
        restore = resolve;
      }),
    );
    const auth = TestBed.inject(AuthService);
    listener('SIGNED_OUT', null);
    restore({ data: { session: testSession }, error: null });
    await auth.ready;
    expect(auth.session()).toBeNull();
  });

  it('rejects expired sessions for route access', async () => {
    client.auth.getSession.mockResolvedValue({
      data: { session: { ...testSession, expires_at: 1 } },
      error: null,
    });
    const auth = TestBed.inject(AuthService);
    await auth.ready;
    expect(auth.hasSession()).toBe(false);
  });

  it('signs in with email and password and hides SDK errors', async () => {
    const auth = TestBed.inject(AuthService);
    client.auth.signInWithPassword.mockResolvedValue({
      data: { session: testSession },
      error: null,
    });
    expect(await auth.signIn(' journal@example.test ', 'password')).toBe(true);
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'journal@example.test',
      password: 'password',
    });
    client.auth.signInWithPassword.mockRejectedValue(new Error('internal details'));
    expect(await auth.signIn('journal@example.test', 'wrong')).toBe(false);
  });

  it('only clears state after successful SDK logout', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.ready;
    client.auth.signOut.mockResolvedValue({ error: new Error('offline') });
    expect(await auth.signOut()).toBe(false);
    expect(auth.hasSession()).toBe(true);
    client.auth.signOut.mockResolvedValue({ error: null });
    expect(await auth.signOut()).toBe(true);
    expect(auth.session()).toBeNull();
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('fails closed if session initialization fails', async () => {
    client.auth.getSession.mockRejectedValue(new Error('offline'));
    const auth = TestBed.inject(AuthService);
    await auth.ready;
    expect(auth.initialized()).toBe(true);
    expect(auth.hasSession()).toBe(false);
    expect(auth.configurationError()).toBe(true);
  });
});
