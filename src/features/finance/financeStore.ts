import { mockCategories, mockReserveBoxes } from '../../data/mockData';
import { assertSupabaseConfigured, supabase } from '../../lib/supabase/supabaseClient';
import { addMonths, formatLocalDate } from '../../lib/utils/date';
import { getCurrentMonthKey } from '../../lib/utils/finance';
import { readTransactionMeta, writeTransactionNotes } from '../../lib/utils/transactionMeta';
import { Account, Card, Category, FinanceSnapshot, RecurringTransaction, ReimbursementPerson, ReserveBox, ReserveBoxMovement, Transaction } from '../../types';

const starterCategoryPromises = new Map<string, Promise<void>>();
const starterReserveBoxPromises = new Map<string, Promise<boolean>>();
const emptyFinanceSnapshot: FinanceSnapshot = {
  accounts: [],
  cards: [],
  categories: [],
  reimbursementPeople: [],
  recurringTransactions: [],
  reserveBoxes: [],
  reserveBoxMovements: [],
  transactions: [],
};
const legacyStarterAccountNames = ['Carteira', 'Nubank', 'C6 Bank'];
const legacyStarterCardNames = ['Nu Crédito', 'Nu Credito', 'C6 Carbon'];

type AccountRow = {
  id: string;
  name: string;
  type: Account['type'];
  institution: string | null;
  balance: number | string;
  last_balance_update?: string | null;
  color: string;
  is_active?: boolean | null;
};

type CardRow = {
  id: string;
  name: string;
  account_id: string | null;
  network: Card['network'];
  credit_limit: number | string;
  closing_day: number;
  due_day: number;
  color: string;
  is_active?: boolean | null;
};

type CategoryRow = {
  id: string;
  name: string;
  flow: Category['flow'];
  icon: string | null;
  color: string;
  is_system?: boolean | null;
};

type TransactionRow = {
  id: string;
  description: string;
  amount: number | string;
  flow: Transaction['flow'];
  status: Transaction['status'];
  transaction_date: string;
  category_id: string | null;
  account_id: string | null;
  card_id: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  notes: string | null;
  is_reimbursable?: boolean | null;
  split_mode?: Transaction['splitMode'] | null;
  personal_amount?: number | string | null;
  reimbursement_amount?: number | string | null;
  reimbursement_person_id?: string | null;
  reimbursement_status?: Transaction['reimbursementStatus'] | null;
  reimbursement_received_at?: string | null;
  reimbursement_received_account_id?: string | null;
  created_at?: string | null;
};

type ReimbursementPersonRow = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
};

type RecurringTransactionRow = {
  id: string;
  description: string;
  amount: number | string;
  flow: RecurringTransaction['flow'];
  status: RecurringTransaction['status'];
  start_date: string;
  end_date: string | null;
  interval_months: number;
  category_id: string | null;
  account_id: string | null;
  card_id: string | null;
  notes: string | null;
  is_reimbursable?: boolean | null;
  split_mode?: RecurringTransaction['splitMode'] | null;
  personal_amount?: number | string | null;
  reimbursement_amount?: number | string | null;
  reimbursement_person_id?: string | null;
  reimbursement_status?: RecurringTransaction['reimbursementStatus'] | null;
  is_active: boolean;
};

type ReserveBoxRow = {
  id: string;
  name: string;
  institution: string;
  cdi_percent: number | string;
  initial_balance: number | string;
  current_balance: number | string;
  created_on: string;
  goal: string | null;
  color: string;
  icon: string;
  last_balance_update: string;
  is_active?: boolean | null;
};

type ReserveBoxMovementRow = {
  id: string;
  reserve_box_id: string;
  movement_type: ReserveBoxMovement['type'];
  amount: number | string;
  movement_date: string;
  description: string | null;
  created_at?: string | null;
};

function errorText(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const values = Object.values(error as Record<string, unknown>)
    .filter((value): value is string => typeof value === 'string');
  return values.join(' ').toLowerCase();
}

