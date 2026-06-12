import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import {
  assertCurrentUserId,
  mapTransaction,
} from '../finance/financeStore';
import { Transaction } from '../../types';

function toTransactionInsert(userId: string, transaction: Omit<Transaction, 'id'>) {
  return {
    user_id: userId,
    description: transaction.description,
    amount: transaction.amount,
    flow: transaction.flow,
    status: transaction.status,
    transaction_date: transaction.date,
    category_id: transaction.categoryId ?? null,
    account_id: transaction.accountId ?? null,
    card_id: transaction.cardId ?? null,
    from_account_id: transaction.fromAccountId ?? null,
    to_account_id: transaction.toAccountId ?? null,
    notes: transaction.notes ?? null,
  };
}

export const transactionRepository = {
  async create(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('transactions')
      .insert(toTransactionInsert(userId, transaction))
      .select('id, description, amount, flow, status, transaction_date, category_id, account_id, card_id, from_account_id, to_account_id, notes')
      .single();

    if (error) throw error;
    return mapTransaction(data);
  },

  async updateStatus(id: string, status: Transaction['status']): Promise<void> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error } = await client.from('transactions').update({ status }).eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },

  async update(id: string, transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('transactions')
      .update(toTransactionInsert(userId, transaction))
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, description, amount, flow, status, transaction_date, category_id, account_id, card_id, from_account_id, to_account_id, notes')
      .single();

    if (error) throw error;
    return mapTransaction(data);
  },

  async remove(id: string): Promise<void> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error } = await client.from('transactions').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
};
