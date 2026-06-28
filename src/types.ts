export type MoneyFlow = 'income' | 'expense' | 'transfer';
export type EntryStatus = 'paid' | 'pending';
export type ExpenseEntryMode = 'variable' | 'fixed' | 'installment';
export type EditSeriesScope = 'single' | 'forward';
export type ExpenseNeed = 'essential' | 'superfluous';
export type ReimbursementStatus = 'pending' | 'received';
export type AccountType = 'checking' | 'savings' | 'cash' | 'investment';
export type CardNetwork = 'mastercard' | 'visa' | 'elo' | 'other';
export type AppView = 'home' | 'transactions' | 'accounts' | 'cards' | 'reimbursements' | 'goals' | 'reports' | 'profile';
export type TransactionTab = 'general' | 'cards' | 'accounts';
export type DashboardTransactionFilter = 'income' | 'expenses' | 'received' | 'paid';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  institution: string;
}

export interface Card {
  id: string;
  name: string;
  accountId: string;
  limit: number;
  used: number;
  dueDay: number;
  closingDay: number;
  color: string;
  network: CardNetwork;
}

export interface Category {
  id: string;
  name: string;
  flow: Exclude<MoneyFlow, 'transfer'>;
  color: string;
  icon: string;
  isSystem?: boolean;
}

export interface ReimbursementPerson {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  categoryId?: string;
  imagePath?: string;
  imageUrl?: string;
  color: string;
  status: 'active' | 'completed' | 'archived';
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  flow: MoneyFlow;
  status: EntryStatus;
  date: string;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  notes?: string;
  isReimbursable?: boolean;
  reimbursementPersonId?: string;
  reimbursementStatus?: ReimbursementStatus;
  reimbursementReceivedAt?: string;
  reimbursementReceivedAccountId?: string;
  recurringTransactionId?: string;
  recurringOccurrenceDate?: string;
  createdAt?: string;
  isProjected?: boolean;
}

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  flow: Exclude<MoneyFlow, 'transfer'>;
  status: EntryStatus;
  startDate: string;
  endDate?: string;
  intervalMonths: number;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  notes?: string;
  isReimbursable?: boolean;
  reimbursementPersonId?: string;
  reimbursementStatus?: ReimbursementStatus;
  reimbursementReceivedAccountId?: string;
  isActive: boolean;
}

export interface TransactionMeta {
  entryMode?: ExpenseEntryMode;
  expenseNeed?: ExpenseNeed;
  invoiceAdjustment?: 'credit';
  seriesId?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  generatedFrom?: string;
  generatedUntil?: string;
  paidAt?: string;
  paidFromAccountId?: string;
  invoiceSortOrder?: number;
  recurringTransactionId?: string;
  recurringOccurrenceDate?: string;
  recurringExcludedDates?: string[];
}

export interface FinanceSnapshot {
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  reimbursementPeople: ReimbursementPerson[];
  recurringTransactions: RecurringTransaction[];
  transactions: Transaction[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  plan: string;
  reimbursementsEnabled: boolean;
}

export interface DashboardSummary {
  currentBalance: number;
  income: number;
  expenses: number;
  received: number;
  paid: number;
  pendingIncome: number;
  pendingExpenses: number;
  reimbursementsPending: number;
  reimbursementsReceived: number;
}

export type ViewType = AppView | 'accounts' | 'charts' | 'settings';
export type TransactionType = Exclude<MoneyFlow, 'transfer'>;
export type TransactionStatus = EntryStatus;
