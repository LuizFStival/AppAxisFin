import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRightLeft, CalendarClock, Check, Layers, Plus, Repeat, TrendingDown, TrendingUp, X } from 'lucide-react';
import { Account, Card, Category, EditSeriesScope, ExpenseEntryMode, ExpenseNeed, MoneyFlow, Transaction } from '../../types';
import { CurrencyInput } from '../shared/CurrencyInput';
import { DEFAULT_CURRENCY_INPUT, formatCurrencyInput, parseCurrencyInput } from '../../lib/utils/currency';
import { addMonths } from '../../lib/utils/date';
import { getCardInvoiceInfo } from '../../lib/utils/cardInvoices';
import { createSeriesId, getVisibleNotes, readTransactionMeta, writeTransactionNotes } from '../../lib/utils/transactionMeta';
import { hasDuplicateName } from '../../lib/utils/validation';

interface AddEntryModalProps {
  isOpen: boolean;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transaction?: Transaction | null;
  onCreateCategory: (input: Omit<Category, 'id' | 'isSystem'>) => Promise<Category>;
  onClose: () => void;
  onSave: (
    transaction: Omit<Transaction, 'id'> | Array<Omit<Transaction, 'id'>>,
    scope?: EditSeriesScope,
  ) => void | Promise<void>;
}

const flowOptions = [
  { id: 'expense' as const, label: 'Despesa', icon: TrendingDown },
  { id: 'income' as const, label: 'Receita', icon: TrendingUp },
  { id: 'transfer' as const, label: 'Transferência', icon: ArrowRightLeft },
];

const expenseModes = [
  { id: 'variable' as const, label: 'Variável', icon: TrendingDown },
  { id: 'fixed' as const, label: 'Fixa', icon: Repeat },
  { id: 'installment' as const, label: 'Parcelada', icon: Layers },
];

const expenseNeedOptions = [
  { id: 'essential' as const, label: 'Essencial' },
  { id: 'superfluous' as const, label: 'Supérflua' },
];

type PaymentSourceType = 'account' | 'card';

function buildMonthlyDates(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate || endDate < startDate) return [];
  const dates: string[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate && dates.length < 120) {
    dates.push(currentDate);
    currentDate = addMonths(currentDate, 1);
  }

  return dates;
}

function buildOpenEndedMonthlyDates(startDate: string): string[] {
  return buildMonthlyDates(startDate, addMonths(startDate, 119));
}

function parseEntryCount(value: string, minimum: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(60, Math.max(minimum, parsed));
}

