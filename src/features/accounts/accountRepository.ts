import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import { DuplicateNameError, hasDuplicateName, isPostgresUniqueViolation } from '../../lib/utils/validation';
import { Account, AccountType } from '../../types';
import {
  assertCurrentUserId,
  loadFinanceSnapshot,
  mapAccount,
} from '../finance/financeStore';

export const accountRepository = {
  async list() {
    const snapshot = await loadFinanceSnapshot();
    return snapshot.accounts;
  },

  async create(input: {
    name: string;
    type: AccountType;
    institution?: string;
    balance: number;
    color: string;
  }): Promise<Account> {
    const trimmedName = input.name.trim();
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data: existingAccounts, error: existingError } = await client
      .from('accounts')
      .select('name')
      .eq('user_id', userId);

    if (existingError) throw existingError;

    if (hasDuplicateName(trimmedName, (existingAccounts ?? []).map((account) => account.name))) {
      throw new DuplicateNameError('conta');
    }

    const { data, error } = await client
      .from('accounts')
      .insert({
        user_id: userId,
        name: trimmedName,
        type: input.type,
        institution: input.institution?.trim() || trimmedName,
        balance: input.balance,
        color: input.color,
      })
      .select('id, name, type, institution, balance, color')
      .single();

    if (error) {
      if (isPostgresUniqueViolation(error)) throw new DuplicateNameError('conta');
      throw error;
    }

    return mapAccount(data);
  },

  async update(id: string, input: {
    name: string;
    type: AccountType;
    institution?: string;
    balance: number;
    color: string;
    originalName?: string;
  }): Promise<Account> {
    const trimmedName = input.name.trim();
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data: existingAccounts, error: existingError } = await client
      .from('accounts')
      .select('name')
      .eq('user_id', userId);

    if (existingError) throw existingError;

    if (hasDuplicateName(trimmedName, (existingAccounts ?? []).map((account) => account.name), input.originalName)) {
      throw new DuplicateNameError('conta');
    }

    const { data, error } = await client
      .from('accounts')
      .update({
        name: trimmedName,
        type: input.type,
        institution: input.institution?.trim() || trimmedName,
        balance: input.balance,
        color: input.color,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, name, type, institution, balance, color')
      .single();

    if (error) {
      if (isPostgresUniqueViolation(error)) throw new DuplicateNameError('conta');
      throw error;
    }

    return mapAccount(data);
  },

  async updateBalance(id: string, balance: number): Promise<Account> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('accounts')
      .update({ balance })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, name, type, institution, balance, color')
      .single();

    if (error) throw error;
    return mapAccount(data);
  },

  async remove(id: string): Promise<void> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { count, error: countError } = await client
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .or(`account_id.eq.${id},from_account_id.eq.${id},to_account_id.eq.${id}`);

    if (countError) throw countError;
    if (count) throw new Error('Não é possível excluir uma conta com lançamentos vinculados.');

    const { error } = await client.from('accounts').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
};
