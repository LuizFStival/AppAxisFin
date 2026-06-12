import React, { useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { AddEntryModal } from './components/transactions/AddEntryModal';
import { AddAccountModal } from './components/accounts/AddAccountModal';
import { AddCardModal } from './components/cards/AddCardModal';
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
import { AccountType, AppView, CardNetwork, Category, FinanceSnapshot, Transaction, UserProfile } from './types';
import { getCurrentMonthKey, shiftMonthKey, summarizeDashboard } from './lib/utils/finance';

const emptyFinanceSnapshot: FinanceSnapshot = {
  accounts: [],
  cards: [],
  categories: [],
  transactions: [],
};

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
          name: sessionUser.user_metadata.full_name ?? sessionUser.email ?? 'Usuario',
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
          name: sessionUser.user_metadata.full_name ?? sessionUser.email ?? 'Usuario',
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

  async function handleSaveTransaction(transaction: Omit<Transaction, 'id'>) {
    if (editingTransaction) {
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

  async function handleReset() {
    const restored = await resetFinanceSnapshot();
    setSnapshot(restored);
    setCurrentView('home');
  }

  async function handleDeleteTransaction(transaction: Transaction) {
    const confirmed = window.confirm(`Excluir o lancamento "${transaction.description}"? Esta acao nao pode ser desfeita.`);
    if (!confirmed) return;

    await transactionRepository.remove(transaction.id);
    setSnapshot((current) => ({
      ...current,
      transactions: current.transactions.filter((item) => item.id !== transaction.id),
    }));
  }

  async function handleDeleteAccount(account: FinanceSnapshot['accounts'][number]) {
    const confirmed = window.confirm(`Excluir a conta "${account.name}"? Contas com lancamentos vinculados nao podem ser excluidas.`);
    if (!confirmed) return;

    try {
      await accountRepository.remove(account.id);
      setSnapshot((current) => ({
        ...current,
        accounts: current.accounts.filter((item) => item.id !== account.id),
        cards: current.cards.map((card) => card.accountId === account.id ? { ...card, accountId: '' } : card),
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Nao foi possivel excluir a conta.');
    }
  }

  async function handleDeleteCard(card: FinanceSnapshot['cards'][number]) {
    const confirmed = window.confirm(`Excluir o cartao "${card.name}"? Cartoes com lancamentos vinculados nao podem ser excluidos.`);
    if (!confirmed) return;

    try {
      await cardRepository.remove(card.id);
      setSnapshot((current) => ({
        ...current,
        cards: current.cards.filter((item) => item.id !== card.id),
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Nao foi possivel excluir o cartao.');
    }
  }

  async function handleDeleteCategory(category: Category) {
    const confirmed = window.confirm(`Excluir a categoria "${category.name}"? Lancamentos vinculados ficarao como "Outros".`);
    if (!confirmed) return;

    try {
      await categoryRepository.remove(category.id);
      setSnapshot((current) => ({
        ...current,
        categories: current.categories.filter((item) => item.id !== category.id),
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Nao foi possivel excluir a categoria.');
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
      onNavigate={setCurrentView}
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
          onViewAccounts={() => setCurrentView('accounts')}
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

      {currentView === 'transactions' ? (
        <TransactionsView
          transactions={snapshot.transactions}
          accounts={snapshot.accounts}
          cards={snapshot.cards}
          categories={snapshot.categories}
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
          categories={snapshot.categories}
          summary={summary}
        />
      ) : null}

      {currentView === 'profile' ? (
        <ProfileView
          user={user}
          categories={snapshot.categories}
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
