import type { Quote, RiskReading } from '@/types';
import { bandPosition } from '@/lib/market';
import { pct } from '@/lib/format';
import { cn } from '@/lib/cn';

/* A quote, rendered as a data block rather than prose.

   The 52-week band is the part a beginner never gets shown: it answers "is this
   expensive right now?" faster than any number, by putting today's price on the
   year's range as a physical position. */

export function StockCard({ quote, compact }: { quote: Quote; compact?: boolean }) {
  const band = bandPosition(quote);
  const up = quote.changePercent >= 0;

  return (
    <div className="rounded-sm border border-rule bg-paper">
      <div className="flex items-start justify-between gap-3 border-b border-rule px-3 py-2.5">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold">{quote.symbol}</p>
          <p className="truncate text-xs text-ink-3">{quote.name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="figure text-sm font-semibold">₹{quote.price.toFixed(2)}</p>
          <p className={cn('figure text-xs', up ? 'text-gain' : 'text-loss')}>
            {pct(quote.changePercent)}
          </p>
        </div>
      </div>

      <div className="px-3 py-3">
        {/* 52-week band */}
        <div className="mb-1 flex items-center justify-between font-mono text-[0.625rem] text-ink-3">
          <span>₹{quote.low52.toFixed(0)}</span>
          <span className="uppercase tracking-wider">52-week range</span>
          <span>₹{quote.high52.toFixed(0)}</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-ink/[0.09]">
          <div
            className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-ink"
            style={{ left: `calc(${(band * 100).toFixed(1)}% - 1px)` }}
            aria-hidden
          />
        </div>
        <p className="mt-1.5 text-[0.6875rem] text-ink-3">
          Trading at {Math.round(band * 100)}% of its yearly range
        </p>

        {!compact && (
          <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-rule pt-3">
            <div>
              <dt className="eyebrow">PE</dt>
              <dd className="figure mt-0.5 text-sm">{quote.peRatio ?? '—'}</dd>
            </div>
            <div>
              <dt className="eyebrow">Yield</dt>
              <dd className="figure mt-0.5 text-sm">{(quote.dividendYield ?? 0).toFixed(2)}%</dd>
            </div>
            <div className="min-w-0">
              <dt className="eyebrow">Sector</dt>
              <dd className="mt-0.5 truncate text-xs">{quote.sector}</dd>
            </div>
          </dl>
        )}

        <p className="mt-2.5 font-mono text-[0.625rem] uppercase tracking-wider text-ink-3">
          {quote.source === 'mock' ? 'Offline dataset' : `Live · ${quote.source}`}
        </p>
      </div>
    </div>
  );
}

/* The risk reading that accompanies a single-stock answer. Every Copilot answer
   about one instrument carries a level and a horizon — never a target price. */
export function RiskBlock({ risk }: { risk: RiskReading }) {
  const tone = risk.score >= 8 ? 'text-loss' : risk.score >= 6 ? 'text-mark' : 'text-gain';

  return (
    <div className="rounded-sm border border-rule bg-paper px-3 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow">Risk reading</span>
        <span className={cn('figure text-sm font-semibold', tone)}>
          {risk.score}/10 · {risk.label}
        </span>
      </div>

      <div className="mt-2 flex gap-0.5" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-[1px]',
              i < risk.score
                ? risk.score >= 8
                  ? 'bg-loss'
                  : risk.score >= 6
                    ? 'bg-mark'
                    : 'bg-gain'
                : 'bg-ink/[0.09]',
            )}
          />
        ))}
      </div>

      <p className="mt-2.5 text-xs text-ink-2">
        <span className="font-semibold text-ink">Suggested horizon: </span>
        {risk.horizon}
      </p>
    </div>
  );
}
