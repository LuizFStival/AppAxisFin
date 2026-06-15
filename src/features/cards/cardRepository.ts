import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import { DuplicateNameError, hasDuplicateName, isPostgresUniqueViolation } from '../../lib/utils/validation';
import { Card, CardNetwork } from '../../types';
import {
  assertCurrentUserId,
  loadFinanceSnapshot,
  mapCard,
} from '../finance/financeStore';

export const cardRepository = {
  async list() {
    const snapshot = await loadFinanceSnapshot();
    return snapshot.cards;
  },

  async create(input: {
    name: string;
    accountId?: string;
    limit: number;
    closingDay: number;
    dueDay: number;
    color: string;
    network: CardNetwork;
  }): Promise<Card> {
    const trimmedName = input.name.trim();
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data: existingCards, error: existingError } = await client
      .from('cards')
      .select('name')
      .eq('user_id', userId);

    if (existingError) throw existingError;

    if (hasDuplicateName(trimmedName, (existingCards ?? []).map((card) => card.name))) {
      throw new DuplicateNameError('cartao');
    }

    const { data, error } = await client
      .from('cards')
      .insert({
        user_id: userId,
        name: trimmedName,
        account_id: input.accountId ?? null,
        credit_limit: input.limit,
        closing_day: input.closingDay,
        due_day: input.dueDay,
        color: input.color,
        network: input.network,
      })
      .select('id, name, account_id, network, credit_limit, closing_day, due_day, color')
      .single();

    if (error) {
      if (isPostgresUniqueViolation(error)) throw new DuplicateNameError('cartao');
      throw error;
    }

    return mapCard(data);
  },

  async update(id: string, input: {
    name: string;
    accountId?: string;
    limit: number;
    closingDay: number;
    dueDay: number;
    color: string;
    network: CardNetwork;
    originalName?: string;
  }): Promise<Card> {
    const trimmedName = input.name.trim();
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data: existingCards, error: existingError } = await client
      .from('cards')
      .select('name')
      .eq('user_id', userId);

    if (existingError) throw existingError;

    if (hasDuplicateName(trimmedName, (existingCards ?? []).map((card) => card.name), input.originalName)) {
      throw new DuplicateNameError('cartao');
    }

    const { data, error } = await client
      .from('cards')
      .update({
        name: trimmedName,
        account_id: input.accountId ?? null,
        credit_limit: input.limit,
        closing_day: input.closingDay,
        due_day: input.dueDay,
        color: input.color,
        network: input.network,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, name, account_id, network, credit_limit, closing_day, due_day, color')
      .single();

    if (error) {
      if (isPostgresUniqueViolation(error)) throw new DuplicateNameError('cartao');
      throw error;
    }

    return mapCard(data);
  },

  async remove(id: string): Promise<void> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error: transactionsError } = await client
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .eq('card_id', id);

    if (transactionsError) throw transactionsError;
    const { error } = await client.from('cards').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
};
