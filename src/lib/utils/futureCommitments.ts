import type { Card, Transaction } from '../../types';
import type { ExpenseNeedBucket } from './expenseNeed';
import {
  getPersonalExpenseSignedAmount,
  getTransactionCompetenceMonth,
  roundMoney,
} from './finance';
import { getExpenseNeedLabel } from './expenseNeed';
import { readTransactionMeta } from './transactionMeta';

export interface FutureCommitmentMonth {
  month: string;
  total: number;
  count: number;
  seriesCount: number;
}

export interface FutureCommitmentNature {
  key: ExpenseNeedBucket;
  label: string;
  total: number;
  count: number;
  percent: number;
}

export interface FutureInstallmentCommitments {
  currentMonthTotal: number;
  totalCommitted: number;
  installmentCount: number;
  seriesCount: number;
  lastCommitmentMonth?: string;
  essentialDurableTotal: number;
  essentialDurablePercent: number;
  superfluousTotal: number;
  superfluousPercent: number;
  natureSummary: FutureCommitmentNature[];
  monthlyProjection: FutureCommitmentMonth[];
}

export function summarizeFutureInstallmentCommitments(
  transactions: Transaction[],
  cards: Card[],
  fromMonth: string,
): FutureInstallmentCommitments {
  const currentMonthSeries = new Set<string>();
  const futureSeries = new Set<string>();
  const months = new Map<string, { total: number; count: number; series: Set<string> }>();
  const natureTotals = new Map<ExpenseNeedBucket, { total: number; count: number }>();
  let currentMonthTotal = 0;
  let totalCommitted = 0;
  let installmentCount = 0;

  transactions.forEach((transaction) => {
    if (transaction.flow !== 'expense') return;
    const meta = readTransactionMeta(transaction.notes);
    if (meta.entryMode !== 'installment') return;

    const amount = getPersonalExpenseSignedAmount(transaction);
    if (amount <= 0) return;

    const competenceMonth = getTransactionCompetenceMonth(transaction, cards);
    const seriesKey = meta.seriesId ?? transaction.id;

    if (competenceMonth === fromMonth) {
      currentMonthTotal = roundMoney(currentMonthTotal + amount);
      currentMonthSeries.add(seriesKey);
      return;
    }

    if (competenceMonth <= fromMonth) return;

    const current = months.get(competenceMonth) ?? { total: 0, count: 0, series: new Set<string>() };
    current.total = roundMoney(current.total + amount);
    current.count += 1;
    current.series.add(seriesKey);
    months.set(competenceMonth, current);
    futureSeries.add(seriesKey);
    totalCommitted = roundMoney(totalCommitted + amount);
    installmentCount += 1;

    const natureKey: ExpenseNeedBucket = meta.expenseNeed ?? 'unclassified';
    const nature = natureTotals.get(natureKey) ?? { total: 0, count: 0 };
    nature.total = roundMoney(nature.total + amount);
    nature.count += 1;
    natureTotals.set(natureKey, nature);
  });

  const monthlyProjection = Array.from(months.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, value]) => ({
      month,
      total: roundMoney(value.total),
      count: value.count,
      seriesCount: value.series.size,
    }));
  const natureOrder: ExpenseNeedBucket[] = ['essential', 'durable', 'superfluous', 'unclassified'];
  const natureSummary = natureOrder
    .map((key) => {
      const value = natureTotals.get(key) ?? { total: 0, count: 0 };
      return {
        key,
        label: getExpenseNeedLabel(key),
        total: roundMoney(value.total),
        count: value.count,
        percent: totalCommitted > 0 ? roundMoney(value.total / totalCommitted * 100) : 0,
      };
    })
    .filter((item) => item.total > 0 || item.count > 0);
  const essentialDurableTotal = roundMoney(
    (natureTotals.get('essential')?.total ?? 0)
    + (natureTotals.get('durable')?.total ?? 0),
  );
  const superfluousTotal = roundMoney(natureTotals.get('superfluous')?.total ?? 0);

  return {
    currentMonthTotal: roundMoney(currentMonthTotal),
    totalCommitted: roundMoney(totalCommitted),
    installmentCount,
    seriesCount: futureSeries.size,
    lastCommitmentMonth: monthlyProjection.at(-1)?.month,
    essentialDurableTotal,
    essentialDurablePercent: totalCommitted > 0 ? roundMoney(essentialDurableTotal / totalCommitted * 100) : 0,
    superfluousTotal,
    superfluousPercent: totalCommitted > 0 ? roundMoney(superfluousTotal / totalCommitted * 100) : 0,
    natureSummary,
    monthlyProjection,
  };
}
