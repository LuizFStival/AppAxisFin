import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from '@supabase/supabase-js';
import { mockUser } from '../../data/mockData';
import { profileRepository } from '../profile/profileRepository';
import { isSupabaseConfigured, supabase } from '../../lib/supabase/supabaseClient';
import { getUserFriendlyError } from '../../lib/utils/userFriendlyError';
import type { UserProfile } from '../../types';

interface UseAuthSessionOptions {
  loadFinance: () => Promise<void>;
  setAppError: Dispatch<SetStateAction<string>>;
}

export function useAuthSession({ loadFinance, setAppError }: UseAuthSessionOptions) {
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured);
  const [user, setUser] = useState<UserProfile>(mockUser);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const loadFinanceRef = useRef(loadFinance);

  useEffect(() => {
    loadFinanceRef.current = loadFinance;
  }, [loadFinance]);

  function hydrateUserProfile(sessionUser: User) {
    setUser({
      id: sessionUser.id,
      name: sessionUser.user_metadata.full_name ?? sessionUser.email ?? 'Usuário',
      email: sessionUser.email ?? '',
      plan: 'AxisFin',
      reimbursementsEnabled: false,
    });

    void profileRepository.getReimbursementsEnabled(sessionUser.id)
      .then((reimbursementsEnabled) => {
        setUser((current) => current.id === sessionUser.id
          ? { ...current, reimbursementsEnabled }
          : current);
      })
      .catch((error: unknown) => {
        setAppError(getUserFriendlyError(error, 'Não foi possível carregar suas preferências. Tente novamente.'));
      });
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      void loadFinanceRef.current();
      return;
    }

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          setAppError(getUserFriendlyError(error, 'Não foi possível verificar sua sessão. Entre novamente.'));
          setIsAuthLoading(false);
          return;
        }

        const sessionUser = data.session?.user;
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const queryParams = new URLSearchParams(window.location.search);
        const isRecoveryUrl = hashParams.get('type') === 'recovery' || queryParams.get('type') === 'recovery';

        if (sessionUser && !isRecoveryUrl) {
          hydrateUserProfile(sessionUser);
          setIsAuthenticated(true);
          void loadFinanceRef.current();
        } else if (sessionUser && isRecoveryUrl) {
          hydrateUserProfile(sessionUser);
          setIsPasswordRecovery(true);
          setIsAuthenticated(false);
        }
        setIsAuthLoading(false);
      })
      .catch((error: unknown) => {
        setAppError(getUserFriendlyError(error, 'Não foi possível verificar sua sessão. Entre novamente.'));
        setIsAuthLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUser = session?.user;
      if (event === 'PASSWORD_RECOVERY') {
        if (sessionUser) hydrateUserProfile(sessionUser);
        setIsPasswordRecovery(true);
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(Boolean(sessionUser));
      if (sessionUser) {
        setIsPasswordRecovery(false);
        hydrateUserProfile(sessionUser);
        void loadFinanceRef.current();
      }
    });

    return () => subscription.unsubscribe();
  }, [setAppError]);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setIsAuthenticated(false);
    setIsPasswordRecovery(false);
    setUser(mockUser);
  }

  function finishPasswordRecovery() {
    setIsPasswordRecovery(false);
    setIsAuthenticated(true);
    void loadFinanceRef.current();
  }

  async function updateAuthName(name: string) {
    if (!supabase) return;
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (error) throw error;
  }

  return {
    finishPasswordRecovery,
    isAuthenticated,
    isAuthLoading,
    isPasswordRecovery,
    setUser,
    signOut,
    updateAuthName,
    user,
  };
}
