import { Category } from '../../types';
import { addMonths } from '../../lib/utils/date';
import { Layers, Repeat, TrendingDown } from 'lucide-react';

export const expenseModes = [
  { id: 'variable' as const, label: 'Variável', icon: TrendingDown },
  { id: 'fixed' as const, label: 'Fixa', icon: Repeat },
  { id: 'installment' as const, label: 'Parcelada', icon: Layers },
];

export const expenseNeedOptions = [
  { id: 'essential' as const, label: 'Essencial' },
  { id: 'superfluous' as const, label: 'Supérflua' },
];

export type PaymentSourceType = 'account' | 'card';

export const splitModeOptions = [
  { id: 'none' as const, label: 'Só minha' },
  { id: 'shared' as const, label: 'Dividir conta' },
  { id: 'third_party_full' as const, label: '100% de terceiro' },
];

export const OPEN_ENDED_FIXED_MONTHS = 12;
export const MAX_FIXED_MONTHS = 120;
export const REIMBURSEMENT_CATEGORY_NAME = 'Reembolsos';
export const INVOICE_ADJUSTMENT_CATEGORY_NAME = 'Ajustes de fatura';

export function normalizeCategoryName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function isReimbursementCategory(category: Category): boolean {
  const name = normalizeCategoryName(category.name);
  return category.flow === 'expense' && (name === 'reembolso' || name === 'reembolsos');
}

export function isInvoiceAdjustmentCategory(category: Category): boolean {
  const name = normalizeCategoryName(category.name);
  return category.flow === 'expense' && (name === 'ajuste de fatura' || name === 'ajustes de fatura');
}

export function buildMonthlyDates(startDate: string, endDate: string, maxMonths = MAX_FIXED_MONTHS): string[] {
  if (!startDate || !endDate || endDate < startDate) return [];
  const dates: string[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate && dates.length < maxMonths) {
    dates.push(currentDate);
    currentDate = addMonths(currentDate, 1);
  }

  return dates;
}

export function buildOpenEndedMonthlyDates(startDate: string): string[] {
  return buildMonthlyDates(startDate, addMonths(startDate, OPEN_ENDED_FIXED_MONTHS - 1), OPEN_ENDED_FIXED_MONTHS);
}

export function parseEntryCount(value: string, minimum: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(60, Math.max(minimum, parsed));
}
