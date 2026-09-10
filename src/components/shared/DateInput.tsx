import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDatePtBr, formatLocalDate, parseLocalDate } from '../../lib/utils/date';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  className?: string;
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const POPOVER_WIDTH = 288;
const POPOVER_HEIGHT = 352;
const VIEWPORT_GAP = 12;

function shiftMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function DateInput({ value, onChange, min, className = '' }: DateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => value ? parseLocalDate(value) : new Date());
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const selectedValue = value ? parseLocalDate(value) : null;
  const minValue = min ? parseLocalDate(min) : null;
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const today = useMemo(() => new Date(), []);
  const todayValue = formatLocalDate(today);

  useEffect(() => {
    if (!value) return;
    setVisibleMonth(parseLocalDate(value));
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    function updatePopoverPosition() {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const maxLeft = Math.max(VIEWPORT_GAP, window.innerWidth - POPOVER_WIDTH - VIEWPORT_GAP);
      const left = Math.min(Math.max(rect.left, VIEWPORT_GAP), maxLeft);
      const preferredTop = rect.bottom + 8;
      const top = preferredTop + POPOVER_HEIGHT > window.innerHeight - VIEWPORT_GAP
        ? Math.max(VIEWPORT_GAP, rect.top - POPOVER_HEIGHT - 8)
        : preferredTop;

      setPopoverStyle({
        left,
        top,
        width: POPOVER_WIDTH,
      });
    }

    updatePopoverPosition();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !popoverRef.current?.contains(target)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [isOpen]);

  function handleSelect(date: Date) {
    if (minValue && date < minValue) return;
    setIsOpen(false);
    onChange(formatLocalDate(date));
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 text-left text-sm font-bold text-white outline-none transition hover:border-sky-400 focus:border-sky-400"
      >
        <span>{value ? formatDatePtBr(value) : 'DD/MM/AAAA'}</span>
        <CalendarDays size={16} className="text-slate-500" />
      </button>

      {isOpen ? createPortal((
        <div ref={popoverRef} style={popoverStyle} className="fixed z-[80] rounded-2xl border border-white/10 bg-[#F8FAFC] p-3 text-slate-950 shadow-2xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => shiftMonth(current, -1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200"
              title="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-bold capitalize">{monthFormatter.format(visibleMonth)}</p>
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => shiftMonth(current, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200"
              title="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500">
            {weekDays.map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((date) => {
              const dateValue = formatLocalDate(date);
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isSelected = selectedValue ? dateValue === formatLocalDate(selectedValue) : false;
              const isToday = dateValue === todayValue;
              const isDisabled = Boolean(minValue && date < minValue);

              return (
                <button
                  key={dateValue}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleSelect(date);
                  }}
                  disabled={isDisabled}
                  aria-label={isToday ? `Hoje, dia ${date.getDate()}` : `Dia ${date.getDate()}`}
                  className={`flex h-8 items-center justify-center rounded-lg border text-xs font-bold transition disabled:cursor-not-allowed disabled:text-slate-300 ${
                    isSelected
                      ? `border-sky-500 bg-sky-500 text-white ${isToday ? 'ring-2 ring-sky-200 ring-offset-1 ring-offset-[#F8FAFC]' : ''}`
                      : isToday
                        ? 'border-sky-500 bg-sky-50 text-sky-700 hover:bg-sky-100'
                      : isCurrentMonth
                        ? 'border-transparent text-slate-950 hover:bg-sky-100'
                        : 'border-transparent text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={() => setVisibleMonth(today)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200">
              Hoje
            </button>
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100">
              Fechar
            </button>
          </div>
        </div>
      ), document.body) : null}
    </div>
  );
}
