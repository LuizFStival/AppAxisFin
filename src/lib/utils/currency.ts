const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const DEFAULT_CURRENCY_INPUT = brlFormatter.format(0);

export function parseCurrencyInput(value: string): number {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
}

export function formatCurrencyInput(value: number): string {
  return brlFormatter.format(value);
}

export function maskCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return DEFAULT_CURRENCY_INPUT;
  return formatCurrencyInput(Number(digits) / 100);
}
