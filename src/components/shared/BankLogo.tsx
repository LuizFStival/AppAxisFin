import React from 'react';
import { Wallet } from 'lucide-react';
import { Account } from '../../types';

export type BankBrand = {
  id: string;
  name: string;
  aliases: string[];
  color: string;
  mark: string;
};

export const BANK_BRANDS: BankBrand[] = [
  { id: 'nubank', name: 'Nubank', aliases: ['nubank', 'nu'], color: '#8A05BE', mark: 'NU' },
  { id: 'itau', name: 'Itau', aliases: ['itau', 'itau unibanco'], color: '#EC7000', mark: 'IT' },
  { id: 'bb', name: 'Banco do Brasil', aliases: ['banco do brasil', 'bb'], color: '#F8D117', mark: 'BB' },
  { id: 'bradesco', name: 'Bradesco', aliases: ['bradesco'], color: '#CC092F', mark: 'BR' },
  { id: 'caixa', name: 'Caixa', aliases: ['caixa', 'caixa economica'], color: '#005CA9', mark: 'CX' },
  { id: 'santander', name: 'Santander', aliases: ['santander'], color: '#EC0000', mark: 'ST' },
  { id: 'inter', name: 'Inter', aliases: ['inter', 'banco inter'], color: '#FF7A00', mark: 'IN' },
  { id: 'btg', name: 'BTG Pactual', aliases: ['btg', 'btg pactual'], color: '#172B4D', mark: 'BTG' },
  { id: 'c6', name: 'C6 Bank', aliases: ['c6', 'c6 bank'], color: '#111827', mark: 'C6' },
  { id: 'sicredi', name: 'Sicredi', aliases: ['sicredi'], color: '#3FAE2A', mark: 'SI' },
];

export function findBankBrand(value?: string): BankBrand | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;

  return BANK_BRANDS.find((brand) =>
    brand.aliases.some((alias) => normalized === alias || normalized.includes(alias)),
  );
}

export function getAccountBankBrand(account: Account): BankBrand | undefined {
  return findBankBrand(account.institution) ?? findBankBrand(account.name);
}

interface BankLogoProps {
  account: Account;
  size?: 'sm' | 'md';
}

export function BankLogo({ account, size = 'md' }: BankLogoProps) {
  const brand = getAccountBankBrand(account);
  const boxSize = size === 'sm' ? 'h-7 w-7 rounded-lg text-[10px]' : 'h-11 w-11 rounded-xl text-xs';
  const backgroundColor = brand?.color ?? account.color;
  const textColor = brand?.id === 'bb' ? '#172554' : '#FFFFFF';

  return (
    <span
      className={`flex shrink-0 items-center justify-center font-display font-bold ${boxSize}`}
      style={{ backgroundColor, color: textColor }}
      title={brand?.name ?? account.institution}
    >
      {brand ? brand.mark : <Wallet size={size === 'sm' ? 14 : 18} />}
    </span>
  );
}
