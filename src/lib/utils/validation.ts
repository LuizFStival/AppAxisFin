export function normalizeEntityName(name: string): string {
  return name.trim().toLowerCase();
}

export function hasDuplicateName(name: string, existing: string[], excludeName?: string): boolean {
  const normalized = normalizeEntityName(name);
  if (!normalized) return false;

  const excluded = excludeName ? normalizeEntityName(excludeName) : null;

  return existing.some((item) => {
    const candidate = normalizeEntityName(item);
    if (!candidate) return false;
    if (excluded && candidate === excluded) return false;
    return candidate === normalized;
  });
}

export class DuplicateNameError extends Error {
  readonly entityLabel: 'conta' | 'cartao' | 'categoria';

  constructor(entityLabel: 'conta' | 'cartao' | 'categoria') {
    const messages = {
      conta: 'Ja existe uma conta com esse nome.',
      cartao: 'Ja existe um cartao com esse nome.',
      categoria: 'Ja existe uma categoria com esse nome para esse tipo.',
    };

    super(messages[entityLabel]);
    this.name = 'DuplicateNameError';
    this.entityLabel = entityLabel;
  }
}

export function isPostgresUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === '23505';
}
