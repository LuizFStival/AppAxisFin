import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import type { SavingsGoalMode } from '../../types';

export interface ProfilePreferences {
  reimbursementsEnabled: boolean;
  savingsGoalMode: SavingsGoalMode;
  savingsGoalAmount: number;
  savingsGoalPercentage: number;
  includePendingSalary: boolean;
}

export const profileRepository = {
  async getPreferences(userId: string): Promise<ProfilePreferences> {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('profiles')
      .select('reimbursements_enabled, savings_goal_mode, savings_goal_amount, savings_goal_percentage, include_pending_salary')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return {
      reimbursementsEnabled: Boolean(data.reimbursements_enabled),
      savingsGoalMode: data.savings_goal_mode === 'fixed' ? 'fixed' : 'salary_percentage',
      savingsGoalAmount: Number(data.savings_goal_amount ?? 0),
      savingsGoalPercentage: Number(data.savings_goal_percentage ?? 20),
      includePendingSalary: data.include_pending_salary !== false,
    };
  },

  async updateReimbursementsEnabled(userId: string, enabled: boolean): Promise<void> {
    const client = assertSupabaseConfigured();
    const { error } = await client
      .from('profiles')
      .update({ reimbursements_enabled: enabled })
      .eq('id', userId);

    if (error) throw error;
  },

  async updateSavingsGoal(userId: string, input: Omit<ProfilePreferences, 'reimbursementsEnabled'>): Promise<void> {
    const client = assertSupabaseConfigured();
    const { error } = await client
      .from('profiles')
      .update({
        savings_goal_mode: input.savingsGoalMode,
        savings_goal_amount: input.savingsGoalAmount,
        savings_goal_percentage: input.savingsGoalPercentage,
        include_pending_salary: input.includePendingSalary,
      })
      .eq('id', userId);

    if (error) throw error;
  },
};
