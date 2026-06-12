import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';
import { Category } from '../../types';
import { DuplicateNameError, hasDuplicateName } from '../../lib/utils/validation';

interface AddCategoryModalProps {
  isOpen: boolean;
  categories: Category[];
  category?: Category | null;
  onClose: () => void;
  onSave: (input: Omit<Category, 'id' | 'isSystem'>) => Promise<void>;
}

const categoryColors = ['#F43F5E', '#10B981', '#3882F6', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6', '#64748B'];
const categoryIcons = ['Utensils', 'Home', 'Car', 'Compass', 'Settings', 'Briefcase', 'Laptop', 'MoreHorizontal'];

export function AddCategoryModal({ isOpen, categories, category, onClose, onSave }: AddCategoryModalProps) {
  const [name, setName] = useState('');
  const [flow, setFlow] = useState<Category['flow']>('expense');
  const [icon, setIcon] = useState('MoreHorizontal');
  const [color, setColor] = useState('#F43F5E');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(category?.name ?? '');
    setFlow(category?.flow ?? 'expense');
    setIcon(category?.icon ?? 'MoreHorizontal');
    setColor(category?.color ?? '#F43F5E');
    setError('');
    setIsSaving(false);
  }, [category, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Informe o nome da categoria.');
      return;
    }

    const sameFlowCategories = categories.filter((item) => item.flow === flow).map((item) => item.name);
    if (hasDuplicateName(trimmedName, sameFlowCategories, category?.name)) {
      setError('Ja existe uma categoria com esse nome para esse tipo.');
      return;
    }

    setIsSaving(true);

    try {
      await onSave({ name: trimmedName, flow, icon, color });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof DuplicateNameError ? saveError.message : 'Nao foi possivel salvar a categoria.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-t-[28px] border border-white/10 bg-[#0B0E14] p-5 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">{category ? 'Editar categoria' : 'Nova categoria'}</h2>
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
              placeholder="Ex: Mercado, Lazer, Salario"
              className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400"
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Tipo
            <select
              value={flow}
              onChange={(event) => setFlow(event.target.value as Category['flow'])}
              className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400"
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Icone
            <select
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400"
            >
              {categoryIcons.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-xs font-semibold text-slate-400">
            Cor
            <div className="flex flex-wrap items-center gap-2">
              {categoryColors.map((option) => (
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
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 font-bold text-white disabled:opacity-60"
        >
          <Check size={18} />
          {isSaving ? 'Salvando...' : category ? 'Salvar categoria' : 'Criar categoria'}
        </button>
      </form>
    </div>
  );
}