export function isMissingRemoteSchemaError(error: unknown, identifiers: string[]) {
  const text = errorText(error);
  return identifiers.some((identifier) => text.includes(identifier.toLowerCase()))
    && (
      text.includes('schema cache')
      || text.includes('could not find')
      || text.includes('does not exist')
      || text.includes('not found')
    );
}

export function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    institution: row.institution ?? row.name,
    balance: Number(row.balance),
    lastBalanceUpdate: row.last_balance_update ?? formatLocalDate(new Date()),
    color: row.color,
    isActive: row.is_active ?? true,
  };
}

export function mapCard(row: CardRow): Card {
  return {
    id: row.id,
    name: row.name,
    accountId: row.account_id ?? '',
    limit: Number(row.credit_limit),
    used: 0,
    dueDay: row.due_day,
    closingDay: row.closing_day,
    color: row.color,
    network: row.network,
    isActive: row.is_active ?? true,
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    flow: row.flow,
    icon: row.icon ?? 'MoreHorizontal',
    color: row.color,
    isSystem: Boolean(row.is_system),
  };
}

export function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    flow: row.flow,
    status: row.status,
    date: row.transaction_date,
    categoryId: row.category_id ?? undefined,
    accountId: row.account_id ?? undefined,
    cardId: row.card_id ?? undefined,
    fromAccountId: row.from_account_id ?? undefined,
    toAccountId: row.to_account_id ?? undefined,
    notes: row.notes ?? undefined,
    isReimbursable: Boolean(row.is_reimbursable),
    splitMode: row.split_mode ?? undefined,
    personalAmount: row.personal_amount == null ? undefined : Number(row.personal_amount),
    reimbursementAmount: row.reimbursement_amount == null ? undefined : Number(row.reimbursement_amount),
    reimbursementPersonId: row.reimbursement_person_id ?? undefined,
    reimbursementStatus: row.reimbursement_status ?? undefined,
    reimbursementReceivedAt: row.reimbursement_received_at ?? undefined,
    reimbursementReceivedAccountId: row.reimbursement_received_account_id ?? undefined,
    createdAt: row.created_at ?? undefined,
  };
}

export function mapRecurringTransaction(row: RecurringTransactionRow): RecurringTransaction {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    flow: row.flow,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    intervalMonths: row.interval_months,
    categoryId: row.category_id ?? undefined,
    accountId: row.account_id ?? undefined,
    cardId: row.card_id ?? undefined,
    notes: row.notes ?? undefined,
    isReimbursable: Boolean(row.is_reimbursable),
    splitMode: row.split_mode ?? undefined,
    personalAmount: row.personal_amount == null ? undefined : Number(row.personal_amount),
    reimbursementAmount: row.reimbursement_amount == null ? undefined : Number(row.reimbursement_amount),
    reimbursementPersonId: row.reimbursement_person_id ?? undefined,
    reimbursementStatus: row.reimbursement_status ?? undefined,
    isActive: row.is_active,
  };
}

