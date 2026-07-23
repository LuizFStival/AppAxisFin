import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import {
  assertCurrentUserId,
  mapAccount,
  mapTransaction,
} from '../finance/financeStore';
import { Account, Card, Transaction } from '../../types';
import { getExpenseSignedAmount } from '../../lib/utils/finance';
import { getVisibleNotes, readTransactionMeta, writeTransactionNotes } from '../../lib/utils/transactionMeta';
import { getCardInvoiceClosingMonth } from '../../lib/utils/cardInvoices';

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
    split_mode: transaction.splitMode ?? (transaction.isReimbursable ? 'third_party_full' : 'none'),
    personal_amount: transaction.personalAmount ?? null,
    reimbursement_amount: transaction.reimbursementAmount ?? null,
    reimbursement_person_id: transaction.isReimbursable ? transaction.reimbursementPersonId ?? null : null,
    reimbursement_status: transaction.isReimbursable ? transaction.reimbursementStatus ?? 'pending' : null,
    reimbursement_received_at: transaction.isReimbursable ? transaction.reimbursementReceivedAt ?? null : null,
    reimbursement_received_account_id: transaction.isReimbursable ? transaction.reimbursementReceivedAccountId ?? null : null,
  };
}

const transactionSelect = 'id, description, amount, flow, status, transaction_date, category_id, account_id, card_id, from_account_id, to_account_id, notes, is_reimbursable, split_mode, personal_amount, reimbursement_amount, reimbursement_person_id, reimbursement_status, reimbursement_received_at, reimbursement_received_account_id, created_at';

export const transactionRepository = {
  async payCardInvoice(input: {
    card: Card;
    accountId: string;
    paymentDate: string;
    amount: number;
    transactions: Transaction[];
  }): Promise<{ account: Account; transactions: Transaction[] }> {
    await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const items = input.transactions.map((transaction) => ({
      id: transaction.isProjected ? null : transaction.id,
      is_projected: Boolean(transaction.isProjected),
      description: transaction.description,
      amount: transaction.amount,
      signed_amount: getExpenseSignedAmount(transaction),
      flow: transaction.flow,
      transaction_date: transaction.date,
      invoice_period: getCardInvoiceClosingMonth(input.card, transaction.date),
      category_id: transaction.categoryId ?? null,
      notes: transaction.notes ?? null,
      is_reimbursable: transaction.isReimbursable ?? false,
      split_mode: transaction.splitMode ?? (transaction.isReimbursable ? 'third_party_full' : 'none'),
      personal_amount: transaction.personalAmount ?? null,
      reimbursement_amount: transaction.reimbursementAmount ?? null,
      reimbursement_person_id: transaction.reimbursementPersonId ?? null,
      reimbursement_status: transaction.isReimbursable ? transaction.reimbursementStatus ?? 'pending' : null,
      reimbursement_received_at: transaction.reimbursementReceivedAt ?? null,
      reimbursement_received_account_id: transaction.reimbursementReceivedAccountId ?? null,
      paid_notes: writeTransactionNotes(getVisibleNotes(transaction.notes), {
        ...readTransactionMeta(transaction.notes),
        paidAt: input.paymentDate,
        paidFromAccountId: input.accountId,
      }) ?? null,
    }));

    const { data, error } = await client.rpc('pay_card_invoice', {
      p_account_id: input.accountId,
      p_card_id: input.card.id,
      p_payment_date: input.paymentDate,
      p_expected_amount: input.amount,
      p_items: items,
    });

    if (error) throw error;
    if (!data?.account || !Array.isArray(data.transactions)) {
      throw new Error('O pagamento foi processado, mas a resposta do banco veio incompleta. Recarregue os dados.');
    }

    return {
      account: mapAccount(data.account),
      transactions: data.transactions.map(mapTransaction),
    };
  },

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
