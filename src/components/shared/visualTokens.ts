type ClassValue = string | false | null | undefined;

export function cx(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(' ');
}

export const screen = {
  scroll: 'premium-scroll app-page-gutters flex h-full min-h-0 flex-col overflow-y-auto pb-8 pt-7 text-white',
  scrollWide: 'premium-scroll app-page-gutters flex h-full min-h-0 flex-col overflow-y-auto pb-8 pt-7 text-white md:pt-8',
  list: 'premium-scroll mt-5 min-h-[260px] flex-1 space-y-3 overflow-y-auto pb-4',
  compactList: 'premium-scroll mt-5 min-h-[220px] flex-1 space-y-3 overflow-y-auto pb-4',
};

export const surface = {
  panel: 'rounded-2xl border border-white/10 bg-white/[0.035]',
  panelMuted: 'rounded-2xl border border-white/10 bg-white/[0.025]',
  summary: 'rounded-2xl border border-white/10 bg-white/[0.04]',
  interactive: 'rounded-2xl border border-white/10 bg-white/[0.035] transition hover:border-white/20 hover:bg-white/[0.055]',
  interactiveItem: 'rounded-2xl border border-white/8 bg-white/[0.03] transition hover:border-white/20 hover:bg-white/[0.055]',
  empty: 'rounded-2xl border border-dashed border-white/10 bg-white/[0.025] text-center',
  segmented: 'rounded-2xl border border-white/10 bg-white/[0.025] p-1',
  segmentedCompact: 'rounded-xl border border-white/10 bg-white/[0.025] p-1',
  modal: 'border border-white/10 bg-[#0B0E14] shadow-2xl',
};

export const control = {
  ghostButton: 'rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10',
  iconButton: 'flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white',
  field: 'rounded-2xl border border-white/10 bg-white/[0.035] text-white outline-none transition focus:border-violet-300',
};
