import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from '@supabase/supabase-js';
import { mockUser } from '../../data/mockData';
import { profileRepository } from '../profile/profileRepository';
import type { ProfilePreferences } from '../profile/profileRepository';
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

  function buildUserProfile(sessionUser: User, preferences?: ProfilePreferences): UserProfile {
    return {
      id: sessionUser.id,
      name: sessionUser.user_metadata.full_name ?? sessionUser.email ?? 'Usuário',
      email: sessionUser.email ?? '',
      plan: 'AxisFin',
      reimbursementsEnabled: preferences?.reimbursementsEnabled ?? false,
      savingsGoalMode: preferences?.savingsGoalMode ?? 'salary_percentage',
      savingsGoalAmount: preferences?.savingsGoalAmount ?? 0,
      savingsGoalPercentage: preferences?.savingsGoalPercentage ?? 20,
      includePendingSalary: preferences?.includePendingSalary ?? true,
      reportWidgets: preferences?.reportWidgets ?? ['income', 'expenses', 'savings_rate', 'average_expenses'],
    };
  }

  async function hydrateUserProfile(sessionUser: User) {
    try {
      const preferences = await profileRepository.getPreferences(sessionUser.id);
      const profile = buildUserProfile(sessionUser, preferences);
      setUser(profile);
      return profile;
    } catch (error: unknown) {
      setAppError(getUserFriendlyError(error, 'Não foi possível carregar suas preferências. Tente novamente.'));
      const fallbackProfile = buildUserProfile(sessionUser);
      setUser((current) => {
        if (current.id !== sessionUser.id) return fallbackProfile;

        return {
          ...fallbackProfile,
          reimbursementsEnabled: current.reimbursementsEnabled,
          savingsGoalMode: current.savingsGoalMode,
          savingsGoalAmount: current.savingsGoalAmount,
          savingsGoalPercentage: current.savingsGoalPercentage,
          includePendingSalary: current.includePendingSalary,
          reportWidgets: current.reportWidgets,
        };
      });
      return fallbackProfile;
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      void loadFinanceRef.current();
      return;
    }

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
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
          await hydrateUserProfile(sessionUser);
          setIsAuthenticated(true);
          await loadFinanceRef.current();
        } else if (sessionUser && isRecoveryUrl) {
          await hydrateUserProfile(sessionUser);
          setIsPasswordRecovery(true);
          setIsAuthenticated(false);
        }
        setIsAuthLoading(false);
      } catch (error: unknown) {
        setAppError(getUserFriendlyError(error, 'Não foi possível verificar sua sessão. Entre novamente.'));
        setIsAuthLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;

      const sessionUser = session?.user;
      if (event === 'PASSWORD_RECOVERY') {
        void (async () => {
          if (sessionUser) await hydrateUserProfile(sessionUser);
          setIsPasswordRecovery(true);
          setIsAuthenticated(false);
        })();
        return;
      }

      if (!sessionUser) {
        setIsAuthenticated(false);
        setIsPasswordRecovery(false);
        return;
      }

      void (async () => {
        setIsPasswordRecovery(false);
        await hydrateUserProfile(sessionUser);
        setIsAuthenticated(true);
        await loadFinanceRef.current();
      })();
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
