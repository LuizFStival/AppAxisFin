import React, { Suspense, useMemo, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { AuthView } from './components/auth/AuthView';
import {
  AccountsView,
  AddAccountModal,
  AddCardModal,
  AddCategoryModal,
  AddEntryModal,
  CardsView,
  DashboardView,
  GoalsView,
  ModalLoadingFallback,
  MonthCenterView,
  NotificationsView,
  ProfileView,
  ReimbursementsView,
  ReserveBoxesView,
  ReportsView,
  TransactionsView,
  ViewLoadingFallback,
} from './components/app/lazyComponents';
import { accountRepository } from './features/accounts/accountRepository';
import { useAuthSession } from './features/auth/useAuthSession';
import { cardRepository } from './features/cards/cardRepository';
import { useInvoiceOrdering } from './features/cards/useInvoiceOrdering';
import { categoryRepository } from './features/categories/categoryRepository';
import { clearFinanceSnapshot, loadFinanceSnapshot } from './features/finance/financeStore';
import { reimbursementRepository } from './features/reimbursements/reimbursementRepository';
import { reserveBoxRepository } from './features/reserve-boxes/reserveBoxRepository';
import { profileRepository } from './features/profile/profileRepository';
import { useNotifications } from './features/notifications/useNotifications';
import { recurringRepository } from './features/recurring/recurringRepository';
import { transactionRepository } from './features/transactions/transactionRepository';
import { AccountType, AppView, CardNetwork, Category, DashboardTransactionFilter, FinanceSnapshot, ReserveBoxMovementType, Transaction, TransactionMeta } from './types';
import { formatCurrency, getCurrentMonthKey, getTransactionReimbursementBaseAmount, getTransactionReimbursementReceivedAmount, shiftMonthKey, summarizeDashboard } from './lib/utils/finance';
import { getCardInvoiceClosingMonth } from './lib/utils/cardInvoices';
import { addMonths, formatLocalDate } from './lib/utils/date';
import { getVisibleNotes, readTransactionMeta, writeTransactionNotes } from './lib/utils/transactionMeta';
import { getUserFriendlyError } from './lib/utils/userFriendlyError';
import { buildAccountBalanceAdjustmentTransaction } from './lib/utils/accountBalanceAdjustment';
import { useAppFeedback } from './components/app/useAppFeedback';

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

function formatDescriptionForTransactionMeta(description: string, transactionOrMeta: Transaction | TransactionMeta) {
  const meta = 'description' in transactionOrMeta ? readTransactionMeta(transactionOrMeta.notes) : transactionOrMeta;
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

function isSameRecurringOccurrence(transaction: Transaction, recurringTransactionId: string, recurringOccurrenceDate: string) {
  const meta = readTransactionMeta(transaction.notes);
  return (transaction.recurringTransactionId ?? meta.recurringTransactionId) === recurringTransactionId
    && (transaction.recurringOccurrenceDate ?? meta.recurringOccurrenceDate) === recurringOccurrenceDate;
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
  const [selectedReimbursementPersonId, setSelectedReimbursementPersonId] = useState<string | null>(null);
  const [dashboardTransactionFilter, setDashboardTransactionFilter] = useState<DashboardTransactionFilter | null>(null);
  const [showBalances, setShowBalances] = useState(true);
  const [activeMonth, setActiveMonth] = useState(getCurrentMonthKey);
  const [appError, setAppError] = useState('');
  const {
    chooseAction,
    confirmAction,
    feedbackOverlays,
    showActionMessage,
    showFeedback,
  } = useAppFeedback();

  async function loadSnapshot() {
    try {
      const loaded = await loadFinanceSnapshot();
      setSnapshot(loaded);
      setAppError('');
    } catch (error) {
      setAppError(getUserFriendlyError(error, 'Não foi possível carregar seus dados. Tente novamente.'));
    }
  }

  const {
    finishPasswordRecovery,
    isAuthenticated,
    isAuthLoading,
    isPasswordRecovery,
    setUser,
    signOut,
    updateAuthName,
    user,
  } = useAuthSession({ loadFinance: loadSnapshot, setAppError });
  const {
    error: notificationError,
    markAllRead,
    markRead,
    notifications,
    unreadCount,
  } = useNotifications({
    cards: snapshot.cards,
    enabled: isAuthenticated,
    reimbursementsEnabled: user.reimbursementsEnabled,
    transactions: snapshot.transactions,
  });

  async function refreshAccounts() {
    const accounts = await accountRepository.list();
    setSnapshot((current) => ({ ...current, accounts }));
  }

  async function runAppAction<T>(action: () => Promise<T>, fallback: string): Promise<T | undefined> {
    try {
      const result = await action();
      setAppError('');
      return result;
    } catch (error) {
      setAppError(getUserFriendlyError(error, fallback));
      return undefined;
    }
  }

  const { reorderInvoiceTransactions } = useInvoiceOrdering({
    currentView,
    runAction: runAppAction,
    setSnapshot,
    recurringTransactions: snapshot.recurringTransactions,
    transactions: snapshot.transactions,
  });
  const activeAccounts = useMemo(() => snapshot.accounts.filter((account) => account.isActive), [snapshot.accounts]);
  const activeCards = useMemo(() => snapshot.cards.filter((card) => card.isActive), [snapshot.cards]);
  const accountOptionsForCardModal = useMemo(() => {
    const linkedAccount = editingCard?.accountId
      ? snapshot.accounts.find((account) => account.id === editingCard.accountId)
      : undefined;
    const options = linkedAccount && !linkedAccount.isActive ? [linkedAccount, ...activeAccounts] : activeAccounts;
    return Array.from(new Map(options.map((account) => [account.id, account])).values());
  }, [activeAccounts, editingCard, snapshot.accounts]);
  const accountsForEntryModal = useMemo(() => {
    const relatedAccountIds = [
      editingTransaction?.accountId,
      editingTransaction?.fromAccountId,
      editingTransaction?.toAccountId,
      editingTransaction?.reimbursementReceivedAccountId,
    ].filter(Boolean) as string[];
    const relatedAccounts = snapshot.accounts.filter((account) => relatedAccountIds.includes(account.id));
    return Array.from(new Map([...activeAccounts, ...relatedAccounts].map((account) => [account.id, account])).values());
  }, [activeAccounts, editingTransaction, snapshot.accounts]);
  const cardsForEntryModal = useMemo(() => {
    const relatedCard = editingTransaction?.cardId
      ? snapshot.cards.find((card) => card.id === editingTransaction.cardId)
      : undefined;
    const options = relatedCard && !relatedCard.isActive ? [...activeCards, relatedCard] : activeCards;
    return Array.from(new Map(options.map((card) => [card.id, card])).values());
  }, [activeCards, editingTransaction, snapshot.cards]);

  const summary = useMemo(
    () => summarizeDashboard(activeAccounts, snapshot.transactions, activeMonth, snapshot.cards, {
      includeReimbursements: user.reimbursementsEnabled,
    }),
    [activeAccounts, activeMonth, snapshot.cards, snapshot.transactions, user.reimbursementsEnabled],
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
      showFeedback({ title: 'Conta atualizada', description: `${saved.name} foi salva.`, tone: 'success' });
      return;
    }

    const saved = await accountRepository.create(input);
    setSnapshot((current) => ({
      ...current,
      accounts: [...current.accounts, saved],
    }));
    showFeedback({ title: 'Conta criada', description: `${saved.name} entrou no seu patrimônio.`, tone: 'success' });
  }

  async function handleUpdateAccountBalance(account: FinanceSnapshot['accounts'][number], balance: number, date: string = formatLocalDate(new Date()), adjustmentDescription?: string) {
    const adjustment = buildAccountBalanceAdjustmentTransaction({
      account,
      balance,
      date,
      description: adjustmentDescription,
    });
    const savedAdjustment = adjustment ? await transactionRepository.create(adjustment) : undefined;
    const saved = await accountRepository.updateBalance(account.id, balance, date);
    setSnapshot((current) => ({
      ...current,
      accounts: current.accounts.map((item) => item.id === saved.id ? saved : item),
      transactions: savedAdjustment
        ? [savedAdjustment, ...current.transactions].sort((left, right) => right.date.localeCompare(left.date))
        : current.transactions,
    }));
    showFeedback({
      title: 'Saldo atualizado',
      description: adjustment ? `Diferença registrada em ${formatCurrency(Math.abs(adjustment.amount))}.` : 'Saldo conferido sem diferença.',
      tone: 'success',
    });
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
      showFeedback({ title: 'Cartão atualizado', description: `${saved.name} foi salvo.`, tone: 'success' });
      return;
    }

    const saved = await cardRepository.create(input);
    setSnapshot((current) => ({
      ...current,
      cards: [...current.cards, saved],
    }));
    showFeedback({ title: 'Cartão criado', description: `${saved.name} já pode receber lançamentos.`, tone: 'success' });
  }

  async function handleCreateReserveBox(input: {
    name: string;
    institution: string;
    cdiPercent: number;
    initialBalance: number;
    createdOn: string;
    goal?: string;
    color: string;
    icon: string;
  }) {
    const saved = await reserveBoxRepository.create(input);
    setSnapshot((current) => ({
      ...current,
      reserveBoxes: [...current.reserveBoxes, saved],
    }));
    showFeedback({ title: 'Caixinha criada', description: `${saved.name} foi adicionada às reservas.`, tone: 'success' });
  }

  async function handleAddReserveBoxMovement(input: {
    reserveBoxId: string;
    type: ReserveBoxMovementType;
    amount: number;
    date: string;
    description?: string;
    accountId?: string;
  }) {
    const result = await reserveBoxRepository.addMovement(input);

    const loaded = await loadFinanceSnapshot();
    setSnapshot({
      ...loaded,
      reserveBoxes: loaded.reserveBoxes.map((box) => box.id === result.box.id ? result.box : box),
      reserveBoxMovements: loaded.reserveBoxMovements.some((movement) => movement.id === result.movement.id)
        ? loaded.reserveBoxMovements
        : [result.movement, ...loaded.reserveBoxMovements],
    });
    showFeedback({ title: 'Movimento registrado', description: `${formatCurrency(input.amount)} em ${result.box.name}.`, tone: 'success' });
  }

  function assignInvoiceSortOrderToNewTransactions(transactions: Array<Omit<Transaction, 'id'>>): Array<Omit<Transaction, 'id'>> {
    const nextOrderByInvoice = new Map<string, number>();

    return transactions.map((transaction) => {
      if (!transaction.cardId) return transaction;

      const card = snapshot.cards.find((item) => item.id === transaction.cardId);
      if (!card) return transaction;

      const meta = readTransactionMeta(transaction.notes);
      if (typeof meta.invoiceSortOrder === 'number' && Number.isFinite(meta.invoiceSortOrder)) return transaction;

      const invoiceMonth = getCardInvoiceClosingMonth(card, transaction.date);
      const invoiceKey = `${transaction.cardId}:${invoiceMonth}`;
      let nextOrder = nextOrderByInvoice.get(invoiceKey);

      if (nextOrder === undefined) {
        const existingOrders = snapshot.transactions
          .filter((item) => item.cardId === transaction.cardId)
          .filter((item) => getCardInvoiceClosingMonth(card, item.date) === invoiceMonth)
          .map((item) => readTransactionMeta(item.notes).invoiceSortOrder)
          .filter((order): order is number => typeof order === 'number' && Number.isFinite(order));

        if (existingOrders.length === 0) return transaction;
        nextOrder = Math.max(...existingOrders) + 1000;
      } else {
        nextOrder += 1000;
      }

      nextOrderByInvoice.set(invoiceKey, nextOrder);

      return {
        ...transaction,
        notes: writeTransactionNotes(getVisibleNotes(transaction.notes), {
          ...meta,
          invoiceSortOrder: nextOrder,
        }),
      };
    });
  }

  async function handleSaveTransaction(transaction: Omit<Transaction, 'id'> | Array<Omit<Transaction, 'id'>>, scope: 'single' | 'forward' = 'single') {
    if (Array.isArray(transaction)) {
      const saved = await transactionRepository.createMany(assignInvoiceSortOrderToNewTransactions(transaction));
      setSnapshot((current) => ({
        ...current,
        transactions: [...saved, ...current.transactions].sort((left, right) => right.date.localeCompare(left.date)),
      }));
      await refreshAccounts();
      showFeedback({ title: 'Lançamentos criados', description: `${saved.length} item(ns) entraram no mês.`, tone: 'success' });
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

      if (recurringRule && recurringOccurrenceDate && scope === 'forward' && nextMeta.entryMode === 'fixed') {
        const baseTransaction = withoutRecurringOccurrenceMeta(transaction);
        const endDate = recurringRule.endDate && recurringRule.endDate >= transaction.date
          ? recurringRule.endDate
          : undefined;
        const nextRecurringTransaction = {
          ...baseTransaction,
          notes: writeTransactionNotes(getVisibleNotes(baseTransaction.notes), {
            ...readTransactionMeta(baseTransaction.notes),
            entryMode: 'fixed' as const,
            generatedFrom: transaction.date,
            generatedUntil: endDate,
          }),
        };
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

        await recurringRepository.stopFrom(recurringRule, recurringOccurrenceDate);
        if (forwardMaterializedIds.length > 0) await transactionRepository.removeMany(forwardMaterializedIds);
        await recurringRepository.createFromTransaction(nextRecurringTransaction, endDate);
        await loadSnapshot();
        await refreshAccounts();
        setEditingTransaction(null);
        showFeedback({ title: 'Série atualizada', description: 'Esta e as próximas ocorrências foram ajustadas.', tone: 'success' });
        return;
      }

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
        showFeedback({ title: 'Ocorrência ajustada', description: 'A despesa fixa deste mês virou lançamento avulso.', tone: 'success' });
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
        showFeedback({ title: 'Lançamento criado', description: `${saved.description} foi salvo.`, tone: 'success' });
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
            description: formatDescriptionForTransactionMeta(transaction.description, itemMeta),
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
        showFeedback({ title: 'Série atualizada', description: `${saved.length} lançamento(s) foram ajustados.`, tone: 'success' });
        return;
      }

      const saved = await transactionRepository.update(editingTransaction.id, transaction);
      setSnapshot((current) => ({
        ...current,
        transactions: current.transactions.map((item) => item.id === saved.id ? saved : item),
      }));
      await refreshAccounts();
      setEditingTransaction(null);
      showFeedback({ title: 'Lançamento atualizado', description: `${saved.description} foi salvo.`, tone: 'success' });
      return;
    }

    const [transactionWithSortOrder] = assignInvoiceSortOrderToNewTransactions([transaction]);
    const saved = await transactionRepository.create(transactionWithSortOrder);
    setSnapshot((current) => ({
      ...current,
      transactions: [saved, ...current.transactions],
    }));
    await refreshAccounts();
    showFeedback({ title: 'Lançamento salvo', description: `${saved.description} entrou no mês.`, tone: 'success' });
  }

  async function handleCreateRecurring(transaction: Omit<Transaction, 'id'>, endDate?: string) {
    await recurringRepository.createFromTransaction(transaction, endDate);
    await loadSnapshot();
    showFeedback({ title: 'Fixa criada', description: `${transaction.description} entrou na rotina mensal.`, tone: 'success' });
  }

  async function handleSaveCategory(input: Omit<Category, 'id' | 'isSystem'>) {
    if (editingCategory) {
      const saved = await categoryRepository.update(editingCategory.id, { ...input, originalName: editingCategory.name });
      setSnapshot((current) => ({
        ...current,
        categories: current.categories.map((category) => category.id === saved.id ? saved : category),
      }));
      setEditingCategory(null);
      showFeedback({ title: 'Categoria atualizada', description: `${saved.name} foi salva.`, tone: 'success' });
      return;
    }

    const saved = await categoryRepository.create(input);
    setSnapshot((current) => ({
      ...current,
      categories: [...current.categories, saved].sort((left, right) => left.name.localeCompare(right.name)),
    }));
    showFeedback({ title: 'Categoria criada', description: `${saved.name} está disponível nos lançamentos.`, tone: 'success' });
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

  async function handleToggleStatus(transaction: Transaction, paymentAccountId?: string) {
    const nextStatus: Transaction['status'] = transaction.status === 'paid' ? 'pending' : 'paid';
    const shouldRequirePaymentAccount = nextStatus === 'paid'
      && (transaction.flow === 'income' || transaction.flow === 'expense')
      && !transaction.cardId;
    if (shouldRequirePaymentAccount && !paymentAccountId) {
      throw new Error('Selecione de qual conta o saldo vai sair.');
    }
    const nextTransaction = shouldRequirePaymentAccount
      ? { ...transaction, status: nextStatus, accountId: paymentAccountId }
      : { ...transaction, status: nextStatus };

    if (transaction.isProjected) {
      const { id: _id, isProjected: _isProjected, ...input } = nextTransaction;
      const saved = await transactionRepository.create(input);
      setSnapshot((current) => ({
        ...current,
        transactions: [saved, ...current.transactions.filter((item) => item.id !== transaction.id)],
      }));
      await refreshAccounts();
      showFeedback({
        title: nextStatus === 'paid' ? 'Lançamento pago' : 'Lançamento reaberto',
        description: saved.description,
        tone: nextStatus === 'paid' ? 'success' : 'info',
      });
      return;
    }

    const saved = shouldRequirePaymentAccount
      ? await transactionRepository.update(transaction.id, nextTransaction)
      : await transactionRepository.updateStatus(transaction.id, nextStatus).then(() => nextTransaction);
    setSnapshot((current) => ({
      ...current,
      transactions: current.transactions.map((item) => item.id === transaction.id ? saved : item),
    }));
    await refreshAccounts();
    showFeedback({
      title: nextStatus === 'paid' ? 'Lançamento pago' : 'Lançamento reaberto',
      description: saved.description,
      tone: nextStatus === 'paid' ? 'success' : 'info',
    });
  }

  async function handleMarkAccountExpensePaid(transaction: Transaction, input: { accountId: string; paymentDate: string }) {
    if (!input.accountId) throw new Error('Selecione de qual conta o saldo vai sair.');
    if (!input.paymentDate) throw new Error('Selecione a data do pagamento.');

    const nextTransaction: Transaction = {
      ...transaction,
      status: 'paid',
      accountId: input.accountId,
      date: input.paymentDate,
    };

    if (transaction.isProjected) {
      const { id: _id, isProjected: _isProjected, ...transactionInput } = nextTransaction;
      const saved = await transactionRepository.create(transactionInput);
      setSnapshot((current) => ({
        ...current,
        transactions: [saved, ...current.transactions.filter((item) => item.id !== transaction.id)],
      }));
      await refreshAccounts();
      showFeedback({ title: 'Despesa paga', description: `${saved.description} saiu da conta escolhida.`, tone: 'success' });
      return;
    }

    const { id: _id, isProjected: _isProjected, ...transactionInput } = nextTransaction;
    const saved = await transactionRepository.update(transaction.id, transactionInput);
    setSnapshot((current) => ({
      ...current,
      transactions: current.transactions.map((item) => item.id === saved.id ? saved : item),
    }));
    await refreshAccounts();
    showFeedback({ title: 'Despesa paga', description: `${saved.description} saiu da conta escolhida.`, tone: 'success' });
  }

  async function handleMarkReimbursementReceived(transaction: Transaction, accountId: string, receivedAmount?: number) {
    const currentMeta = readTransactionMeta(transaction.notes);
    const originalReimbursementAmount = getTransactionReimbursementBaseAmount(transaction);
    const alreadyReceivedAmount = getTransactionReimbursementReceivedAmount(transaction);
    const currentPendingAmount = Math.max(0, originalReimbursementAmount - alreadyReceivedAmount);
    const normalizedReceivedAmount = Math.max(0, Math.min(currentPendingAmount, receivedAmount ?? currentPendingAmount));
    const nextReceivedTotal = Math.min(originalReimbursementAmount, alreadyReceivedAmount + normalizedReceivedAmount);
    const remainingReimbursementAmount = Math.max(0, originalReimbursementAmount - nextReceivedTotal);
    const nextReimbursementStatus = remainingReimbursementAmount > 0 ? 'pending' as const : 'received' as const;
    const nextReceivedAt = new Date().toISOString().slice(0, 10);
    const nextMeta = {
      ...currentMeta,
      reimbursementOriginalAmount: originalReimbursementAmount,
      reimbursementPayments: [
        ...(currentMeta.reimbursementPayments ?? []),
        { amount: normalizedReceivedAmount, accountId, date: nextReceivedAt },
      ],
      reimbursementCarryMonth: remainingReimbursementAmount > 0 ? currentMeta.reimbursementCarryMonth : undefined,
    };
    const nextNotes = writeTransactionNotes(getVisibleNotes(transaction.notes), nextMeta);

    if (transaction.isProjected) {
      const { id: _id, isProjected: _isProjected, ...input } = transaction;
      const saved = await transactionRepository.create({
        ...input,
        notes: nextNotes,
        isReimbursable: true,
        reimbursementAmount: nextReimbursementStatus === 'received' ? originalReimbursementAmount : remainingReimbursementAmount,
        reimbursementStatus: nextReimbursementStatus,
        reimbursementReceivedAt: nextReceivedAt,
        reimbursementReceivedAccountId: accountId,
      });
      setSnapshot((current) => ({
        ...current,
        transactions: [saved, ...current.transactions.filter((item) => item.id !== transaction.id)],
      }));
      await refreshAccounts();
      showFeedback({
        title: nextReimbursementStatus === 'received' ? 'Reembolso recebido' : 'Reembolso parcial registrado',
        description: `${formatCurrency(normalizedReceivedAmount)} entrou na conta escolhida.`,
        tone: 'success',
      });
      return;
    }

    const saved = await transactionRepository.update(transaction.id, {
      ...transaction,
      notes: nextNotes,
      isReimbursable: true,
      reimbursementAmount: nextReimbursementStatus === 'received' ? originalReimbursementAmount : remainingReimbursementAmount,
      reimbursementStatus: nextReimbursementStatus,
      reimbursementReceivedAt: nextReceivedAt,
      reimbursementReceivedAccountId: accountId,
    });
    setSnapshot((current) => ({
      ...current,
      transactions: current.transactions.map((item) => item.id === saved.id ? saved : item),
    }));
    await refreshAccounts();
    showFeedback({
      title: nextReimbursementStatus === 'received' ? 'Reembolso recebido' : 'Reembolso parcial registrado',
      description: `${formatCurrency(normalizedReceivedAmount)} entrou na conta escolhida.`,
      tone: 'success',
    });
  }

  async function handleCarryReimbursement(transaction: Transaction, targetMonth = shiftMonthKey(activeMonth, 1)) {
    const meta = readTransactionMeta(transaction.notes);
    const nextNotes = writeTransactionNotes(getVisibleNotes(transaction.notes), {
      ...meta,
      reimbursementCarryMonth: targetMonth,
    });

    if (transaction.isProjected) {
      const { id: _id, isProjected: _isProjected, ...input } = transaction;
      const saved = await transactionRepository.create({ ...input, notes: nextNotes });
      setSnapshot((current) => ({
        ...current,
        transactions: [saved, ...current.transactions.filter((item) => item.id !== transaction.id)],
      }));
      await refreshAccounts();
      showFeedback({ title: 'Reembolso carregado', description: `Pendência movida para ${targetMonth}.`, tone: 'info' });
      return;
    }

    const saved = await transactionRepository.update(transaction.id, { ...transaction, notes: nextNotes });
    setSnapshot((current) => ({
      ...current,
      transactions: current.transactions.map((item) => item.id === saved.id ? saved : item),
    }));
    showFeedback({ title: 'Reembolso carregado', description: `Pendência movida para ${targetMonth}.`, tone: 'info' });
  }

  async function handleSkipFixedOccurrence(transaction: Transaction): Promise<boolean> {
    const meta = readTransactionMeta(transaction.notes);
    const recurringTransactionId = transaction.recurringTransactionId ?? meta.recurringTransactionId;
    const recurringOccurrenceDate = transaction.recurringOccurrenceDate ?? meta.recurringOccurrenceDate;
    const recurringRule = recurringTransactionId
      ? snapshot.recurringTransactions.find((rule) => rule.id === recurringTransactionId)
      : undefined;

    if (!recurringRule || !recurringOccurrenceDate) {
      throw new Error('Não foi possível localizar a regra desta despesa fixa.');
    }

    const confirmed = await confirmAction({
      title: 'Marcar fixa como não usada?',
      description: `A ocorrência "${transaction.description}" será removida apenas deste mês.`,
      details: 'A regra fixa continua ativa para os próximos meses.',
      tone: 'warning',
      confirmLabel: 'Marcar como não usada',
    });
    if (!confirmed) return false;

    const recurringRuleMeta = readTransactionMeta(recurringRule.notes);
    const recurringRuleNotes = writeTransactionNotes(getVisibleNotes(recurringRule.notes), {
      ...recurringRuleMeta,
      recurringExcludedDates: Array.from(new Set([
        ...(recurringRuleMeta.recurringExcludedDates ?? []),
        recurringOccurrenceDate,
      ])).sort(),
    });

    await recurringRepository.excludeOccurrence(recurringRule, recurringOccurrenceDate);
    if (!transaction.isProjected) await transactionRepository.remove(transaction.id);
    setSnapshot((current) => ({
      ...current,
      recurringTransactions: current.recurringTransactions.map((rule) => (
        rule.id === recurringRule.id ? { ...rule, notes: recurringRuleNotes } : rule
      )),
      transactions: current.transactions.filter((item) => !isSameRecurringOccurrence(item, recurringTransactionId, recurringOccurrenceDate)),
    }));
    await refreshAccounts();
    showFeedback({ title: 'Fixa ignorada neste mês', description: `${transaction.description} saiu da fila de pagamento.`, tone: 'success' });
    return true;
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

    const {
      account: updatedAccount,
      transactions: savedTransactions,
    } = await transactionRepository.payCardInvoice(input);
    const savedById = new Map(savedTransactions.map((transaction) => [transaction.id, transaction]));
    const paidIds = new Set(input.transactions.map((transaction) => transaction.id));
    const materializedProjectedTransactions = savedTransactions.filter(
      (transaction) => !paidIds.has(transaction.id),
    );

    setSnapshot((current) => ({
      ...current,
      accounts: current.accounts.map((item) => item.id === updatedAccount.id ? updatedAccount : item),
      transactions: [
        ...materializedProjectedTransactions,
        ...current.transactions
          .filter((transaction) => !transaction.isProjected || !paidIds.has(transaction.id))
          .map((transaction) => savedById.get(transaction.id) ?? transaction),
      ],
    }));
    showFeedback({ title: 'Fatura paga', description: `${input.card.name}: ${formatCurrency(input.amount)} saiu da conta.`, tone: 'success' });
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

  async function handleReset(): Promise<boolean> {
    try {
      const emptySnapshot = await clearFinanceSnapshot();
      setSnapshot(emptySnapshot);
      setCurrentView('home');
      setAppError('');
      showFeedback({ title: 'Dados limpos', description: 'Seu app voltou ao estado inicial.', tone: 'warning' });
      return true;
    } catch (error) {
      setAppError(getUserFriendlyError(error, 'Não foi possível limpar seus dados. Tente novamente.'));
      return false;
    }
  }

  async function handleUpdateProfile(input: { name: string }) {
    await updateAuthName(input.name);

    setUser((current) => ({
      ...current,
      name: input.name,
    }));
  }

  async function handleUpdateReimbursementsEnabled(enabled: boolean) {
    await profileRepository.updateReimbursementsEnabled(user.id, enabled);
    setUser((current) => ({ ...current, reimbursementsEnabled: enabled }));
    if (!enabled && currentView === 'reimbursements') setCurrentView('profile');
  }

  async function handleUpdateSavingsGoal(input: Pick<typeof user, 'savingsGoalMode' | 'savingsGoalAmount' | 'savingsGoalPercentage' | 'includePendingSalary'>) {
    await profileRepository.updateSavingsGoal(user.id, input);
    setUser((current) => ({ ...current, ...input }));
  }

  async function handleUpdateReportWidgets(reportWidgets: typeof user.reportWidgets) {
    await profileRepository.updateReportWidgets(user.id, reportWidgets);
    setUser((current) => ({ ...current, reportWidgets }));
  }

  async function handleDeleteTransaction(transaction: Transaction) {
    const meta = readTransactionMeta(transaction.notes);
    const recurringTransactionId = transaction.recurringTransactionId ?? meta.recurringTransactionId;
    const recurringOccurrenceDate = transaction.recurringOccurrenceDate ?? meta.recurringOccurrenceDate;
    const recurringRule = recurringTransactionId
      ? snapshot.recurringTransactions.find((rule) => rule.id === recurringTransactionId)
      : undefined;

    if (recurringRule && recurringOccurrenceDate) {
      const choice = await chooseAction({
        title: 'Excluir despesa fixa?',
        description: `Escolha o alcance da exclusão para "${transaction.description}".`,
        details: 'Esta ação altera uma regra recorrente. Confira se quer mexer só neste mês ou daqui para frente.',
        tone: 'danger',
        cancelLabel: 'Manter despesa',
        choices: [
          {
            value: 'single',
            label: 'Excluir somente esta ocorrência',
            description: 'Remove apenas este mês e mantém a despesa fixa ativa.',
            tone: 'warning',
          },
          {
            value: 'future',
            label: 'Excluir esta e as próximas',
            description: 'Encerra a recorrência a partir desta data.',
            tone: 'danger',
          },
        ],
      });
      if (choice === null) return;

      if (choice === 'single') {
        await recurringRepository.excludeOccurrence(recurringRule, recurringOccurrenceDate);
        if (!transaction.isProjected) {
          await transactionRepository.remove(transaction.id);
        }
        setSnapshot((current) => ({
          ...current,
          transactions: current.transactions.filter((item) => item.id !== transaction.id),
          recurringTransactions: current.recurringTransactions.map((rule) => (
            rule.id === recurringRule.id
              ? {
                ...rule,
                notes: writeTransactionNotes(getVisibleNotes(rule.notes), {
                  ...readTransactionMeta(rule.notes),
                  recurringExcludedDates: Array.from(new Set([
                    ...(readTransactionMeta(rule.notes).recurringExcludedDates ?? []),
                    recurringOccurrenceDate,
                  ])).sort(),
                }),
              }
              : rule
          )),
        }));
        await loadSnapshot();
        await refreshAccounts();
        showFeedback({ title: 'Ocorrência excluída', description: `${transaction.description} saiu apenas deste mês.`, tone: 'success' });
        return;
      }

      if (choice === 'future') {
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
        showFeedback({ title: 'Recorrência encerrada', description: 'Esta e as próximas ocorrências foram removidas.', tone: 'success' });
        return;
      }

      return;
    }

    if (transaction.isProjected) {
      await showActionMessage({
        title: 'Regra fixa não encontrada',
        description: 'Não foi possível localizar a regra desta ocorrência fixa. Recarregue o aplicativo e tente novamente.',
        tone: 'warning',
      });
      return;
    }

    const groupedTransactions = meta.seriesId
      ? snapshot.transactions.filter((item) => readTransactionMeta(item.notes).seriesId === meta.seriesId)
      : [];

    if (groupedTransactions.length > 1) {
      const forwardTransactions = groupedTransactions.filter((item) => item.date >= transaction.date);
      const choice = await chooseAction({
        title: 'Excluir série parcelada?',
        description: `Escolha o alcance da exclusão para "${transaction.description}".`,
        details: `Existem ${forwardTransactions.length} lançamento(s) desta série a partir desta data.`,
        tone: 'danger',
        cancelLabel: 'Manter lançamentos',
        choices: [
          {
            value: 'single',
            label: 'Excluir apenas este lançamento',
            description: 'Remove só o item selecionado.',
            tone: 'warning',
          },
          {
            value: 'future',
            label: 'Excluir este e os próximos',
            description: 'Remove este item e os lançamentos seguintes da série.',
            tone: 'danger',
          },
        ],
      });
      if (choice === null) return;

      if (choice === 'future') {
        const ids = forwardTransactions.map((item) => item.id);
        await transactionRepository.removeMany(ids);
        setSnapshot((current) => ({
          ...current,
          transactions: current.transactions.filter((item) => !ids.includes(item.id)),
        }));
        await refreshAccounts();
        showFeedback({ title: 'Série ajustada', description: `${ids.length} lançamento(s) foram removidos.`, tone: 'success' });
        return;
      }
    } else {
      const confirmed = await confirmAction({
        title: 'Excluir lançamento?',
        description: `O lançamento "${transaction.description}" será removido.`,
        details: 'Esta ação não pode ser desfeita.',
        tone: 'danger',
        confirmLabel: 'Excluir lançamento',
      });
      if (!confirmed) return;
    }

    await transactionRepository.remove(transaction.id);
    setSnapshot((current) => ({
      ...current,
      transactions: current.transactions.filter((item) => item.id !== transaction.id),
    }));
    await refreshAccounts();
    showFeedback({ title: 'Lançamento excluído', description: `${transaction.description} foi removido.`, tone: 'success' });
  }

  async function handleDeleteAccount(account: FinanceSnapshot['accounts'][number]) {
    const confirmed = await confirmAction({
      title: 'Excluir conta?',
      description: `A conta "${account.name}" será excluída se não houver lançamentos vinculados.`,
      details: 'Contas com histórico financeiro não podem ser excluídas. Para manter histórico fora das listas principais, use arquivar.',
      tone: 'danger',
      confirmLabel: 'Excluir conta',
    });
    if (!confirmed) return;

    try {
      await accountRepository.remove(account.id);
      setSnapshot((current) => ({
        ...current,
        accounts: current.accounts.filter((item) => item.id !== account.id),
        cards: current.cards.map((card) => card.accountId === account.id ? { ...card, accountId: '' } : card),
      }));
      showFeedback({ title: 'Conta excluída', description: `${account.name} foi removida.`, tone: 'success' });
    } catch (error) {
      await showActionMessage({
        title: 'Conta não excluída',
        description: error instanceof Error && error.message.includes('lançamentos vinculados')
          ? error.message
          : getUserFriendlyError(error, 'Não foi possível excluir a conta. Tente novamente.'),
        tone: 'warning',
      });
    }
  }

  async function handleSetAccountActive(account: FinanceSnapshot['accounts'][number], isActive: boolean) {
    const confirmed = await confirmAction({
      title: `${isActive ? 'Desarquivar' : 'Arquivar'} conta?`,
      description: `${isActive ? 'A conta voltará para listas e lançamentos.' : 'A conta sairá das listas principais, mas o histórico será mantido.'}`,
      details: account.name,
      tone: isActive ? 'success' : 'warning',
      confirmLabel: isActive ? 'Desarquivar conta' : 'Arquivar conta',
    });
    if (!confirmed) return;

    try {
      const saved = await accountRepository.setActive(account.id, isActive);
      setSnapshot((current) => ({
        ...current,
        accounts: current.accounts.map((item) => item.id === saved.id ? saved : item),
      }));
      if (!isActive && selectedAccountId === account.id) setSelectedAccountId('');
      showFeedback({
        title: isActive ? 'Conta desarquivada' : 'Conta arquivada',
        description: saved.name,
        tone: isActive ? 'success' : 'info',
      });
    } catch (error) {
      await showActionMessage({
        title: 'Conta não alterada',
        description: getUserFriendlyError(error, `Não foi possível ${isActive ? 'desarquivar' : 'arquivar'} a conta. Tente novamente.`),
        tone: 'warning',
      });
    }
  }

  async function handleDeleteCard(card: FinanceSnapshot['cards'][number]) {
    const linkedTransactions = snapshot.transactions.filter((transaction) => transaction.cardId === card.id).length;
    const confirmed = await confirmAction({
      title: 'Excluir cartão?',
      description: `O cartão "${card.name}" e ${linkedTransactions} lançamento(s) das faturas vinculadas serão removidos.`,
      details: 'Esta ação não pode ser desfeita. Se quiser preservar histórico, prefira arquivar o cartão.',
      tone: 'danger',
      confirmLabel: 'Excluir cartão',
    });
    if (!confirmed) return;

    try {
      await cardRepository.remove(card.id);
      setSnapshot((current) => ({
        ...current,
        cards: current.cards.filter((item) => item.id !== card.id),
        transactions: current.transactions.filter((transaction) => transaction.cardId !== card.id),
      }));
      showFeedback({ title: 'Cartão excluído', description: `${card.name} foi removido.`, tone: 'success' });
    } catch (error) {
      await showActionMessage({
        title: 'Cartão não excluído',
        description: getUserFriendlyError(error, 'Não foi possível excluir o cartão. Tente novamente.'),
        tone: 'warning',
      });
    }
  }

  async function handleSetCardActive(card: FinanceSnapshot['cards'][number], isActive: boolean) {
    const confirmed = await confirmAction({
      title: `${isActive ? 'Desarquivar' : 'Arquivar'} cartão?`,
      description: `${isActive ? 'O cartão voltará para listas e lançamentos.' : 'O cartão sairá das listas principais, mas as faturas antigas serão mantidas.'}`,
      details: card.name,
      tone: isActive ? 'success' : 'warning',
      confirmLabel: isActive ? 'Desarquivar cartão' : 'Arquivar cartão',
    });
    if (!confirmed) return;

    try {
      const saved = await cardRepository.setActive(card.id, isActive);
      setSnapshot((current) => ({
        ...current,
        cards: current.cards.map((item) => item.id === saved.id ? saved : item),
      }));
      if (!isActive && selectedCardId === card.id) setSelectedCardId('');
      showFeedback({
        title: isActive ? 'Cartão desarquivado' : 'Cartão arquivado',
        description: saved.name,
        tone: isActive ? 'success' : 'info',
      });
    } catch (error) {
      await showActionMessage({
        title: 'Cartão não alterado',
        description: getUserFriendlyError(error, `Não foi possível ${isActive ? 'desarquivar' : 'arquivar'} o cartão. Tente novamente.`),
        tone: 'warning',
      });
    }
  }

  async function handleDeleteCategory(category: Category) {
    const confirmed = await confirmAction({
      title: 'Excluir categoria?',
      description: `A categoria "${category.name}" será removida.`,
      details: 'Lançamentos vinculados ficarão como "Outros".',
      tone: 'danger',
      confirmLabel: 'Excluir categoria',
    });
    if (!confirmed) return;

    try {
      await categoryRepository.remove(category.id);
      setSnapshot((current) => ({
        ...current,
        categories: current.categories.filter((item) => item.id !== category.id),
      }));
      showFeedback({ title: 'Categoria excluída', description: `${category.name} foi removida.`, tone: 'success' });
    } catch (error) {
      await showActionMessage({
        title: 'Categoria não excluída',
        description: getUserFriendlyError(error, 'Não foi possível excluir a categoria. Tente novamente.'),
        tone: 'warning',
      });
    }
  }

  async function handleSignOut() {
    await signOut();
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
        onPasswordRecovered={finishPasswordRecovery}
      />
    );
  }

  return (
    <AppShell
      currentView={currentView}
      reimbursementsEnabled={user.reimbursementsEnabled}
      onNavigate={(view) => {
        setCurrentView(view);
        setDashboardTransactionFilter(null);
        if (view === 'accounts') setSelectedAccountId('');
        if (view === 'cards') setSelectedCardId('');
        setSelectedReimbursementPersonId(null);
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

      <Suspense fallback={<ViewLoadingFallback />}>
        {currentView === 'home' ? (
          <DashboardView
          userName={user.name}
          accounts={activeAccounts}
          cards={snapshot.cards}
          categories={snapshot.categories}
          transactions={snapshot.transactions}
          reserveBoxes={snapshot.reserveBoxes}
          activeMonth={activeMonth}
          summary={summary}
          savingsPreferences={user}
          reimbursementsEnabled={user.reimbursementsEnabled}
          showBalances={showBalances}
          notificationCount={unreadCount}
          onPreviousMonth={() => setActiveMonth((month) => shiftMonthKey(month, -1))}
          onNextMonth={() => setActiveMonth((month) => shiftMonthKey(month, 1))}
          onCurrentMonth={() => setActiveMonth(getCurrentMonthKey())}
          onToggleBalances={() => setShowBalances((value) => !value)}
          onAdd={() => {
            setEditingTransaction(null);
            setIsAddOpen(true);
          }}
          onOpenProfile={() => setCurrentView('profile')}
          onOpenNotifications={() => setCurrentView('notifications')}
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
          onViewReserves={() => setCurrentView('reserves')}
          onViewReimbursements={() => {
            setSelectedReimbursementPersonId(null);
            setCurrentView('reimbursements');
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

      {currentView === 'month-center' ? (
        <MonthCenterView
          accounts={snapshot.accounts}
          cards={snapshot.cards}
          categories={snapshot.categories}
          people={snapshot.reimbursementPeople}
          transactions={snapshot.transactions}
          activeMonth={activeMonth}
          summary={summary}
          reimbursementsEnabled={user.reimbursementsEnabled}
          onPreviousMonth={() => setActiveMonth((month) => shiftMonthKey(month, -1))}
          onNextMonth={() => setActiveMonth((month) => shiftMonthKey(month, 1))}
          onCurrentMonth={() => setActiveMonth(getCurrentMonthKey())}
          onOpenCards={(cardId) => {
            setSelectedCardId(cardId ?? '');
            setCurrentView('cards');
          }}
          onOpenTransactions={() => {
            setDashboardTransactionFilter('pending');
            setCurrentView('transactions');
          }}
          onOpenReimbursements={(personId) => {
            setSelectedReimbursementPersonId(personId ?? null);
            setCurrentView('reimbursements');
          }}
          onPayInvoice={handlePayCardInvoice}
          onMarkAccountExpensePaid={(transaction, input) => runAppAction(
            () => handleMarkAccountExpensePaid(transaction, input),
            'Não foi possível registrar o pagamento. Tente novamente.',
          )}
          onMarkReimbursementReceived={(transaction, accountId, receivedAmount) => runAppAction(
            () => handleMarkReimbursementReceived(transaction, accountId, receivedAmount),
            'Não foi possível atualizar o reembolso. Tente novamente.',
          )}
          onCarryReimbursement={(transaction) => runAppAction(
            () => handleCarryReimbursement(transaction),
            'Não foi possível levar o reembolso para o próximo mês. Tente novamente.',
          )}
          onSkipFixedOccurrence={(transaction) => runAppAction(
            () => handleSkipFixedOccurrence(transaction),
            'Não foi possível marcar a despesa como não usada neste mês. Tente novamente.',
          )}
        />
      ) : null}

      {currentView === 'accounts' ? (
        <AccountsView
          accounts={snapshot.accounts}
          cards={snapshot.cards}
          categories={snapshot.categories}
          transactions={snapshot.transactions}
          reserveBoxes={snapshot.reserveBoxes}
          reserveBoxMovements={snapshot.reserveBoxMovements}
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
          onUpdateAccountBalance={handleUpdateAccountBalance}
          onArchiveAccount={(account) => void handleSetAccountActive(account, false)}
          onRestoreAccount={(account) => void handleSetAccountActive(account, true)}
          onOpenInvoice={(cardId, period) => {
            setSelectedCardId(cardId);
            setActiveMonth(period);
            setCurrentView('cards');
          }}
          onPreviousMonth={() => setActiveMonth((month) => shiftMonthKey(month, -1))}
          onNextMonth={() => setActiveMonth((month) => shiftMonthKey(month, 1))}
          onCurrentMonth={() => setActiveMonth(getCurrentMonthKey())}
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
          onReorderInvoiceTransactions={reorderInvoiceTransactions}
          onPayInvoice={handlePayCardInvoice}
          onImportInvoiceTransactions={(transactions) => handleSaveTransaction(transactions)}
          onUpdateCardClosingDay={handleUpdateCardClosingDay}
          onEditCard={(card) => {
            setEditingCard(card);
            setIsAddCardOpen(true);
          }}
          onDeleteCard={handleDeleteCard}
          onArchiveCard={(card) => void handleSetCardActive(card, false)}
          onRestoreCard={(card) => void handleSetCardActive(card, true)}
        />
      ) : null}

      {currentView === 'reserves' ? (
        <ReserveBoxesView
          boxes={snapshot.reserveBoxes}
          movements={snapshot.reserveBoxMovements}
          accounts={activeAccounts}
          showBalances={showBalances}
          onCreateBox={handleCreateReserveBox}
          onAddMovement={handleAddReserveBoxMovement}
        />
      ) : null}

      {currentView === 'transactions' ? (
        <TransactionsView
          transactions={snapshot.transactions}
          reimbursementsEnabled={user.reimbursementsEnabled}
          accounts={snapshot.accounts}
          cards={snapshot.cards}
          categories={snapshot.categories}
          reimbursementPeople={snapshot.reimbursementPeople}
          activeMonth={activeMonth}
          dashboardFilter={dashboardTransactionFilter}
          onToggleStatus={(transaction, paymentAccountId) => runAppAction(
            () => handleToggleStatus(transaction, paymentAccountId),
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
          onOpenReimbursements={(personId) => {
            setSelectedReimbursementPersonId(personId);
            setCurrentView('reimbursements');
          }}
        />
      ) : null}

      {currentView === 'reimbursements' ? (
        <ReimbursementsView
          people={snapshot.reimbursementPeople}
          accounts={snapshot.accounts}
          cards={snapshot.cards}
          transactions={snapshot.transactions}
          activeMonth={activeMonth}
          initialPersonId={selectedReimbursementPersonId}
          onPreviousMonth={() => setActiveMonth((month) => shiftMonthKey(month, -1))}
          onNextMonth={() => setActiveMonth((month) => shiftMonthKey(month, 1))}
          onCurrentMonth={() => setActiveMonth(getCurrentMonthKey())}
          onMarkReceived={(transaction, accountId, receivedAmount) => runAppAction(
            () => handleMarkReimbursementReceived(transaction, accountId, receivedAmount),
            'Não foi possível atualizar o reembolso. Tente novamente.',
          )}
          onCarryReimbursement={(transaction) => runAppAction(
            () => handleCarryReimbursement(transaction),
            'Não foi possível levar o reembolso para o próximo mês. Tente novamente.',
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
          accounts={snapshot.accounts}
          reserveBoxes={snapshot.reserveBoxes}
          cards={snapshot.cards}
          transactions={snapshot.transactions}
          categories={snapshot.categories}
          savingsPreferences={user}
          reportWidgets={user.reportWidgets}
          reimbursementsEnabled={user.reimbursementsEnabled}
          onPreviousMonth={() => setActiveMonth((month) => shiftMonthKey(month, -1))}
          onNextMonth={() => setActiveMonth((month) => shiftMonthKey(month, 1))}
          onCurrentMonth={() => setActiveMonth(getCurrentMonthKey())}
        />
      ) : null}

      {currentView === 'notifications' ? (
        <NotificationsView
          error={notificationError}
          notifications={notifications}
          onMarkAllRead={markAllRead}
          onMarkRead={markRead}
          onNavigate={setCurrentView}
        />
      ) : null}

      {currentView === 'goals' ? (
        <GoalsView
          categories={snapshot.categories}
          reimbursementPeople={snapshot.reimbursementPeople}
          onConfirmAction={confirmAction}
        />
      ) : null}

        {currentView === 'profile' ? (
          <ProfileView
          user={user}
          accounts={snapshot.accounts}
          cards={snapshot.cards}
          categories={snapshot.categories}
          transactions={snapshot.transactions}
          showBalances={showBalances}
          notificationCount={unreadCount}
          onToggleBalances={() => setShowBalances((value) => !value)}
          onOpenNotifications={() => setCurrentView('notifications')}
          onUpdateProfile={handleUpdateProfile}
          onUpdateReimbursementsEnabled={handleUpdateReimbursementsEnabled}
          onUpdateSavingsGoal={handleUpdateSavingsGoal}
          onUpdateReportWidgets={handleUpdateReportWidgets}
          onAddAccount={() => {
            setEditingAccount(null);
            setIsAddAccountOpen(true);
          }}
          onEditAccount={(account) => {
            setEditingAccount(account);
            setIsAddAccountOpen(true);
          }}
          onArchiveAccount={(account) => void handleSetAccountActive(account, false)}
          onRestoreAccount={(account) => void handleSetAccountActive(account, true)}
          onAddCard={() => {
            setEditingCard(null);
            setIsAddCardOpen(true);
          }}
          onEditCard={(card) => {
            setEditingCard(card);
            setIsAddCardOpen(true);
          }}
          onArchiveCard={(card) => void handleSetCardActive(card, false)}
          onRestoreCard={(card) => void handleSetCardActive(card, true)}
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
      </Suspense>

      <Suspense fallback={<ModalLoadingFallback />}>
        {isAddOpen ? (
          <AddEntryModal
            isOpen
            accounts={accountsForEntryModal}
            cards={cardsForEntryModal}
            categories={snapshot.categories}
            reimbursementPeople={snapshot.reimbursementPeople}
            reimbursementsEnabled={user.reimbursementsEnabled}
            transaction={editingTransaction}
            preferredCardId={currentView === 'cards' ? (selectedCardId || activeCards[0]?.id) : undefined}
            onCreateCategory={handleCreateCategoryFromEntry}
            onCreateReimbursementPerson={handleCreateReimbursementPerson}
            onCreateRecurring={handleCreateRecurring}
            onSkipFixedOccurrence={async (transaction) => {
              try {
                const didSkip = await handleSkipFixedOccurrence(transaction);
                setAppError('');
                return didSkip;
              } catch (error) {
                setAppError(getUserFriendlyError(error, 'Não foi possível marcar a despesa como não usada neste mês. Tente novamente.'));
                return false;
              }
            }}
            onClose={() => {
              setIsAddOpen(false);
              setEditingTransaction(null);
            }}
            onSave={handleSaveTransaction}
          />
        ) : null}

        {isAddAccountOpen ? (
          <AddAccountModal
            isOpen
            accounts={activeAccounts}
            account={editingAccount}
            onClose={() => {
              setIsAddAccountOpen(false);
              setEditingAccount(null);
            }}
            onSave={handleSaveAccount}
          />
        ) : null}

        {isAddCardOpen ? (
          <AddCardModal
            isOpen
            accounts={accountOptionsForCardModal}
            cards={activeCards}
            card={editingCard}
            onClose={() => {
              setIsAddCardOpen(false);
              setEditingCard(null);
            }}
            onSave={handleSaveCard}
          />
        ) : null}

        {isAddCategoryOpen ? (
          <AddCategoryModal
            isOpen
            categories={snapshot.categories}
            category={editingCategory}
            defaultFlow={newCategoryFlow}
            onClose={() => {
              setIsAddCategoryOpen(false);
              setEditingCategory(null);
            }}
            onSave={handleSaveCategory}
          />
        ) : null}
      </Suspense>

      {feedbackOverlays}
    </AppShell>
  );
}

