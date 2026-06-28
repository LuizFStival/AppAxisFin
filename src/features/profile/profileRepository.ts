import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';

export const profileRepository = {
  async getReimbursementsEnabled(userId: string): Promise<boolean> {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('profiles')
      .select('reimbursements_enabled')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return Boolean(data.reimbursements_enabled);
  },

  async updateReimbursementsEnabled(userId: string, enabled: boolean): Promise<void> {
    const client = assertSupabaseConfigured();
    const { error } = await client
      .from('profiles')
      .update({ reimbursements_enabled: enabled })
      .eq('id', userId);

    if (error) throw error;
  },
};
