import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import { DuplicateNameError, hasDuplicateName, isPostgresUniqueViolation } from '../../lib/utils/validation';
import { ReserveBox, ReserveBoxMovement, ReserveBoxMovementType } from '../../types';
import {
  assertCurrentUserId,
  isMissingRemoteSchemaError,
  loadFinanceSnapshot,
  mapReserveBox,
  mapReserveBoxMovement,
} from '../finance/financeStore';

const reserveBoxFields = 'id, name, institution, cdi_percent, initial_balance, current_balance, created_on, goal, color, icon, last_balance_update, is_active';
const reserveBoxMovementFields = 'id, reserve_box_id, account_id, movement_type, amount, movement_date, description, created_at';

function reserveBoxesUnavailableError() {
  const error = new Error('A seção Caixinhas ainda precisa da atualização do banco no Supabase para salvar dados.');
  error.name = 'UserFacingError';
  return error;
}

export const reserveBoxRepository = {
  async list() {
    const snapshot = await loadFinanceSnapshot();
    return snapshot.reserveBoxes;
  },

  async create(input: {
    name: string;
    institution: string;
    cdiPercent: number;
    initialBalance: number;
    createdOn: string;
    goal?: string;
    color: string;
    icon: string;
  }): Promise<ReserveBox> {
    const trimmedName = input.name.trim();
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data: existingBoxes, error: existingError } = await client
      .from('reserve_boxes')
      .select('name')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (isMissingRemoteSchemaError(existingError, ['reserve_boxes'])) throw reserveBoxesUnavailableError();
    if (existingError) throw existingError;
    if (hasDuplicateName(trimmedName, (existingBoxes ?? []).map((box) => box.name))) {
      throw new DuplicateNameError('caixinha');
    }

    const { data, error } = await client
      .from('reserve_boxes')
      .insert({
        user_id: userId,
        name: trimmedName,
        institution: input.institution.trim() || 'Outro',
        cdi_percent: input.cdiPercent,
        initial_balance: input.initialBalance,
        current_balance: input.initialBalance,
        created_on: input.createdOn,
        goal: input.goal?.trim() || null,
        color: input.color,
        icon: input.icon,
        last_balance_update: input.createdOn,
        is_active: true,
      })
      .select(reserveBoxFields)
      .single();

    if (error) {
      if (isMissingRemoteSchemaError(error, ['reserve_boxes'])) throw reserveBoxesUnavailableError();
      if (isPostgresUniqueViolation(error)) throw new DuplicateNameError('caixinha');
      throw error;
    }

    return mapReserveBox(data);
  },

  async addMovement(input: {
    reserveBoxId: string;
    type: ReserveBoxMovementType;
    amount: number;
    date: string;
    description?: string;
    accountId?: string;
  }): Promise<{ box: ReserveBox; movement: ReserveBoxMovement }> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { data: movementData, error: movementError } = await client
      .from('reserve_box_movements')
      .insert({
        user_id: userId,
        reserve_box_id: input.reserveBoxId,
        account_id: input.accountId ?? null,
        movement_type: input.type,
        amount: input.amount,
        movement_date: input.date,
        description: input.description?.trim() || null,
      })
      .select(reserveBoxMovementFields)
      .single();

    if (isMissingRemoteSchemaError(movementError, ['reserve_box_movements', 'account_id'])) throw reserveBoxesUnavailableError();
    if (movementError) throw movementError;

    const { data: boxData, error: boxError } = await client
      .from('reserve_boxes')
      .select(reserveBoxFields)
      .eq('id', input.reserveBoxId)
      .eq('user_id', userId)
      .single();

    if (isMissingRemoteSchemaError(boxError, ['reserve_boxes'])) throw reserveBoxesUnavailableError();
    if (boxError) throw boxError;

    return {
      box: mapReserveBox(boxData),
      movement: mapReserveBoxMovement(movementData),
    };
  },
};
