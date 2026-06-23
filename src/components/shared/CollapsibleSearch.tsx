import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface CollapsibleSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  expandedClassName?: string;
}

export function CollapsibleSearch({
  value,
  onChange,
  placeholder,
  className = '',
  expandedClassName = '',
}: CollapsibleSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-sky-400/30 hover:text-sky-200 ${className}`}
        aria-label="Abrir busca"
        title="Buscar"
      >
        <Search size={16} />
        {value ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-sky-400" /> : null}
      </button>
    );
  }

  return (
    <div className={`flex h-10 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-sky-400/30 bg-[#101319] px-3 text-slate-400 ${expandedClassName}`}>
      <Search size={15} className="shrink-0 text-sky-300" />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
      />
      <button
        type="button"
        onClick={() => {
          onChange('');
          setIsOpen(false);
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white"
        aria-label="Fechar e limpar busca"
        title="Fechar busca"
      >
        <X size={15} />
      </button>
    </div>
  );
}
