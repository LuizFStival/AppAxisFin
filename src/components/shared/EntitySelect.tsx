import { ChevronDown, CreditCard } from 'lucide-react';
import type { ReactNode } from 'react';
import { Account, Card } from '../../types';
import { formatCurrency } from '../../lib/utils/finance';
import { BankLogo } from './BankLogo';
import { cx, surface } from './visualTokens';

interface BaseSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  placeholder?: string;
  includeEmptyOption?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}

interface AccountSelectProps extends BaseSelectProps {
  accounts: Account[];
}

interface CardSelectProps extends BaseSelectProps {
  cards: Card[];
}

function getCardNetworkLabel(network: Card['network']) {
  if (network === 'mastercard') return 'Mastercard';
  if (network === 'visa') return 'Visa';
  if (network === 'elo') return 'Elo';
  return 'Cartao';
}

function SelectShell({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cx('grid min-w-0 gap-2 text-xs font-semibold text-slate-400', className)}>
      {label ? <span>{label}</span> : null}
      {children}
    </label>
  );
}

export function AccountSelect({
  accounts,
  value,
  onChange,
  label,
  className,
  placeholder = 'Selecione uma conta',
  includeEmptyOption = false,
  emptyLabel = 'Selecione',
  disabled = false,
}: AccountSelectProps) {
  const selectedAccount = accounts.find((account) => account.id === value) ?? null;
  const isDisabled = disabled || accounts.length === 0;

  return (
    <SelectShell label={label} className={className}>
      <div className={cx(surface.interactive, 'relative min-h-14 overflow-hidden p-3', isDisabled && 'opacity-60')}>
        {selectedAccount ? (
          <div className="pointer-events-none flex min-w-0 items-center gap-3 pr-7">
            <BankLogo account={selectedAccount} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{selectedAccount.name}</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                {selectedAccount.institution || 'Conta'} · {formatCurrency(selectedAccount.balance)}
              </p>
            </div>
          </div>
        ) : (
          <div className="pointer-events-none flex min-h-8 items-center pr-7 text-sm font-bold text-slate-500">
            {accounts.length === 0 ? 'Cadastre uma conta' : placeholder}
          </div>
        )}
        <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={isDisabled}
          aria-label={label ?? placeholder}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        >
          {includeEmptyOption ? <option value="">{emptyLabel}</option> : null}
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} - {formatCurrency(account.balance)}
            </option>
          ))}
        </select>
      </div>
    </SelectShell>
  );
}

export function CardSelect({
  cards,
  value,
  onChange,
  label,
  className,
  placeholder = 'Selecione um cartao',
  includeEmptyOption = true,
  emptyLabel = 'Selecione',
  disabled = false,
}: CardSelectProps) {
  const selectedCard = cards.find((card) => card.id === value) ?? null;
  const isDisabled = disabled || cards.length === 0;

  return (
    <SelectShell label={label} className={className}>
      <div className={cx(surface.interactive, 'relative min-h-14 overflow-hidden p-3', isDisabled && 'opacity-60')}>
        {selectedCard ? (
          <div className="pointer-events-none flex min-w-0 items-center gap-3 pr-7">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg"
              style={{
                backgroundImage: `linear-gradient(135deg, ${selectedCard.color}, #111827)`,
                boxShadow: `0 14px 28px ${selectedCard.color}24`,
              }}
            >
              <CreditCard size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{selectedCard.name}</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                {getCardNetworkLabel(selectedCard.network)} · limite {formatCurrency(selectedCard.limit)}
              </p>
            </div>
          </div>
        ) : (
          <div className="pointer-events-none flex min-h-8 items-center pr-7 text-sm font-bold text-slate-500">
            {cards.length === 0 ? 'Cadastre um cartao' : placeholder}
          </div>
        )}
        <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={isDisabled}
          aria-label={label ?? placeholder}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        >
          {includeEmptyOption ? <option value="">{emptyLabel}</option> : null}
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name} - {getCardNetworkLabel(card.network)}
            </option>
          ))}
        </select>
      </div>
    </SelectShell>
  );
}
