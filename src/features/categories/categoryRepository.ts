import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import { DuplicateNameError, hasDuplicateName, isPostgresUniqueViolation } from '../../lib/utils/validation';
import { Category } from '../../types';
import { assertCurrentUserId, loadFinanceSnapshot } from '../finance/financeStore';

type CategoryRow = {
  id: string;
  name: string;
  flow: Category['flow'];
  icon: string | null;
  color: string;
  is_system: boolean;
};

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    flow: row.flow,
    icon: row.icon ?? 'MoreHorizontal',
    color: row.color,
    isSystem: row.is_system,
  };
}

async function listByFlow(userId: string, flow: Category['flow']) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client.from('categories').select('name').eq('user_id', userId).eq('flow', flow);
  if (error) throw error;
  return (data ?? []).map((category) => category.name);
}

export const categoryRepository = {
  async list() {
    const snapshot = await loadFinanceSnapshot();
    return snapshot.categories;
  },

  async create(input: Omit<Category, 'id' | 'isSystem'>): Promise<Category> {
    const name = input.name.trim();
    const userId = await assertCurrentUserId();

    if (hasDuplicateName(name, await listByFlow(userId, input.flow))) {
      throw new DuplicateNameError('categoria');
    }

    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('categories')
      .insert({
        user_id: userId,
        name,
        flow: input.flow,
        icon: input.icon,
        color: input.color,
        is_system: false,
      })
      .select('id, name, flow, icon, color, is_system')
      .single();

    if (error) {
      if (isPostgresUniqueViolation(error)) throw new DuplicateNameError('categoria');
      throw error;
    }

    return mapCategory(data);
  },

  async update(id: string, input: Omit<Category, 'id' | 'isSystem'> & { originalName?: string }): Promise<Category> {
    const name = input.name.trim();
    const userId = await assertCurrentUserId();

    if (hasDuplicateName(name, await listByFlow(userId, input.flow), input.originalName)) {
      throw new DuplicateNameError('categoria');
    }

    const client = assertSupabaseConfigured();
    const { data, error } = await client
      .from('categories')
      .update({
        name,
        flow: input.flow,
        icon: input.icon,
        color: input.color,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, name, flow, icon, color, is_system')
      .single();

    if (error) {
      if (isPostgresUniqueViolation(error)) throw new DuplicateNameError('categoria');
      throw error;
    }

    return mapCategory(data);
  },

  async remove(id: string): Promise<void> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error } = await client.from('categories').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
};
