import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import type { ReportWidgetId, SavingsGoalMode } from '../../types';

const defaultReportWidgets: ReportWidgetId[] = ['income', 'expenses', 'savings_rate', 'average_expenses'];
const validReportWidgets = new Set<ReportWidgetId>(defaultReportWidgets);

function sanitizeReportWidgets(value: unknown): ReportWidgetId[] {
  if (!Array.isArray(value)) return defaultReportWidgets;
  return value.filter((item): item is ReportWidgetId =>
    typeof item === 'string' && validReportWidgets.has(item as ReportWidgetId),
  ).filter((item, index, items) => items.indexOf(item) === index);
}

export interface ProfilePreferences {
  reimbursementsEnabled: boolean;
  savingsGoalMode: SavingsGoalMode;
  savingsGoalAmount: number;
  savingsGoalPercentage: number;
  includePendingSalary: boolean;
  reportWidgets: ReportWidgetId[];
}

export const profileRepository = {
  async getPreferences(userId: string): Promise<ProfilePreferences> {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('profiles')
      .select('reimbursements_enabled, savings_goal_mode, savings_goal_amount, savings_goal_percentage, include_pending_salary, report_widgets')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return {
      reimbursementsEnabled: Boolean(data.reimbursements_enabled),
      savingsGoalMode: data.savings_goal_mode === 'fixed' ? 'fixed' : 'salary_percentage',
      savingsGoalAmount: Number(data.savings_goal_amount ?? 0),
      savingsGoalPercentage: Number(data.savings_goal_percentage ?? 20),
      includePendingSalary: data.include_pending_salary !== false,
      reportWidgets: sanitizeReportWidgets(data.report_widgets),
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

  async updateSavingsGoal(userId: string, input: Pick<ProfilePreferences, 'savingsGoalMode' | 'savingsGoalAmount' | 'savingsGoalPercentage' | 'includePendingSalary'>): Promise<void> {
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

  async updateReportWidgets(userId: string, reportWidgets: ReportWidgetId[]): Promise<void> {
    const client = assertSupabaseConfigured();
    const { error } = await client.from('profiles').update({ report_widgets: sanitizeReportWidgets(reportWidgets) }).eq('id', userId);
    if (error) throw error;
  },
};
