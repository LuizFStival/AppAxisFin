import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';
import { Account, AccountType } from '../../types';
import { CurrencyInput } from '../shared/CurrencyInput';
import { BANK_BRANDS, findBankBrand } from '../shared/BankLogo';
import { DEFAULT_CURRENCY_INPUT, formatCurrencyInput, parseCurrencyInput } from '../../lib/utils/currency';
import { DuplicateNameError, hasDuplicateName } from '../../lib/utils/validation';
import { getUserFriendlyError } from '../../lib/utils/userFriendlyError';

interface AddAccountModalProps {
  isOpen: boolean;
  accounts: Account[];
  account?: Account | null;
  onClose: () => void;
  onSave: (input: {
    name: string;
    type: AccountType;
    institution?: string;
    balance: number;
    color: string;
  }) => Promise<void>;
}

const accountTypes: { id: AccountType; label: string }[] = [
  { id: 'checking', label: 'Corrente' },
  { id: 'savings', label: 'Poupança' },
  { id: 'cash', label: 'Dinheiro' },
  { id: 'investment', label: 'Investimento' },
];

const accountColors = ['#3B82F6', '#8A05BE', '#EC7000', '#F8D117', '#CC092F', '#005CA9', '#EC0000', '#FF7A00', '#111827', '#10B981'];

export function AddAccountModal({ isOpen, accounts, account, onClose, onSave }: AddAccountModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [institution, setInstitution] = useState('');
  const [bankId, setBankId] = useState('custom');
  const [color, setColor] = useState('#3B82F6');
  const [balance, setBalance] = useState(DEFAULT_CURRENCY_INPUT);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const selectedBrand = findBankBrand(account?.institution);
    setName(account?.name ?? '');
    setType(account?.type ?? 'checking');
    setInstitution(account?.institution ?? '');
    setBankId(selectedBrand?.id ?? 'custom');
    setColor(account?.color ?? selectedBrand?.color ?? '#3B82F6');
    setBalance(account ? formatCurrencyInput(account.balance) : DEFAULT_CURRENCY_INPUT);
    setError('');
    setIsSaving(false);
  }, [account, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Informe o nome da conta.');
      return;
    }

    if (hasDuplicateName(trimmedName, accounts.map((item) => item.name), account?.name)) {
      setError('Já existe uma conta com esse nome.');
      return;
    }

    const parsedBalance = parseCurrencyInput(balance);
    if (parsedBalance < 0) {
      setError('Informe um saldo inicial válido.');
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        name: trimmedName,
        type,
        institution: institution.trim() || undefined,
        balance: parsedBalance,
        color,
      });
      onClose();
    } catch (saveError) {
      if (saveError instanceof DuplicateNameError) {
        setError(saveError.message);
      } else {
        setError(getUserFriendlyError(saveError, `Não foi possível ${account ? 'salvar' : 'criar'} a conta. Tente novamente.`));
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleBankChange(nextBankId: string) {
    setBankId(nextBankId);
    if (nextBankId === 'custom') return;

    const brand = BANK_BRANDS.find((item) => item.id === nextBankId);
    if (!brand) return;

    setInstitution(brand.name);
    setColor(brand.color);
    setName((current) => current.trim() ? current : brand.name);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-t-[28px] border border-white/10 bg-[#0B0E14] p-5 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">{account ? 'Editar conta' : 'Nova conta'}</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {error ? (
          <p className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertCircle size={16} />
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Nome
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Nubank, Carteira"
              className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400"
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Banco
            <select
              value={bankId}
              onChange={(event) => handleBankChange(event.target.value)}
              className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400"
            >
              <option value="custom">Outro / manual</option>
              {BANK_BRANDS.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Tipo
            <select
              value={type}
              onChange={(event) => setType(event.target.value as AccountType)}
              className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400"
            >
              {accountTypes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Instituição
            <input
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
              placeholder="Ex: Nubank, C6 Bank"
              className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400"
            />
          </label>

          <label className="grid gap-2 text-xs font-semibold text-slate-400">
            Cor da conta
            <div className="flex flex-wrap items-center gap-2">
              {accountColors.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColor(option)}
                  className={`h-8 w-8 rounded-full border-2 ${color === option ? 'border-white' : 'border-white/10'}`}
                  style={{ backgroundColor: option }}
                  title={option}
                />
              ))}
              <input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                type="color"
                className="h-8 w-10 rounded-lg border border-white/10 bg-white/5 p-1"
                title="Escolher cor"
              />
            </div>
          </label>

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Saldo inicial
            <CurrencyInput value={balance} onChange={setBalance} />
          </label>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 font-bold text-white disabled:opacity-60"
        >
          <Check size={18} />
          {isSaving ? 'Salvando...' : account ? 'Salvar conta' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
}
