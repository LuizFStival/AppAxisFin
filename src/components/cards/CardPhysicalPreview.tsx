import { Card } from '../../types';
import { formatCurrency } from '../../lib/utils/finance';

export function getNetworkLabel(network: Card['network']) {
  if (network === 'mastercard') return 'Mastercard';
  if (network === 'visa') return 'Visa';
  if (network === 'elo') return 'Elo';
  return 'Cartão';
}

function getMaskedCardNumber(card: Card) {
  const seed = Array.from(card.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const lastDigits = String((seed % 9000) + 1000).padStart(4, '0');
  return `1478 2255 4595 ${lastDigits}`;
}

function CardNetworkMark({ network }: { network: Card['network'] }) {
  if (network === 'mastercard') {
    return (
      <span className="relative block h-6 w-10" aria-label="Mastercard">
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-red-500/90" />
        <span className="absolute right-1 top-1 h-5 w-5 rounded-full bg-amber-400/90 mix-blend-screen" />
      </span>
    );
  }

  return (
    <span className="flex h-7 min-w-12 items-center justify-center rounded-md bg-white/15 px-2 text-[10px] font-black text-white">
      {getNetworkLabel(network)}
    </span>
  );
}

interface CardPhysicalPreviewProps {
  card: Card;
  displayStatus: string;
  invoiceLabel: string;
  total: number;
  totalDisplay?: string;
}

export function CardPhysicalPreview({ card, displayStatus, invoiceLabel, total, totalDisplay }: CardPhysicalPreviewProps) {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div
        className="relative overflow-hidden rounded-[24px] border border-white/15 p-4 shadow-2xl"
        style={{
          aspectRatio: '1.586 / 1',
          backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.18), transparent 28%), radial-gradient(circle at 88% 2%, ${card.color}99, transparent 34%), linear-gradient(135deg, ${card.color}, #251344 54%, #11131d)`,
          boxShadow: `0 22px 55px ${card.color}22`,
        }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-white/35" />
        <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full border border-white/10 bg-white/5" />
        <div className="absolute bottom-0 left-0 h-20 w-full bg-gradient-to-t from-black/30 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-white/65">Total da fatura</p>
              <p className="mt-1 truncate font-display text-xl font-black text-white">{totalDisplay ?? formatCurrency(total)}</p>
            </div>
            <span className="rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-bold text-white">
              {displayStatus}
            </span>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-7 w-9 rounded-md border border-amber-200/30 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-700 shadow-inner" />
              <span className="relative h-7 w-8" aria-hidden="true">
                <span className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-r-full border-y border-r border-white/45" />
                <span className="absolute left-1.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-r-full border-y border-r border-white/30" />
                <span className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-r-full border-y border-r border-white/20" />
              </span>
            </div>
            <p className="font-mono text-sm font-bold text-white sm:text-base">{getMaskedCardNumber(card)}</p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-white/60">Titular</p>
                <p className="truncate text-sm font-black text-white">{card.name}</p>
                <p className="mt-1 truncate text-[11px] font-semibold text-white/55">{invoiceLabel}</p>
              </div>
              <CardNetworkMark network={card.network} />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto h-7 w-[86%] rounded-b-[28px] bg-black/25 blur-md" />
    </div>
  );
}
