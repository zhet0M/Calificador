import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionState = signal<Session | null>(null);
  private readonly initializedState = signal(false);
  private readonly configurationErrorState = signal(false);

  readonly session = this.sessionState.asReadonly();
  readonly initialized = this.initializedState.asReadonly();
  readonly configurationError = this.configurationErrorState.asReadonly();
  readonly user = computed(() => this.session()?.user ?? null);
  readonly ready = this.initialize();

  hasSession(): boolean {
    const session = this.session();
    return !!session && !!session.expires_at && session.expires_at * 1000 > Date.now();
  }

  private async initialize(): Promise<void> {
    try {
      const client = this.supabase.client;
      let revision = 0;
      // Keep this callback synchronous: SDK auth calls here can deadlock.
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        revision++;
        this.sessionState.set(session);
      });
      this.destroyRef.onDestroy(() => data.subscription.unsubscribe());
      const initialRevision = revision;
      const { data: restored, error } = await client.auth.getSession();
      if (revision === initialRevision) {
        this.sessionState.set(error ? null : restored.session);
      }
    } catch {
      this.sessionState.set(null);
      this.configurationErrorState.set(true);
    } finally {
      this.initializedState.set(true);
    }
  }

  async signIn(email: string, password: string): Promise<boolean> {
    await this.ready;
    try {
      const { data, error } = await this.supabase.client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.session) return false;
      this.sessionState.set(data.session);
      return true;
    } catch {
      return false;
    }
  }

  async signOut(): Promise<boolean> {
    await this.ready;
    try {
      const { error } = await this.supabase.client.auth.signOut({ scope: 'local' });
      if (error) return false;
      this.sessionState.set(null);
      return true;
    } catch {
      return false;
    }
  }
}
