import { roundMoney } from './finance';

export interface QuickEntryDraft {
  id: string;
  raw: string;
  date?: string;
  description: string;
  amount: number;
  categoryHint?: string;
  error?: string;
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function parseAmount(value: string): { amount: number; text: string } | null {
  const matches = Array.from(value.matchAll(/(?:R\$\s*)?(\d{1,6}(?:\.\d{3})*,\d{2}|\d{1,6}\.\d{2}|\d{1,6},\d{1,2})/gi));
  const match = matches.at(-1);
  if (!match) return null;

  const rawNumber = match[1];
  const normalized = rawNumber.includes(',')
    ? rawNumber.replace(/\./g, '').replace(',', '.')
    : rawNumber;
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    amount: roundMoney(amount),
    text: match[0],
  };
}

function parseDate(value: string, fallbackYear: number): { date: string; text: string } | null {
  const match = value.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (!match) {
    const monthNames: Record<string, number> = {
      janeiro: 1,
      fevereiro: 2,
      marco: 3,
      março: 3,
      abril: 4,
      maio: 5,
      junho: 6,
      julho: 7,
      agosto: 8,
      setembro: 9,
      outubro: 10,
      novembro: 11,
      dezembro: 12,
    };
    const textDateMatch = value.toLowerCase().match(/\b(?:dia\s*)?(\d{1,2})\s+de\s+([a-zç]+)(?:\s+de\s+(\d{2,4}))?\b/i);
    if (!textDateMatch) return null;

    const day = Number.parseInt(textDateMatch[1], 10);
    const month = monthNames[textDateMatch[2]];
    const yearPart = textDateMatch[3];
    const year = yearPart
      ? Number.parseInt(yearPart.length === 2 ? `20${yearPart}` : yearPart, 10)
      : fallbackYear;
    if (!month || month < 1 || month > 12 || day < 1 || day > 31 || year < 2000) return null;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

    return {
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      text: textDateMatch[0],
    };
  }

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const yearPart = match[3];
  const year = yearPart
    ? Number.parseInt(yearPart.length === 2 ? `20${yearPart}` : yearPart, 10)
    : fallbackYear;

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return {
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    text: match[0],
  };
}

function cleanDescription(value: string): { description: string; categoryHint?: string } {
  const parts = value
    .split('|')
    .map((part) => normalizeSpaces(part))
    .filter(Boolean);
  const description = parts[0] ?? '';
  return {
    description,
    categoryHint: parts.length > 1 ? parts.at(-1) : undefined,
  };
}

export function parseQuickEntries(text: string, today = new Date()): QuickEntryDraft[] {
  const fallbackYear = today.getFullYear();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((raw, index) => {
      const amountResult = parseAmount(raw);
      const dateResult = parseDate(raw, fallbackYear);
      let clean = raw;
      if (amountResult) clean = clean.replace(amountResult.text, ' ');
      if (dateResult) clean = clean.replace(dateResult.text, ' ');
      clean = normalizeSpaces(clean.replace(/\s[-–—]\s/g, ' | '));
      const { description, categoryHint } = cleanDescription(clean);

      const draft: QuickEntryDraft = {
        id: `quick-${index}-${raw.slice(0, 12)}`,
        raw,
        date: dateResult?.date,
        description,
        amount: amountResult?.amount ?? 0,
        categoryHint,
      };

      if (!amountResult) draft.error = 'Valor não encontrado';
      else if (!description) draft.error = 'Título não encontrado';
      return draft;
    });
}
