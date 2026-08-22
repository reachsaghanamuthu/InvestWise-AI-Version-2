import type { AutopsyReport } from '@/types';
import { Sheet } from '@/components/ui/Sheet';
import { Delta } from '@/components/ui/Bits';
import { money, pct } from '@/lib/format';

/* Section A of the report: the numbers, before any interpretation. */

export function AutopsyOverview({ report }: { report: AutopsyReport }) {
  const o = report.overview;
  const vsNifty = o.monthPnlPercent - o.niftyPercent;

  return (
    <div className="space-y-5">
      <Sheet>
        <div className="grid grid-cols-2 divide-x divide-y divide-rule sm:grid-cols-4 sm:divide-y-0">
          <div className="px-4 py-4">
            <p className="eyebrow">Portfolio value</p>
            <p className="figure mt-1.5 text-xl font-semibold">{money(o.value)}</p>
            <p className="mt-1 text-xs text-ink-2">{money(o.invested)} invested</p>
          </div>
          <div className="px-4 py-4">
            <p className="eyebrow">Month gain / loss</p>
            <p className="figure mt-1.5 text-xl font-semibold">
              <Delta value={o.monthPnl} />
            </p>
            <p className="mt-1 text-xs text-ink-2">{pct(o.monthPnlPercent)}</p>
          </div>
          <div className="px-4 py-4">
            <p className="eyebrow">Holdings</p>
            <p className="figure mt-1.5 text-xl font-semibold">{o.holdings}</p>
            <p className="mt-1 text-xs text-ink-2">{o.allocation.length} instrument types</p>
          </div>
          <div className="px-4 py-4">
            <p className="eyebrow">vs Nifty 50</p>
            <p className="mt-1.5 text-xl font-semibold">
              <Delta percent={vsNifty} />
            </p>
            <p className="mt-1 text-xs text-ink-2">Nifty {pct(o.niftyPercent)}</p>
          </div>
        </div>
      </Sheet>

      <div className="grid gap-5 sm:grid-cols-2">
        <Sheet>
          <div className="border-b border-rule px-4 py-3 sm:px-5">
            <p className="eyebrow">Best and worst</p>
          </div>
          <div className="divide-y divide-rule">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <div>
                <p className="font-mono text-sm font-semibold">{o.best?.symbol ?? '—'}</p>
                <p className="text-xs text-ink-3">Best performer</p>
              </div>
              {o.best && <Delta percent={o.best.pnlPercent} className="text-sm" />}
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <div>
                <p className="font-mono text-sm font-semibold">{o.worst?.symbol ?? '—'}</p>
                <p className="text-xs text-ink-3">Worst performer</p>
              </div>
              {o.worst && <Delta percent={o.worst.pnlPercent} className="text-sm" />}
            </div>
          </div>
        </Sheet>

        <Sheet>
          <div className="border-b border-rule px-4 py-3 sm:px-5">
            <p className="eyebrow">Diversification</p>
          </div>
          <div className="px-4 py-4 sm:px-5">
            {o.allocation.length === 0 ? (
              <p className="text-sm text-ink-2">No open positions this period.</p>
            ) : (
              <ul className="space-y-3">
                {o.allocation.map((a) => (
                  <li key={a.label}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span>{a.label}</span>
                      <span className="figure text-ink-2">{a.percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.09]">
                      <div className="h-full rounded-full bg-ink/60" style={{ width: `${a.percent}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Sheet>
      </div>
    </div>
  );
}
