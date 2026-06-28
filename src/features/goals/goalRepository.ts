import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import { Goal } from '../../types';
import { assertCurrentUserId } from '../finance/financeStore';

type GoalRow = {
  id: string;
  name: string;
  target_amount: number | string;
  current_amount: number | string;
  target_date: string | null;
  category_id: string | null;
  image_path: string | null;
  color: string;
  status: Goal['status'];
};

async function mapGoal(row: GoalRow): Promise<Goal> {
  const client = assertSupabaseConfigured();
  let imageUrl: string | undefined;
  if (row.image_path) {
    const { data } = await client.storage.from('goal-images').createSignedUrl(row.image_path, 60 * 60);
    imageUrl = data?.signedUrl;
  }

  return {
    id: row.id,
    name: row.name,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    targetDate: row.target_date ?? undefined,
    categoryId: row.category_id ?? undefined,
    imagePath: row.image_path ?? undefined,
    imageUrl,
    color: row.color,
    status: row.status,
  };
}

const goalFields = 'id, name, target_amount, current_amount, target_date, category_id, image_path, color, status';

export const goalRepository = {
  async list(): Promise<Goal[]> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('goals')
      .select(goalFields)
      .eq('user_id', userId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return Promise.all((data ?? []).map((row) => mapGoal(row as GoalRow)));
  },

  async create(input: {
    name: string;
    targetAmount: number;
    targetDate?: string;
    categoryId?: string;
    image?: File;
    color: string;
  }): Promise<Goal> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    let imagePath: string | undefined;

    if (input.image) {
      const extension = input.image.name.split('.').pop()?.toLowerCase() || 'jpg';
      imagePath = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await client.storage
        .from('goal-images')
        .upload(imagePath, input.image, { contentType: input.image.type, upsert: false });
      if (uploadError) throw uploadError;
    }

    const { data, error } = await client
      .from('goals')
      .insert({
        user_id: userId,
        name: input.name.trim(),
        target_amount: input.targetAmount,
        target_date: input.targetDate || null,
        category_id: input.categoryId || null,
        image_path: imagePath ?? null,
        color: input.color,
      })
      .select(goalFields)
      .single();

    if (error) {
      if (imagePath) await client.storage.from('goal-images').remove([imagePath]);
      throw error;
    }
    return mapGoal(data as GoalRow);
  },

  async addMovement(goalId: string, amount: number): Promise<void> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error } = await client.from('goal_movements').insert({
      user_id: userId,
      goal_id: goalId,
      amount,
    });
    if (error) throw error;
  },

  async remove(goal: Goal): Promise<void> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error } = await client.from('goals').delete().eq('id', goal.id).eq('user_id', userId);
    if (error) throw error;
    if (goal.imagePath) await client.storage.from('goal-images').remove([goal.imagePath]);
  },
};
