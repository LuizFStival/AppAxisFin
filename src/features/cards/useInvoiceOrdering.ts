import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { recurringRepository } from '../recurring/recurringRepository';
import { transactionRepository } from '../transactions/transactionRepository';
import { getVisibleNotes, readTransactionMeta, writeTransactionNotes } from '../../lib/utils/transactionMeta';
import type { AppView, FinanceSnapshot, RecurringTransaction, Transaction } from '../../types';

interface UseInvoiceOrderingOptions {
  currentView: AppView;
  setSnapshot: Dispatch<SetStateAction<FinanceSnapshot>>;
  recurringTransactions: RecurringTransaction[];
  transactions: Transaction[];
  runAction: (action: () => Promise<void>, fallback: string) => Promise<void>;
}

export function useInvoiceOrdering({
  currentView,
  setSnapshot,
  recurringTransactions,
  transactions,
  runAction,
}: UseInvoiceOrderingOptions) {
  const pendingNotesRef = useRef(new Map<string, string | undefined>());
  const pendingRecurringNotesRef = useRef(new Map<string, string | undefined>());
  const previousViewRef = useRef<AppView>(currentView);
  const runActionRef = useRef(runAction);
  const recurringTransactionsRef = useRef<RecurringTransaction[]>(recurringTransactions);
  const transactionsRef = useRef<Transaction[]>(transactions);

  useEffect(() => {
    runActionRef.current = runAction;
    recurringTransactionsRef.current = recurringTransactions;
    transactionsRef.current = transactions;
  }, [recurringTransactions, runAction, transactions]);

  async function flushPendingOrder() {
    const pendingNotes = new Map<string, string | undefined>(pendingNotesRef.current);
    const pendingRecurringNotes = new Map<string, string | undefined>(pendingRecurringNotesRef.current);
    if (pendingNotes.size === 0 && pendingRecurringNotes.size === 0) return;

    const pendingTransactions = transactionsRef.current.filter((transaction) =>
      pendingNotes.has(transaction.id) && !transaction.isProjected,
    );
    const pendingRecurringTransactions = Array.from(pendingRecurringNotes, ([id, notes]) => ({ id, notes }));
    const [savedTransactions, savedRecurringTransactions] = await Promise.all([
      transactionRepository.updateMany(pendingTransactions),
      recurringRepository.updateManyNotes(pendingRecurringTransactions),
    ]);
    const savedById = new Map(savedTransactions.map((transaction) => [transaction.id, transaction]));
    const savedRecurringById = new Map(savedRecurringTransactions.map((transaction) => [transaction.id, transaction]));

    pendingNotes.forEach((notes, id) => {
      if (pendingNotesRef.current.get(id) === notes) pendingNotesRef.current.delete(id);
    });
    pendingRecurringNotes.forEach((notes, id) => {
      if (pendingRecurringNotesRef.current.get(id) === notes) pendingRecurringNotesRef.current.delete(id);
    });
    setSnapshot((current) => ({
      ...current,
      recurringTransactions: current.recurringTransactions.map((transaction) =>
        pendingRecurringNotesRef.current.has(transaction.id)
          ? transaction
          : savedRecurringById.get(transaction.id) ?? transaction,
      ),
      transactions: current.transactions.map((transaction) =>
        pendingNotesRef.current.has(transaction.id)
          ? transaction
          : savedById.get(transaction.id) ?? transaction,
      ),
    }));
  }

  useEffect(() => {
    const previousView = previousViewRef.current;
    previousViewRef.current = currentView;
    if (previousView !== 'cards' || currentView === 'cards') return;

    void runActionRef.current(
      flushPendingOrder,
      'A nova ordem da fatura ficou nesta tela, mas ainda não foi salva. Entre na fatura e tente sair novamente.',
    );
  }, [currentView]);

  function reorderInvoiceTransactions(orderedTransactions: Transaction[]) {
    const recurringById = new Map<string, RecurringTransaction>(
      recurringTransactionsRef.current.map((transaction) => [transaction.id, transaction]),
    );
    const nextRecurringNotesById = new Map<string, string | undefined>();
    const reorderedTransactions = orderedTransactions.map((transaction, index) => ({
      ...transaction,
      notes: writeTransactionNotes(getVisibleNotes(transaction.notes), {
        ...readTransactionMeta(transaction.notes),
        invoiceSortOrder: (index + 1) * 1000,
      }),
    })).map((transaction, index) => {
      if (!transaction.isProjected || !transaction.recurringTransactionId) return transaction;

      const recurringTransaction = recurringById.get(transaction.recurringTransactionId);
      const recurringNotes = writeTransactionNotes(getVisibleNotes(recurringTransaction?.notes), {
        ...readTransactionMeta(recurringTransaction?.notes),
        invoiceSortOrder: (index + 1) * 1000,
      });
      nextRecurringNotesById.set(transaction.recurringTransactionId, recurringNotes);

      return transaction;
    });
    const optimisticById = new Map(reorderedTransactions.map((transaction) => [transaction.id, transaction]));
    reorderedTransactions.forEach((transaction) => {
      if (!transaction.isProjected) pendingNotesRef.current.set(transaction.id, transaction.notes);
    });
    nextRecurringNotesById.forEach((notes, id) => pendingRecurringNotesRef.current.set(id, notes));

    setSnapshot((current) => ({
      ...current,
      recurringTransactions: current.recurringTransactions.map((transaction) =>
        nextRecurringNotesById.has(transaction.id)
          ? { ...transaction, notes: nextRecurringNotesById.get(transaction.id) }
          : transaction,
      ),
      transactions: current.transactions.map((transaction) =>
        optimisticById.get(transaction.id) ?? transaction,
      ),
    }));
  }

  return { reorderInvoiceTransactions };
}
