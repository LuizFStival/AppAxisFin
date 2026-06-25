import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ExpenseViewFilter, expenseViewFilterOptions } from '../../lib/utils/expenseFilters';

interface ExpenseFilterChipsProps {
  value: ExpenseViewFilter;
  onChange: (value: ExpenseViewFilter) => void;
  className?: string;
}

export function ExpenseFilterChips({ value, onChange, className = '' }: ExpenseFilterChipsProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setCanScrollLeft(scroller.scrollLeft > 2);
    setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2);
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const selected = scrollerRef.current?.querySelector<HTMLElement>(`[data-filter-id="${value}"]`);
    selected?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [value]);

  function scrollFilters(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: direction * 150, behavior: 'smooth' });
  }

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        ref={scrollerRef}
        onScroll={updateScrollState}
        className="horizontal-scroll no-scrollbar flex min-w-0 touch-pan-x gap-2 overflow-x-auto pb-1 pr-8"
        role="group"
        aria-label="Filtrar despesas"
      >
        {expenseViewFilterOptions.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              data-filter-id={option.id}
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              className={`h-8 shrink-0 rounded-full border px-3 text-[11px] font-bold transition ${
                selected
                  ? 'border-sky-400/40 bg-sky-500 text-white'
                  : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {canScrollLeft ? (
        <button
          type="button"
          onClick={() => scrollFilters(-1)}
          className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#101319] text-sky-200 shadow-lg"
          aria-label="Ver filtros anteriores"
          title="Filtros anteriores"
        >
          <ChevronLeft size={15} />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollFilters(1)}
          className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-sky-400/30 bg-[#101319] text-sky-200 shadow-lg"
          aria-label="Ver mais filtros"
          title="Ver mais filtros"
        >
          <ChevronRight size={15} />
        </button>
      ) : null}
    </div>
  );
}
