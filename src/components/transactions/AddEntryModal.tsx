import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRightLeft, Calculator, CalendarClock, Check, ChevronDown, CirclePlus, CreditCard, Delete, Layers, Plus, Repeat, TrendingDown, UserRound, Wallet, X } from 'lucide-react';
import { Account, Card, Category, EditSeriesScope, ExpenseEntryMode, ExpenseNeed, ExpenseSplitMode, MoneyFlow, ReimbursementPerson, Transaction } from '../../types';
import { CurrencyInput } from '../shared/CurrencyInput';
import { DateInput } from '../shared/DateInput';
import { DEFAULT_CURRENCY_INPUT, formatCurrencyInput, parseCurrencyInput } from '../../lib/utils/currency';
import { addMonths, formatDatePtBr, formatLocalDate } from '../../lib/utils/date';
import { getCardInvoiceInfo } from '../../lib/utils/cardInvoices';
import { createSeriesId, getVisibleNotes, readTransactionMeta, writeTransactionNotes } from '../../lib/utils/transactionMeta';
import { hasDuplicateName } from '../../lib/utils/validation';
import { getUserFriendlyError } from '../../lib/utils/userFriendlyError';
import { parseMathExpression } from '../../lib/utils/mathExpression';

interface AddEntryModalProps {
  isOpen: boolean;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  reimbursementPeople: ReimbursementPerson[];
  reimbursementsEnabled: boolean;
  transaction?: Transaction | null;
  preferredCardId?: string;
  onCreateCategory: (input: Omit<Category, 'id' | 'isSystem'>) => Promise<Category>;
  onCreateReimbursementPerson: (input: Omit<ReimbursementPerson, 'id'>) => Promise<ReimbursementPerson>;
  onCreateRecurring: (transaction: Omit<Transaction, 'id'>, endDate?: string) => Promise<void>;
  onClose: () => void;
  onSave: (
    transaction: Omit<Transaction, 'id'> | Array<Omit<Transaction, 'id'>>,
    scope?: EditSeriesScope,
  ) => void | Promise<void>;
}

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
const splitModeOptions = [
  { id: 'none' as const, label: 'Só minha' },
  { id: 'shared' as const, label: 'Dividir conta' },
  { id: 'third_party_full' as const, label: '100% de terceiro' },
];
const OPEN_ENDED_FIXED_MONTHS = 12;
const MAX_FIXED_MONTHS = 120;
const REIMBURSEMENT_CATEGORY_NAME = 'Reembolsos';
const INVOICE_ADJUSTMENT_CATEGORY_NAME = 'Ajustes de fatura';

function normalizeCategoryName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isReimbursementCategory(category: Category): boolean {
  const name = normalizeCategoryName(category.name);
  return category.flow === 'expense' && (name === 'reembolso' || name === 'reembolsos');
}

function isInvoiceAdjustmentCategory(category: Category): boolean {
  const name = normalizeCategoryName(category.name);
  return category.flow === 'expense' && (name === 'ajuste de fatura' || name === 'ajustes de fatura');
}

function buildMonthlyDates(startDate: string, endDate: string, maxMonths = MAX_FIXED_MONTHS): string[] {
  if (!startDate || !endDate || endDate < startDate) return [];
  const dates: string[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate && dates.length < maxMonths) {
    dates.push(currentDate);
    currentDate = addMonths(currentDate, 1);
  }

  return dates;
}

function buildOpenEndedMonthlyDates(startDate: string): string[] {
  return buildMonthlyDates(startDate, addMonths(startDate, OPEN_ENDED_FIXED_MONTHS - 1), OPEN_ENDED_FIXED_MONTHS);
}

function parseEntryCount(value: string, minimum: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(60, Math.max(minimum, parsed));
}

