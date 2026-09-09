import { ReserveBox, ReserveBoxMovement } from '../../types';
import { parseLocalDate } from './date';
import { roundMoney } from './finance';

export const BASE_CDI_ANNUAL_RATE = 0.105;

export function estimateReserveYield(balance: number, cdiPercent: number, startDate: string, endDate: string) {
  const days = Math.max(0, Math.floor((parseLocalDate(endDate).getTime() - parseLocalDate(startDate).getTime()) / 86_400_000));
  if (days === 0 || balance <= 0 || cdiPercent <= 0) return 0;
  const annualRate = BASE_CDI_ANNUAL_RATE * (cdiPercent / 100);
  return roundMoney(balance * (Math.pow(1 + annualRate, days / 365) - 1));
}

export function getReserveBoxExpectedBalance(box: ReserveBox, endDate: string) {
  return roundMoney(box.currentBalance + estimateReserveYield(box.currentBalance, box.cdiPercent, box.lastBalanceUpdate, endDate));
}

export function getReserveBoxDeltaFromEstimate(box: ReserveBox, endDate: string) {
  return roundMoney(box.currentBalance - getReserveBoxExpectedBalance(box, endDate));
}

export function summarizeReserveBoxes(boxes: ReserveBox[], endDate: string) {
  const activeBoxes = boxes.filter((box) => box.isActive);
  const totalBalance = roundMoney(activeBoxes.reduce((sum, box) => sum + box.currentBalance, 0));
  const estimatedYield = roundMoney(activeBoxes.reduce((sum, box) =>
    sum + estimateReserveYield(box.currentBalance, box.cdiPercent, box.lastBalanceUpdate, endDate), 0));
  const expectedBalance = roundMoney(totalBalance + estimatedYield);

  return {
    count: activeBoxes.length,
    totalBalance,
    estimatedYield,
    expectedBalance,
  };
}

export function getReserveInstitutions(boxes: ReserveBox[]) {
  return Array.from(new Set(boxes.map((box) => box.institution))).sort((left, right) => left.localeCompare(right, 'pt-BR'));
}

export function getReserveBoxMovements(box: ReserveBox, movements: ReserveBoxMovement[]) {
  return movements
    .filter((movement) => movement.reserveBoxId === box.id)
    .sort((left, right) => right.date.localeCompare(left.date) || (right.createdAt ?? '').localeCompare(left.createdAt ?? ''));
}
