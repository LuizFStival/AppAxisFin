import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { AddEntryModal } from './components/transactions/AddEntryModal';
import { AddAccountModal } from './components/accounts/AddAccountModal';
import { AddCardModal } from './components/cards/AddCardModal';
import { CardsView } from './components/cards/CardsView';
import { AddCategoryModal } from './components/categories/AddCategoryModal';
import { ReportsView } from './components/reports/ReportsView';
import { ReimbursementsView } from './components/reimbursements/ReimbursementsView';
import { ProfileView } from './components/profile/ProfileView';
import { AccountsView } from './components/accounts/AccountsView';
import { AuthView } from './components/auth/AuthView';
import { mockUser } from './data/mockData';
import { accountRepository } from './features/accounts/accountRepository';
import { cardRepository } from './features/cards/cardRepository';
import { categoryRepository } from './features/categories/categoryRepository';
import { loadFinanceSnapshot, resetFinanceSnapshot } from './features/finance/financeStore';
import { reimbursementRepository } from './features/reimbursements/reimbursementRepository';
import { recurringRepository } from './features/recurring/recurringRepository';
import { transactionRepository } from './features/transactions/transactionRepository';
import { isSupabaseConfigured, supabase } from './lib/supabase/supabaseClient';
import { AccountType, AppView, CardNetwork, Category, DashboardTransactionFilter, FinanceSnapshot, Transaction, UserProfile } from './types';
import { getCurrentMonthKey, shiftMonthKey, summarizeDashboard } from './lib/utils/finance';
import { addMonths } from './lib/utils/date';
import { getVisibleNotes, readTransactionMeta, writeTransactionNotes } from './lib/utils/transactionMeta';
import { getUserFriendlyError } from './lib/utils/userFriendlyError';

const emptyFinanceSnapshot: FinanceSnapshot = {
  accounts: [],
  cards: [],
  categories: [],
  reimbursementPeople: [],
  recurringTransactions: [],
  transactions: [],
};

function formatDescriptionForTransactionMeta(description: string, transaction: Transaction) {
  const meta = readTransactionMeta(transaction.notes);
  if (meta.entryMode !== 'installment' || !meta.installmentNumber || !meta.totalInstallments) return description;
  return `${description.replace(/\s\(\d+\/\d+\)$/, '')} (${meta.installmentNumber}/${meta.totalInstallments})`;
}