export function AddEntryModal({ isOpen, accounts, cards, categories, reimbursementPeople, reimbursementsEnabled, transaction, preferredCardId, onCreateCategory, onCreateReimbursementPerson, onCreateRecurring, onClose, onSave }: AddEntryModalProps) {
  const canUseReimbursements = reimbursementsEnabled || Boolean(transaction?.isReimbursable);
  const [entryStep, setEntryStep] = useState<'picker' | 'form'>('picker');
  const [flow, setFlow] = useState<MoneyFlow>('expense');
  const [expenseMode, setExpenseMode] = useState<ExpenseEntryMode>('variable');
  const [expenseNeed, setExpenseNeed] = useState<ExpenseNeed | ''>('');
  const [amount, setAmount] = useState(DEFAULT_CURRENCY_INPUT);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');
  const [categoryId, setCategoryId] = useState('');
  const [sourceType, setSourceType] = useState<PaymentSourceType>('account');
  const [lockedSourceType, setLockedSourceType] = useState<PaymentSourceType | null>(null);
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [splitMode, setSplitMode] = useState<ExpenseSplitMode>('none');
  const [splitType, setSplitType] = useState<'percent' | 'fixed'>('percent');
  const [splitPercent, setSplitPercent] = useState('50');
  const [splitFixedAmount, setSplitFixedAmount] = useState(formatCurrencyInput(0));
  const [isInvoiceCredit, setIsInvoiceCredit] = useState(false);
  const [reimbursementPersonId, setReimbursementPersonId] = useState('');
  const [reimbursementStatus, setReimbursementStatus] = useState<'pending' | 'received'>('pending');
  const [reimbursementReceivedAccountId, setReimbursementReceivedAccountId] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [personError, setPersonError] = useState('');
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);
  const [hasFixedEndDate, setHasFixedEndDate] = useState(false);
  const [fixedEndDate, setFixedEndDate] = useState('');
  const [installmentCount, setInstallmentCount] = useState('2');
  const [editScope, setEditScope] = useState<EditSeriesScope>('single');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isQuickOptionsOpen, setIsQuickOptionsOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorExpression, setCalculatorExpression] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isPreparingReimbursementCategory, setIsPreparingReimbursementCategory] = useState(false);
  const initializedFormKeyRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const transactionMeta = useMemo(() => readTransactionMeta(transaction?.notes), [transaction]);
  const isGroupedTransaction = Boolean(transactionMeta.seriesId);
  const isRecurringOccurrence = Boolean(
    transaction?.recurringTransactionId
    || transactionMeta.recurringTransactionId,
  );
  const canEditForwardEntries = Boolean(transaction && (isGroupedTransaction || isRecurringOccurrence));
  const reimbursementCategory = useMemo(() => categories.find(isReimbursementCategory), [categories]);
  const invoiceAdjustmentCategory = useMemo(() => categories.find(isInvoiceAdjustmentCategory), [categories]);

  useEffect(() => {
    if (!isOpen) {
      initializedFormKeyRef.current = null;
      return;
    }

    const formKey = transaction?.id ?? 'new';
    if (initializedFormKeyRef.current === formKey) return;
    initializedFormKeyRef.current = formKey;

    const initialSplitMode = transaction?.splitMode ?? (transaction?.isReimbursable ? 'third_party_full' : 'none');
    const initialSourceType = transaction?.cardId || preferredCardId ? 'card' : 'account';
    const initialCardId = transaction?.cardId ?? preferredCardId ?? '';
    setFlow(transaction?.flow ?? 'expense');
    setEntryStep(transaction ? 'form' : 'picker');
    setExpenseMode(transactionMeta.entryMode ?? 'variable');
    setExpenseNeed(initialSplitMode === 'third_party_full' ? '' : transactionMeta.expenseNeed ?? '');
    setAmount(transaction ? formatCurrencyInput(transaction.amount) : DEFAULT_CURRENCY_INPUT);
    setDescription(transaction?.description.replace(/\s\(\d+\/\d+\)$/, '') ?? '');
    setDate(transaction?.date ?? new Date().toISOString().slice(0, 10));
    setStatus(transaction?.status ?? 'paid');
    setCategoryId(transaction?.categoryId ?? '');
    setSourceType(initialSourceType);
    setLockedSourceType(null);
    setAccountId(transaction?.accountId ?? accounts[0]?.id ?? '');
    setCardId(initialCardId);
    setFromAccountId(transaction?.fromAccountId ?? accounts[0]?.id ?? '');
    setToAccountId(transaction?.toAccountId ?? accounts[1]?.id ?? accounts[0]?.id ?? '');
    setNotes(getVisibleNotes(transaction?.notes));
    setSplitMode(initialSplitMode);
    setIsReimbursable(initialSplitMode !== 'none');
    setSplitType(transaction?.reimbursementAmount && transaction.amount !== transaction.reimbursementAmount ? 'fixed' : 'percent');
    setSplitPercent('50');
    setSplitFixedAmount(formatCurrencyInput(transaction?.reimbursementAmount ?? 0));
    setIsInvoiceCredit(transactionMeta.invoiceAdjustment === 'credit');
    setReimbursementPersonId(transaction?.reimbursementPersonId ?? reimbursementPeople[0]?.id ?? '');
    setReimbursementStatus(transaction?.reimbursementStatus ?? 'pending');
    setReimbursementReceivedAccountId(transaction?.reimbursementReceivedAccountId ?? transaction?.accountId ?? accounts[0]?.id ?? '');
    setNewPersonName('');
    setPersonError('');
    setHasFixedEndDate(Boolean(transactionMeta.generatedUntil));
    setFixedEndDate(transactionMeta.generatedUntil ?? '');
    setInstallmentCount(String(transactionMeta.totalInstallments ?? 2));
    setEditScope('single');
    setNewCategoryName('');
    setCategoryError('');
    setFormError('');
    setIsSaving(false);
    setIsAdvancedOpen(false);
    setIsQuickOptionsOpen(false);
    setIsCalculatorOpen(false);
    setCalculatorExpression('');
  }, [accounts, isOpen, preferredCardId, transaction, transactionMeta.entryMode, transactionMeta.expenseNeed, transactionMeta.generatedUntil, transactionMeta.invoiceAdjustment, transactionMeta.totalInstallments]);

  const selectedCard = sourceType === 'card' ? cards.find((card) => card.id === cardId) : undefined;
  const invoiceInfo = selectedCard && flow === 'expense' ? getCardInvoiceInfo(selectedCard, date) : null;
  const isEditingClosedInvoice = Boolean(transaction && invoiceInfo && invoiceInfo.status !== 'aberta');

  useEffect(() => {
    if (!isOpen || flow !== 'expense' || expenseMode !== 'installment') return;
    if (lockedSourceType === 'account') {
      setExpenseMode('variable');
      return;
    }
    setSourceType('card');
    if (!cardId && cards[0]) setCardId(cards[0].id);
  }, [cardId, cards, expenseMode, flow, isOpen, lockedSourceType]);

  useEffect(() => {
    if (!isOpen || flow !== 'expense' || lockedSourceType || !preferredCardId || transaction?.cardId) return;
    setSourceType('card');
    setCardId(preferredCardId);
  }, [flow, isOpen, lockedSourceType, preferredCardId, transaction?.cardId]);

  useEffect(() => {
    if (!isOpen || flow === 'transfer') return;
    setCategoryId((current) => {
      const currentCategory = categories.find((category) => category.id === current);
      return currentCategory?.flow === flow ? current : '';
    });
  }, [categories, flow, isOpen]);

  useEffect(() => {
    if (!isOpen || flow !== 'expense' || splitMode !== 'third_party_full' || !reimbursementCategory) return;
    setCategoryId(reimbursementCategory.id);
  }, [flow, isOpen, reimbursementCategory, splitMode]);

  useEffect(() => {
    if (!isOpen || flow !== 'expense' || !isInvoiceCredit || !invoiceAdjustmentCategory) return;
    setCategoryId(invoiceAdjustmentCategory.id);
  }, [flow, invoiceAdjustmentCategory, isInvoiceCredit, isOpen]);

  if (!isOpen) return null;

  function selectNewEntryFlow(nextFlow: MoneyFlow, nextSourceType?: PaymentSourceType) {
    setFlow(nextFlow);
    setStatus(nextFlow === 'income' ? 'pending' : 'paid');
    setIsInvoiceCredit(false);
    setIsReimbursable(false);
    setSplitMode('none');
    setExpenseNeed('');
    setLockedSourceType(nextFlow === 'expense' && nextSourceType ? nextSourceType : null);
    if (nextFlow === 'expense' && nextSourceType) {
      setSourceType(nextSourceType);
      if (nextSourceType === 'card') {
        setCardId((current) => current || preferredCardId || cards[0]?.id || '');
      } else {
        setAccountId((current) => current || accounts[0]?.id || '');
      }
    }
    setEntryStep('form');
  }

  function appendCalculatorToken(token: string) {
    setCalculatorExpression((current) => {
      if (/^[+\-*/]$/.test(token)) {
        if (!current) return token === '-' ? '-' : '';
        return /[+\-*/]$/.test(current) ? `${current.slice(0, -1)}${token}` : `${current}${token}`;
      }

      if (token === ',') {
        const currentNumber = current.split(/[+\-*/]/).pop() ?? '';
        if (currentNumber.includes(',') || currentNumber.includes('.')) return current;
      }

      return `${current}${token}`;
    });
  }

  function applyCalculatorResult() {
    const result = parseMathExpression(calculatorExpression);
    if (result === null) return;
    setAmount(formatCurrencyInput(result));
    setIsCalculatorOpen(false);
  }

  const filteredCategories = categories.filter((category) => category.flow === flow);
  const isInstallmentExpense = flow === 'expense' && expenseMode === 'installment' && !isInvoiceCredit;
  const fixedDates = expenseMode === 'fixed'
    ? hasFixedEndDate ? buildMonthlyDates(date, fixedEndDate) : buildOpenEndedMonthlyDates(date)
    : [];
  const cannotSubmit = flow === 'expense' && (sourceType === 'card' || isInvoiceCredit) && cards.length === 0;
  const parsedAmount = parseCurrencyInput(amount);
  const parsedSplitPercent = Math.min(100, Math.max(0, Number.parseFloat(splitPercent.replace(',', '.')) || 0));
  const parsedSplitFixedAmount = parseCurrencyInput(splitFixedAmount);
  const reimbursementAmount = flow === 'expense' && splitMode === 'third_party_full'
    ? parsedAmount
    : flow === 'expense' && splitMode === 'shared'
      ? Math.round((splitType === 'fixed' ? parsedSplitFixedAmount : parsedAmount * parsedSplitPercent / 100) * 100) / 100
      : 0;
  const personalAmount = Math.round(Math.max(0, parsedAmount - reimbursementAmount) * 100) / 100;
  const hasPersonalExpenseShare = flow === 'expense' && !isInvoiceCredit && splitMode !== 'third_party_full';
  const shouldCreateSharedEntries = flow === 'expense'
    && splitMode === 'shared'
    && !isInvoiceCredit
    && personalAmount > 0
    && reimbursementAmount > 0;
  const hasQuickOptions = isInvoiceCredit || splitMode !== 'none';
  const hasAdvancedContext = expenseMode !== 'variable'
    || isInvoiceCredit
    || splitMode !== 'none'
    || hasPersonalExpenseShare
    || Boolean(transaction && isGroupedTransaction)
    || hasFixedEndDate
    || Boolean(isReimbursable)
    || Boolean(newCategoryName.trim());

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
      setCategoryError(getUserFriendlyError(error, 'Não foi possível criar a categoria. Tente novamente.'));
    } finally {
      setIsCreatingCategory(false);
    }
  }

  async function ensureReimbursementCategory(): Promise<Category | null> {
    if (reimbursementCategory) {
      setCategoryId(reimbursementCategory.id);
      return reimbursementCategory;
    }

    setIsPreparingReimbursementCategory(true);
    setFormError('');
    try {
      const saved = await onCreateCategory({
        name: REIMBURSEMENT_CATEGORY_NAME,
        flow: 'expense',
        icon: 'HandCoins',
        color: '#F59E0B',
      });
      setCategoryId(saved.id);
      return saved;
    } catch (error) {
      setFormError(getUserFriendlyError(error, 'Não foi possível preparar a categoria Reembolsos. Tente novamente.'));
      return null;
    } finally {
      setIsPreparingReimbursementCategory(false);
    }
  }

  async function ensureInvoiceAdjustmentCategory(): Promise<Category | null> {
    if (invoiceAdjustmentCategory) {
      setCategoryId(invoiceAdjustmentCategory.id);
      return invoiceAdjustmentCategory;
    }

    setIsCreatingCategory(true);
    setFormError('');
    try {
      const saved = await onCreateCategory({
        name: INVOICE_ADJUSTMENT_CATEGORY_NAME,
        flow: 'expense',
        icon: 'ReceiptText',
        color: '#22C55E',
      });
      setCategoryId(saved.id);
      return saved;
    } catch (error) {
      setFormError(getUserFriendlyError(error, 'Não foi possível preparar a categoria Ajustes de fatura. Tente novamente.'));
      return null;
    } finally {
      setIsCreatingCategory(false);
    }
  }

  async function handleSplitModeChange(nextMode: ExpenseSplitMode) {
    setSplitMode(nextMode);
    setIsReimbursable(nextMode !== 'none');

    if (nextMode === 'none') {
      if (reimbursementCategory && categoryId === reimbursementCategory.id) setCategoryId('');
      return;
    }

    if (nextMode === 'shared' && reimbursementCategory && categoryId === reimbursementCategory.id) setCategoryId('');
    if (nextMode === 'third_party_full') setExpenseNeed('');
    setIsInvoiceCredit(false);
    if (!reimbursementPersonId && reimbursementPeople[0]) {
      setReimbursementPersonId(reimbursementPeople[0].id);
    }

    if (nextMode === 'third_party_full') await ensureReimbursementCategory();
  }

  async function handleInvoiceCreditChange(checked: boolean) {
    setIsInvoiceCredit(checked);

    if (!checked) {
      if (invoiceAdjustmentCategory && categoryId === invoiceAdjustmentCategory.id) setCategoryId('');
      return;
    }

    setFlow('expense');
    setExpenseMode('variable');
    setExpenseNeed('');
    setIsReimbursable(false);
    setSplitMode('none');
    setSourceType('card');
    if (!cardId && cards[0]) setCardId(cards[0].id);
    await ensureInvoiceAdjustmentCategory();
  }

  async function handleCreatePerson() {
    const name = newPersonName.trim();
    setPersonError('');
    if (!name) {
      setPersonError('Informe o nome da pessoa.');
      return;
    }

    if (hasDuplicateName(name, reimbursementPeople.map((person) => person.name))) {
      setPersonError('Já existe uma pessoa com esse nome.');
      return;
    }

    setIsCreatingPerson(true);
    try {
      const saved = await onCreateReimbursementPerson({ name });
      setIsReimbursable(true);
      setSplitMode((current) => current === 'none' ? 'shared' : current);
      setReimbursementPersonId(saved.id);
      setNewPersonName('');
      await ensureReimbursementCategory();
    } catch (error) {
      setPersonError(getUserFriendlyError(error, 'Não foi possível criar a pessoa. Tente novamente.'));
    } finally {
      setIsCreatingPerson(false);
    }
  }

  function buildTransaction(dateValue: string, descriptionValue = description.trim(), meta = transactionMeta): Omit<Transaction, 'id'> {
    const nextMeta = {
      ...meta,
      expenseNeed: hasPersonalExpenseShare ? expenseNeed || undefined : undefined,
      invoiceAdjustment: flow === 'expense' && isInvoiceCredit ? 'credit' as const : undefined,
    };
    const shouldUseCard = flow === 'expense' && (sourceType === 'card' || isInvoiceCredit);
    const shouldMarkReimbursement = flow === 'expense' && splitMode !== 'none' && !isInvoiceCredit;
    return {
      description: formatDescriptionForMeta(descriptionValue, meta),
      amount: parsedAmount,
      flow,
      status: shouldUseCard ? 'pending' : status,
      date: dateValue,
      notes: writeTransactionNotes(notes, nextMeta),
      categoryId,
      accountId: shouldUseCard ? undefined : accountId,
      cardId: shouldUseCard ? cardId || undefined : undefined,
      isReimbursable: shouldMarkReimbursement,
      splitMode: shouldMarkReimbursement ? splitMode : 'none',
      personalAmount: shouldMarkReimbursement ? personalAmount : undefined,
      reimbursementAmount: shouldMarkReimbursement ? reimbursementAmount : undefined,
      reimbursementPersonId: shouldMarkReimbursement ? reimbursementPersonId : undefined,
      reimbursementStatus: shouldMarkReimbursement ? reimbursementStatus : undefined,
      reimbursementReceivedAt: shouldMarkReimbursement && reimbursementStatus === 'received' ? dateValue : undefined,
      reimbursementReceivedAccountId: shouldMarkReimbursement && reimbursementStatus === 'received'
        ? reimbursementReceivedAccountId || undefined
        : undefined,
    };
  }

  function buildSharedTransactions(dateValue: string, descriptionValue: string, meta = transactionMeta): Array<Omit<Transaction, 'id'>> {
    const personName = reimbursementPeople.find((person) => person.id === reimbursementPersonId)?.name;
    const baseMeta = {
      ...meta,
      invoiceAdjustment: undefined,
    };
    const personalMeta = {
      ...baseMeta,
      expenseNeed: expenseNeed || undefined,
    };
    const reimbursementMeta = {
      ...baseMeta,
      expenseNeed: undefined,
    };
    const shouldUseCard = sourceType === 'card';
    const personalDescription = formatDescriptionForMeta(descriptionValue, personalMeta);
    const reimbursementDescription = formatDescriptionForMeta(
      personName ? `${descriptionValue} - ${personName}` : `${descriptionValue} - terceiro`,
      reimbursementMeta,
    );

    return [
      {
        description: personalDescription,
        amount: personalAmount,
        flow: 'expense',
        status: shouldUseCard ? 'pending' : status,
        date: dateValue,
        notes: writeTransactionNotes(notes, personalMeta),
        categoryId,
        accountId: shouldUseCard ? undefined : accountId,
        cardId: shouldUseCard ? cardId || undefined : undefined,
        isReimbursable: false,
        splitMode: 'none',
      },
      {
        description: reimbursementDescription,
        amount: reimbursementAmount,
        flow: 'expense',
        status: shouldUseCard ? 'pending' : status,
        date: dateValue,
        notes: writeTransactionNotes(notes, reimbursementMeta),
        categoryId,
        accountId: shouldUseCard ? undefined : accountId,
        cardId: shouldUseCard ? cardId || undefined : undefined,
        isReimbursable: true,
        splitMode: 'third_party_full',
        personalAmount: 0,
        reimbursementAmount,
        reimbursementPersonId,
        reimbursementStatus,
        reimbursementReceivedAt: reimbursementStatus === 'received' ? dateValue : undefined,
        reimbursementReceivedAccountId: reimbursementStatus === 'received'
          ? reimbursementReceivedAccountId || undefined
          : undefined,
      },
    ];
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    const reportMissingField = (message: string) => {
      setFormError(message);
      window.requestAnimationFrame(() => {
        formRef.current?.scrollTo({ top: 150, behavior: 'smooth' });
      });
    };
    if (parsedAmount <= 0) {
      reportMissingField('Informe um valor maior que zero para salvar o lançamento.');
      return;
    }
    if (!description.trim()) {
      reportMissingField('Informe um título para identificar o lançamento.');
      return;
    }
    if (!date) {
      reportMissingField('Selecione a data do lançamento.');
      return;
    }
    if (isInvoiceCredit && !invoiceAdjustmentCategory && !categoryId) {
      reportMissingField('Crie ou mantenha a categoria Ajustes de fatura para salvar descontos da fatura.');
      return;
    }
    if (flow === 'expense' && splitMode === 'third_party_full' && !reimbursementCategory && !categoryId) {
      reportMissingField('Crie ou mantenha a categoria Reembolsos para salvar despesas de terceiros.');
      return;
    }
    if (flow !== 'transfer' && !categoryId) {
      reportMissingField('Selecione uma categoria para salvar o lançamento.');
      return;
    }
    if (hasPersonalExpenseShare && !expenseNeed) {
      reportMissingField('Selecione se a despesa é essencial ou supérflua.');
      return;
    }
    if (flow === 'expense' && splitMode === 'shared' && (reimbursementAmount <= 0 || reimbursementAmount >= parsedAmount)) {
      reportMissingField('Informe uma divisao maior que zero e menor que o valor total.');
      return;
    }
    if (flow === 'expense' && isReimbursable && !isInvoiceCredit && !reimbursementPersonId) {
      reportMissingField('Selecione quem deve esse reembolso.');
      return;
    }
    if (flow === 'expense' && isReimbursable && reimbursementStatus === 'received' && !reimbursementReceivedAccountId) {
      reportMissingField('Selecione a conta onde o reembolso entrou.');
      return;
    }
    if (flow === 'expense' && sourceType === 'account' && !accountId) {
      reportMissingField('Selecione uma conta para salvar a despesa.');
      return;
    }
    if (flow === 'expense' && (sourceType === 'card' || isInvoiceCredit) && !cardId) {
      reportMissingField('Selecione um cartão para salvar a despesa.');
      return;
    }
    if (flow === 'expense' && expenseMode === 'fixed' && !transaction && hasFixedEndDate && fixedDates.length === 0) {
      reportMissingField('A data final precisa ser igual ou posterior à data inicial.');
      return;
    }
    if (flow === 'income' && !accountId) {
      reportMissingField('Selecione uma conta para salvar a receita.');
      return;
    }
    if (flow === 'transfer' && (!fromAccountId || !toAccountId)) {
      reportMissingField('Selecione as contas de origem e destino da transferência.');
      return;
    }
    if (flow === 'transfer' && fromAccountId === toAccountId) {
      reportMissingField('As contas de origem e destino precisam ser diferentes.');
      return;
    }

    setIsSaving(true);
    try {
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
        ? { ...transactionMeta, expenseNeed: hasPersonalExpenseShare ? expenseNeed || undefined : undefined, invoiceAdjustment: isInvoiceCredit ? 'credit' as const : undefined }
        : { ...transactionMeta, entryMode: expenseMode, expenseNeed: hasPersonalExpenseShare ? expenseNeed || undefined : undefined, invoiceAdjustment: isInvoiceCredit ? 'credit' as const : undefined };
      await onSave(buildTransaction(date, description.trim(), meta), editScope);
      onClose();
      return;
    }

    if (shouldCreateSharedEntries && expenseMode === 'fixed') {
      const sharedTransactions = buildSharedTransactions(date, description.trim(), {
        entryMode: 'fixed',
        expenseNeed: expenseNeed || undefined,
        generatedFrom: date,
        generatedUntil: hasFixedEndDate ? fixedEndDate : undefined,
      });
      await Promise.all(sharedTransactions.map((item) =>
        onCreateRecurring(item, hasFixedEndDate ? fixedEndDate : undefined),
      ));
      onClose();
      return;
    }

    if (flow === 'expense' && expenseMode === 'fixed' && !isInvoiceCredit) {
      await onCreateRecurring(buildTransaction(date, description.trim(), {
        entryMode: 'fixed',
        expenseNeed: hasPersonalExpenseShare ? expenseNeed || undefined : undefined,
        generatedFrom: date,
        generatedUntil: hasFixedEndDate ? fixedEndDate : undefined,
      }), hasFixedEndDate ? fixedEndDate : undefined);
      onClose();
      return;
    }

    if (shouldCreateSharedEntries && expenseMode === 'installment') {
      const seriesId = createSeriesId();
      const reimbursementSeriesId = createSeriesId();
      const total = parseEntryCount(installmentCount, 2);
      const transactions = Array.from({ length: total }, (_, index) => {
        const [personalEntry, reimbursementEntry] = buildSharedTransactions(addMonths(date, index), description.trim(), {
          entryMode: 'installment',
          expenseNeed: expenseNeed || undefined,
          seriesId,
          installmentNumber: index + 1,
          totalInstallments: total,
          generatedFrom: date,
        });
        return [
          personalEntry,
          {
            ...reimbursementEntry,
            notes: writeTransactionNotes(notes, {
              entryMode: 'installment',
              seriesId: reimbursementSeriesId,
              installmentNumber: index + 1,
              totalInstallments: total,
              generatedFrom: date,
            }),
          },
        ];
      }).flat();
      await onSave(transactions);
      onClose();
      return;
    }

    if (flow === 'expense' && expenseMode === 'installment' && !isInvoiceCredit) {
      const seriesId = createSeriesId();
      const total = parseEntryCount(installmentCount, 2);
      const transactions = Array.from({ length: total }, (_, index) =>
        buildTransaction(addMonths(date, index), description.trim(), {
          entryMode: 'installment',
          expenseNeed: hasPersonalExpenseShare ? expenseNeed || undefined : undefined,
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

    if (shouldCreateSharedEntries) {
      await onSave(buildSharedTransactions(date, description.trim(), {
        entryMode: 'variable',
        expenseNeed: expenseNeed || undefined,
      }));
      onClose();
      return;
    }

    await onSave(buildTransaction(date, description.trim(), { entryMode: 'variable', expenseNeed: hasPersonalExpenseShare ? expenseNeed || undefined : undefined }));
    onClose();
    } catch (error) {
      setFormError(getUserFriendlyError(error, 'Não foi possível salvar o lançamento. Tente novamente.'));
    } finally {
      setIsSaving(false);
    }
  }

  if (!transaction && entryStep === 'picker') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/75 p-0 backdrop-blur-sm md:p-6">
        <div className="premium-card max-h-[100dvh] w-full max-w-[620px] overflow-y-auto rounded-none px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl md:max-h-[calc(100dvh-2rem)] md:rounded-[30px]">
          <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-white/20" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">O que você quer adicionar?</h2>
              <p className="mt-1 text-xs font-medium text-slate-400">Escolha o tipo de lançamento</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white">
              <X size={19} />
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button type="button" onClick={() => selectNewEntryFlow('expense', 'card')} className="cosmic-card cosmic-card-hover flex min-h-20 items-center justify-between rounded-2xl px-5 py-4 text-left text-white" style={{ borderColor: '#8B5CF666', backgroundImage: 'linear-gradient(135deg, rgba(139,92,246,0.18), transparent 58%)' }}>
              <span>
                <span className="block text-base font-bold">Despesa cartão</span>
                <span className="mt-1 block text-xs font-medium text-violet-100/70">Compra na fatura</span>
              </span>
              <CreditCard size={24} className="text-violet-300" />
            </button>
            <button type="button" onClick={() => selectNewEntryFlow('expense', 'account')} className="cosmic-card cosmic-card-hover flex min-h-20 items-center justify-between rounded-2xl px-5 py-4 text-left text-white" style={{ borderColor: '#38BDF866', backgroundImage: 'linear-gradient(135deg, rgba(56,189,248,0.16), transparent 58%)' }}>
              <span>
                <span className="block text-base font-bold">Despesa conta</span>
                <span className="mt-1 block text-xs font-medium text-sky-100/70">Débito ou Pix</span>
              </span>
              <Wallet size={24} className="text-sky-300" />
            </button>
            <button type="button" onClick={() => selectNewEntryFlow('income')} className="cosmic-card cosmic-card-hover flex min-h-20 items-center justify-between rounded-2xl px-5 py-4 text-left text-white" style={{ borderColor: '#34D39966', backgroundImage: 'linear-gradient(135deg, rgba(52,211,153,0.14), transparent 58%)' }}>
              <span>
                <span className="block text-base font-bold">Receita</span>
                <span className="mt-1 block text-xs font-medium text-emerald-100/70">Entrada em conta</span>
              </span>
              <CirclePlus size={24} className="text-emerald-400" />
            </button>
            <button type="button" onClick={() => selectNewEntryFlow('transfer')} className="cosmic-card cosmic-card-hover flex min-h-20 items-center justify-between rounded-2xl px-5 py-4 text-left text-white">
              <span>
                <span className="block text-base font-bold">Transferência</span>
                <span className="mt-1 block text-xs font-medium text-slate-300/70">Entre contas</span>
              </span>
              <ArrowRightLeft size={24} className="text-slate-300" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const calculatorResult = parseMathExpression(calculatorExpression);
  const todayValue = formatLocalDate(new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/75 p-0 backdrop-blur-sm md:p-6">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="premium-card flex h-[100dvh] max-h-[100dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-none shadow-2xl md:h-auto md:max-h-[calc(100dvh-2rem)] md:rounded-[34px]"
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] md:px-6 md:pt-5">
          <button
            type="button"
            onClick={() => transaction ? onClose() : setEntryStep('picker')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/5 text-white transition hover:bg-white/10"
            title={transaction ? 'Fechar' : 'Voltar'}
          >
            <ArrowLeft size={26} />
          </button>
          <h2 className="min-w-0 rounded-full border border-white/10 bg-black/25 px-4 py-2.5 text-center font-display text-sm font-bold text-white shadow-lg md:px-6 md:text-base">
            {transaction ? 'Editar lançamento' : flow === 'income' ? 'Receita' : flow === 'expense' ? lockedSourceType === 'card' ? 'Despesa cartão' : lockedSourceType === 'account' ? 'Despesa conta' : 'Despesa' : 'Transferência'}
          </h2>
          <button type="submit" disabled={cannotSubmit || isSaving} className="min-w-16 rounded-full px-1 py-2 text-sm font-bold text-white transition hover:bg-white/5 disabled:opacity-50">
            {isSaving ? 'Salvando' : 'Aplicar'}
          </button>
        </div>

        <div className="px-5 pb-5 pt-1 md:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Valor</p>
          <div className="mt-1 flex items-center gap-3">
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              className="h-14 border-0 bg-transparent px-0 text-4xl font-sans font-medium text-white focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => {
                const currentAmount = parseCurrencyInput(amount);
                setCalculatorExpression(currentAmount > 0 ? String(currentAmount).replace('.', ',') : '');
                setIsCalculatorOpen(true);
              }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white transition hover:bg-white/10"
              title="Abrir calculadora"
              aria-label="Abrir calculadora"
            >
              <Calculator size={22} />
            </button>
          </div>
        </div>

        <div className="premium-scroll flex-1 overflow-y-auto rounded-t-[30px] border-t border-white/10 bg-[#080A0F]/88 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 md:max-h-[calc(100dvh-16rem)] md:px-5">
          {formError ? (
            <p className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              <AlertCircle size={16} />
              {formError}
            </p>
          ) : null}

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Título
              <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Título do lançamento" className="h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-base text-white outline-none transition focus:border-violet-300" />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-200">
                Data
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                  <button
                    type="button"
                    onClick={() => setDate(todayValue)}
                    className={`h-11 rounded-full border px-4 text-sm font-bold ${
                      date === todayValue ? 'border-emerald-400 text-emerald-300' : 'border-white/15 text-slate-400'
                    }`}
                  >
                    Hoje
                  </button>
                  <DateInput value={date} onChange={setDate} />
                </div>
              </label>

              {flow === 'expense' && !isInvoiceCredit ? (
                <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.035] p-1.5">
                  <p className="col-span-3 px-2 pb-0.5 pt-1 text-xs font-semibold text-slate-300">Tipo de lançamento</p>
                  {expenseModes.map((option) => {
                    const Icon = option.icon;
                    const isDisabled = (lockedSourceType === 'account' && option.id === 'installment')
                      || (Boolean(transaction) && (
                        isGroupedTransaction
                          ? option.id !== expenseMode
                          : isRecurringOccurrence
                            ? option.id === 'installment'
                            : option.id !== expenseMode
                      ));
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setExpenseMode(option.id);
                          if (option.id === 'installment' && cards[0] && !cardId) setCardId(cards[0].id);
                        }}
                        disabled={isDisabled}
                        className={`flex h-10 items-center justify-center gap-1 rounded-xl text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          expenseMode === option.id ? 'premium-metal text-white' : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <Icon size={14} />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                  {expenseMode === 'installment' && !transaction ? (
                    <label className="col-span-3 grid gap-1 px-2 pb-2 pt-1 text-xs font-semibold text-slate-400">
                      Número de parcelas
                      <input
                        type="number"
                        min={2}
                        max={60}
                        value={installmentCount}
                        onChange={(event) => setInstallmentCount(event.target.value)}
                        className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-violet-300"
                      />
                      <span className="text-[11px] font-medium text-slate-500">
                        {`${parseEntryCount(installmentCount, 2)} parcelas serão criadas.`}
                      </span>
                    </label>
                  ) : null}
                </div>
              ) : null}

              {canEditForwardEntries ? (
                <div className="md:col-span-2 grid grid-cols-2 gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-2">
                  <p className="col-span-2 px-2 pb-1 text-xs font-bold text-amber-100">
                    Aplicar alteração
                  </p>
                  <button type="button" onClick={() => setEditScope('single')} className={`h-11 rounded-xl text-xs font-bold ${editScope === 'single' ? 'bg-amber-400 text-slate-950' : 'text-amber-100'}`}>
                    Apenas esta
                  </button>
                  <button type="button" onClick={() => setEditScope('forward')} className={`h-11 rounded-xl text-xs font-bold ${editScope === 'forward' ? 'bg-amber-400 text-slate-950' : 'text-amber-100'}`}>
                    Esta e próximas
                  </button>
                </div>
              ) : null}

              {flow === 'expense' && (canUseReimbursements || lockedSourceType !== 'account') ? (
                <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {lockedSourceType !== 'account' ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleInvoiceCreditChange(!isInvoiceCredit);
                          setIsQuickOptionsOpen(true);
                        }}
                        className={`h-10 rounded-xl px-3 text-xs font-bold transition ${isInvoiceCredit ? 'bg-emerald-400 text-slate-950' : 'bg-white/5 text-slate-300'}`}
                      >
                        Estorno fatura
                      </button>
                    ) : null}
                    {canUseReimbursements ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuickOptionsOpen(true);
                          if (splitMode === 'none') {
                            void handleSplitModeChange('shared');
                          } else {
                            void handleSplitModeChange('none');
                          }
                        }}
                        disabled={isInvoiceCredit}
                        className={`h-10 rounded-xl px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${splitMode !== 'none' ? 'bg-amber-400 text-slate-950' : 'bg-white/5 text-slate-300'}`}
                      >
                        Terceiro/reembolso
                      </button>
                    ) : null}
                  </div>

                  {hasQuickOptions ? (
                    <button
                      type="button"
                      onClick={() => setIsQuickOptionsOpen((current) => !current)}
                      className="mt-2 flex h-8 w-full items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-slate-400 transition hover:bg-white/5"
                    >
                      {isQuickOptionsOpen ? 'Ocultar detalhes' : 'Ajustar detalhes'}
                      <ChevronDown size={13} className={`transition ${isQuickOptionsOpen ? 'rotate-180' : ''}`} />
                    </button>
                  ) : null}

                  {isInvoiceCredit && isQuickOptionsOpen ? (
                    <p className="mt-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-medium text-emerald-100/80">Use para devoluções e créditos do cartão. O valor reduz a fatura e não vira receita.</p>
                  ) : null}

                  {splitMode !== 'none' && isQuickOptionsOpen ? (
                    <div className="mt-2 grid gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-3">
                      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-black/15 p-1">
                        {splitModeOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              void handleSplitModeChange(option.id);
                            }}
                            className={`min-h-10 rounded-xl px-2 text-[11px] font-bold transition ${splitMode === option.id ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      {splitMode === 'shared' ? (
                    <div className="mt-3 grid gap-3">
                      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/15 p-1">
                        <button type="button" onClick={() => setSplitType('percent')} className={`h-10 rounded-xl text-xs font-bold ${splitType === 'percent' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}>
                          Percentual
                        </button>
                        <button type="button" onClick={() => setSplitType('fixed')} className={`h-10 rounded-xl text-xs font-bold ${splitType === 'fixed' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}>
                          Valor fixo
                        </button>
                      </div>
                      {splitType === 'percent' ? (
                        <label className="grid gap-1 text-xs font-semibold text-slate-400">
                          Parte de terceiro (%)
                          <input
                            type="number"
                            min={1}
                            max={99}
                            step={1}
                            value={splitPercent}
                            onChange={(event) => setSplitPercent(event.target.value)}
                            className="h-12 rounded-2xl border border-white/10 bg-[#0B0E14] px-3 text-white outline-none focus:border-amber-300"
                          />
                        </label>
                      ) : (
                        <label className="grid gap-1 text-xs font-semibold text-slate-400">
                          Parte de terceiro (R$)
                          <CurrencyInput
                            value={splitFixedAmount}
                            onChange={setSplitFixedAmount}
                            className="h-12 rounded-2xl border border-white/10 bg-[#0B0E14] px-3 text-white outline-none focus:border-amber-300"
                          />
                        </label>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                          <p className="text-[10px] font-bold uppercase text-emerald-100">Minha parte</p>
                          <p className="mt-1 font-mono text-sm font-bold text-white">{formatCurrencyInput(personalAmount)}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3">
                          <p className="text-[10px] font-bold uppercase text-amber-100">Reembolso</p>
                          <p className="mt-1 font-mono text-sm font-bold text-white">{formatCurrencyInput(reimbursementAmount)}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {isReimbursable ? (
                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-1 text-xs font-semibold text-slate-400">
                          Quem deve
                          <select value={reimbursementPersonId} onChange={(event) => setReimbursementPersonId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-[#0B0E14] px-3 text-white outline-none focus:border-amber-300">
                            <option value="">Selecione</option>
                            {reimbursementPeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-slate-400">
                          Status
                          <select
                            value={reimbursementStatus}
                            onChange={(event) => {
                              const nextStatus = event.target.value as 'pending' | 'received';
                              setReimbursementStatus(nextStatus);
                              if (nextStatus === 'received' && !reimbursementReceivedAccountId) {
                                setReimbursementReceivedAccountId(accountId || accounts[0]?.id || '');
                              }
                              if (nextStatus === 'pending') {
                                setReimbursementReceivedAccountId('');
                              }
                            }}
                            className="h-12 rounded-2xl border border-white/10 bg-[#0B0E14] px-3 text-white outline-none focus:border-amber-300"
                          >
                            <option value="pending">A receber</option>
                            <option value="received">Recebido</option>
                          </select>
                        </label>
                      </div>
                      {reimbursementStatus === 'received' ? (
                        <label className="grid gap-1 text-xs font-semibold text-slate-400">
                          Conta onde o dinheiro entrou
                          <select
                            value={reimbursementReceivedAccountId}
                            onChange={(event) => setReimbursementReceivedAccountId(event.target.value)}
                            className="h-12 rounded-2xl border border-white/10 bg-[#0B0E14] px-3 text-white outline-none focus:border-emerald-300"
                          >
                            <option value="">Selecione</option>
                            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                          </select>
                        </label>
                      ) : null}
                      <div className="flex gap-2">
                        <input
                          value={newPersonName}
                          onChange={(event) => setNewPersonName(event.target.value)}
                          placeholder="Nova pessoa"
                          className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0B0E14] px-3 text-sm text-white outline-none focus:border-amber-300"
                        />
                        <button
                          type="button"
                          onClick={handleCreatePerson}
                          disabled={isCreatingPerson}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950 disabled:opacity-60"
                          title="Cadastrar pessoa"
                        >
                          <Plus size={17} />
                        </button>
                      </div>
                      {personError ? (
                        <p className="flex items-center gap-2 text-xs text-rose-200">
                          <AlertCircle size={14} />
                          {personError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {hasPersonalExpenseShare ? (
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-1">
                  {expenseNeedOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setExpenseNeed(option.id)}
                      className={`h-10 rounded-xl text-xs font-bold transition ${expenseNeed === option.id ? 'premium-metal text-white' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                Categoria
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-12 min-w-0 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-white outline-none transition focus:border-violet-300">
                  <option value="">Selecione</option>
                  {filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>

                {flow === 'expense' ? (
                  <div className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                  {lockedSourceType === 'card' ? 'Cartão' : lockedSourceType === 'account' ? 'Conta' : 'Origem'}
                  {lockedSourceType ? null : (
                    <div className="grid min-w-0 grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.035] p-1">
                      <button
                        type="button"
                        onClick={() => setSourceType('account')}
                        disabled={isInstallmentExpense || isInvoiceCredit}
                        className={`h-10 rounded-xl text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${sourceType === 'account' ? 'premium-metal text-white' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                        Conta
                      </button>
                      <button
                        type="button"
                        onClick={() => setSourceType('card')}
                        className={`h-10 rounded-xl text-xs font-bold transition ${sourceType === 'card' ? 'premium-metal text-white' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                        Cartão
                      </button>
                    </div>
                  )}
                  {sourceType === 'account' ? (
                    <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-12 min-w-0 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-white outline-none transition focus:border-violet-300">
                      {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                  ) : (
                    <select value={cardId} onChange={(event) => setCardId(event.target.value)} className="h-12 min-w-0 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-white outline-none transition focus:border-violet-300">
                      <option value="">Selecione</option>
                      {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                    </select>
                  )}
                </div>
              ) : (
                <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                  Conta
                  <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-3 text-white outline-none transition focus:border-violet-300">
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </label>
              )}

              {flow === 'expense' && sourceType === 'card' && cards.length === 0 ? (
                <p className="md:col-span-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-100">
                  Cadastre um cartão antes de criar uma despesa no cartão.
                </p>
              ) : null}

              {!(flow === 'expense' && (sourceType === 'card' || isInvoiceCredit)) ? (
                <label className="grid gap-2 text-sm font-semibold text-slate-200 md:col-span-2">
                  Estado
                  <select value={status} onChange={(event) => setStatus(event.target.value as 'paid' | 'pending')} className="h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-white outline-none transition focus:border-violet-300">
                    <option value="paid">Confirmado</option>
                    <option value="pending">Pendente</option>
                  </select>
                </label>
              ) : null}

              {invoiceInfo ? (
                <div className={`md:col-span-2 rounded-2xl border p-4 text-xs ${isEditingClosedInvoice ? 'border-amber-400/25 bg-amber-400/10 text-amber-100' : 'border-sky-400/20 bg-sky-400/10 text-sky-100'}`}>
                  <div className="flex items-center gap-2 font-bold text-white">
                    <CalendarClock size={16} />
                    <span>{invoiceInfo.label}</span>
                    <span className="ml-auto capitalize">{invoiceInfo.status}</span>
                  </div>
                  <p className="mt-2 text-slate-300">Consumo de {formatDatePtBr(invoiceInfo.startDate)} a {formatDatePtBr(invoiceInfo.endDate)}. Vencimento em {formatDatePtBr(invoiceInfo.dueDate)}.</p>
                  {isEditingClosedInvoice ? <p className="mt-2 font-semibold">Esta fatura já fechou ou venceu. Edite com cuidado para não alterar meses passados por engano.</p> : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsAdvancedOpen((current) => !current)}
              className="flex h-10 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              <span>Avançado</span>
              <ChevronDown size={16} className={`transition ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAdvancedOpen ? (
              <div className="grid gap-4 pt-1">
                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Descrição
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Adicione uma descrição" className="min-h-20 resize-none rounded-[22px] border border-white/15 bg-white/[0.035] px-4 py-4 text-base text-white outline-none transition focus:border-sky-400" />
                </label>

                {flow !== 'transfer' && !(flow === 'expense' && (splitMode === 'third_party_full' || isInvoiceCredit)) ? (
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

                {flow === 'expense' && expenseMode === 'fixed' && !isInvoiceCredit && !transaction ? (
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
                        <DateInput value={fixedEndDate} onChange={setFixedEndDate} min={date} />
                      </label>
                    ) : null}
                    <span className="text-[11px] font-medium text-slate-500">
                      {hasFixedEndDate && fixedEndDate
                        ? `${fixedDates.length} ocorrência${fixedDates.length === 1 ? '' : 's'} será${fixedDates.length === 1 ? '' : 'm'} projetada${fixedDates.length === 1 ? '' : 's'} pela regra.`
                        : 'A regra será salva no banco e projetada nos próximos 12 meses.'}
                    </span>
                  </div>
                ) : null}

                {flow === 'expense' && (sourceType === 'card' || isInvoiceCredit) && cards.length === 0 ? (
                  <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-100">
                    Cadastre um cartão antes de criar uma despesa no cartão.
                  </p>
                ) : null}
              </div>
            ) : null}

            <button type="submit" disabled={cannotSubmit || isSaving} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 font-bold text-white disabled:opacity-50">
              <Check size={18} />
              {isSaving ? 'Salvando...' : 'Salvar lançamento'}
            </button>
          </div>
        </div>
      </form>

      {isCalculatorOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/75 p-0 backdrop-blur-sm md:p-6">
        <div className="flex h-[100dvh] max-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden border border-white/10 bg-[#0B0E14] text-white shadow-2xl md:h-[860px] md:max-h-[calc(100dvh-3rem)] md:rounded-[34px]">
          <div className="flex items-center justify-between px-4 py-3">
            <button type="button" onClick={() => setIsCalculatorOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-white">
              <X size={21} />
            </button>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Calculadora</p>
            <div className="h-11 w-11" />
          </div>

          <div className="mx-auto flex min-h-0 w-full flex-1 flex-col justify-end px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <p className="text-base font-medium text-slate-300">Qual valor da sua {flow === 'income' ? 'receita' : flow === 'expense' ? 'despesa' : 'transferência'}?</p>
            <p className="mt-2 min-h-9 break-all text-right text-2xl font-semibold text-slate-300">{calculatorExpression || '0,00'}</p>
            <p className="mt-1 text-right text-4xl font-bold tabular-nums">{calculatorResult === null ? 'R$ 0,00' : formatCurrencyInput(calculatorResult)}</p>

            <div className="mt-5 grid grid-cols-4 gap-2.5">
              <button type="button" onClick={() => appendCalculatorToken('/')} className="h-14 rounded-2xl bg-[#1A2630] text-xl font-bold">÷</button>
              <button type="button" onClick={() => appendCalculatorToken('*')} className="h-14 rounded-2xl bg-[#1A2630] text-xl font-bold">×</button>
              <button type="button" onClick={() => setCalculatorExpression((current) => current.slice(0, -1))} className="col-span-2 flex h-14 items-center justify-center rounded-2xl bg-[#1A2630]">
                <Delete size={24} />
              </button>

              {['7', '8', '9'].map((key) => <button key={key} type="button" onClick={() => appendCalculatorToken(key)} className="h-14 rounded-2xl bg-[#121A21] text-xl font-bold">{key}</button>)}
              <button type="button" onClick={() => appendCalculatorToken('-')} className="h-14 rounded-2xl bg-[#1A2630] text-2xl font-bold">−</button>

              {['4', '5', '6'].map((key) => <button key={key} type="button" onClick={() => appendCalculatorToken(key)} className="h-14 rounded-2xl bg-[#121A21] text-xl font-bold">{key}</button>)}
              <button type="button" onClick={() => appendCalculatorToken('+')} className="h-14 rounded-2xl bg-[#1A2630] text-2xl font-bold">+</button>

              {['1', '2', '3'].map((key) => <button key={key} type="button" onClick={() => appendCalculatorToken(key)} className="h-14 rounded-2xl bg-[#121A21] text-xl font-bold">{key}</button>)}
              <button
                type="button"
                onClick={applyCalculatorResult}
                disabled={calculatorResult === null}
                className={`row-span-2 rounded-2xl text-white disabled:opacity-40 ${
                  flow === 'income' ? 'bg-emerald-500' : flow === 'expense' ? 'bg-rose-500' : 'bg-sky-500'
                }`}
              >
                <Check size={32} className="mx-auto" />
              </button>

              <button type="button" onClick={() => setCalculatorExpression('')} className="col-span-2 h-14 rounded-2xl bg-[#1A2630] text-lg font-bold">AC</button>
              <button type="button" onClick={() => appendCalculatorToken('0')} className="h-14 rounded-2xl bg-[#121A21] text-xl font-bold">0</button>
            </div>
          </div>
        </div>
        </div>
      ) : null}
    </div>
  );
}

