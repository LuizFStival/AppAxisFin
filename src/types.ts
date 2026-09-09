export type MoneyFlow = 'income' | 'expense' | 'transfer';
export type EntryStatus = 'paid' | 'pending';
export type ExpenseEntryMode = 'variable' | 'fixed' | 'installment';
export type EditSeriesScope = 'single' | 'forward';
export type ExpenseNeed = 'essential' | 'superfluous';
export type ReimbursementStatus = 'pending' | 'received';
export type ExpenseSplitMode = 'none' | 'shared' | 'third_party_full';
export type AccountType = 'checking' | 'savings' | 'cash' | 'investment';
export type CardNetwork = 'mastercard' | 'visa' | 'elo' | 'other';
export type AppView = 'home' | 'month-center' | 'transactions' | 'accounts' | 'cards' | 'reserves' | 'reimbursements' | 'goals' | 'reports' | 'notifications' | 'profile';
export type TransactionTab = 'general' | 'cards' | 'accounts';
export type DashboardTransactionFilter = 'income' | 'expenses' | 'reimbursements' | 'result' | 'received' | 'paid' | 'pending';
export type SavingsGoalMode = 'fixed' | 'salary_percentage';
export type ReportWidgetId = 'income' | 'expenses' | 'savings_rate' | 'average_expenses';
export type ReserveBoxMovementType = 'deposit' | 'withdrawal' | 'yield' | 'balance_update';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  lastBalanceUpdate: string;
  color: string;
  institution: string;
  isActive: boolean;
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
  isActive: boolean;
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

export interface Commitment {
  id: string;
  name: string;
  totalValue: number;
  mySharePercent: number;
  partnerPersonId?: string;
  monthlyAmount?: number;
  installmentCount?: number;
  startDate?: string;
  paidAmount: number;
  color: string;
  status: 'active' | 'completed' | 'archived';
}

export interface Budget {
  id: string;
  categoryId: string;
  period: string;
  limitAmount: number;
}

export interface ReserveBox {
  id: string;
  name: string;
  institution: string;
  cdiPercent: number;
  initialBalance: number;
  currentBalance: number;
  createdOn: string;
  goal?: string;
  color: string;
  icon: string;
  lastBalanceUpdate: string;
  isActive: boolean;
}

export interface ReserveBoxMovement {
  id: string;
  reserveBoxId: string;
  type: ReserveBoxMovementType;
  amount: number;
  date: string;
  description?: string;
  createdAt?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  readAt?: string;
  scheduledFor?: string;
  sourceKey: string;
  actionView: Extract<AppView, 'transactions' | 'cards' | 'reimbursements'>;
  createdAt: string;
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
  splitMode?: ExpenseSplitMode;
  personalAmount?: number;
  reimbursementAmount?: number;
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
  splitMode?: ExpenseSplitMode;
  personalAmount?: number;
  reimbursementAmount?: number;
  reimbursementPersonId?: string;
  reimbursementStatus?: ReimbursementStatus;
  reimbursementReceivedAccountId?: string;
  isActive: boolean;
}

export interface TransactionMeta {
  entryMode?: ExpenseEntryMode;
  expenseNeed?: ExpenseNeed;
  invoiceAdjustment?: 'credit';
  reimbursementOriginalAmount?: number;
  reimbursementPayments?: Array<{ amount: number; accountId: string; date: string }>;
  reimbursementCarryMonth?: string;
  seriesId?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  generatedFrom?: string;
  generatedUntil?: string;
  paidAt?: string;
  paidFromAccountId?: string;
  invoicePaymentCardId?: string;
  invoicePaymentPeriod?: string;
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
  reserveBoxes: ReserveBox[];
  reserveBoxMovements: ReserveBoxMovement[];
  transactions: Transaction[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  plan: string;
  reimbursementsEnabled: boolean;
  savingsGoalMode: SavingsGoalMode;
  savingsGoalAmount: number;
  savingsGoalPercentage: number;
  includePendingSalary: boolean;
  reportWidgets: ReportWidgetId[];
}

export interface DashboardSummary {
  currentBalance: number;
  accountInflow: number;
  accountInflowPersonal: number;
  accountInflowThirdParty: number;
  accountOutflow: number;
  accountOutflowPersonal: number;
  accountOutflowThirdParty: number;
  income: number;
  expenses: number;
  settledExpenses: number;
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
