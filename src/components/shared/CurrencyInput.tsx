import React from 'react';
import { maskCurrencyInput } from '../../lib/utils/currency';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}

export function CurrencyInput({ value, onChange, id, placeholder = 'R$ 0,00', className = '' }: CurrencyInputProps) {
  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(maskCurrencyInput(event.target.value))}
        inputMode="numeric"
        placeholder={placeholder}
        className={`h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 font-mono text-lg text-white outline-none focus:border-sky-400 ${className}`}
      />
    </div>
  );
}
