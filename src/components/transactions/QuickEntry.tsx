import { AlertCircle, ArrowLeft, Mic, X } from 'lucide-react';
import { Account, Card, Category } from '../../types';
import { CurrencyInput } from '../shared/CurrencyInput';
import { PaymentSourceType } from './addEntryRules';

export interface QuickReviewItem {
  id: string;
  raw: string;
  date: string;
  description: string;
  amountInput: string;
  amount: number;
  categoryId: string;
  error: string;
}

interface QuickEntryProps {
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  quickSourceType: PaymentSourceType;
  quickCardId: string;
  quickAccountId: string;
  quickCategoryId: string;
  quickText: string;
  quickError: string;
  quickReviewItems: QuickReviewItem[];
  quickReadyItems: QuickReviewItem[];
  isListeningQuickEntry: boolean;
  isSaving: boolean;
  onBack: () => void;
  onClose: () => void;
  onSourceTypeChange: (sourceType: PaymentSourceType) => void;
  onCardChange: (cardId: string) => void;
  onAccountChange: (accountId: string) => void;
  onCategoryChange: (categoryId: string) => void;
  onTextChange: (text: string) => void;
  onClear: () => void;
  onToggleVoice: () => void;
  onUpdateDraft: (id: string, patch: { date?: string; description?: string; amount?: string; categoryId?: string }) => void;
  onRemoveDraft: (id: string) => void;
  onSave: () => void;
}

export function QuickEntry({
  accounts,
  cards,
  categories,
  quickSourceType,
  quickCardId,
  quickAccountId,
  quickCategoryId,
  quickText,
  quickError,
  quickReviewItems,
  quickReadyItems,
  isListeningQuickEntry,
  isSaving,
  onBack,
  onClose,
  onSourceTypeChange,
  onCardChange,
  onAccountChange,
  onCategoryChange,
  onTextChange,
  onClear,
  onToggleVoice,
  onUpdateDraft,
  onRemoveDraft,
  onSave,
}: QuickEntryProps) {
  const expenseCategories = categories.filter((category) => category.flow === 'expense');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/75 p-0 backdrop-blur-sm md:p-6">
      <div className="premium-card flex max-h-[100dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-none shadow-2xl md:max-h-[calc(100dvh-2rem)] md:rounded-[30px]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white">
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0 text-center">
            <h2 className="font-display text-lg font-bold text-white">Lançamento rápido</h2>
            <p className="text-xs font-semibold text-slate-500">Cole ou dite os gastos da semana</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="premium-scroll min-h-0 flex-1 overflow-y-auto p-5">
          {quickError ? (
            <p className="mb-3 flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              <AlertCircle size={16} />
              {quickError}
            </p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.035] p-1">
              <button type="button" onClick={() => onSourceTypeChange('card')} disabled={cards.length === 0} className={`h-10 rounded-xl text-xs font-bold transition disabled:opacity-40 ${quickSourceType === 'card' ? 'bg-white text-black' : 'text-slate-400'}`}>Cartão</button>
              <button type="button" onClick={() => onSourceTypeChange('account')} className={`h-10 rounded-xl text-xs font-bold transition ${quickSourceType === 'account' ? 'bg-white text-black' : 'text-slate-400'}`}>Conta</button>
            </div>
            {quickSourceType === 'card' ? (
              <select value={quickCardId} onChange={(event) => onCardChange(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-white outline-none focus:border-violet-300">
                <option value="">Selecione o cartão</option>
                {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
              </select>
            ) : (
              <select value={quickAccountId} onChange={(event) => onAccountChange(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-white outline-none focus:border-violet-300">
                <option value="">Selecione a conta</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            )}
            <select value={quickCategoryId} onChange={(event) => onCategoryChange(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-white outline-none focus:border-violet-300">
              <option value="">Categoria padrão</option>
              {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>

          <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-200">
            Texto dos gastos
            <textarea
              value={quickText}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder={'Exemplo:\n28/06 | Estacionamento Shopping Brei | 21,50 | Transporte\n29/06 Amazon R$ 82,28 Compras'}
              className="min-h-40 resize-y rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-relaxed text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={onToggleVoice} className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${isListeningQuickEntry ? 'bg-rose-500/15 text-rose-100 hover:bg-rose-500/25' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}>
              <Mic size={16} />
              {isListeningQuickEntry ? 'Concluir item' : quickReviewItems.length > 0 ? 'Falar próximo item' : 'Ditado por voz'}
            </button>
            <button type="button" onClick={onClear} className="h-10 rounded-xl bg-white/5 px-4 text-sm font-bold text-slate-300 transition hover:bg-white/10">
              Limpar
            </button>
          </div>

          <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025]">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
              <p className="text-sm font-bold text-white">Revisão</p>
              <p className="text-xs font-semibold text-slate-500">{quickReadyItems.length}/{quickReviewItems.length} prontos</p>
            </div>
            {quickReviewItems.length === 0 ? (
              <div className="p-5 text-center text-sm font-semibold text-slate-500">Os itens detectados aparecem aqui antes de salvar.</div>
            ) : (
              <div className="divide-y divide-white/8">
                {quickReviewItems.map((item) => (
                  <article key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[128px_minmax(180px,1fr)_128px_minmax(150px,0.8fr)_40px] md:items-start">
                    <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Data
                      <input
                        type="date"
                        value={item.date}
                        onChange={(event) => onUpdateDraft(item.id, { date: event.target.value })}
                        className="h-10 rounded-xl border border-white/10 bg-black/20 px-2 text-xs font-bold normal-case tracking-normal text-white outline-none focus:border-violet-300"
                      />
                    </label>
                    <label className="grid min-w-0 gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Título
                      <input
                        value={item.description}
                        onChange={(event) => onUpdateDraft(item.id, { description: event.target.value })}
                        className="h-10 min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-violet-300"
                      />
                      {item.error ? <span className="text-xs font-semibold normal-case tracking-normal text-rose-200">{item.error}</span> : null}
                    </label>
                    <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Valor
                      <CurrencyInput
                        value={item.amountInput}
                        onChange={(value) => onUpdateDraft(item.id, { amount: value })}
                        className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm font-black normal-case tracking-normal text-white outline-none focus:border-violet-300"
                      />
                    </label>
                    <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Categoria
                      <select
                        value={item.categoryId}
                        onChange={(event) => onUpdateDraft(item.id, { categoryId: event.target.value })}
                        className="h-10 rounded-xl border border-white/10 bg-black/20 px-2 text-xs font-bold normal-case tracking-normal text-white outline-none focus:border-violet-300"
                      >
                        <option value="">Selecione</option>
                        {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                    </label>
                    <div className="flex md:justify-end md:pt-5">
                      <button
                        type="button"
                        onClick={() => onRemoveDraft(item.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-100 transition hover:bg-rose-500/20"
                        title="Remover item"
                        aria-label="Remover item"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-2 border-t border-white/10 p-4 sm:grid-cols-[1fr_auto]">
          <p className="text-xs font-semibold leading-relaxed text-slate-500">Revise antes de salvar. Itens com erro ficam fora do cadastro.</p>
          <button type="button" onClick={onSave} disabled={isSaving || quickReadyItems.length === 0} className="h-11 rounded-xl bg-white px-5 text-sm font-black text-black transition hover:bg-slate-200 disabled:opacity-40">
            {isSaving ? 'Salvando...' : `Salvar ${quickReadyItems.length} gasto${quickReadyItems.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