export function mapReimbursementPerson(row: ReimbursementPersonRow): ReimbursementPerson {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function mapReserveBox(row: ReserveBoxRow): ReserveBox {
  return {
    id: row.id,
    name: row.name,
    institution: row.institution,
    cdiPercent: Number(row.cdi_percent),
    initialBalance: Number(row.initial_balance),
    currentBalance: Number(row.current_balance),
    createdOn: row.created_on,
    goal: row.goal ?? undefined,
    color: row.color,
    icon: row.icon,
    lastBalanceUpdate: row.last_balance_update,
    isActive: row.is_active ?? true,
  };
}

export function mapReserveBoxMovement(row: ReserveBoxMovementRow): ReserveBoxMovement {
  return {
    id: row.id,
    reserveBoxId: row.reserve_box_id,
    type: row.movement_type,
    amount: Number(row.amount),
    date: row.movement_date,
    description: row.description ?? undefined,
    createdAt: row.created_at ?? undefined,
  };
}

function getProjectionWindow() {
  const currentMonth = getCurrentMonthKey();
  const startDate = `${addMonths(`${currentMonth}-01`, -2).slice(0, 7)}-01`;
  const endDate = addMonths(`${currentMonth}-01`, 14);
  return { startDate, endDate };
}

function expandRecurringTransactions(rules: RecurringTransaction[], transactions: Transaction[]): Transaction[] {
  const { startDate, endDate } = getProjectionWindow();
  const materializedOccurrences = new Set(
    transactions
      .map((transaction) => readTransactionMeta(transaction.notes))
      .filter((meta) => meta.recurringTransactionId && meta.recurringOccurrenceDate)
      .map((meta) => `${meta.recurringTransactionId}:${meta.recurringOccurrenceDate}`),
  );

  return rules.flatMap((rule) => {
    if (!rule.isActive) return [];
    const occurrences: Transaction[] = [];
    const ruleMeta = readTransactionMeta(rule.notes);
    const excludedDates = new Set(ruleMeta.recurringExcludedDates ?? []);
    let occurrenceDate = rule.startDate;
    const lastDate = rule.endDate && rule.endDate < endDate ? rule.endDate : endDate;

    while (occurrenceDate <= lastDate) {
      if (occurrenceDate >= startDate && !excludedDates.has(occurrenceDate)) {
        const occurrenceKey = `${rule.id}:${occurrenceDate}`;
        if (!materializedOccurrences.has(occurrenceKey)) {
          occurrences.push({
            id: `recurring:${rule.id}:${occurrenceDate}`,
            description: rule.description,
            amount: rule.amount,
            flow: rule.flow,
            status: rule.status,
            date: occurrenceDate,
            categoryId: rule.categoryId,
            accountId: rule.accountId,
            cardId: rule.cardId,
            notes: writeTransactionNotes(rule.notes, {
              ...ruleMeta,
              entryMode: 'fixed',
              generatedFrom: rule.startDate,
              generatedUntil: rule.endDate,
              recurringTransactionId: rule.id,
              recurringOccurrenceDate: occurrenceDate,
            }),
            isReimbursable: rule.isReimbursable,
            splitMode: rule.splitMode,
            personalAmount: rule.personalAmount,
            reimbursementAmount: rule.reimbursementAmount,
            reimbursementPersonId: rule.reimbursementPersonId,
            reimbursementStatus: rule.isReimbursable ? rule.reimbursementStatus ?? 'pending' : undefined,
            recurringTransactionId: rule.id,
            recurringOccurrenceDate: occurrenceDate,
            isProjected: true,
          });
        }
      }

      occurrenceDate = addMonths(occurrenceDate, rule.intervalMonths);
    }

    return occurrences;
  });
}

export async function getCurrentUserId() {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) return null;

  return data.user.id;
}

export async function assertCurrentUserId() {
  const userId = await getCurrentUserId();
  if (!userId) {
    const error = new Error('Entre no AxisFin novamente para salvar seus dados com segurança.');
    error.name = 'UserFacingError';
    throw error;
  }

  return userId;
}

async function ensureStarterCategories(userId: string) {
  const existingPromise = starterCategoryPromises.get(userId);
  if (existingPromise) return existingPromise;

  const starterCategoryPromise = ensureStarterCategoriesOnce(userId).finally(() => {
    starterCategoryPromises.delete(userId);
  });

  starterCategoryPromises.set(userId, starterCategoryPromise);
  return starterCategoryPromise;
}

async function ensureStarterReserveBoxes(userId: string) {
  const existingPromise = starterReserveBoxPromises.get(userId);
  if (existingPromise) return existingPromise;

  const starterReserveBoxPromise = ensureStarterReserveBoxesOnce(userId).finally(() => {
    starterReserveBoxPromises.delete(userId);
  });

  starterReserveBoxPromises.set(userId, starterReserveBoxPromise);
  return starterReserveBoxPromise;
}

