import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import type { Budget } from '../../types';
import { assertCurrentUserId } from '../finance/financeStore';

type BudgetRow = {
  id: string;
  category_id: string;
  period: string;
  limit_amount: number | string;
};

function mapBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    period: row.period,
    limitAmount: Number(row.limit_amount),
  };
}

const fields = 'id, category_id, period, limit_amount';

export const budgetRepository = {
  async list(period: string): Promise<Budget[]> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('budgets')
      .select(fields)
      .eq('user_id', userId)
      .eq('period', period)
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map((row) => mapBudget(row as BudgetRow));
  },

  async savePeriod(period: string, limits: Record<string, number>): Promise<Budget[]> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const entries = Object.entries(limits);
    const activeEntries = entries.filter(([, amount]) => amount > 0);
    const removedCategoryIds = entries.filter(([, amount]) => amount <= 0).map(([categoryId]) => categoryId);

    if (activeEntries.length > 0) {
      const { error } = await client.from('budgets').upsert(
        activeEntries.map(([categoryId, limitAmount]) => ({
          user_id: userId,
          category_id: categoryId,
          period,
          limit_amount: limitAmount,
          alert_percent: 70,
        })),
        { onConflict: 'user_id,category_id,period' },
      );
      if (error) throw error;
    }

    if (removedCategoryIds.length > 0) {
      const { error } = await client
        .from('budgets')
        .delete()
        .eq('user_id', userId)
        .eq('period', period)
        .in('category_id', removedCategoryIds);
      if (error) throw error;
    }

    return this.list(period);
  },
};
