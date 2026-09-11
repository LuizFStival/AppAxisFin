import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRightLeft, Calculator, Check, ChevronDown, CirclePlus, ClipboardList, CreditCard, Delete, Plus, UserRound, Wallet, X } from 'lucide-react';
import { Account, Card, Category, EditSeriesScope, ExpenseEntryMode, ExpenseNeed, ExpenseSplitMode, MoneyFlow, ReimbursementPerson, Transaction } from '../../types';
import { CurrencyInput } from '../shared/CurrencyInput';
import { DateInput } from '../shared/DateInput';
import { DEFAULT_CURRENCY_INPUT, formatCurrencyInput, parseCurrencyInput } from '../../lib/utils/currency';
import { formatLocalDate } from '../../lib/utils/date';
import { formatCurrency } from '../../lib/utils/finance';
import { getCardInvoiceInfo } from '../../lib/utils/cardInvoices';
import { getVisibleNotes, readTransactionMeta } from '../../lib/utils/transactionMeta';
import { hasDuplicateName } from '../../lib/utils/validation';
import { getUserFriendlyError } from '../../lib/utils/userFriendlyError';
import { parseMathExpression } from '../../lib/utils/mathExpression';
import { parseQuickEntries } from '../../lib/utils/quickEntryParser';
import {
  buildMonthlyDates,
  buildOpenEndedMonthlyDates,
  expenseNeedOptions,
  INVOICE_ADJUSTMENT_CATEGORY_NAME,
  isInvoiceAdjustmentCategory,
  isReimbursementCategory,
  normalizeCategoryName,
  parseEntryCount,
  PaymentSourceType,
  REIMBURSEMENT_CATEGORY_NAME,
} from './addEntryRules';
import {
  AddEntryDraft,
  buildQuickEntryTransactions,
  splitAmountIntoInstallments,
} from './addEntryBuilder';
import { AddEntrySavePlan, buildAddEntrySavePlan } from './addEntrySavePlan';
import { ExpenseOptions } from './ExpenseOptions';
import { QuickEntry, type QuickReviewItem } from './QuickEntry';
import { ReimbursementFields } from './ReimbursementFields';
import { SourceSelector } from './SourceSelector';

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
  onSkipFixedOccurrence?: (transaction: Transaction) => boolean | Promise<boolean>;
  onClose: () => void;
  onSave: (
    transaction: Omit<Transaction, 'id'> | Array<Omit<Transaction, 'id'>>,
    scope?: EditSeriesScope,
  ) => void | Promise<void>;
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives?: number;
  onresult: ((event: { resultIndex?: number; results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function AddEntryModal({ isOpen, accounts, cards, categories, reimbursementPeople, reimbursementsEnabled, transaction, preferredCardId, onCreateCategory, onCreateReimbursementPerson, onCreateRecurring, onSkipFixedOccurrence, onClose, onSave }: AddEntryModalProps) {
  const canUseReimbursements = reimbursementsEnabled || Boolean(transaction?.isReimbursable);
  const [entryStep, setEntryStep] = useState<'picker' | 'form' | 'quick'>('picker');
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
  const [quickText, setQuickText] = useState('');
  const [quickSourceType, setQuickSourceType] = useState<PaymentSourceType>('card');
  const [quickAccountId, setQuickAccountId] = useState('');
  const [quickCardId, setQuickCardId] = useState('');
  const [quickCategoryId, setQuickCategoryId] = useState('');
  const [quickError, setQuickError] = useState('');
  const [isListeningQuickEntry, setIsListeningQuickEntry] = useState(false);
  const [quickDraftEdits, setQuickDraftEdits] = useState<Record<string, { date?: string; description?: string; amount?: string; categoryId?: string }>>({});
  const [quickDeletedDraftIds, setQuickDeletedDraftIds] = useState<string[]>([]);
  const initializedFormKeyRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const quickRecognitionRef = useRef<SpeechRecognitionLike | null>(null);

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
    setEditScope(transaction && (isRecurringOccurrence || transactionMeta.entryMode === 'installment') ? 'forward' : 'single');
    setNewCategoryName('');
    setCategoryError('');
    setFormError('');
    setIsSaving(false);
    setIsAdvancedOpen(false);
    setIsQuickOptionsOpen(false);
    setIsCalculatorOpen(false);
    setCalculatorExpression('');
    setQuickText('');
    setQuickSourceType(cards.length > 0 ? 'card' : 'account');
    setQuickAccountId(accounts[0]?.id ?? '');
    setQuickCardId(preferredCardId ?? cards[0]?.id ?? '');
    setQuickCategoryId(categories.find((category) => category.flow === 'expense')?.id ?? '');
    setQuickError('');
    setIsListeningQuickEntry(false);
    setQuickDraftEdits({});
    setQuickDeletedDraftIds([]);
    quickRecognitionRef.current?.stop();
    quickRecognitionRef.current = null;
  }, [accounts, cards, categories, isOpen, isRecurringOccurrence, preferredCardId, transaction, transactionMeta.entryMode, transactionMeta.expenseNeed, transactionMeta.generatedUntil, transactionMeta.invoiceAdjustment, transactionMeta.totalInstallments]);

  const selectedCard = sourceType === 'card' ? cards.find((card) => card.id === cardId) : undefined;
  const invoiceInfo = selectedCard && flow === 'expense' ? getCardInvoiceInfo(selectedCard, date) : null;
  const isEditingClosedInvoice = Boolean(transaction && invoiceInfo && invoiceInfo.status !== 'aberta');
  const todayValue = formatLocalDate(new Date());

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
  const installmentPreview = (() => {
    if (!isInstallmentExpense || transaction || parsedAmount <= 0) return null;
    const count = parseEntryCount(installmentCount, 2);
    const amounts = splitAmountIntoInstallments(parsedAmount, count);
    const firstAmount = amounts[0] ?? 0;
    const lastAmount = amounts[amounts.length - 1] ?? firstAmount;
    const hasAdjustment = amounts.some((item) => item !== firstAmount);
    return hasAdjustment
      ? `${count} parcelas: ${formatCurrency(firstAmount)} nas primeiras e ${formatCurrency(lastAmount)} na última. Total ${formatCurrency(parsedAmount)}.`
      : `${count}x de ${formatCurrency(firstAmount)}. Total ${formatCurrency(parsedAmount)}.`;
  })();
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
  const hasAdvancedContext = expenseMode !== 'variable'
    || isInvoiceCredit
    || splitMode !== 'none'
    || hasPersonalExpenseShare
    || Boolean(transaction && isGroupedTransaction)
    || hasFixedEndDate
    || Boolean(isReimbursable)
    || Boolean(newCategoryName.trim());
  const entryDraft: AddEntryDraft = {
    flow,
    amount: parsedAmount,
    status,
    notes,
    categoryId,
    sourceType,
    accountId,
    cardId,
    splitMode,
    expenseNeed,
    isInvoiceCredit,
    hasPersonalExpenseShare,
    personalAmount,
    reimbursementAmount,
    reimbursementPersonId,
    reimbursementStatus,
    reimbursementReceivedAccountId,
    reimbursementPeople,
  };
  const quickDrafts = useMemo(() => parseQuickEntries(quickText), [quickText]);
  const quickReviewDrafts = quickDrafts.filter((draft) => !quickDeletedDraftIds.includes(draft.id));

  function findQuickCategoryId(categoryHint?: string) {
    const expenseCategories = categories.filter((category) => category.flow === 'expense');
    if (!categoryHint) return quickCategoryId || expenseCategories[0]?.id || '';
    const normalizedHint = normalizeCategoryName(categoryHint);
    return expenseCategories.find((category) => {
      const normalizedName = normalizeCategoryName(category.name);
      return normalizedName === normalizedHint || normalizedName.includes(normalizedHint) || normalizedHint.includes(normalizedName);
    })?.id ?? quickCategoryId ?? expenseCategories[0]?.id ?? '';
  }

  function getQuickDraftReview(draft: (typeof quickDrafts)[number]): QuickReviewItem {
    const edit = quickDraftEdits[draft.id] ?? {};
    const amountInput = edit.amount ?? (draft.amount > 0 ? formatCurrencyInput(draft.amount) : DEFAULT_CURRENCY_INPUT);
    const amountValue = parseCurrencyInput(amountInput);
    const dateValue = edit.date ?? draft.date ?? todayValue;
    const descriptionValue = edit.description ?? draft.description;
    const categoryValue = edit.categoryId ?? findQuickCategoryId(draft.categoryHint);
    const error = !descriptionValue.trim()
      ? 'Título não encontrado'
      : amountValue <= 0
        ? 'Valor não encontrado'
        : !dateValue
          ? 'Data não encontrada'
          : !categoryValue
            ? 'Categoria não selecionada'
            : '';

    return {
      id: draft.id,
      raw: draft.raw,
      date: dateValue,
      description: descriptionValue,
      amountInput,
      amount: amountValue,
      categoryId: categoryValue,
      error,
    };
  }

  const quickReviewItems = quickReviewDrafts.map(getQuickDraftReview);
  const quickReadyItems = quickReviewItems.filter((item) => !item.error);

  async function executeSavePlan(plan: AddEntrySavePlan) {
    if (plan.kind === 'save') {
      await onSave(plan.transaction, plan.scope);
      return;
    }

    if (plan.kind === 'createRecurring') {
      await onCreateRecurring(plan.transaction, plan.endDate);
      return;
    }

    await Promise.all(plan.transactions.map((item) => onCreateRecurring(item, plan.endDate)));
  }

  function updateQuickDraft(id: string, patch: { date?: string; description?: string; amount?: string; categoryId?: string }) {
    setQuickDraftEdits((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  }

  function removeQuickDraft(id: string) {
    setQuickDeletedDraftIds((current) => Array.from(new Set([...current, id])));
  }

  function startQuickVoiceInput() {
    if (isListeningQuickEntry) return;
    const SpeechRecognitionCtor = (window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setQuickError('Seu navegador não liberou ditado por voz aqui. Você ainda pode colar ou digitar os gastos.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const startIndex = event.resultIndex ?? 0;
      const transcript = Array.from(event.results)
        .slice(startIndex)
        .map((result) => result[0].transcript)
        .join('\n');
      setQuickText((current) => [current.trim(), transcript.trim()].filter(Boolean).join('\n'));
    };
    recognition.onerror = (event) => {
      const errorMessages: Record<string, string> = {
        'not-allowed': 'O navegador bloqueou o microfone. Libere a permissão do microfone e tente novamente.',
        'service-not-allowed': 'O serviço de voz não está disponível neste navegador. Cole o texto ou use o ditado do teclado.',
        'audio-capture': 'Não encontrei um microfone ativo. Verifique o microfone do computador/celular.',
        'no-speech': 'Não ouvi nenhuma fala. Toque em “Ditado por voz” e fale uma despesa por vez.',
        network: 'O serviço de voz falhou por conexão. Você pode colar ou digitar os gastos.',
      };
      setQuickError(errorMessages[event.error ?? ''] ?? `Não consegui capturar a voz (${event.error ?? 'erro desconhecido'}). Cole o texto ou tente novamente.`);
    };
    recognition.onend = () => {
      setIsListeningQuickEntry(false);
      quickRecognitionRef.current = null;
    };
    setQuickError('');
    setIsListeningQuickEntry(true);
    quickRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListeningQuickEntry(false);
      quickRecognitionRef.current = null;
      setQuickError('O ditado já estava aberto ou o navegador recusou a captura. Tente novamente em alguns segundos.');
    }
  }

  function stopQuickVoiceInput() {
    quickRecognitionRef.current?.stop();
    quickRecognitionRef.current = null;
    setIsListeningQuickEntry(false);
  }

  async function handleQuickSave() {
    setQuickError('');
    if (quickReadyItems.length === 0) {
      setQuickError('Cole ou dite pelo menos um gasto com título e valor.');
      return;
    }
    if (quickSourceType === 'card' && !quickCardId) {
      setQuickError('Selecione o cartão usado nos lançamentos.');
      return;
    }
    if (quickSourceType === 'account' && !quickAccountId) {
      setQuickError('Selecione a conta usada nos lançamentos.');
      return;
    }
    if (quickReviewItems.some((item) => !item.categoryId)) {
      setQuickError('Selecione uma categoria padrão para os itens sem categoria reconhecida.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(buildQuickEntryTransactions({
        sourceType: quickSourceType,
        accountId: quickAccountId,
        cardId: quickCardId,
        items: quickReadyItems,
      }));
      onClose();
    } catch (error) {
      setQuickError(getUserFriendlyError(error, 'Não foi possível salvar os lançamentos rápidos.'));
    } finally {
      setIsSaving(false);
    }
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
      await executeSavePlan(buildAddEntrySavePlan({
        flow,
        transaction,
        transactionMeta,
        expenseMode,
        editScope,
        shouldCreateSharedEntries,
        hasPersonalExpenseShare,
        expenseNeed,
        isInvoiceCredit,
        hasFixedEndDate,
        fixedEndDate,
        installmentCount,
        date,
        description,
        notes,
        amount: parsedAmount,
        status,
        fromAccountId,
        toAccountId,
        entryDraft,
      }));
      onClose();
    } catch (error) {
      setFormError(getUserFriendlyError(error, 'Não foi possível salvar o lançamento. Tente novamente.'));
    } finally {
      setIsSaving(false);
    }
  }

  if (!transaction && entryStep === 'quick') {
    return (
      <QuickEntry
        accounts={accounts}
        cards={cards}
        categories={categories}
        quickSourceType={quickSourceType}
        quickCardId={quickCardId}
        quickAccountId={quickAccountId}
        quickCategoryId={quickCategoryId}
        quickText={quickText}
        quickError={quickError}
        quickReviewItems={quickReviewItems}
        quickReadyItems={quickReadyItems}
        isListeningQuickEntry={isListeningQuickEntry}
        isSaving={isSaving}
        onBack={() => setEntryStep('picker')}
        onClose={onClose}
        onSourceTypeChange={setQuickSourceType}
        onCardChange={setQuickCardId}
        onAccountChange={setQuickAccountId}
        onCategoryChange={setQuickCategoryId}
        onTextChange={setQuickText}
        onClear={() => {
          setQuickText('');
          setQuickDraftEdits({});
          setQuickDeletedDraftIds([]);
        }}
        onToggleVoice={isListeningQuickEntry ? stopQuickVoiceInput : startQuickVoiceInput}
        onUpdateDraft={updateQuickDraft}
        onRemoveDraft={removeQuickDraft}
        onSave={handleQuickSave}
      />
    );
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
            <button type="button" onClick={() => setEntryStep('quick')} className="cosmic-card cosmic-card-hover flex min-h-20 items-center justify-between rounded-2xl px-5 py-4 text-left text-white md:col-span-2" style={{ borderColor: '#F8FAFC66', backgroundImage: 'linear-gradient(135deg, rgba(248,250,252,0.16), transparent 58%)' }}>
              <span>
                <span className="block text-base font-bold">Lançamento rápido</span>
                <span className="mt-1 block text-xs font-medium text-slate-300/70">Colar ou ditar gastos da semana</span>
              </span>
              <ClipboardList size={24} className="text-white" />
            </button>
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/75 p-0 backdrop-blur-sm md:p-6">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="premium-card flex h-[100dvh] max-h-[100dvh] w-full max-w-[840px] flex-col overflow-hidden rounded-none shadow-2xl md:h-auto md:max-h-[calc(100dvh-2rem)] md:rounded-[34px]"
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {isInstallmentExpense && !transaction ? 'Valor total da compra' : 'Valor'}
          </p>
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

        <div className="premium-scroll flex-1 overflow-y-auto rounded-t-[30px] border-t border-white/10 bg-[#080A0F]/88 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 md:max-h-[calc(100dvh-15rem)] md:px-5">
          {formError ? (
            <p className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              <AlertCircle size={16} />
              {formError}
            </p>
          ) : null}

          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Título
              <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Título do lançamento" className="h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-base text-white outline-none transition focus:border-violet-300" />
            </label>

            <div className="grid gap-3 md:grid-cols-12">
              <label className="grid gap-2 text-sm font-semibold text-slate-200 md:col-span-5">
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

              {flow === 'expense' ? (
                <ExpenseOptions
                  cards={cards}
                  cardId={cardId}
                  lockedSourceType={lockedSourceType}
                  expenseMode={expenseMode}
                  installmentCount={installmentCount}
                  transaction={transaction}
                  isGroupedTransaction={isGroupedTransaction}
                  isRecurringOccurrence={isRecurringOccurrence}
                  isInvoiceCredit={isInvoiceCredit}
                  canEditForwardEntries={canEditForwardEntries}
                  editScope={editScope}
                  installmentPreview={installmentPreview}
                  onExpenseModeChange={setExpenseMode}
                  onCardChange={setCardId}
                  onInstallmentCountChange={setInstallmentCount}
                  onEditScopeChange={setEditScope}
                  onSkipFixedOccurrence={onSkipFixedOccurrence}
                  onClose={onClose}
                />
              ) : null}

              {flow === 'expense' ? (
                <ReimbursementFields
                  accounts={accounts}
                  reimbursementPeople={reimbursementPeople}
                  accountId={accountId}
                  lockedSourceType={lockedSourceType}
                  canUseReimbursements={canUseReimbursements}
                  isInvoiceCredit={isInvoiceCredit}
                  isQuickOptionsOpen={isQuickOptionsOpen}
                  splitMode={splitMode}
                  splitType={splitType}
                  splitPercent={splitPercent}
                  splitFixedAmount={splitFixedAmount}
                  personalAmount={personalAmount}
                  reimbursementAmount={reimbursementAmount}
                  isReimbursable={isReimbursable}
                  reimbursementPersonId={reimbursementPersonId}
                  reimbursementStatus={reimbursementStatus}
                  reimbursementReceivedAccountId={reimbursementReceivedAccountId}
                  newPersonName={newPersonName}
                  isCreatingPerson={isCreatingPerson}
                  personError={personError}
                  onInvoiceCreditChange={handleInvoiceCreditChange}
                  onQuickOptionsOpenChange={setIsQuickOptionsOpen}
                  onSplitModeChange={handleSplitModeChange}
                  onSplitTypeChange={setSplitType}
                  onSplitPercentChange={setSplitPercent}
                  onSplitFixedAmountChange={setSplitFixedAmount}
                  onReimbursementPersonChange={setReimbursementPersonId}
                  onReimbursementStatusChange={setReimbursementStatus}
                  onReimbursementReceivedAccountChange={setReimbursementReceivedAccountId}
                  onNewPersonNameChange={setNewPersonName}
                  onCreatePerson={handleCreatePerson}
                />
              ) : null}

              {hasPersonalExpenseShare ? (
                <div className="grid gap-2 text-sm font-semibold text-slate-200 md:col-span-6">
                  Natureza
                  <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.035] p-1.5">
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
                </div>
              ) : null}

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200 md:col-span-6">
                Categoria
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-12 min-w-0 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-white outline-none transition focus:border-violet-300">
                  <option value="">Selecione</option>
                  {filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>

              <SourceSelector
                accounts={accounts}
                cards={cards}
                flow={flow}
                lockedSourceType={lockedSourceType}
                sourceType={sourceType}
                accountId={accountId}
                cardId={cardId}
                status={status}
                isInstallmentExpense={isInstallmentExpense}
                isInvoiceCredit={isInvoiceCredit}
                invoiceInfo={invoiceInfo}
                isEditingClosedInvoice={isEditingClosedInvoice}
                onSourceTypeChange={setSourceType}
                onAccountChange={setAccountId}
                onCardChange={setCardId}
                onStatusChange={setStatus}
              />
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

