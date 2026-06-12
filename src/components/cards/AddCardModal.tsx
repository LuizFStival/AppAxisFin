import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';
import { Account, Card, CardNetwork } from '../../types';
import { CurrencyInput } from '../shared/CurrencyInput';
import { DEFAULT_CURRENCY_INPUT, formatCurrencyInput, parseCurrencyInput } from '../../lib/utils/currency';
import { DuplicateNameError, hasDuplicateName } from '../../lib/utils/validation';

interface AddCardModalProps {
  isOpen: boolean;
  accounts: Account[];
  cards: Card[];
  card?: Card | null;
  onClose: () => void;
  onSave: (input: {
    name: string;
    accountId?: string;
    limit: number;
    closingDay: number;
    dueDay: number;
    color: string;
    network: CardNetwork;
  }) => Promise<void>;
}

const networks: { id: CardNetwork; label: string }[] = [
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'visa', label: 'Visa' },
  { id: 'elo', label: 'Elo' },
  { id: 'other', label: 'Outro' },
];

export function AddCardModal({ isOpen, accounts, cards, card, onClose, onSave }: AddCardModalProps) {
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [limit, setLimit] = useState(DEFAULT_CURRENCY_INPUT);
  const [closingDay, setClosingDay] = useState('1');
  const [dueDay, setDueDay] = useState('10');
  const [network, setNetwork] = useState<CardNetwork>('mastercard');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(card?.name ?? '');
    setAccountId(card?.accountId || accounts[0]?.id || '');
    setLimit(card ? formatCurrencyInput(card.limit) : DEFAULT_CURRENCY_INPUT);
    setClosingDay(String(card?.closingDay ?? 1));
    setDueDay(String(card?.dueDay ?? 10));
    setNetwork(card?.network ?? 'mastercard');
    setError('');
    setIsSaving(false);
  }, [accounts, card, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Informe o nome do cartao.');
      return;
    }

    if (hasDuplicateName(trimmedName, cards.map((item) => item.name), card?.name)) {
      setError('Ja existe um cartao com esse nome.');
      return;
    }

    const parsedLimit = parseCurrencyInput(limit);
    if (parsedLimit <= 0) {
      setError('Informe um limite valido.');
      return;
    }

    const parsedClosingDay = Number(closingDay);
    const parsedDueDay = Number(dueDay);
    if (!Number.isInteger(parsedClosingDay) || parsedClosingDay < 1 || parsedClosingDay > 31) {
      setError('Dia de fechamento deve ser entre 1 e 31.');
      return;
    }
    if (!Number.isInteger(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
      setError('Dia de vencimento deve ser entre 1 e 31.');
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        name: trimmedName,
        accountId: accountId || undefined,
        limit: parsedLimit,
        closingDay: parsedClosingDay,
        dueDay: parsedDueDay,
        color: '#8B5CF6',
        network,
      });
      onClose();
    } catch (saveError) {
      if (saveError instanceof DuplicateNameError) {
        setError(saveError.message);
      } else {
        setError('Nao foi possivel criar o cartao. Tente novamente.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-t-[28px] border border-white/10 bg-[#0B0E14] p-5 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">{card ? 'Editar cartao' : 'Novo cartao'}</h2>
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
              placeholder="Ex: Nu Credito, C6 Carbon"
              className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400"
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Conta vinculada
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400"
            >
              <option value="">Nenhuma</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Limite
            <CurrencyInput value={limit} onChange={setLimit} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-xs font-semibold text-slate-400">
              Fechamento
              <input
                type="number"
                min={1}
                max={31}
                value={closingDay}
                onChange={(event) => setClosingDay(event.target.value)}
                className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-400">
              Vencimento
              <input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(event) => setDueDay(event.target.value)}
                className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400"
              />
            </label>
          </div>

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Bandeira
            <select
              value={network}
              onChange={(event) => setNetwork(event.target.value as CardNetwork)}
              className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400"
            >
              {networks.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 font-bold text-white disabled:opacity-60"
        >
          <Check size={18} />
          {isSaving ? 'Salvando...' : card ? 'Salvar cartao' : 'Criar cartao'}
        </button>
      </form>
    </div>
  );
}
