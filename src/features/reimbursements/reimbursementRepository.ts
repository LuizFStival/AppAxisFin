import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import { ReimbursementPerson } from '../../types';
import { assertCurrentUserId, mapReimbursementPerson } from '../finance/financeStore';

export const reimbursementRepository = {
  async createPerson(input: Omit<ReimbursementPerson, 'id'>): Promise<ReimbursementPerson> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('reimbursement_people')
      .insert({
        user_id: userId,
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        notes: input.notes?.trim() || null,
      })
      .select('id, name, phone, notes')
      .single();

    if (error) throw error;
    return mapReimbursementPerson(data);
  },
};
