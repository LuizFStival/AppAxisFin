import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, CheckCircle2, FileSpreadsheet, Search, Trash2, Upload, UserRound, X } from 'lucide-react';
import { Card, Category, ReimbursementPerson, Transaction } from '../../types';
import { formatCurrency, isInvoiceCredit } from '../../lib/utils/finance';
import { formatShortDatePtBr } from '../../lib/utils/date';
import { getUserFriendlyError } from '../../lib/utils/userFriendlyError';
import {
  buildInvoiceImportTransactions,
  filterInvoiceImportItemsByCardPeriod,
  parseNubankInvoiceCsv,
  reconcileInvoiceImportItems,
  ReconciledInvoiceImportItem,
  InvoiceImportReimbursementDraft,
  suggestInvoiceImportCategoryId,
} from '../../lib/utils/invoiceImport';

interface CardInvoiceImportModalProps {
  card: Card;
  categories: Category[];
  reimbursementPeople: ReimbursementPerson[];
  invoiceLabel: string;
  activeMonth: string;
  invoiceTransactions: Transaction[];
  onClose: () => void;
  onImport: (transactions: Array<Omit<Transaction, 'id'>>) => Promise<void>;
}

export function CardInvoiceImportModal({
  card,
  categories,
  reimbursementPeople,
  invoiceLabel,
  activeMonth,
  invoiceTransactions,
  onClose,
  onImport,
}: CardInvoiceImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ReconciledInvoiceImportItem[]>([]);
  const [categoryByImportId, setCategoryByImportId] = useState<Record<string, string>>({});
  const [reimbursementByImportId, setReimbursementByImportId] = useState<Record<string, InvoiceImportReimbursementDraft>>({});
  const [ignoredImportIds, setIgnoredImportIds] = useState<string[]>([]);
  const [investigatingImportId, setInvestigatingImportId] = useState('');
  const [investigationQueryByImportId, setInvestigationQueryByImportId] = useState<Record<string, string>>({});
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [ignoredCount, setIgnoredCount] = useState(0);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const expenseCategories = categories.filter((category) => category.flow === 'expense');
  const activeRows = rows.filter((row) => !ignoredImportIds.includes(row.id));
  const importableRows = activeRows.filter((row) => row.matchStatus === 'new');
  const matchedRows = activeRows.filter((row) => row.matchStatus === 'matched');
  const totalToImport = useMemo(
    () => importableRows.reduce((sum, row) => sum + (row.kind === 'credit' ? -row.amount : row.amount), 0),
    [importableRows],
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setParseErrors([]);
    setRows([]);
    setIgnoredCount(0);
    setIgnoredImportIds([]);
    setInvestigatingImportId('');
    setInvestigationQueryByImportId({});
    setFileName(file.name);

    try {
      const parsed = parseNubankInvoiceCsv(await file.text());
      const periodItems = filterInvoiceImportItemsByCardPeriod(parsed.items, card, activeMonth);
      const reconciled = reconcileInvoiceImportItems(periodItems, invoiceTransactions);
      const initialCategories: Record<string, string> = {};
      const initialReimbursements: Record<string, InvoiceImportReimbursementDraft> = {};

      reconciled.forEach((item) => {
        if (item.matchStatus === 'new') {
          initialCategories[item.id] = suggestInvoiceImportCategoryId(categories, item) ?? '';
          if (item.kind === 'expense') {
            initialReimbursements[item.id] = {
              splitMode: 'personal',
              reimbursementStatus: 'pending',
            };
          }
        }
      });

      setRows(reconciled);
      setCategoryByImportId(initialCategories);
      setReimbursementByImportId(initialReimbursements);
      setParseErrors(parsed.errors);
      setIgnoredCount(parsed.items.length - periodItems.length);
      if (periodItems.length === 0) {
        setError(`A fatura importada não tem lançamentos no ciclo ${invoiceLabel} deste cartão.`);
      }
    } catch (parseError) {
      setError(getUserFriendlyError(parseError, 'Não foi possível ler o CSV do Nubank.'));
    }
  }

  async function handleImport() {
    setError('');
    const rowsToImport = rows.filter((row) => !ignoredImportIds.includes(row.id));
    const transactions = buildInvoiceImportTransactions({
      items: rowsToImport,
      cardId: card.id,
      categoryByImportId,
      reimbursementByImportId,
      reimbursementPersonNameById: Object.fromEntries(reimbursementPeople.map((person) => [person.id, person.name])),
    });
    const missingPerson = rowsToImport.some((row) => {
      const reimbursement = reimbursementByImportId[row.id];
      return row.matchStatus === 'new'
        && row.kind === 'expense'
        && reimbursement
        && reimbursement.splitMode !== 'personal'
        && !reimbursement.reimbursementPersonId;
    });

    if (missingPerson) {
      setError('Selecione a pessoa nos lançamentos marcados como reembolso ou dividido.');
      return;
    }

    if (transactions.length === 0) {
      setError('Não há lançamentos novos para importar.');
      return;
    }

    setIsSaving(true);
    try {
      await onImport(transactions);
      onClose();
    } catch (importError) {
      setError(getUserFriendlyError(importError, 'Não foi possível importar os lançamentos da fatura.'));
    } finally {
      setIsSaving(false);
    }
  }

  function updateReimbursement(id: string, patch: Partial<InvoiceImportReimbursementDraft>) {
    const row = rows.find((item) => item.id === id);
    setReimbursementByImportId((current) => {
      const previous = current[id] ?? { splitMode: 'personal', reimbursementStatus: 'pending' };
      const next = { ...previous, ...patch };
      if (patch.splitMode === 'shared' && !Number.isFinite(next.personalAmount)) {
        next.personalAmount = row ? Number((row.amount / 2).toFixed(2)) : 0;
      }
      if (patch.splitMode === 'personal') {
        next.reimbursementPersonId = undefined;
        next.personalAmount = undefined;
      }
      return { ...current, [id]: next };
    });
  }

  function toggleIgnoredImportId(id: string) {
    setIgnoredImportIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function markRowAsMatched(row: ReconciledInvoiceImportItem, transaction: Transaction) {
    setRows((current) => current.map((item) =>
      item.id === row.id
        ? {
          ...item,
          matchStatus: 'matched',
          matchReason: 'manual',
          matchedTransaction: transaction,
        }
        : item,
    ));
    setInvestigatingImportId('');
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={(event) => event.stopPropagation()}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0B0E14] shadow-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-3 border-b border-white/8 p-5">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Importar fatura Nubank</h2>
            <p className="mt-1 text-xs text-slate-500">{invoiceLabel} de {card.name}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="premium-scroll max-h-[calc(92vh-148px)] overflow-y-auto p-5">
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void handleFileChange(event)} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-300/25 bg-violet-500/10 px-4 py-5 text-center transition hover:bg-violet-500/15"
          >
            <Upload size={24} className="text-violet-200" />
            <span className="text-sm font-bold text-white">{fileName || 'Selecionar CSV da fatura'}</span>
            <span className="text-xs text-slate-500">O arquivo fica no navegador; só os lançamentos confirmados entram no AxisFin.</span>
          </button>

          {error ? (
            <p className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              <AlertCircle size={16} />
              {error}
            </p>
          ) : null}

          {rows.length > 0 ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Novos</p>
                  <p className="mt-1 font-display text-xl font-bold text-white">{importableRows.length}</p>
                </div>
                <div className="rounded-2xl border border-sky-400/15 bg-sky-500/10 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-sky-200">Conciliados</p>
                  <p className="mt-1 font-display text-xl font-bold text-white">{matchedRows.length}</p>
                </div>
                <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200">Impacto</p>
                  <p className={`mt-1 truncate font-display text-xl font-bold ${totalToImport < 0 ? 'text-emerald-200' : 'text-white'}`}>{formatCurrency(totalToImport)}</p>
                </div>
                <div className="rounded-2xl border border-slate-400/15 bg-slate-500/10 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Ignorados</p>
                  <p className="mt-1 font-display text-xl font-bold text-white">{ignoredImportIds.length}</p>
                </div>
              </div>

              {ignoredCount > 0 || parseErrors.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                  {ignoredCount > 0 ? <p>{ignoredCount} lançamento{ignoredCount === 1 ? '' : 's'} ficaram fora do ciclo selecionado.</p> : null}
                  {parseErrors.slice(0, 3).map((item) => <p key={item}>{item}</p>)}
                </div>
              ) : null}

              <div className="mt-4 space-y-2">
                {rows.map((row) => {
                  const reimbursement = reimbursementByImportId[row.id] ?? { splitMode: 'personal', reimbursementStatus: 'pending' };
                  const isIgnored = ignoredImportIds.includes(row.id);
                  const isInvestigating = investigatingImportId === row.id;
                  const investigationQuery = investigationQueryByImportId[row.id] ?? '';
                  const candidates = getInvestigationCandidates(row, invoiceTransactions, rows, investigationQuery);
                  const reimbursementAmount = reimbursement.splitMode === 'third_party_full'
                    ? row.amount
                    : reimbursement.splitMode === 'shared'
                      ? Math.max(0, row.amount - (reimbursement.personalAmount ?? row.amount / 2))
                      : 0;

                  return (
                  <article key={row.id} className={`grid gap-3 rounded-2xl border p-3 sm:grid-cols-[1fr_190px] sm:items-center ${isIgnored ? 'border-slate-500/20 bg-slate-500/5 opacity-60' : 'border-white/8 bg-white/[0.03]'}`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-white">{row.baseTitle}</p>
                        {isIgnored ? <span className="rounded-full border border-slate-400/20 bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold text-slate-200">Ignorado</span> : null}
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${row.matchStatus === 'matched' ? 'border-sky-400/20 bg-sky-500/15 text-sky-100' : 'border-emerald-400/20 bg-emerald-500/15 text-emerald-100'}`}>
                          {row.matchStatus === 'matched' ? 'Conciliado' : 'Novo'}
                        </span>
                        {row.kind === 'credit' ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-100">Crédito</span> : null}
                        {row.installmentNumber && row.totalInstallments ? <span className="rounded-full border border-violet-400/20 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-100">Parcela {row.installmentNumber}/{row.totalInstallments}</span> : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{formatShortDatePtBr(row.date)} • {row.title}</p>
                      {row.matchStatus === 'matched' ? (
                        <p className="mt-1 truncate text-[11px] text-sky-200">
                          {getMatchReasonLabel(row.matchReason)}
                          {row.matchedTransaction ? `: ${row.matchedTransaction.description}` : ''}
                        </p>
                      ) : null}
                      {isInvestigating ? (
                        <div className="mt-3 rounded-xl border border-sky-400/15 bg-sky-500/10 p-2">
                          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-widest text-sky-200">
                            Investigar na fatura cadastrada
                            <div className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3">
                              <Search size={14} className="text-slate-500" />
                              <input
                                value={investigationQuery}
                                onChange={(event) => setInvestigationQueryByImportId((current) => ({ ...current, [row.id]: event.target.value }))}
                                placeholder="Buscar por nome"
                                className="min-w-0 flex-1 bg-transparent text-xs normal-case tracking-normal text-white outline-none placeholder:text-slate-600"
                              />
                            </div>
                          </label>
                          <div className="mt-2 grid gap-2">
                            {candidates.length === 0 ? (
                              <p className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-xs text-slate-500">Nenhum candidato encontrado neste ciclo.</p>
                            ) : candidates.map((candidate) => (
                              <button
                                key={candidate.transaction.id}
                                type="button"
                                onClick={() => markRowAsMatched(row, candidate.transaction)}
                                className="grid gap-1 rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-left transition hover:border-sky-300/40 hover:bg-sky-500/10"
                              >
                                <span className="flex items-center justify-between gap-2">
                                  <span className="truncate text-xs font-bold text-white">{candidate.transaction.description}</span>
                                  <span className="shrink-0 font-mono text-xs font-bold text-rose-200">{formatCurrency(candidate.transaction.amount)}</span>
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {formatShortDatePtBr(candidate.transaction.date)} • {candidate.reasons.join(', ')}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {row.matchStatus === 'new' && row.kind === 'expense' && !isIgnored ? (
                        <div className="mt-3 grid gap-2 rounded-xl border border-white/8 bg-black/20 p-2 sm:grid-cols-3">
                          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            Tipo
                            <select
                              value={reimbursement.splitMode}
                              onChange={(event) => updateReimbursement(row.id, { splitMode: event.target.value as InvoiceImportReimbursementDraft['splitMode'] })}
                              className="h-9 rounded-xl border border-white/10 bg-black/30 px-3 text-xs normal-case tracking-normal text-white outline-none focus:border-violet-300"
                            >
                              <option value="personal">Meu</option>
                              <option value="third_party_full">Reembolso total</option>
                              <option value="shared">Dividido</option>
                            </select>
                          </label>
                          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            Pessoa
                            <select
                              value={reimbursement.reimbursementPersonId ?? ''}
                              disabled={reimbursement.splitMode === 'personal'}
                              onChange={(event) => updateReimbursement(row.id, { reimbursementPersonId: event.target.value || undefined })}
                              className="h-9 rounded-xl border border-white/10 bg-black/30 px-3 text-xs normal-case tracking-normal text-white outline-none disabled:opacity-40 focus:border-violet-300"
                            >
                              <option value="">Selecione</option>
                              {reimbursementPeople.map((person) => (
                                <option key={person.id} value={person.id}>{person.name}</option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            Minha parte
                            <input
                              type="number"
                              min={0}
                              max={row.amount}
                              step="0.01"
                              value={reimbursement.splitMode === 'shared' ? String(reimbursement.personalAmount ?? Number((row.amount / 2).toFixed(2))) : reimbursement.splitMode === 'third_party_full' ? '0' : String(row.amount)}
                              disabled={reimbursement.splitMode !== 'shared'}
                              onChange={(event) => updateReimbursement(row.id, { personalAmount: Number(event.target.value) })}
                              className="h-9 rounded-xl border border-white/10 bg-black/30 px-3 text-xs normal-case tracking-normal text-white outline-none disabled:opacity-40 focus:border-violet-300"
                            />
                          </label>
                          {reimbursement.splitMode !== 'personal' ? (
                            <p className="flex items-center gap-1 text-[11px] font-bold text-amber-200 sm:col-span-3">
                              <UserRound size={12} />
                              A receber: {formatCurrency(reimbursementAmount)}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="grid gap-2">
                      <p className={`text-right font-mono text-sm font-bold ${row.kind === 'credit' ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {row.kind === 'credit' ? '-' : ''}{formatCurrency(row.amount)}
                      </p>
                      {row.matchStatus === 'new' && !isIgnored ? (
                        <select
                          value={categoryByImportId[row.id] ?? ''}
                          onChange={(event) => setCategoryByImportId((current) => ({ ...current, [row.id]: event.target.value }))}
                          className="h-9 min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 text-xs font-semibold text-white outline-none focus:border-violet-300"
                        >
                          <option value="">Sem categoria</option>
                          {expenseCategories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="flex h-9 items-center justify-end gap-1 text-xs font-bold text-sky-200">
                          <CheckCircle2 size={14} />
                          {isIgnored ? 'Fora do lote' : 'Já existe'}
                        </span>
                      )}
                      {row.matchStatus === 'new' && !isIgnored ? (
                        <button
                          type="button"
                          onClick={() => setInvestigatingImportId((current) => current === row.id ? '' : row.id)}
                          className="flex h-9 items-center justify-center gap-1 rounded-xl bg-sky-500/10 px-3 text-xs font-bold text-sky-200 transition hover:bg-sky-500/20"
                        >
                          <Search size={14} />
                          Investigar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => toggleIgnoredImportId(row.id)}
                        className={`flex h-9 items-center justify-center gap-1 rounded-xl px-3 text-xs font-bold transition ${isIgnored ? 'bg-white/5 text-slate-200 hover:bg-white/10' : 'bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'}`}
                      >
                        {isIgnored ? <Check size={14} /> : <Trash2 size={14} />}
                        {isIgnored ? 'Restaurar' : 'Ignorar'}
                      </button>
                    </div>
                  </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-center">
              <FileSpreadsheet size={24} className="mx-auto text-slate-500" />
              <p className="mt-2 text-sm font-bold text-white">Envie o CSV para ver a conferência</p>
              <p className="mt-1 text-xs text-slate-500">O AxisFin separa novos lançamentos dos que já estão cadastrados.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/8 p-4">
          <button type="button" onClick={onClose} className="h-11 rounded-xl bg-white/5 px-4 text-sm font-bold text-slate-200 transition hover:bg-white/10">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={isSaving || importableRows.length === 0}
            className="flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-black transition hover:bg-slate-200 disabled:opacity-40"
          >
            <Check size={17} />
            {isSaving ? 'Importando...' : `Importar ${importableRows.length}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function getMatchReasonLabel(reason: ReconciledInvoiceImportItem['matchReason']) {
  if (reason === 'date_amount') return 'Conciliado por data e valor';
  if (reason === 'merchant') return 'Conciliado por estabelecimento';
  if (reason === 'manual') return 'Conciliado manualmente';
  return 'Conciliado por importação anterior';
}

function getInvestigationCandidates(
  row: ReconciledInvoiceImportItem,
  invoiceTransactions: Transaction[],
  rows: ReconciledInvoiceImportItem[],
  query: string,
) {
  const normalizedQuery = normalizeSearch(query);
  const usedTransactionIds = new Set(
    rows
      .filter((item) => item.id !== row.id && item.matchedTransaction)
      .map((item) => item.matchedTransaction?.id)
      .filter(Boolean),
  );

  return invoiceTransactions
    .filter((transaction) => !usedTransactionIds.has(transaction.id))
    .map((transaction) => {
      const sameKind = row.kind === 'credit' ? isInvoiceCredit(transaction) : !isInvoiceCredit(transaction);
      if (!sameKind) return undefined;

      const transactionKey = normalizeSearch(transaction.description).replace(/[^a-z0-9]+/g, ' ').trim();
      const sameDate = transaction.date === row.date;
      const closeDate = Math.abs(daysBetween(transaction.date, row.date)) <= 2;
      const sameAmount = Math.abs(transaction.amount - row.amount) < 0.01;
      const merchantLike = transactionKey.includes(row.merchantKey) || row.merchantKey.includes(transactionKey);
      const queryMatch = normalizedQuery ? transactionKey.includes(normalizedQuery) : false;
      const score = (sameAmount ? 5 : 0)
        + (sameDate ? 4 : 0)
        + (merchantLike ? 3 : 0)
        + (!sameDate && closeDate ? 1 : 0)
        + (queryMatch ? 4 : 0);

      if (score === 0 || (normalizedQuery && !queryMatch && !sameAmount && !sameDate)) return undefined;

      return {
        transaction,
        score,
        reasons: [
          sameAmount ? 'valor igual' : '',
          sameDate ? 'mesma data' : closeDate ? 'data próxima' : '',
          merchantLike ? 'nome parecido' : '',
          queryMatch ? 'busca' : '',
        ].filter(Boolean),
      };
    })
    .filter((candidate): candidate is { transaction: Transaction; score: number; reasons: string[] } => Boolean(candidate))
    .sort((left, right) => right.score - left.score || left.transaction.date.localeCompare(right.transaction.date))
    .slice(0, 8);
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function daysBetween(left: string, right: string) {
  const leftDate = new Date(`${left}T00:00:00`);
  const rightDate = new Date(`${right}T00:00:00`);
  return Math.round((leftDate.getTime() - rightDate.getTime()) / 86400000);
}