async function ensureStarterReserveBoxesOnce(userId: string): Promise<boolean> {
  const client = assertSupabaseConfigured();
  const { count: reserveBoxCount, error: reserveBoxCountError } = await client
    .from('reserve_boxes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (isMissingRemoteSchemaError(reserveBoxCountError, ['reserve_boxes'])) return false;
  if (reserveBoxCountError) throw reserveBoxCountError;
  if (reserveBoxCount) return true;

  const today = formatLocalDate(new Date());
  const { error } = await client.from('reserve_boxes').insert(
    mockReserveBoxes.map((box) => ({
      user_id: userId,
      name: box.name,
      institution: box.institution,
      cdi_percent: box.cdiPercent,
      initial_balance: box.initialBalance,
      current_balance: box.currentBalance,
      created_on: today,
      goal: box.goal ?? null,
      color: box.color,
      icon: box.icon,
      last_balance_update: today,
      is_active: true,
    })),
  );

  if (isMissingRemoteSchemaError(error, ['reserve_boxes'])) return false;
  if (error) throw error;
  return true;
}

async function ensureStarterCategoriesOnce(userId: string) {
  const client = assertSupabaseConfigured();
  const { count: categoryCount, error: categoryCountError } = await client
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (categoryCountError) throw categoryCountError;
  if (categoryCount) return;

  const { error: categoriesError } = await client.from('categories').insert(
    mockCategories.map((category) => ({
      user_id: userId,
      name: category.name,
      flow: category.flow,
      icon: category.icon,
      color: category.color,
      is_system: true,
    })),
  );

  if (categoriesError) throw categoriesError;
}

async function cleanupLegacyStarterFinance(userId: string) {
  const client = assertSupabaseConfigured();
  const [accountsResult, cardsResult, transactionsResult] = await Promise.all([
    client.from('accounts').select('id, name, balance').eq('user_id', userId),
    client.from('cards').select('id, name, account_id').eq('user_id', userId),
    client.from('transactions').select('id, account_id, card_id, from_account_id, to_account_id').eq('user_id', userId),
  ]);

  if (accountsResult.error) throw accountsResult.error;
  if (cardsResult.error) throw cardsResult.error;
  if (transactionsResult.error) throw transactionsResult.error;

  const accounts = accountsResult.data ?? [];
  const cards = cardsResult.data ?? [];
  const transactions = transactionsResult.data ?? [];

  if (transactions.length > 0 || accounts.length === 0) return;

  const hasFullLegacyAccountSet = legacyStarterAccountNames.every((name) =>
    accounts.some((account) => account.name === name),
  );
  const hasOnlyLegacyZeroAccounts = accounts.every((account) => {
    const balance = Number(account.balance);
    return legacyStarterAccountNames.includes(account.name) && balance === 0;
  });
  const hasOnlyLegacyCards = cards.every((card) => legacyStarterCardNames.includes(card.name));

  if (!hasFullLegacyAccountSet || !hasOnlyLegacyZeroAccounts || !hasOnlyLegacyCards) return;

  const cardIds = cards.map((card) => card.id);
  if (cardIds.length > 0) {
    const { error } = await client.from('cards').delete().eq('user_id', userId).in('id', cardIds);
    if (error) throw error;
  }

  const accountIds = accounts.map((account) => account.id);
  const { error } = await client.from('accounts').delete().eq('user_id', userId).in('id', accountIds);
  if (error) throw error;
}

export async function loadFinanceSnapshot(): Promise<FinanceSnapshot> {
  const userId = await getCurrentUserId();
  if (!userId) return emptyFinanceSnapshot;

  const client = assertSupabaseConfigured();
  await ensureStarterCategories(userId);
  const reserveBoxesAvailable = await ensureStarterReserveBoxes(userId);
  await cleanupLegacyStarterFinance(userId);

  const accountSelect = await client.from('accounts').select('id, name, type, institution, balance, last_balance_update, color, is_active').eq('user_id', userId).order('created_at');
  const accountsResult = accountSelect.error && isMissingRemoteSchemaError(accountSelect.error, ['last_balance_update'])
    ? await client.from('accounts').select('id, name, type, institution, balance, color, is_active').eq('user_id', userId).order('created_at')
    : accountSelect;

  const reserveBoxesPromise = reserveBoxesAvailable
    ? client
      .from('reserve_boxes')
      .select('id, name, institution, cdi_percent, initial_balance, current_balance, created_on, goal, color, icon, last_balance_update, is_active')
      .eq('user_id', userId)
      .order('created_at')
    : Promise.resolve({ data: [], error: null });
  const reserveBoxMovementsPromise = reserveBoxesAvailable
    ? client
      .from('reserve_box_movements')
      .select('id, reserve_box_id, movement_type, amount, movement_date, description, created_at')
      .eq('user_id', userId)
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false })
    : Promise.resolve({ data: [], error: null });

  const [cardsResult, categoriesResult, reimbursementPeopleResult, recurringTransactionsResult, reserveBoxesResult, reserveBoxMovementsResult, transactionsResult] = await Promise.all([
    client.from('cards').select('id, name, account_id, network, credit_limit, closing_day, due_day, color, is_active').eq('user_id', userId).order('created_at'),
    client.from('categories').select('id, name, flow, icon, color, is_system').eq('user_id', userId).order('name'),
    client.from('reimbursement_people').select('id, name, phone, notes').eq('user_id', userId).order('name'),
    client
      .from('recurring_transactions')
      .select('id, description, amount, flow, status, start_date, end_date, interval_months, category_id, account_id, card_id, notes, is_reimbursable, split_mode, personal_amount, reimbursement_amount, reimbursement_person_id, reimbursement_status, is_active')
      .eq('user_id', userId)
      .order('start_date', { ascending: false }),
    reserveBoxesPromise,
    reserveBoxMovementsPromise,
    client
      .from('transactions')
      .select('id, description, amount, flow, status, transaction_date, category_id, account_id, card_id, from_account_id, to_account_id, notes, is_reimbursable, split_mode, personal_amount, reimbursement_amount, reimbursement_person_id, reimbursement_status, reimbursement_received_at, reimbursement_received_account_id, created_at')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  if (accountsResult.error) throw accountsResult.error;
  if (cardsResult.error) throw cardsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  if (reimbursementPeopleResult.error) throw reimbursementPeopleResult.error;
  if (recurringTransactionsResult.error) throw recurringTransactionsResult.error;
  if (reserveBoxesResult.error && !isMissingRemoteSchemaError(reserveBoxesResult.error, ['reserve_boxes'])) throw reserveBoxesResult.error;
  if (reserveBoxMovementsResult.error && !isMissingRemoteSchemaError(reserveBoxMovementsResult.error, ['reserve_box_movements'])) throw reserveBoxMovementsResult.error;
  if (transactionsResult.error) throw transactionsResult.error;
  const transactions = (transactionsResult.data ?? []).map(mapTransaction);
  const recurringTransactions = (recurringTransactionsResult.data ?? []).map(mapRecurringTransaction);
  const projectedTransactions = expandRecurringTransactions(recurringTransactions, transactions);

  return {
    accounts: (accountsResult.data ?? []).map(mapAccount),
    cards: (cardsResult.data ?? []).map(mapCard),
    categories: (categoriesResult.data ?? []).map(mapCategory),
    reimbursementPeople: (reimbursementPeopleResult.data ?? []).map(mapReimbursementPerson),
    recurringTransactions,
    reserveBoxes: (reserveBoxesResult.data ?? []).map(mapReserveBox),
    reserveBoxMovements: (reserveBoxMovementsResult.data ?? []).map(mapReserveBoxMovement),
    transactions: [...transactions, ...projectedTransactions],
  };
}

export async function clearFinanceSnapshot(): Promise<FinanceSnapshot> {
  const userId = await assertCurrentUserId();
  const client = assertSupabaseConfigured();
  const { data: goalImages, error: goalImagesError } = await client
    .from('goals')
    .select('image_path')
    .eq('user_id', userId)
    .not('image_path', 'is', null);
  if (goalImagesError) throw goalImagesError;

  const imagePaths = (goalImages ?? [])
    .map((goal) => goal.image_path)
    .filter((path): path is string => Boolean(path));
  if (imagePaths.length > 0) {
    const { error: storageError } = await client.storage.from('goal-images').remove(imagePaths);
    if (storageError) throw storageError;
  }

  const { error } = await client.rpc('reset_my_finance_data');
  if (error) throw error;

  return loadFinanceSnapshot();
}
