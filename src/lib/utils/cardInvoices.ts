import { Card } from '../../types';
import { clampDay, formatLocalDate, parseLocalDate } from './date';

export interface CardInvoiceInfo {
  period: string;
  label: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  status: 'aberta' | 'fechada' | 'vencida';
}

function shiftMonth(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function formatInvoiceMonthLabel(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

export function getCardInvoiceInfo(card: Card, purchaseDate: string, todayValue = formatLocalDate(new Date())): CardInvoiceInfo {
  const purchase = parseLocalDate(purchaseDate);
  const closingInPurchaseMonth = clampDay(purchase.getFullYear(), purchase.getMonth(), card.closingDay);
  const closesInNextMonth = purchase >= closingInPurchaseMonth;
  const endMonthBase = closesInNextMonth ? shiftMonth(purchase, 1) : purchase;
  const endDate = clampDay(endMonthBase.getFullYear(), endMonthBase.getMonth(), card.closingDay);
  const previousEndMonth = shiftMonth(endDate, -1);
  const previousEndDate = clampDay(previousEndMonth.getFullYear(), previousEndMonth.getMonth(), card.closingDay);
  const startDate = new Date(previousEndDate);

  const dueMonthOffset = card.dueDay > card.closingDay ? 0 : 1;
  const dueMonth = shiftMonth(endDate, dueMonthOffset);
  const dueDate = clampDay(dueMonth.getFullYear(), dueMonth.getMonth(), card.dueDay);
  const period = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
  const today = parseLocalDate(todayValue);
  const status = today <= endDate ? 'aberta' : today <= dueDate ? 'fechada' : 'vencida';

  return {
    period,
    label: `Fatura ${formatInvoiceMonthLabel(period)}`,
    startDate: formatLocalDate(startDate),
    endDate: formatLocalDate(endDate),
    dueDate: formatLocalDate(dueDate),
    status,
  };
}

export function getCardInvoiceInfoForPeriod(card: Card, period: string, todayValue = formatLocalDate(new Date())): CardInvoiceInfo {
  return getCardInvoiceInfoForClosingMonth(card, period, todayValue);
}

export function getCardInvoiceInfoForClosingMonth(card: Card, closingMonth: string, todayValue = formatLocalDate(new Date())): CardInvoiceInfo {
  const [year, month] = closingMonth.split('-').map(Number);
  const endDate = clampDay(year, month - 1, card.closingDay);
  const previousEndMonth = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
  const previousEndDate = clampDay(previousEndMonth.getFullYear(), previousEndMonth.getMonth(), card.closingDay);
  const dueMonthOffset = card.dueDay > card.closingDay ? 0 : 1;
  const dueMonth = shiftMonth(endDate, dueMonthOffset);
  const dueDate = clampDay(dueMonth.getFullYear(), dueMonth.getMonth(), card.dueDay);
  const period = closingMonth;
  const today = parseLocalDate(todayValue);
  const status = today <= endDate ? 'aberta' : today <= dueDate ? 'fechada' : 'vencida';

  return {
    period,
    label: `Fatura ${formatInvoiceMonthLabel(period)}`,
    startDate: formatLocalDate(previousEndDate),
    endDate: formatLocalDate(endDate),
    dueDate: formatLocalDate(dueDate),
    status,
  };
}

export function getCardInvoiceClosingMonth(card: Card, purchaseDate: string): string {
  return getCardInvoiceInfo(card, purchaseDate).endDate.slice(0, 7);
}