function withoutRecurringOccurrenceMeta(transaction: Omit<Transaction, 'id'>): Omit<Transaction, 'id'> {
  const {
    recurringTransactionId: _recurringTransactionId,
    recurringOccurrenceDate: _recurringOccurrenceDate,
    recurringExcludedDates: _recurringExcludedDates,
    ...meta
  } = readTransactionMeta(transaction.notes);

  return {
    ...transaction,
    recurringTransactionId: undefined,
    recurringOccurrenceDate: undefined,
    notes: writeTransactionNotes(getVisibleNotes(transaction.notes), meta),
  };
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [snapshot, setSnapshot] = useState<FinanceSnapshot>(emptyFinanceSnapshot);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingAccount, setEditingAccount] = useState<FinanceSnapshot['accounts'][number] | null>(null);
  const [editingCard, setEditingCard] = useState<FinanceSnapshot['cards'][number] | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryFlow, setNewCategoryFlow] = useState<Category['flow']>('expense');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [dashboardTransactionFilter, setDashboardTransactionFilter] = useState<DashboardTransactionFilter | null>(null);
  const [showBalances, setShowBalances] = useState(true);
  const [activeMonth, setActiveMonth] = useState(getCurrentMonthKey);
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured);
  const [user, setUser] = useState<UserProfile>(mockUser);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [appError, setAppError] = useState('');
  const pendingInvoiceOrderNotesRef = useRef(new Map<string, string | undefined>());
  const previousViewRef = useRef<AppView>(currentView);

  async function loadSnapshot() {
    try {
      const loaded = await loadFinanceSnapshot();
      setSnapshot(loaded);
      setAppError('');
    } catch (error) {
      setAppError(getUserFriendlyError(error, 'Não foi possível carregar seus dados. Tente novamente.'));
    }
  }

  async function refreshAccounts() {
    const accounts = await accountRepository.list();
    setSnapshot((current) => ({ ...current, accounts }));
  }

  async function runAppAction(action: () => Promise<void>, fallback: string) {
    try {
      await action();
      setAppError('');
    } catch (error) {
      setAppError(getUserFriendlyError(error, fallback));
    }
  }

  async function flushPendingInvoiceOrder() {
    const pendingNotes = new Map(pendingInvoiceOrderNotesRef.current);
    if (pendingNotes.size === 0) return;

    const pendingTransactions = snapshot.transactions.filter((transaction) =>
      pendingNotes.has(transaction.id) && !transaction.isProjected,
    );
    const savedTransactions = await transactionRepository.updateMany(pendingTransactions);
    const savedById = new Map(savedTransactions.map((transaction) => [transaction.id, transaction]));

    pendingNotes.forEach((notes, id) => {
      if (pendingInvoiceOrderNotesRef.current.get(id) === notes) {
        pendingInvoiceOrderNotesRef.current.delete(id);
      }
    });
    setSnapshot((current) => ({
      ...current,
      transactions: current.transactions.map((transaction) =>
        pendingInvoiceOrderNotesRef.current.has(transaction.id)
          ? transaction
          : savedById.get(transaction.id) ?? transaction,
      ),
    }));
  }

  useEffect(() => {
    const previousView = previousViewRef.current;
    previousViewRef.current = currentView;
    if (previousView !== 'cards' || currentView === 'cards') return;

    void runAppAction(
      flushPendingInvoiceOrder,
      'A nova ordem da fatura ficou nesta tela, mas ainda não foi salva. Entre na fatura e tente sair novamente.',
    );
  }, [currentView]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      loadSnapshot();
      return;
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setAppError(getUserFriendlyError(error, 'Não foi possível verificar sua sessão. Entre novamente.'));
        setIsAuthLoading(false);
        return;
      }
      const sessionUser = data.session?.user;
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(window.location.search);
      const isRecoveryUrl = hashParams.get('type') === 'recovery' || queryParams.get('type') === 'recovery';

      if (sessionUser && !isRecoveryUrl) {
        setUser({
          id: sessionUser.id,
          name: sessionUser.user_metadata.full_name ?? sessionUser.email ?? 'Usuário',
          email: sessionUser.email ?? '',
          plan: 'AxisFin',
        });
        setIsAuthenticated(true);
        loadSnapshot();
      } else if (sessionUser && isRecoveryUrl) {
        setUser({
          id: sessionUser.id,
          name: sessionUser.user_metadata.full_name ?? sessionUser.email ?? 'Usuário',
          email: sessionUser.email ?? '',
          plan: 'AxisFin',
        });
        setIsPasswordRecovery(true);
        setIsAuthenticated(false);
      }
      setIsAuthLoading(false);
    }).catch((error: unknown) => {
      setAppError(getUserFriendlyError(error, 'Não foi possível verificar sua sessão. Entre novamente.'));
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUser = session?.user;
      if (event === 'PASSWORD_RECOVERY') {
        if (sessionUser) {
          setUser({
            id: sessionUser.id,
            name: sessionUser.user_metadata.full_name ?? sessionUser.email ?? 'Usuário',
            email: sessionUser.email ?? '',
            plan: 'AxisFin',
          });
        }
        setIsPasswordRecovery(true);
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(Boolean(sessionUser));
      if (sessionUser) {
        setIsPasswordRecovery(false);
        setUser({
          id: sessionUser.id,
          name: sessionUser.user_metadata.full_name ?? sessionUser.email ?? 'Usuário',
          email: sessionUser.email ?? '',
          plan: 'AxisFin',
        });
        loadSnapshot();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const summary = useMemo(
    () => summarizeDashboard(snapshot.accounts, snapshot.transactions, activeMonth),
    [activeMonth, snapshot.accounts, snapshot.transactions],
  );

  async function handleSaveAccount(input: {
    name: string;
    type: AccountType;
    institution?: string;
    balance: number;
    color: string;
  }) {
    if (editingAccount) {
      const saved = await accountRepository.update(editingAccount.id, { ...input, originalName: editingAccount.name });
      setSnapshot((current) => ({
        ...current,
        accounts: current.accounts.map((account) => account.id === saved.id ? saved : account),
      }));
      setEditingAccount(null);
      return;
    }

    const saved = await accountRepository.create(input);
    setSnapshot((current) => ({
      ...current,
      accounts: [...current.accounts, saved],
    }));
  }

  async function handleSaveCard(input: {
    name: string;
    accountId?: string;
    limit: number;
    closingDay: number;
    dueDay: number;
    color: string;
    network: CardNetwork;
  }) {
    if (editingCard) {
      const saved = await cardRepository.update(editingCard.id, { ...input, originalName: editingCard.name });
      setSnapshot((current) => ({
        ...current,
        cards: current.cards.map((card) => card.id === saved.id ? saved : card),
      }));
      setEditingCard(null);
      return;
    }

    const saved = await cardRepository.create(input);
    setSnapshot((current) => ({
      ...current,
      cards: [...current.cards, saved],
    }));
  }

  async function handleSaveTransaction(transaction: Omit<Transaction, 'id'> | Array<Omit<Transaction, 'id'>>, scope: 'single' | 'forward' = 'single') {
    if (Array.isArray(transaction)) {
      const saved = await transactionRepository.createMany(transaction);
      setSnapshot((current) => ({
        ...current,
        transactions: [...saved, ...current.transactions].sort((left, right) => right.date.localeCompare(left.date)),
      }));
      await refreshAccounts();
      return;
    }

    if (editingTransaction) {
      const editingMeta = readTransactionMeta(editingTransaction.notes);
      const recurringTransactionId = editingTransaction.recurringTransactionId ?? editingMeta.recurringTransactionId;
      const recurringOccurrenceDate = editingTransaction.recurringOccurrenceDate ?? editingMeta.recurringOccurrenceDate;
      const recurringRule = recurringTransactionId
        ? snapshot.recurringTransactions.find((rule) => rule.id === recurringTransactionId)
        : undefined;
      const nextMeta = readTransactionMeta(transaction.notes);

      if (recurringRule && recurringOccurrenceDate && nextMeta.entryMode === 'variable') {
        const variableTransaction = withoutRecurringOccurrenceMeta(transaction);
        if (editingTransaction.isProjected) {
          const saved = await transactionRepository.create(variableTransaction);
          try {
            await recurringRepository.excludeOccurrence(recurringRule, recurringOccurrenceDate);
          } catch (error) {
            await transactionRepository.remove(saved.id);
            throw error;
          }
        } else {
          await recurringRepository.excludeOccurrence(recurringRule, recurringOccurrenceDate);
          await transactionRepository.update(editingTransaction.id, variableTransaction);
        }
        await loadSnapshot();
        await refreshAccounts();
        setEditingTransaction(null);
        return;
      }

      if (editingTransaction.isProjected) {
        const saved = await transactionRepository.create(transaction);
        setSnapshot((current) => ({
          ...current,
          transactions: [saved, ...current.transactions.filter((item) => item.id !== editingTransaction.id)]
            .sort((left, right) => right.date.localeCompare(left.date)),
        }));
        await refreshAccounts();
        setEditingTransaction(null);
        return;
      }

      const meta = readTransactionMeta(editingTransaction.notes);
      const shouldUpdateForward = scope === 'forward' && meta.seriesId;

      if (shouldUpdateForward) {
        const relatedTransactions = snapshot.transactions
          .filter((item) => readTransactionMeta(item.notes).seriesId === meta.seriesId && item.date >= editingTransaction.date)
          .sort((left, right) => left.date.localeCompare(right.date));
        const visibleNotes = getVisibleNotes(transaction.notes);
        const updatedMeta = readTransactionMeta(transaction.notes);
        const updatedTransactions = relatedTransactions.map((item, index) => {
          const itemMeta = readTransactionMeta(item.notes);
          const expenseNeed = transaction.isReimbursable ? undefined : updatedMeta.expenseNeed ?? itemMeta.expenseNeed;
          return {
            ...item,
            ...transaction,
            id: item.id,
            description: formatDescriptionForTransactionMeta(transaction.description, item),
            date: addMonths(transaction.date, index),
            notes: writeTransactionNotes(visibleNotes, { ...itemMeta, expenseNeed }),
          };
        });
        const saved = await transactionRepository.updateMany(updatedTransactions);
        const savedById = new Map(saved.map((item) => [item.id, item]));
        setSnapshot((current) => ({
          ...current,
          transactions: current.transactions
            .map((item) => savedById.get(item.id) ?? item)
            .sort((left, right) => right.date.localeCompare(left.date)),
        }));
        await refreshAccounts();
        setEditingTransaction(null);
        return;
      }

      const saved = await transactionRepository.update(editingTransaction.id, transaction);
      setSnapshot((current) => ({
        ...current,
        transactions: current.transactions.map((item) => item.id === saved.id ? saved : item),
      }));
      await refreshAccounts();
      setEditingTransaction(null);
      return;
    }

    const saved = await transactionRepository.create(transaction);
    setSnapshot((current) => ({
      ...current,
      transactions: [saved, ...current.transactions],
    }));
    await refreshAccounts();
  }

  async function handleCreateRecurring(transaction: Omit<Transaction, 'id'>, endDate?: string) {
    await recurringRepository.createFromTransaction(transaction, endDate);
    await loadSnapshot();
  }

  async function handleSaveCategory(input: Omit<Category, 'id' | 'isSystem'>) {
    if (editingCategory) {
      const saved = await categoryRepository.update(editingCategory.id, { ...input, originalName: editingCategory.name });
      setSnapshot((current) => ({
        ...current,
        categories: current.categories.map((category) => category.id === saved.id ? saved : category),
      }));
      setEditingCategory(null);
      return;
    }

    const saved = await categoryRepository.create(input);
    setSnapshot((current) => ({
      ...current,
      categories: [...current.categories, saved].sort((left, right) => left.name.localeCompare(right.name)),
    }));
  }

  async function handleCreateCategoryFromEntry(input: Omit<Category, 'id' | 'isSystem'>) {
    const saved = await categoryRepository.create(input);
    setSnapshot((current) => ({
      ...current,
      categories: [...current.categories, saved].sort((left, right) => left.name.localeCompare(right.name)),
    }));
    return saved;
  }

  async function handleCreateReimbursementPerson(input: { name: string; phone?: string; notes?: string }) {
    const saved = await reimbursementRepository.createPerson(input);
    setSnapshot((current) => ({
      ...current,
      reimbursementPeople: [...current.reimbursementPeople, saved].sort((left, right) => left.name.localeCompare(right.name)),
    }));
    return saved;
  }

  async function handleToggleStatus(transaction: Transaction) {
    const nextStatus = transaction.status === 'paid' ? 'pending' : 'paid';
    if (transaction.isProjected) {
      const { id: _id, isProjected: _isProjected, ...input } = transaction;
      const saved = await transactionRepository.create({ ...input, status: nextStatus });
      setSnapshot((current) => ({
        ...current,
        transactions: [saved, ...current.transactions.filter((item) => item.id !== transaction.id)],
      }));
      await refreshAccounts();
      return;
    }

    await transactionRepository.updateStatus(transaction.id, nextStatus);
    setSnapshot((current) => ({
      ...current,
      transactions: current.transactions.map((item) =>
        item.id === transaction.id ? { ...item, status: nextStatus } : item,
      ),
    }));
    await refreshAccounts();
  }

  async function handleMarkReimbursementReceived(transaction: Transaction, accountId: string) {
    if (transaction.isProjected) {
      const { id: _id, isProjected: _isProjected, ...input } = transaction;
      const saved = await transactionRepository.create({
        ...input,
        isReimbursable: true,
        reimbursementStatus: 'received',
        reimbursementReceivedAt: new Date().toISOString().slice(0, 10),
        reimbursementReceivedAccountId: accountId,
      });
      setSnapshot((current) => ({
        ...current,
        transactions: [saved, ...current.transactions.filter((item) => item.id !== transaction.id)],
      }));
      await refreshAccounts();
      return;
    }

    const saved = await transactionRepository.update(transaction.id, {
      ...transaction,
      isReimbursable: true,
      reimbursementStatus: 'received',
      reimbursementReceivedAt: new Date().toISOString().slice(0, 10),
      reimbursementReceivedAccountId: accountId,
    });
    setSnapshot((current) => ({
      ...current,
      transactions: current.transactions.map((item) => item.id === saved.id ? saved : item),
    }));
    await refreshAccounts();
  }

  async function handlePayCardInvoice(input: {
    card: FinanceSnapshot['cards'][number];
    accountId: string;
    paymentDate: string;
    amount: number;
    transactions: Transaction[];
  }) {
    const account = snapshot.accounts.find((item) => item.id === input.accountId);
    if (!account) throw new Error('Selecione uma conta valida para pagar a fatura.');
    if (!input.paymentDate) throw new Error('Selecione a data do pagamento.');
    if (input.amount <= 0 || input.transactions.length === 0) throw new Error('Esta fatura não tem valor para pagamento.');

    const updatedAccount = await accountRepository.updateBalance(input.accountId, account.balance - input.amount);
    const paidTransactions = input.transactions.map((transaction) => ({
      ...transaction,
      status: 'paid' as const,
      notes: writeTransactionNotes(getVisibleNotes(transaction.notes), {
        ...readTransactionMeta(transaction.notes),
        paidAt: input.paymentDate,
        paidFromAccountId: input.accountId,
      }),
    }));
    const savedTransactions = await transactionRepository.updateMany(paidTransactions);
    const savedById = new Map(savedTransactions.map((transaction) => [transaction.id, transaction]));

    setSnapshot((current) => ({
      ...current,
      accounts: current.accounts.map((item) => item.id === updatedAccount.id ? updatedAccount : item),
      transactions: current.transactions.map((transaction) =>
        savedById.get(transaction.id) ?? transaction,
      ),
    }));
  }

  async function handleReorderInvoiceTransactions(transactions: Transaction[]) {
    const reorderedTransactions = transactions.map((transaction, index) => ({
      ...transaction,
      notes: writeTransactionNotes(getVisibleNotes(transaction.notes), {
        ...readTransactionMeta(transaction.notes),
        invoiceSortOrder: (index + 1) * 1000,
      }),
    }));
    const optimisticById = new Map(reorderedTransactions.map((transaction) => [transaction.id, transaction]));
    reorderedTransactions.forEach((transaction) => {
      if (!transaction.isProjected) pendingInvoiceOrderNotesRef.current.set(transaction.id, transaction.notes);
    });

    setSnapshot((current) => ({
      ...current,
      transactions: current.transactions.map((transaction) =>
        optimisticById.get(transaction.id) ?? transaction,
      ),
    }));
  }

  async function handleUpdateCardClosingDay(card: FinanceSnapshot['cards'][number], closingDay: number) {
    const saved = await cardRepository.update(card.id, {
      name: card.name,
      accountId: card.accountId || undefined,
      limit: card.limit,
      closingDay,
      dueDay: card.dueDay,
      color: card.color,
      network: card.network,
      originalName: card.name,
    });

    setSnapshot((current) => ({
      ...current,
      cards: current.cards.map((item) => item.id === saved.id ? saved : item),
    }));
  }

  async function handleReset() {
    const confirmed = window.confirm(
      'Restaurar demo vai apagar os dados cadastrados e voltar o app para o estado inicial. Deseja prosseguir?',
    );
    if (!confirmed) return;

    try {
      const restored = await resetFinanceSnapshot();
      setSnapshot(restored);
      setCurrentView('home');
      setAppError('');
    } catch (error) {
      setAppError(getUserFriendlyError(error, 'Não foi possível restaurar os dados. Tente novamente.'));
    }
  }

  async function handleUpdateProfile(input: { name: string }) {
    if (supabase) {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: input.name,
        },
      });
      if (error) throw error;
    }

    setUser((current) => ({
      ...current,
      name: input.name,
    }));
  }

  async function handleDeleteTransaction(transaction: Transaction) {
    const meta = readTransactionMeta(transaction.notes);
    const recurringTransactionId = transaction.recurringTransactionId ?? meta.recurringTransactionId;
    const recurringOccurrenceDate = transaction.recurringOccurrenceDate ?? meta.recurringOccurrenceDate;
    const recurringRule = recurringTransactionId
      ? snapshot.recurringTransactions.find((rule) => rule.id === recurringTransactionId)
      : undefined;

    if (recurringRule && recurringOccurrenceDate) {
      const choice = window.prompt(
        `Excluir "${transaction.description}"?\n\nDigite 1 para excluir somente esta ocorrência.\nDigite 2 para excluir esta e todas as próximas ocorrências da despesa fixa.`,
      );
      if (choice === null) return;

      if (choice.trim() === '1') {
        await recurringRepository.excludeOccurrence(recurringRule, recurringOccurrenceDate);
        if (!transaction.isProjected) {
          await transactionRepository.remove(transaction.id);
        }
        await loadSnapshot();
        await refreshAccounts();
        return;
      }

      if (choice.trim() === '2') {
        await recurringRepository.stopFrom(recurringRule, recurringOccurrenceDate);
        const forwardMaterializedIds = snapshot.transactions
          .filter((item) => !item.isProjected)
          .filter((item) => {
            const itemMeta = readTransactionMeta(item.notes);
            const itemRecurringId = item.recurringTransactionId ?? itemMeta.recurringTransactionId;
            const itemOccurrenceDate = item.recurringOccurrenceDate ?? itemMeta.recurringOccurrenceDate;
            return itemRecurringId === recurringRule.id
              && Boolean(itemOccurrenceDate)
              && itemOccurrenceDate! >= recurringOccurrenceDate;
          })
          .map((item) => item.id);
        await transactionRepository.removeMany(forwardMaterializedIds);
        await loadSnapshot();
        await refreshAccounts();
        return;
      }

      return;
    }

    if (transaction.isProjected) {
      alert('Não foi possível localizar a regra desta ocorrência fixa. Recarregue o aplicativo e tente novamente.');
      return;
    }

    const groupedTransactions = meta.seriesId
      ? snapshot.transactions.filter((item) => readTransactionMeta(item.notes).seriesId === meta.seriesId)
      : [];

    if (groupedTransactions.length > 1) {
      const forwardTransactions = groupedTransactions.filter((item) => item.date >= transaction.date);
      const choice = window.prompt(
        `Excluir "${transaction.description}"?\n\nDigite 1 para excluir apenas este lançamento.\nDigite 2 para excluir este e os próximos ${forwardTransactions.length - 1} lançamento(s) da série.`,
      );
      if (choice === null) return;

      if (choice.trim() === '2') {
        const ids = forwardTransactions.map((item) => item.id);
        await transactionRepository.removeMany(ids);
        setSnapshot((current) => ({
          ...current,
          transactions: current.transactions.filter((item) => !ids.includes(item.id)),
        }));
        await refreshAccounts();
        return;
      }

      if (choice.trim() !== '1') return;
    } else {
      const confirmed = window.confirm(`Excluir o lançamento "${transaction.description}"? Esta ação não pode ser desfeita.`);
      if (!confirmed) return;
    }

    await transactionRepository.remove(transaction.id);
    setSnapshot((current) => ({
      ...current,
      transactions: current.transactions.filter((item) => item.id !== transaction.id),
    }));
    await refreshAccounts();
  }

  async function handleDeleteAccount(account: FinanceSnapshot['accounts'][number]) {
    const confirmed = window.confirm(`Excluir a conta "${account.name}"? Contas com lançamentos vinculados não podem ser excluídas.`);
    if (!confirmed) return;

    try {
      await accountRepository.remove(account.id);
      setSnapshot((current) => ({
        ...current,
        accounts: current.accounts.filter((item) => item.id !== account.id),
        cards: current.cards.map((card) => card.accountId === account.id ? { ...card, accountId: '' } : card),
      }));
    } catch (error) {
      alert(
        error instanceof Error && error.message.includes('lançamentos vinculados')
          ? error.message
          : getUserFriendlyError(error, 'Não foi possível excluir a conta. Tente novamente.'),
      );
    }
  }

  async function handleDeleteCard(card: FinanceSnapshot['cards'][number]) {
    const linkedTransactions = snapshot.transactions.filter((transaction) => transaction.cardId === card.id).length;
    const confirmed = window.confirm(`Excluir o cartão "${card.name}"? Esta ação apaga o cartão e ${linkedTransactions} lançamento(s) das faturas vinculadas. Não pode ser desfeita.`);
    if (!confirmed) return;

    try {
      await cardRepository.remove(card.id);
      setSnapshot((current) => ({
        ...current,
        cards: current.cards.filter((item) => item.id !== card.id),
        transactions: current.transactions.filter((transaction) => transaction.cardId !== card.id),
      }));
    } catch (error) {
      alert(getUserFriendlyError(error, 'Não foi possível excluir o cartão. Tente novamente.'));
    }
  }

  async function handleDeleteCategory(category: Category) {
    const confirmed = window.confirm(`Excluir a categoria "${category.name}"? Lançamentos vinculados ficarão como "Outros".`);
    if (!confirmed) return;

    try {
      await categoryRepository.remove(category.id);
      setSnapshot((current) => ({
        ...current,
        categories: current.categories.filter((item) => item.id !== category.id),
      }));
    } catch (error) {
      alert(getUserFriendlyError(error, 'Não foi possível excluir a categoria. Tente novamente.'));
    }
  }

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setIsAuthenticated(false);
    setIsPasswordRecovery(false);
    setUser(mockUser);
    setSnapshot(emptyFinanceSnapshot);
    setCurrentView('home');
    setActiveMonth(getCurrentMonthKey());
    setEditingTransaction(null);
    setEditingAccount(null);
    setEditingCard(null);
    setEditingCategory(null);
    setSelectedAccountId('');
    setSelectedCardId('');
    setDashboardTransactionFilter(null);
  }

  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050608] text-sm font-semibold text-gray-400">
        Carregando AxisFin...
      </main>
    );
  }

  if (!isAuthenticated || isPasswordRecovery) {
    return (
      <AuthView
        isPasswordRecovery={isPasswordRecovery}
        onAuthenticated={loadSnapshot}
        onPasswordRecovered={() => {
          setIsPasswordRecovery(false);
          setIsAuthenticated(true);
          loadSnapshot();
        }}
      />
    );
  }

  return (
    <AppShell
      currentView={currentView}
      onNavigate={(view) => {
        setCurrentView(view);
        setDashboardTransactionFilter(null);
        if (view === 'accounts') setSelectedAccountId('');
        if (view === 'cards') setSelectedCardId('');
      }}
      onAdd={() => {
        setEditingTransaction(null);
        setIsAddOpen(true);
      }}
    >
      {appError ? (
        <div role="alert" className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 md:mx-8">
          <span>{appError}</span>
          <button
            type="button"
            onClick={() => void loadSnapshot()}
            className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {currentView === 'home' ? (
        <DashboardView
          userName={user.name}
          accounts={snapshot.accounts}
          cards={snapshot.cards}
          categories={snapshot.categories}
          transactions={snapshot.transactions}
          activeMonth={activeMonth}
          summary={summary}
          showBalances={showBalances}
          onPreviousMonth={() => setActiveMonth((month) => shiftMonthKey(month, -1))}
          onNextMonth={() => setActiveMonth((month) => shiftMonthKey(month, 1))}
          onCurrentMonth={() => setActiveMonth(getCurrentMonthKey())}
          onToggleBalances={() => setShowBalances((value) => !value)}
          onAdd={() => {
            setEditingTransaction(null);
            setIsAddOpen(true);
          }}
          onOpenProfile={() => setCurrentView('profile')}
          onAddAccount={() => {
            setEditingAccount(null);
            setIsAddAccountOpen(true);
          }}
          onAddCard={() => {
            setEditingCard(null);
            setIsAddCardOpen(true);
          }}
          onViewAccounts={(accountId) => {
            setSelectedAccountId(accountId ?? '');
            setCurrentView('accounts');
          }}
          onViewCards={(cardId) => {
            setSelectedCardId(cardId ?? '');
            setCurrentView('cards');
          }}
          onViewDashboardTransactions={(filter) => {
            setDashboardTransactionFilter(filter);
            setCurrentView('transactions');
          }}
          onPayInvoice={handlePayCardInvoice}
          onUpdateCardClosingDay={handleUpdateCardClosingDay}
          onEditCard={(card) => {
            setEditingCard(card);
            setIsAddCardOpen(true);
          }}
          onDeleteCard={handleDeleteCard}
        />
      ) : null}

      {currentView === 'accounts' ? (
        <AccountsView
          accounts={snapshot.accounts}
          cards={snapshot.cards}
          categories={snapshot.categories}
          transactions={snapshot.transactions}
          activeMonth={activeMonth}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onAddAccount={() => {
            setEditingAccount(null);
            setIsAddAccountOpen(true);
          }}
          onEditAccount={(account) => {
            setEditingAccount(account);
            setIsAddAccountOpen(true);
          }}
          onDeleteAccount={handleDeleteAccount}
        />
      ) : null}

      {currentView === 'cards' ? (
        <CardsView
          cards={snapshot.cards}
          accounts={snapshot.accounts}
          categories={snapshot.categories}
          reimbursementPeople={snapshot.reimbursementPeople}
          transactions={snapshot.transactions}
          selectedCardId={selectedCardId}
          activeMonth={activeMonth}
          onSelectCard={setSelectedCardId}
          onPreviousMonth={() => setActiveMonth((month) => shiftMonthKey(month, -1))}
          onNextMonth={() => setActiveMonth((month) => shiftMonthKey(month, 1))}
          onCurrentMonth={() => setActiveMonth(getCurrentMonthKey())}
          onEditTransaction={(transaction) => {
            setEditingTransaction(transaction);
            setIsAddOpen(true);
          }}
          onDeleteTransaction={(transaction) => runAppAction(
            () => handleDeleteTransaction(transaction),
            'Não foi possível excluir o lançamento. Tente novamente.',
          )}
          onReorderInvoiceTransactions={handleReorderInvoiceTransactions}
          onPayInvoice={handlePayCardInvoice}
          onUpdateCardClosingDay={handleUpdateCardClosingDay}
          onEditCard={(card) => {
            setEditingCard(card);
            setIsAddCardOpen(true);
          }}
          onDeleteCard={handleDeleteCard}
        />
      ) : null}

      {currentView === 'transactions' ? (
        <TransactionsView
          transactions={snapshot.transactions}
          accounts={snapshot.accounts}
          cards={snapshot.cards}
          categories={snapshot.categories}
          reimbursementPeople={snapshot.reimbursementPeople}
          activeMonth={activeMonth}
          dashboardFilter={dashboardTransactionFilter}
          onToggleStatus={(transaction) => runAppAction(
            () => handleToggleStatus(transaction),
            'Não foi possível atualizar o lançamento. Tente novamente.',
          )}
          onEdit={(transaction) => {
            setEditingTransaction(transaction);
            setIsAddOpen(true);
          }}
          onDelete={(transaction) => runAppAction(
            () => handleDeleteTransaction(transaction),
            'Não foi possível excluir o lançamento. Tente novamente.',
          )}
        />
      ) : null}

      {currentView === 'reimbursements' ? (
        <ReimbursementsView
          people={snapshot.reimbursementPeople}
          accounts={snapshot.accounts}
          cards={snapshot.cards}
          transactions={snapshot.transactions}
          activeMonth={activeMonth}
          onPreviousMonth={() => setActiveMonth((month) => shiftMonthKey(month, -1))}
          onNextMonth={() => setActiveMonth((month) => shiftMonthKey(month, 1))}
          onCurrentMonth={() => setActiveMonth(getCurrentMonthKey())}
          onMarkReceived={(transaction, accountId) => runAppAction(
            () => handleMarkReimbursementReceived(transaction, accountId),
            'Não foi possível atualizar o reembolso. Tente novamente.',
          )}
          onEditTransaction={(transaction) => {
            setEditingTransaction(transaction);
            setIsAddOpen(true);
          }}
        />
      ) : null}

      {currentView === 'reports' ? (
        <ReportsView
          month={activeMonth}
          transactions={snapshot.transactions}
          categories={snapshot.categories}
          summary={summary}
        />
      ) : null}

      {currentView === 'profile' ? (
        <ProfileView
          user={user}
          accounts={snapshot.accounts}
          cards={snapshot.cards}
          categories={snapshot.categories}
          showBalances={showBalances}
          onToggleBalances={() => setShowBalances((value) => !value)}
          onUpdateProfile={handleUpdateProfile}
          onAddAccount={() => {
            setEditingAccount(null);
            setIsAddAccountOpen(true);
          }}
          onEditAccount={(account) => {
            setEditingAccount(account);
            setIsAddAccountOpen(true);
          }}
          onDeleteAccount={handleDeleteAccount}
          onAddCard={() => {
            setEditingCard(null);
            setIsAddCardOpen(true);
          }}
          onEditCard={(card) => {
            setEditingCard(card);
            setIsAddCardOpen(true);
          }}
          onDeleteCard={handleDeleteCard}
          onAddCategory={(flow) => {
            setEditingCategory(null);
            setNewCategoryFlow(flow);
            setIsAddCategoryOpen(true);
          }}
          onEditCategory={(category) => {
            setEditingCategory(category);
            setIsAddCategoryOpen(true);
          }}
          onDeleteCategory={handleDeleteCategory}
          onReset={handleReset}
          onSignOut={handleSignOut}
        />
      ) : null}

      <AddEntryModal
        isOpen={isAddOpen}
        accounts={snapshot.accounts}
        cards={snapshot.cards}
        categories={snapshot.categories}
        reimbursementPeople={snapshot.reimbursementPeople}
        transaction={editingTransaction}
        onCreateCategory={handleCreateCategoryFromEntry}
        onCreateReimbursementPerson={handleCreateReimbursementPerson}
        onCreateRecurring={handleCreateRecurring}
        onClose={() => {
          setIsAddOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
      />

      <AddAccountModal
        isOpen={isAddAccountOpen}
        accounts={snapshot.accounts}
        account={editingAccount}
        onClose={() => {
          setIsAddAccountOpen(false);
          setEditingAccount(null);
        }}
        onSave={handleSaveAccount}
      />

      <AddCardModal
        isOpen={isAddCardOpen}
        accounts={snapshot.accounts}
        cards={snapshot.cards}
        card={editingCard}
        onClose={() => {
          setIsAddCardOpen(false);
          setEditingCard(null);
        }}
        onSave={handleSaveCard}
      />

      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        categories={snapshot.categories}
        category={editingCategory}
        defaultFlow={newCategoryFlow}
        onClose={() => {
          setIsAddCategoryOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
      />
    </AppShell>
  );
}

