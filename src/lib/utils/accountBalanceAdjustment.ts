import { Account, Transaction } from '../../types';
import { roundMoney } from './finance';
import { writeTransactionNotes } from './transactionMeta';

export function buildAccountBalanceAdjustmentTransaction(input: {
  account: Account;
  balance: number;
  date: string;
  description?: string;
  adjustmentNature?: 'result' | 'internal_transfer';
}): Omit<Transaction, 'id'> | undefined {
  const difference = roundMoney(input.balance - input.account.balance);
  if (Math.abs(difference) < 0.01) return undefined;

  const isIncrease = difference > 0;
  const description = input.description?.trim()
    || (isIncrease ? 'Ajuste positivo de saldo' : 'Ajuste negativo de saldo');

  return {
    description,
    amount: Math.abs(difference),
    flow: isIncrease ? 'income' : 'expense',
    status: 'paid',
    date: input.date,
    accountId: input.account.id,
    notes: writeTransactionNotes(undefined, {
      accountBalanceAdjustment: isIncrease ? 'increase' : 'decrease',
      accountBalancePreviousBalance: input.account.balance,
      accountBalanceNewBalance: input.balance,
      accountBalanceAdjustmentDate: input.date,
      internalTransfer: input.adjustmentNature === 'internal_transfer' ? 'balance_adjustment' : undefined,
    }),
    isReimbursable: false,
    splitMode: 'none',
  };
}
