import React, { useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { AddEntryModal } from './components/transactions/AddEntryModal';
import { AddAccountModal } from './components/accounts/AddAccountModal';
import { AddCardModal } from './components/cards/AddCardModal';
import { CardsView } from './components/cards/CardsView';
import { AddCategoryModal } from './components/categories/AddCategoryModal';
import { ReportsView } from './components/reports/ReportsView';
import { ProfileView } from './components/profile/ProfileView';
import { AccountsView } from './components/accounts/AccountsView';
import { AuthView } from './components/auth/AuthView';
import { mockUser } from './data/mockData';
import { accountRepository } from './features/accounts/accountRepository';
import { cardRepository } from './features/cards/cardRepository';
import { categoryRepository } from './features/categories/categoryRepository';
import { loadFinanceSnapshot, resetFinanceSnapshot } from './features/finance/financeStore';
import { transactionRepository } from './features/transactions/transactionRepository';
import { isSupabaseConfigured, supabase } from './lib/supabase/supabaseClient';
import { AccountType, AppView, CardNetwork, Category, DashboardTransactionFilter, FinanceSnapshot, Transaction, UserProfile } from './types';
import { getCurrentMonthKey, shiftMonthKey, summarizeDashboard } from './lib/utils/finance';
import { addMonths } from './lib/utils/date';
import { getVisibleNotes, readTransactionMeta, writeTransactionNotes } from './lib/utils/transactionMeta';

const emptyFinanceSnapshot: FinanceSnapshot = {
  accounts: [],
  cards: [],
  categories: [],
  transactions: [],
};

function formatDescriptionForTransactionMeta(description: string, transaction: Transaction) {
  const meta = readTransactionMeta(transaction.notes);
  if (meta.entryMode !== 'installment' || !meta.installmentNumber || !meta.totalInstallments) return description;
  return `${description.replace(/\s\(\d+\/\d+\)$/, '')} (${meta.installmentNumber}/${meta.totalInstallments})`;
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
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [dashboardTransactionFilter, setDashboardTransactionFilter] = useState<DashboardTransactionFilter | null>(null);
  const [showBalances, setShowBalances] = useState(true);
  const [activeMonth, setActiveMonth] = useState(getCurrentMonthKey);
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured);
  const [user, setUser] = useState<UserProfile>(mockUser);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  async function loadSnapshot() {
    const loaded = await loadFinanceSnapshot();
    setSnapshot(loaded);
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      loadSnapshot();
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      if (sessionUser) {
        setUser({
          id: sessionUser.id,
          name: sessionUser.user_metadata.full_name ?? sessionUser.email ?? 'Usuário',
          email: sessionUser.email ?? '',
          plan: 'AxisFin',
        });
        setIsAuthenticated(true);
        loadSnapshot();
      }
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      setIsAuthenticated(Boolean(sessionUser));
      if (sessionUser) {
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
    () => summarizeDashboard(snapshot.accounts, snapshot.cards, snapshot.transactions, activeMonth),
    [activeMonth, snapshot.accounts, snapshot.cards, snapshot.transactions],
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
      return;
    }

    if (editingTransaction) {
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
          return {
            ...item,
            ...transaction,
            id: item.id,
            description: formatDescriptionForTransactionMeta(transaction.description, item),
            date: addMonths(transaction.date, index),
            notes: writeTransactionNotes(visibleNotes, { ...itemMeta, expenseNeed: updatedMeta.expenseNeed ?? itemMeta.expenseNeed }),
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
        setEditingTransaction(null);
        return;
      }

      const saved = await transactionRepository.update(editingTransaction.id, transaction);
      setSnapshot((current) => ({
        ...current,
        transactions: current.transactions.map((item) => item.id === saved.id ? saved : item),
      }));
      setEditingTransaction(null);
      return;
    }

    const saved = await transactionRepository.create(transaction);
    setSnapshot((current) => ({
      ...current,
      transactions: [saved, ...current.transactions],
    }));
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

  async function handleToggleStatus(transaction: Transaction) {
    const nextStatus = transaction.status === 'paid' ? 'pending' : 'paid';
    await transactionRepository.updateStatus(transaction.id, nextStatus);
    setSnapshot((current) => ({
      ...current,
      transactions: current.transactions.map((item) =>
        item.id === transaction.id ? { ...item, status: nextStatus } : item,
      ),
    }));
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
    if (input.amount <= 0 || input.transactions.length === 0) throw new Error('Esta fatura nao tem valor para pagamento.');

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
    const restored = await resetFinanceSnapshot();
    setSnapshot(restored);
    setCurrentView('home');
  }

  async function handleDeleteTransaction(transaction: Transaction) {
    const meta = readTransactionMeta(transaction.notes);
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
      alert(error instanceof Error ? error.message : 'Não foi possível excluir a conta.');
    }
  }

  async function handleDeleteCard(card: FinanceSnapshot['cards'][number]) {
    const linkedTransactions = snapshot.transactions.filter((transaction) => transaction.cardId === card.id).length;
    const confirmed = window.confirm(`Excluir o cartao "${card.name}"? Esta acao apaga o cartao e ${linkedTransactions} lancamento(s) das faturas vinculadas. Nao pode ser desfeita.`);
    if (!confirmed) return;

    try {
      await cardRepository.remove(card.id);
      setSnapshot((current) => ({
        ...current,
        cards: current.cards.filter((item) => item.id !== card.id),
        transactions: current.transactions.filter((transaction) => transaction.cardId !== card.id),
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível excluir o cartão.');
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
      alert(error instanceof Error ? error.message : 'Não foi possível excluir a categoria.');
    }
  }

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setIsAuthenticated(false);
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

  if (!isAuthenticated) {
    return <AuthView onAuthenticated={loadSnapshot} />;
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
          onDeleteTransaction={handleDeleteTransaction}
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
          activeMonth={activeMonth}
          dashboardFilter={dashboardTransactionFilter}
          onToggleStatus={handleToggleStatus}
          onEdit={(transaction) => {
            setEditingTransaction(transaction);
            setIsAddOpen(true);
          }}
          onDelete={handleDeleteTransaction}
        />
      ) : null}

      {currentView === 'reports' ? (
        <ReportsView
          month={activeMonth}
          transactions={snapshot.transactions}
          cards={snapshot.cards}
          categories={snapshot.categories}
          summary={summary}
        />
      ) : null}

      {currentView === 'profile' ? (
        <ProfileView
          user={user}
          cards={snapshot.cards}
          categories={snapshot.categories}
          onViewReports={() => setCurrentView('reports')}
          onAddCard={() => {
            setEditingCard(null);
            setIsAddCardOpen(true);
          }}
          onEditCard={(card) => {
            setEditingCard(card);
            setIsAddCardOpen(true);
          }}
          onDeleteCard={handleDeleteCard}
          onAddCategory={() => {
            setEditingCategory(null);
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
        transaction={editingTransaction}
        onCreateCategory={handleCreateCategoryFromEntry}
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
        onClose={() => {
          setIsAddCategoryOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
      />
    </AppShell>
  );
}

