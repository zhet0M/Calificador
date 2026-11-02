import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private instance?: SupabaseClient;

  readonly isConfigured =
    environment.supabaseUrl.startsWith('https://') &&
    !environment.supabaseUrl.includes('TU-PROYECTO') &&
    environment.supabasePublishableKey.length > 0 &&
    environment.supabasePublishableKey !== 'TU-ANON-O-PUBLISHABLE-KEY';

  get client(): SupabaseClient {
    if (!this.isConfigured) {
      throw new Error('Falta configurar Supabase en el environment activo.');
    }

    if (environment.supabasePublishableKey.startsWith('sb_secret_')) {
      throw new Error('Usa exclusivamente una clave publica de Supabase.');
    }

    this.instance ??= createClient(environment.supabaseUrl, environment.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });

    return this.instance;
  }
}
