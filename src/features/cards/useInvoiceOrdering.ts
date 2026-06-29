import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { transactionRepository } from '../transactions/transactionRepository';
import { getVisibleNotes, readTransactionMeta, writeTransactionNotes } from '../../lib/utils/transactionMeta';
import type { AppView, FinanceSnapshot, Transaction } from '../../types';

interface UseInvoiceOrderingOptions {
  currentView: AppView;
  setSnapshot: Dispatch<SetStateAction<FinanceSnapshot>>;
  transactions: Transaction[];
  runAction: (action: () => Promise<void>, fallback: string) => Promise<void>;
}

export function useInvoiceOrdering({
  currentView,
  setSnapshot,
  transactions,
  runAction,
}: UseInvoiceOrderingOptions) {
  const pendingNotesRef = useRef(new Map<string, string | undefined>());
  const previousViewRef = useRef<AppView>(currentView);
  const runActionRef = useRef(runAction);
  const transactionsRef = useRef(transactions);

  useEffect(() => {
    runActionRef.current = runAction;
    transactionsRef.current = transactions;
  }, [runAction, transactions]);

  async function flushPendingOrder() {
    const pendingNotes = new Map(pendingNotesRef.current);
    if (pendingNotes.size === 0) return;

    const pendingTransactions = transactionsRef.current.filter((transaction) =>
      pendingNotes.has(transaction.id) && !transaction.isProjected,
    );
    const savedTransactions = await transactionRepository.updateMany(pendingTransactions);
    const savedById = new Map(savedTransactions.map((transaction) => [transaction.id, transaction]));

    pendingNotes.forEach((notes, id) => {
      if (pendingNotesRef.current.get(id) === notes) pendingNotesRef.current.delete(id);
    });
    setSnapshot((current) => ({
      ...current,
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
    const reorderedTransactions = orderedTransactions.map((transaction, index) => ({
      ...transaction,
      notes: writeTransactionNotes(getVisibleNotes(transaction.notes), {
        ...readTransactionMeta(transaction.notes),
        invoiceSortOrder: (index + 1) * 1000,
      }),
    }));
    const optimisticById = new Map(reorderedTransactions.map((transaction) => [transaction.id, transaction]));
    reorderedTransactions.forEach((transaction) => {
      if (!transaction.isProjected) pendingNotesRef.current.set(transaction.id, transaction.notes);
    });

    setSnapshot((current) => ({
      ...current,
      transactions: current.transactions.map((transaction) =>
        optimisticById.get(transaction.id) ?? transaction,
      ),
    }));
  }

  return { reorderInvoiceTransactions };
}
