import { mockCategories } from '../../data/mockData';
import { assertSupabaseConfigured, supabase } from '../../lib/supabase/supabaseClient';
import { addMonths } from '../../lib/utils/date';
import { getCurrentMonthKey } from '../../lib/utils/finance';
import { readTransactionMeta, writeTransactionNotes } from '../../lib/utils/transactionMeta';
import { Account, Card, Category, FinanceSnapshot, RecurringTransaction, ReimbursementPerson, Transaction } from '../../types';

const starterCategoryPromises = new Map<string, Promise<void>>();
const emptyFinanceSnapshot: FinanceSnapshot = {
  accounts: [],
  cards: [],
  categories: [],
  reimbursementPeople: [],
  recurringTransactions: [],
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
  color: string;
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
  reimbursement_person_id?: string | null;
  reimbursement_status?: Transaction['reimbursementStatus'] | null;
  reimbursement_received_at?: string | null;
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
  reimbursement_person_id?: string | null;
  reimbursement_status?: RecurringTransaction['reimbursementStatus'] | null;
  is_active: boolean;
};

export function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    institution: row.institution ?? row.name,
    balance: Number(row.balance),
    color: row.color,
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
    reimbursementPersonId: row.reimbursement_person_id ?? undefined,
    reimbursementStatus: row.reimbursement_status ?? undefined,
    reimbursementReceivedAt: row.reimbursement_received_at ?? undefined,
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
    let occurrenceDate = rule.startDate;
    const lastDate = rule.endDate && rule.endDate < endDate ? rule.endDate : endDate;

    while (occurrenceDate <= lastDate) {
      if (occurrenceDate >= startDate) {
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
              entryMode: 'fixed',
              generatedFrom: rule.startDate,
              generatedUntil: rule.endDate,
              recurringTransactionId: rule.id,
              recurringOccurrenceDate: occurrenceDate,
            }),
            isReimbursable: rule.isReimbursable,
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
  await cleanupLegacyStarterFinance(userId);

  const [accountsResult, cardsResult, categoriesResult, reimbursementPeopleResult, recurringTransactionsResult, transactionsResult] = await Promise.all([
    client.from('accounts').select('id, name, type, institution, balance, color').eq('user_id', userId).order('created_at'),
    client.from('cards').select('id, name, account_id, network, credit_limit, closing_day, due_day, color').eq('user_id', userId).order('created_at'),
    client.from('categories').select('id, name, flow, icon, color, is_system').eq('user_id', userId).order('name'),
    client.from('reimbursement_people').select('id, name, phone, notes').eq('user_id', userId).order('name'),
    client
      .from('recurring_transactions')
      .select('id, description, amount, flow, status, start_date, end_date, interval_months, category_id, account_id, card_id, notes, is_reimbursable, reimbursement_person_id, reimbursement_status, is_active')
      .eq('user_id', userId)
      .order('start_date', { ascending: false }),
    client
      .from('transactions')
      .select('id, description, amount, flow, status, transaction_date, category_id, account_id, card_id, from_account_id, to_account_id, notes, is_reimbursable, reimbursement_person_id, reimbursement_status, reimbursement_received_at, created_at')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  if (accountsResult.error) throw accountsResult.error;
  if (cardsResult.error) throw cardsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  if (reimbursementPeopleResult.error) throw reimbursementPeopleResult.error;
  if (recurringTransactionsResult.error) throw recurringTransactionsResult.error;
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
    transactions: [...transactions, ...projectedTransactions],
  };
}

export async function resetFinanceSnapshot(): Promise<FinanceSnapshot> {
  const userId = await assertCurrentUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from('transactions').delete().eq('user_id', userId);
  if (error) throw error;
  const { error: peopleError } = await client.from('reimbursement_people').delete().eq('user_id', userId);
  if (peopleError) throw peopleError;

  return loadFinanceSnapshot();
}
