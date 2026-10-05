import type { ExpenseNeed } from '../../types';

export type ExpenseNeedBucket = ExpenseNeed | 'unclassified';

export const expenseNeedOptions: Array<{
  id: ExpenseNeed;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: 'essential',
    label: 'Essencial',
    shortLabel: 'Essencial',
    description: 'Necessidade recorrente ou gasto inevitavel.',
  },
  {
    id: 'durable',
    label: 'Bem durável',
    shortLabel: 'Durável',
    description: 'Compra que vira patrimônio de uso ou melhora estrutural.',
  },
  {
    id: 'superfluous',
    label: 'Supérflua',
    shortLabel: 'Supérflua',
    description: 'Escolha de consumo que pode ser reduzida ou adiada.',
  },
];

export function getExpenseNeedLabel(expenseNeed?: ExpenseNeedBucket): string {
  if (expenseNeed === 'unclassified') return 'Sem natureza';
  return expenseNeedOptions.find((option) => option.id === expenseNeed)?.label ?? '';
}

export function getExpenseNeedShortLabel(expenseNeed?: ExpenseNeedBucket): string {
  if (expenseNeed === 'unclassified') return 'Sem natureza';
  return expenseNeedOptions.find((option) => option.id === expenseNeed)?.shortLabel ?? '';
}

export function getExpenseNeedTagClass(expenseNeed?: ExpenseNeedBucket): string {
  if (expenseNeed === 'essential') return 'border-emerald-400/20 bg-emerald-500/15 text-emerald-100';
  if (expenseNeed === 'durable') return 'border-sky-400/20 bg-sky-500/15 text-sky-100';
  if (expenseNeed === 'superfluous') return 'border-rose-400/20 bg-rose-500/15 text-rose-100';
  return 'border-slate-400/20 bg-slate-500/15 text-slate-100';
}

export function getExpenseNeedToneClass(expenseNeed?: ExpenseNeedBucket): string {
  if (expenseNeed === 'essential') return 'bg-emerald-300';
  if (expenseNeed === 'durable') return 'bg-sky-300';
  if (expenseNeed === 'superfluous') return 'bg-rose-300';
  return 'bg-slate-500';
}