export function AddEntryModal({ isOpen, accounts, cards, categories, transaction, onCreateCategory, onClose, onSave }: AddEntryModalProps) {
  const [flow, setFlow] = useState<MoneyFlow>('expense');
  const [expenseMode, setExpenseMode] = useState<ExpenseEntryMode>('variable');
  const [expenseNeed, setExpenseNeed] = useState<ExpenseNeed | ''>('');
  const [amount, setAmount] = useState(DEFAULT_CURRENCY_INPUT);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');
  const [categoryId, setCategoryId] = useState('');
  const [sourceType, setSourceType] = useState<PaymentSourceType>('account');
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [hasFixedEndDate, setHasFixedEndDate] = useState(false);
  const [fixedEndDate, setFixedEndDate] = useState('');
  const [installmentCount, setInstallmentCount] = useState('2');
  const [editScope, setEditScope] = useState<EditSeriesScope>('single');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [formError, setFormError] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const transactionMeta = useMemo(() => readTransactionMeta(transaction?.notes), [transaction]);
  const isGroupedTransaction = Boolean(transactionMeta.seriesId);

  useEffect(() => {
    if (!isOpen) return;

    setFlow(transaction?.flow ?? 'expense');
    setExpenseMode(transactionMeta.entryMode ?? 'variable');
    setExpenseNeed(transactionMeta.expenseNeed ?? '');
    setAmount(transaction ? formatCurrencyInput(transaction.amount) : DEFAULT_CURRENCY_INPUT);
    setDescription(transaction?.description.replace(/\s\(\d+\/\d+\)$/, '') ?? '');
    setDate(transaction?.date ?? new Date().toISOString().slice(0, 10));
    setStatus(transaction?.status ?? 'paid');
    setCategoryId(transaction?.categoryId ?? '');
    setSourceType(transaction?.cardId ? 'card' : 'account');
    setAccountId(transaction?.accountId ?? accounts[0]?.id ?? '');
    setCardId(transaction?.cardId ?? '');
    setFromAccountId(transaction?.fromAccountId ?? accounts[0]?.id ?? '');
    setToAccountId(transaction?.toAccountId ?? accounts[1]?.id ?? accounts[0]?.id ?? '');
    setNotes(getVisibleNotes(transaction?.notes));
    setHasFixedEndDate(Boolean(transactionMeta.generatedUntil));
    setFixedEndDate(transactionMeta.generatedUntil ?? '');
    setInstallmentCount(String(transactionMeta.totalInstallments ?? 2));
    setEditScope('single');
    setNewCategoryName('');
    setCategoryError('');
    setFormError('');
  }, [accounts, isOpen, transaction, transactionMeta.entryMode, transactionMeta.expenseNeed, transactionMeta.totalInstallments]);

  const selectedCard = sourceType === 'card' ? cards.find((card) => card.id === cardId) : undefined;
  const invoiceInfo = selectedCard && flow === 'expense' ? getCardInvoiceInfo(selectedCard, date) : null;
  const isCreditExpense = flow === 'expense' && sourceType === 'card' && Boolean(cardId);
  const isEditingClosedInvoice = Boolean(transaction && invoiceInfo && invoiceInfo.status !== 'aberta');

  useEffect(() => {
    if (!isOpen || flow !== 'expense' || expenseMode !== 'installment') return;
    setSourceType('card');
    if (!cardId && cards[0]) setCardId(cards[0].id);
  }, [cardId, cards, expenseMode, flow, isOpen]);

  useEffect(() => {
    if (!isOpen || flow === 'transfer') return;
    setCategoryId((current) => {
      const currentCategory = categories.find((category) => category.id === current);
      return currentCategory?.flow === flow ? current : '';
    });
  }, [categories, flow, isOpen]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((category) => category.flow === flow);
  const isInstallmentExpense = flow === 'expense' && expenseMode === 'installment';
  const fixedDates = expenseMode === 'fixed'
    ? hasFixedEndDate ? buildMonthlyDates(date, fixedEndDate) : buildOpenEndedMonthlyDates(date)
    : [];
  const cannotSubmit = isInstallmentExpense && cards.length === 0;

  function formatDescriptionForMeta(descriptionValue: string, meta: ReturnType<typeof readTransactionMeta>): string {
    if (meta.entryMode !== 'installment' || !meta.installmentNumber || !meta.totalInstallments) return descriptionValue;
    return `${descriptionValue.replace(/\s\(\d+\/\d+\)$/, '')} (${meta.installmentNumber}/${meta.totalInstallments})`;
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    setCategoryError('');
    if (!name) {
      setCategoryError('Informe o nome da categoria.');
      return;
    }

    if (hasDuplicateName(name, categories.filter((category) => category.flow === flow).map((category) => category.name))) {
      setCategoryError('Já existe uma categoria com esse nome.');
      return;
    }

    setIsCreatingCategory(true);
    try {
      const saved = await onCreateCategory({
        name,
        flow: flow === 'income' ? 'income' : 'expense',
        icon: 'MoreHorizontal',
        color: flow === 'income' ? '#10B981' : '#F43F5E',
      });
      setCategoryId(saved.id);
      setNewCategoryName('');
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Não foi possível criar a categoria.');
    } finally {
      setIsCreatingCategory(false);
    }
  }

  function buildTransaction(dateValue: string, descriptionValue = description.trim(), meta = transactionMeta): Omit<Transaction, 'id'> {
    const nextMeta = flow === 'expense' ? { ...meta, expenseNeed: expenseNeed || undefined } : meta;
    const shouldUseCard = flow === 'expense' && sourceType === 'card';
    return {
      description: formatDescriptionForMeta(descriptionValue, meta),
      amount: parseCurrencyInput(amount),
      flow,
      status,
      date: dateValue,
      notes: writeTransactionNotes(notes, nextMeta),
      categoryId,
      accountId: shouldUseCard ? undefined : accountId,
      cardId: shouldUseCard ? cardId || undefined : undefined,
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    const parsedAmount = parseCurrencyInput(amount);
    if (!description.trim() || parsedAmount <= 0) return;
    if (flow !== 'transfer' && !categoryId) {
      setFormError('Selecione uma categoria para salvar o lançamento.');
      return;
    }
    if (flow === 'expense' && !expenseNeed) {
      setFormError('Selecione se a despesa é essencial ou supérflua.');
      return;
    }
    if (flow === 'expense' && sourceType === 'account' && !accountId) {
      setFormError('Selecione uma conta para salvar a despesa.');
      return;
    }
    if (flow === 'expense' && sourceType === 'card' && !cardId) {
      setFormError('Selecione um cartão para salvar a despesa.');
      return;
    }
    if (flow === 'expense' && expenseMode === 'fixed' && !transaction && hasFixedEndDate && fixedDates.length === 0) {
      setFormError('A data final precisa ser igual ou posterior à data inicial.');
      return;
    }
    if (flow === 'income' && !accountId) {
      setFormError('Selecione uma conta para salvar a receita.');
      return;
    }

    if (flow === 'transfer') {
      await onSave({
        description: description.trim(),
        amount: parsedAmount,
        flow,
        status,
        date,
        notes: notes.trim() || undefined,
        fromAccountId,
        toAccountId,
      });
      onClose();
      return;
    }

    if (transaction) {
      const meta = transactionMeta.seriesId
        ? { ...transactionMeta, expenseNeed: expenseNeed || undefined }
        : { ...transactionMeta, entryMode: expenseMode, expenseNeed: expenseNeed || undefined };
      await onSave(buildTransaction(date, description.trim(), meta), editScope);
      onClose();
      return;
    }

    if (flow === 'expense' && expenseMode === 'fixed') {
      const seriesId = createSeriesId();
      const transactions = fixedDates.map((fixedDate) =>
        buildTransaction(fixedDate, description.trim(), {
          entryMode: 'fixed',
          expenseNeed: expenseNeed || undefined,
          seriesId,
          generatedFrom: date,
          generatedUntil: hasFixedEndDate ? fixedEndDate : undefined,
        }),
      );
      await onSave(transactions);
      onClose();
      return;
    }

    if (flow === 'expense' && expenseMode === 'installment') {
      const seriesId = createSeriesId();
      const total = parseEntryCount(installmentCount, 2);
      const transactions = Array.from({ length: total }, (_, index) =>
        buildTransaction(addMonths(date, index), description.trim(), {
          entryMode: 'installment',
          expenseNeed: expenseNeed || undefined,
          seriesId,
          installmentNumber: index + 1,
          totalInstallments: total,
          generatedFrom: date,
        }),
      );
      await onSave(transactions);
      onClose();
      return;
    }

    await onSave(buildTransaction(date, description.trim(), { entryMode: 'variable', expenseNeed: expenseNeed || undefined }));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#0B0E14] p-5 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">{transaction ? 'Editar lançamento' : 'Novo lançamento'}</h2>
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

        {flow === 'expense' ? (
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-white/5 p-1">
            {expenseModes.map((option) => {
              const Icon = option.icon;
              const selected = expenseMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setExpenseMode(option.id);
                    if (option.id === 'installment' && cards[0] && !cardId) setCardId(cards[0].id);
                  }}
                  disabled={Boolean(transaction)}
                  className={`flex h-11 items-center justify-center gap-1 rounded-xl text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected ? 'bg-violet-500 text-white' : 'text-slate-400'
                  }`}
                >
                  <Icon size={14} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {flow === 'expense' ? (
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-1">
            {expenseNeedOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setExpenseNeed(option.id)}
                className={`h-11 rounded-xl text-xs font-bold transition ${expenseNeed === option.id ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}
              >
                {option.label}
              </button>
            ))}
            {!expenseNeed ? (
              <p className="col-span-2 px-2 pb-1 text-[11px] font-medium text-slate-500">Escolha uma classificação para evitar lançamentos marcados por engano.</p>
            ) : null}
          </div>
        ) : null}

        {transaction && isGroupedTransaction ? (
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-2">
            <button type="button" onClick={() => setEditScope('single')} className={`h-11 rounded-xl text-xs font-bold ${editScope === 'single' ? 'bg-amber-400 text-slate-950' : 'text-amber-100'}`}>
              Apenas esta
            </button>
            <button type="button" onClick={() => setEditScope('forward')} className={`h-11 rounded-xl text-xs font-bold ${editScope === 'forward' ? 'bg-amber-400 text-slate-950' : 'text-amber-100'}`}>
              Esta e próximas
            </button>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4">
          {formError ? (
            <p className="flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              <AlertCircle size={16} />
              {formError}
            </p>
          ) : null}

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Valor
            <CurrencyInput value={amount} onChange={setAmount} />
          </label>

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Descrição
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex: mercado, salário, pix reserva" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" />
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
                  <option value="">Selecione</option>
                  {filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              {flow === 'expense' ? (
                <div className="grid gap-1 text-xs font-semibold text-slate-400 sm:col-span-2">
                  Origem
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-1">
                    <button
                      type="button"
                      onClick={() => setSourceType('account')}
                      disabled={isInstallmentExpense}
                      className={`h-11 rounded-xl text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${sourceType === 'account' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
                    >
                      Conta
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceType('card')}
                      className={`h-11 rounded-xl text-xs font-bold transition ${sourceType === 'card' ? 'bg-violet-500 text-white' : 'text-slate-400'}`}
                    >
                      Cartão
                    </button>
                  </div>
                  {sourceType === 'account' ? (
                    <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400">
                      {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                  ) : (
                    <select value={cardId} onChange={(event) => setCardId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400">
                      <option value="">Selecione</option>
                      {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                    </select>
                  )}
                </div>
              ) : (
                <label className="grid gap-1 text-xs font-semibold text-slate-400 sm:col-span-2">
                  Conta
                  <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400">
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}

          {flow !== 'transfer' ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex gap-2">
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder={flow === 'income' ? 'Nova categoria de receita' : 'Nova categoria de despesa'}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0B0E14] px-3 text-sm text-white outline-none focus:border-sky-400"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={isCreatingCategory}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white disabled:opacity-60"
                  title="Criar categoria"
                >
                  <Plus size={17} />
                </button>
              </div>
              {categoryError ? (
                <p className="mt-2 flex items-center gap-2 text-xs text-rose-200">
                  <AlertCircle size={14} />
                  {categoryError}
                </p>
              ) : null}
            </div>
          ) : null}

          {flow === 'expense' && expenseMode === 'fixed' && !transaction ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <label className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-300">
                <span>Definir data final</span>
                <input
                  type="checkbox"
                  checked={hasFixedEndDate}
                  onChange={(event) => {
                    setHasFixedEndDate(event.target.checked);
                    if (!event.target.checked) setFixedEndDate('');
                  }}
                  className="h-4 w-4 accent-sky-500"
                />
              </label>
              {hasFixedEndDate ? (
                <label className="mt-3 grid gap-1 text-xs font-semibold text-slate-400">
                  Repetir até
                  <input
                    type="date"
                    min={date}
                    value={fixedEndDate}
                    onChange={(event) => setFixedEndDate(event.target.value)}
                    className="h-12 rounded-2xl border border-white/10 bg-[#0B0E14] px-4 text-white outline-none focus:border-sky-400"
                  />
                </label>
              ) : null}
              <span className="text-[11px] font-medium text-slate-500">
                {hasFixedEndDate && fixedEndDate
                  ? `${fixedDates.length} lançamento${fixedDates.length === 1 ? '' : 's'} mensal${fixedDates.length === 1 ? '' : 'is'} serão criados.`
                  : 'Sem data final: a despesa fica fixa e pode ser encerrada depois pela exclusão da série.'}
              </span>
            </div>
          ) : null}

          {flow === 'expense' && expenseMode === 'installment' && !transaction ? (
            <label className="grid gap-1 text-xs font-semibold text-slate-400">
              Número de parcelas
              <input
                type="number"
                min={2}
                max={60}
                value={installmentCount}
                onChange={(event) => setInstallmentCount(event.target.value)}
                className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400"
              />
              <span className="text-[11px] font-medium text-slate-500">
                {`${parseEntryCount(installmentCount, 2)} parcelas serão criadas.`}
              </span>
            </label>
          ) : null}

          {invoiceInfo ? (
            <div className={`rounded-2xl border p-4 text-xs ${isEditingClosedInvoice ? 'border-amber-400/25 bg-amber-400/10 text-amber-100' : 'border-sky-400/20 bg-sky-400/10 text-sky-100'}`}>
              <div className="flex items-center gap-2 font-bold text-white">
                <CalendarClock size={16} />
                <span>{invoiceInfo.label}</span>
                <span className="ml-auto capitalize">{invoiceInfo.status}</span>
              </div>
              <p className="mt-2 text-slate-300">Consumo de {invoiceInfo.startDate} a {invoiceInfo.endDate}. Vencimento em {invoiceInfo.dueDate}.</p>
              {isEditingClosedInvoice ? <p className="mt-2 font-semibold">Esta fatura já fechou ou venceu. Edite com cuidado para não alterar meses passados por engano.</p> : null}
            </div>
          ) : null}

          {isCreditExpense && expenseMode === 'installment' && !transaction ? (
            <p className="text-xs text-slate-500">Cada parcela entrará em uma fatura mensal a partir da data de compra.</p>
          ) : null}

          {flow === 'expense' && expenseMode === 'installment' && cards.length === 0 ? (
            <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-100">
              Cadastre um cartão antes de criar uma despesa parcelada.
            </p>
          ) : null}

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Observações
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20 rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-sky-400" />
          </label>
        </div>

        <button type="submit" disabled={cannotSubmit} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 font-bold text-white disabled:opacity-50">
          <Check size={18} />
          Salvar lançamento
        </button>
      </form>
    </div>
  );
}
