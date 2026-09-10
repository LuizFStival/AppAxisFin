import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import { Commitment } from '../../types';
import { assertCurrentUserId } from '../finance/financeStore';

type CommitmentRow = {
  id: string;
  name: string;
  total_value: number | string;
  my_share_percent: number | string;
  partner_person_id: string | null;
  monthly_amount: number | string | null;
  installment_count: number | null;
  start_date: string | null;
  paid_amount: number | string;
  color: string;
  status: Commitment['status'];
};

const commitmentFields = 'id, name, total_value, my_share_percent, partner_person_id, monthly_amount, installment_count, start_date, paid_amount, color, status';

function mapCommitment(row: CommitmentRow): Commitment {
  return {
    id: row.id,
    name: row.name,
    totalValue: Number(row.total_value),
    mySharePercent: Number(row.my_share_percent),
    partnerPersonId: row.partner_person_id ?? undefined,
    monthlyAmount: row.monthly_amount == null ? undefined : Number(row.monthly_amount),
    installmentCount: row.installment_count ?? undefined,
    startDate: row.start_date ?? undefined,
    paidAmount: Number(row.paid_amount),
    color: row.color,
    status: row.status,
  };
}

export const commitmentRepository = {
  async list(): Promise<Commitment[]> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('commitments')
      .select(commitmentFields)
      .eq('user_id', userId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapCommitment(row as CommitmentRow));
  },

  async create(input: {
    name: string;
    totalValue: number;
    mySharePercent: number;
    partnerPersonId?: string;
    monthlyAmount?: number;
    installmentCount?: number;
    startDate?: string;
    paidAmount?: number;
    color: string;
  }): Promise<Commitment> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('commitments')
      .insert({
        user_id: userId,
        name: input.name.trim(),
        total_value: input.totalValue,
        my_share_percent: input.mySharePercent,
        partner_person_id: input.partnerPersonId || null,
        monthly_amount: input.monthlyAmount ?? null,
        installment_count: input.installmentCount ?? null,
        start_date: input.startDate || null,
        paid_amount: input.paidAmount ?? 0,
        color: input.color,
      })
      .select(commitmentFields)
      .single();
    if (error) throw error;
    return mapCommitment(data as CommitmentRow);
  },

  async remove(commitment: Commitment): Promise<void> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error } = await client
      .from('commitments')
      .delete()
      .eq('id', commitment.id)
      .eq('user_id', userId);
    if (error) throw error;
  },
};
