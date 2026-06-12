import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, Check, TrendingDown, TrendingUp, X } from 'lucide-react';
import { Account, Card, Category, MoneyFlow, Transaction } from '../../types';
import { CurrencyInput } from '../shared/CurrencyInput';
import { DEFAULT_CURRENCY_INPUT, formatCurrencyInput, parseCurrencyInput } from '../../lib/utils/currency';

interface AddEntryModalProps {
  isOpen: boolean;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transaction?: Transaction | null;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>) => void | Promise<void>;
}

const flowOptions = [
  { id: 'expense' as const, label: 'Despesa', icon: TrendingDown },
  { id: 'income' as const, label: 'Receita', icon: TrendingUp },
  { id: 'transfer' as const, label: 'Transferencia', icon: ArrowRightLeft },
];

export function AddEntryModal({ isOpen, accounts, cards, categories, transaction, onClose, onSave }: AddEntryModalProps) {
  const [flow, setFlow] = useState<MoneyFlow>('expense');
  const [amount, setAmount] = useState(DEFAULT_CURRENCY_INPUT);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setFlow(transaction?.flow ?? 'expense');
    setAmount(transaction ? formatCurrencyInput(transaction.amount) : DEFAULT_CURRENCY_INPUT);
    setDescription(transaction?.description ?? '');
    setDate(transaction?.date ?? new Date().toISOString().slice(0, 10));
    setStatus(transaction?.status ?? 'paid');
    setAccountId(transaction?.accountId ?? accounts[0]?.id ?? '');
    setCardId(transaction?.cardId ?? '');
    setFromAccountId(transaction?.fromAccountId ?? accounts[0]?.id ?? '');
    setToAccountId(transaction?.toAccountId ?? accounts[1]?.id ?? accounts[0]?.id ?? '');
    setNotes(transaction?.notes ?? '');
  }, [accounts, isOpen, transaction]);

  useEffect(() => {
    const firstCategory = categories.find((category) => category.flow === flow);
    setCategoryId(transaction?.categoryId && transaction.flow === flow ? transaction.categoryId : firstCategory?.id ?? '');
  }, [categories, flow, transaction]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((category) => category.flow === flow);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsedAmount = parseCurrencyInput(amount);
    if (!description.trim() || parsedAmount <= 0) return;

    const base = {
      description: description.trim(),
      amount: parsedAmount,
      flow,
      status,
      date,
      notes: notes.trim() || undefined,
    };

    if (flow === 'transfer') {
      await onSave({
        ...base,
        fromAccountId,
        toAccountId,
      });
    } else {
      await onSave({
        ...base,
        categoryId,
        accountId: cardId ? undefined : accountId,
        cardId: cardId || undefined,
      });
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-t-[28px] border border-white/10 bg-[#0B0E14] p-5 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">{transaction ? 'Editar lancamento' : 'Novo lancamento'}</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-white/5 p-1">
          {flowOptions.map((option) => {
            const Icon = option.icon;
            const selected = flow === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFlow(option.id)}
                className={`flex h-12 items-center justify-center gap-1 rounded-xl text-xs font-bold transition ${
                  selected ? 'bg-sky-500 text-white' : 'text-slate-400'
                }`}
              >
                <Icon size={15} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Valor
            <CurrencyInput value={amount} onChange={setAmount} />
          </label>

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Descricao
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex: mercado, salario, pix reserva" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-xs font-semibold text-slate-400">
              Data
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400" />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-400">
              Estado
              <select value={status} onChange={(event) => setStatus(event.target.value as 'paid' | 'pending')} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400">
                <option value="paid">Confirmado</option>
                <option value="pending">Pendente</option>
              </select>
            </label>
          </div>

          {flow === 'transfer' ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-xs font-semibold text-slate-400">
                Origem
                <select value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400">
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-400">
                Destino
                <select value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400">
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-xs font-semibold text-slate-400">
                Categoria
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400">
                  {filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-400">
                Conta
                <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400">
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-400">
                Cartao
                <select value={cardId} onChange={(event) => setCardId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400">
                  <option value="">Nao usar</option>
                  {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                </select>
              </label>
            </div>
          )}

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Observacoes
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20 rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-sky-400" />
          </label>
        </div>

        <button type="submit" className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 font-bold text-white">
          <Check size={18} />
          Salvar lancamento
        </button>
      </form>
    </div>
  );
}
