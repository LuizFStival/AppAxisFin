import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isSecretKey = typeof supabaseAnonKey === 'string' && supabaseAnonKey.startsWith('sb_secret_');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && !isSecretKey);
export const hasSupabaseSecretKeyInClient = isSecretKey;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
        storageKey: 'axisfin.auth.session',
      },
    })
  : null;

export function assertSupabaseConfigured() {
  if (hasSupabaseSecretKeyInClient) {
    throw new Error('A Vercel esta usando uma chave secreta do Supabase. Troque VITE_SUPABASE_ANON_KEY por uma chave publica anon ou publishable.');
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase ainda nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
}
