import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import { RecurringTransaction, Transaction } from '../../types';
import { assertCurrentUserId, mapRecurringTransaction } from '../finance/financeStore';

function toRecurringInsert(userId: string, transaction: Omit<Transaction, 'id'>, endDate?: string) {
  const shouldUseCard = Boolean(transaction.cardId);
  return {
    user_id: userId,
    description: transaction.description,
    amount: transaction.amount,
    flow: transaction.flow === 'income' ? 'income' : 'expense',
    status: transaction.status,
    start_date: transaction.date,
    end_date: endDate ?? null,
    interval_months: 1,
    category_id: transaction.categoryId ?? null,
    account_id: shouldUseCard ? null : transaction.accountId ?? null,
    card_id: shouldUseCard ? transaction.cardId ?? null : null,
    notes: transaction.notes ?? null,
    is_reimbursable: transaction.isReimbursable ?? false,
    reimbursement_person_id: transaction.isReimbursable ? transaction.reimbursementPersonId ?? null : null,
    reimbursement_status: transaction.isReimbursable ? transaction.reimbursementStatus ?? 'pending' : null,
    is_active: true,
  };
}

const recurringSelect = 'id, description, amount, flow, status, start_date, end_date, interval_months, category_id, account_id, card_id, notes, is_reimbursable, reimbursement_person_id, reimbursement_status, is_active';

export const recurringRepository = {
  async createFromTransaction(transaction: Omit<Transaction, 'id'>, endDate?: string): Promise<RecurringTransaction> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('recurring_transactions')
      .insert(toRecurringInsert(userId, transaction, endDate))
      .select(recurringSelect)
      .single();

    if (error) throw error;
    return mapRecurringTransaction(data);
  },
};
