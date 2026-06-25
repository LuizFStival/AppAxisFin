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
    is_reimbursable: transaction.isReimbursable ?? false,
    reimbursement_person_id: transaction.isReimbursable ? transaction.reimbursementPersonId ?? null : null,
    reimbursement_status: transaction.isReimbursable ? transaction.reimbursementStatus ?? 'pending' : null,
    reimbursement_received_at: transaction.isReimbursable ? transaction.reimbursementReceivedAt ?? null : null,
    reimbursement_received_account_id: transaction.isReimbursable ? transaction.reimbursementReceivedAccountId ?? null : null,
  };
}

const transactionSelect = 'id, description, amount, flow, status, transaction_date, category_id, account_id, card_id, from_account_id, to_account_id, notes, is_reimbursable, reimbursement_person_id, reimbursement_status, reimbursement_received_at, reimbursement_received_account_id, created_at';

export const transactionRepository = {
  async create(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('transactions')
      .insert(toTransactionInsert(userId, transaction))
      .select(transactionSelect)
      .single();

    if (error) throw error;
    return mapTransaction(data);
  },

  async createMany(transactions: Array<Omit<Transaction, 'id'>>): Promise<Transaction[]> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('transactions')
      .insert(transactions.map((transaction) => toTransactionInsert(userId, transaction)))
      .select(transactionSelect)
      .order('transaction_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapTransaction);
  },

  async updateStatus(id: string, status: Transaction['status']): Promise<void> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error } = await client.from('transactions').update({ status }).eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },

  async updateManyStatus(ids: string[], status: Transaction['status']): Promise<void> {
    if (ids.length === 0) return;
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error } = await client.from('transactions').update({ status }).eq('user_id', userId).in('id', ids);
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
      .select(transactionSelect)
      .single();

    if (error) throw error;
    return mapTransaction(data);
  },

  async updateMany(transactions: Transaction[]): Promise<Transaction[]> {
    const saved: Transaction[] = [];
    for (const transaction of transactions) {
      const { id, ...input } = transaction;
      saved.push(await this.update(id, input));
    }
    return saved;
  },

  async remove(id: string): Promise<void> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error } = await client.from('transactions').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },

  async removeMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error } = await client.from('transactions').delete().eq('user_id', userId).in('id', ids);
    if (error) throw error;
  },

  async removeByCard(cardId: string): Promise<void> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error } = await client.from('transactions').delete().eq('user_id', userId).eq('card_id', cardId);
    if (error) throw error;
  },
};
