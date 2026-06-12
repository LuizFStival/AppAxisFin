export type MoneyFlow = 'income' | 'expense' | 'transfer';
export type EntryStatus = 'paid' | 'pending';
export type AccountType = 'checking' | 'savings' | 'cash' | 'investment';
export type CardNetwork = 'mastercard' | 'visa' | 'elo' | 'other';
export type AppView = 'home' | 'transactions' | 'accounts' | 'reports' | 'profile';
export type TransactionTab = 'general' | 'cards' | 'accounts';

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
}

export interface FinanceSnapshot {
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  plan: string;
}

export interface DashboardSummary {
  currentBalance: number;
  income: number;
  expenses: number;
  received: number;
  paid: number;
  pendingIncome: number;
  pendingExpenses: number;
}

export type ViewType = AppView | 'accounts' | 'charts' | 'settings';
export type TransactionType = Exclude<MoneyFlow, 'transfer'>;
export type TransactionStatus = EntryStatus;
