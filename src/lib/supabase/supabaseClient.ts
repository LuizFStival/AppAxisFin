import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isSecretKey = typeof supabaseAnonKey === 'string' && supabaseAnonKey.startsWith('sb_secret_');
const authStorageKey = 'axisfin.auth.session';
const authPersistencePreferenceKey = 'axisfin.auth.keep-connected';

export function getAuthPersistencePreference() {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(authPersistencePreferenceKey) !== 'false';
  } catch {
    return true;
  }
}

export function setAuthPersistencePreference(keepConnected: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(authPersistencePreferenceKey, String(keepConnected));
  } catch {
    // The session still works for the current tab when persistent storage is unavailable.
  }
}

function getAuthStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const selectedStorage = () => getAuthPersistencePreference() ? window.localStorage : window.sessionStorage;
    const alternateStorage = () => getAuthPersistencePreference() ? window.sessionStorage : window.localStorage;

    return {
      get length() {
        return selectedStorage().length;
      },
      clear() {
        selectedStorage().clear();
      },
      getItem(key: string) {
        return selectedStorage().getItem(key) ?? alternateStorage().getItem(key);
      },
      key(index: number) {
        return selectedStorage().key(index);
      },
      removeItem(key: string) {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      },
      setItem(key: string, value: string) {
        selectedStorage().setItem(key, value);
        alternateStorage().removeItem(key);
      },
    };
  } catch {
    return window.sessionStorage;
  }
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && !isSecretKey);
export const hasSupabaseSecretKeyInClient = isSecretKey;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: getAuthStorage(),
        storageKey: authStorageKey,
      },
    })
  : null;

export function assertSupabaseConfigured() {
  if (hasSupabaseSecretKeyInClient) {
    throw new Error('A Vercel está usando uma chave secreta do Supabase. Troque VITE_SUPABASE_ANON_KEY por uma chave pública anon ou publishable.');
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase ainda não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
}
