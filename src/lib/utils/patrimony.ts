import { Account, Card, ReserveBox, ReserveBoxMovement, Transaction } from '../../types';
import { parseLocalDate } from './date';
import { getAccountMovementEntries, roundMoney } from './finance';

export interface BalanceFreshnessItem {
  id: string;
  name: string;
  kind: 'account' | 'reserve_box';
  lastBalanceUpdate: string;
  daysSinceUpdate: number;
  isStale: boolean;
}

export interface BalanceFreshnessSummary {
  items: BalanceFreshnessItem[];
  staleItems: BalanceFreshnessItem[];
  staleCount: number;
  mixedBalanceDates: boolean;
  oldestDate?: string;
  newestDate?: string;
}

export interface PatrimonyVariationSummary {
  accountPatrimony: number;
  reservePatrimony: number;
  currentPatrimony: number;
  estimatedStartPatrimony: number;
  monthlyAccountChange: number;
  monthlyReserveChange: number;
  monthlyInternalReserveChange: number;
  externalContributions: number;
  monthlyPatrimonyChange: number;
  adjustedPatrimonyChange: number;
  freshness: BalanceFreshnessSummary;
}

function daysBetween(start: string, end: string) {
  return Math.max(0, Math.floor((parseLocalDate(end).getTime() - parseLocalDate(start).getTime()) / 86_400_000));
}

function getReserveBoxSignedAmount(movement: ReserveBoxMovement) {
  if (movement.type === 'deposit') return movement.amount;
  if (movement.type === 'withdrawal') return -movement.amount;
  if (movement.type === 'yield') return movement.amount;
  return 0;
}

function getReserveLinkedAccountSignedAmount(movement: ReserveBoxMovement) {
  if (!movement.accountId) return 0;
  if (movement.type === 'deposit') return -movement.amount;
  if (movement.type === 'withdrawal') return movement.amount;
  return 0;
}

export function summarizeBalanceFreshness(
  accounts: Account[],
  reserveBoxes: ReserveBox[],
  referenceDate: string,
  staleAfterDays = 7,
): BalanceFreshnessSummary {
  const items = [
    ...accounts
      .filter((account) => account.isActive)
      .map((account) => ({
        id: account.id,
        name: account.name,
        kind: 'account' as const,
        lastBalanceUpdate: account.lastBalanceUpdate,
      })),
    ...reserveBoxes
      .filter((box) => box.isActive)
      .map((box) => ({
        id: box.id,
        name: box.name,
        kind: 'reserve_box' as const,
        lastBalanceUpdate: box.lastBalanceUpdate,
      })),
  ].map((item) => {
    const daysSinceUpdate = daysBetween(item.lastBalanceUpdate, referenceDate);
    return {
      ...item,
      daysSinceUpdate,
      isStale: daysSinceUpdate > staleAfterDays,
    };
  });
  const dateKeys = Array.from(new Set(items.map((item) => item.lastBalanceUpdate).filter(Boolean))).sort();
  const staleItems = items.filter((item) => item.isStale);

  return {
    items,
    staleItems,
    staleCount: staleItems.length,
    mixedBalanceDates: dateKeys.length > 1,
    oldestDate: dateKeys[0],
    newestDate: dateKeys.at(-1),
  };
}

export function summarizePatrimonyVariation(input: {
  accounts: Account[];
  reserveBoxes: ReserveBox[];
  reserveBoxMovements: ReserveBoxMovement[];
  transactions: Transaction[];
  cards?: Card[];
  month: string;
  referenceDate: string;
}): PatrimonyVariationSummary {
  const activeAccounts = input.accounts.filter((account) => account.isActive);
  const activeReserveBoxes = input.reserveBoxes.filter((box) => box.isActive);
  const activeAccountIds = new Set(activeAccounts.map((account) => account.id));
  const activeReserveBoxIds = new Set(activeReserveBoxes.map((box) => box.id));

  const accountPatrimony = roundMoney(activeAccounts.reduce((sum, account) => sum + account.balance, 0));
  const reservePatrimony = roundMoney(activeReserveBoxes.reduce((sum, box) => sum + box.currentBalance, 0));
  const currentPatrimony = roundMoney(accountPatrimony + reservePatrimony);

  const transactionAccountChange = roundMoney(activeAccounts.reduce((accountSum, account) => {
    const movement = input.transactions.flatMap((transaction) =>
      getAccountMovementEntries(transaction, account.id, input.cards ?? [])
        .filter((entry) => entry.month === input.month)
        .map((entry) => entry.amount),
    ).reduce((sum, amount) => sum + amount, 0);
    return accountSum + movement;
  }, 0));

  const monthReserveMovements = input.reserveBoxMovements
    .filter((movement) => activeReserveBoxIds.has(movement.reserveBoxId))
    .filter((movement) => movement.date.startsWith(input.month));
  const reserveBoxChange = roundMoney(monthReserveMovements.reduce((sum, movement) => sum + getReserveBoxSignedAmount(movement), 0));
  const reserveLinkedAccountChange = roundMoney(monthReserveMovements.reduce((sum, movement) => {
    if (movement.accountId && !activeAccountIds.has(movement.accountId)) return sum;
    return sum + getReserveLinkedAccountSignedAmount(movement);
  }, 0));
  const externalContributions = roundMoney(monthReserveMovements.reduce((sum, movement) => {
    if (movement.type !== 'deposit' || movement.accountId) return sum;
    return sum + movement.amount;
  }, 0));
  const monthlyAccountChange = roundMoney(transactionAccountChange + reserveLinkedAccountChange);
  const monthlyReserveChange = reserveBoxChange;
  const monthlyPatrimonyChange = roundMoney(monthlyAccountChange + monthlyReserveChange);
  const adjustedPatrimonyChange = roundMoney(monthlyPatrimonyChange - externalContributions);

  return {
    accountPatrimony,
    reservePatrimony,
    currentPatrimony,
    estimatedStartPatrimony: roundMoney(currentPatrimony - monthlyPatrimonyChange),
    monthlyAccountChange,
    monthlyReserveChange,
    monthlyInternalReserveChange: reserveLinkedAccountChange,
    externalContributions,
    monthlyPatrimonyChange,
    adjustedPatrimonyChange,
    freshness: summarizeBalanceFreshness(activeAccounts, activeReserveBoxes, input.referenceDate),
  };
}
