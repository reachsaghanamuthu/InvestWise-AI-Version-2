import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, RefreshCw } from 'lucide-react';
import { Page } from '@/components/Common/AppShell';
import { Sheet, SheetBody, SheetHead, Empty } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Chip, Delta, Meter } from '@/components/ui/Bits';
import { GradeMark } from '@/components/ui/Stamp';
import { usePortfolio } from '@/store/usePortfolio';
import { useAuth } from '@/store/useAuth';
import { runAutopsy } from '@/lib/patterns';
import { niftyLevel } from '@/lib/market';
import { money, pct } from '@/lib/format';
import { MILESTONES } from '@/data/demo';

/* The dashboard is a summary sheet, not a wall of widgets: the four numbers a
   student checks, the one finding that matters most this month, and a way into
   each of the two features. */

function StatBlock({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: React.ReactNode;
  tone?: 'gain' | 'loss';
}) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="eyebrow">{label}</p>
      <p
        className={
          'figure mt-1.5 text-xl font-semibold sm:text-2xl ' +
          (tone === 'gain' ? 'text-gain' : tone === 'loss' ? 'text-loss' : '')
        }
      >
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-ink-2">{note}</p>}
    </div>
  );
}

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const { summary, transactions, quotes, refresh, refreshing } = usePortfolio();

  const report = useMemo(() => runAutopsy(transactions, quotes), [transactions, quotes]);
  const nifty = useMemo(() => niftyLevel(), []);

  const topFinding =
    report.patterns.find((p) => p.severity === 'high') ??
    report.patterns.find((p) => p.severity !== 'clear') ??
    report.patterns[0];

  const firstName = user?.name.split(' ')[0] ?? 'there';
  const empty = summary.holdings.length === 0;

  return (
    <Page
      eyebrow={report.period}
      title={`Namaste, ${firstName}`}
      action={
        <Button variant="outline" size="sm" onClick={() => void refresh()} loading={refreshing}>
          {!refreshing && <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
          Refresh prices
        </Button>
      }
    >
      {empty ? (
        <Sheet>
          <Empty
            title="Your ledger is empty"
            hint="Add the trades you have already made — even the ones you regret. The report needs history to find a pattern in."
            action={
              <Link to="/app/portfolio">
                <Button>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add your first trade
                </Button>
              </Link>
            }
          />
        </Sheet>
      ) : (
        <>
          {/* --- The four numbers ------------------------------------- */}
          <Sheet className="mb-5">
            <div className="grid grid-cols-2 divide-x divide-y divide-rule sm:grid-cols-4 sm:divide-y-0">
              <StatBlock
                label="Portfolio value"
                value={money(summary.value)}
                note={`${money(summary.invested)} invested`}
              />
              <StatBlock
                label="Total gain / loss"
                value={money(Math.abs(summary.pnl))}
                tone={summary.pnl >= 0 ? 'gain' : 'loss'}
                note={<Delta percent={summary.pnlPercent} />}
              />
              <StatBlock
                label="Holdings"
                value={String(summary.holdings.length)}
                note={`${summary.sectorAllocation.length} sectors · ${summary.tradesThisMonth} trades this month`}
              />
              <StatBlock
                label="vs Nifty 50"
                value={pct(summary.pnlPercent - nifty.changePercent)}
                tone={summary.pnlPercent - nifty.changePercent >= 0 ? 'gain' : 'loss'}
                note={`Nifty ${pct(nifty.changePercent)} today`}
              />
            </div>
          </Sheet>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            {/* --- This month's headline finding --------------------- */}
            <div className="space-y-5">
              <Sheet>
                <SheetHead
                  eyebrow="This month’s headline finding"
                  title={
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-stat font-semibold text-loss">
                        {topFinding.code}
                      </span>
                      {topFinding.name}
                    </span>
                  }
                  action={<GradeMark grade={report.grade} />}
                />
                <SheetBody>
                  <p className="text-[0.9375rem] leading-relaxed">{topFinding.finding}</p>

                  {topFinding.evidence.length > 0 && (
                    <ul className="mt-4 space-y-1 border-l-2 border-loss/40 pl-3">
                      {topFinding.evidence.slice(0, 3).map((line) => (
                        <li key={line} className="figure text-xs text-ink-2">
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-4 border-t border-rule pt-4 text-sm leading-relaxed text-ink-2">
                    <span className="font-semibold text-ink">What to do: </span>
                    {topFinding.advice}
                  </p>

                  <Link
                    to="/app/autopsy"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-ink underline underline-offset-4 hover:no-underline"
                  >
                    Read the full autopsy
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </SheetBody>
              </Sheet>

              {/* --- Holdings ------------------------------------------ */}
              <Sheet>
                <SheetHead
                  eyebrow="Positions"
                  title="What you hold"
                  action={
                    <Link
                      to="/app/portfolio"
                      className="rounded-sm text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
                    >
                      Manage
                    </Link>
                  }
                />
                <div className="scroll-thin overflow-x-auto">
                  <table className="greenbar w-full min-w-[34rem] text-sm">
                    <thead>
                      <tr className="border-b border-rule">
                        <th className="eyebrow px-4 py-2 text-left font-medium sm:px-5">Symbol</th>
                        <th className="eyebrow px-3 py-2 text-right font-medium">Qty</th>
                        <th className="eyebrow px-3 py-2 text-right font-medium">Avg cost</th>
                        <th className="eyebrow px-3 py-2 text-right font-medium">Price</th>
                        <th className="eyebrow px-4 py-2 text-right font-medium sm:px-5">P&amp;L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.holdings.slice(0, 6).map((h) => (
                        <tr key={h.symbol} className="border-b border-rule/60 last:border-0">
                          <td className="px-4 py-2.5 sm:px-5">
                            <span className="font-mono text-xs font-semibold">{h.symbol}</span>
                            <span className="block truncate text-xs text-ink-3">{h.sector}</span>
                          </td>
                          <td className="figure px-3 py-2.5 text-right text-xs">{h.quantity}</td>
                          <td className="figure px-3 py-2.5 text-right text-xs">
                            ₹{h.avgCost.toFixed(2)}
                          </td>
                          <td className="figure px-3 py-2.5 text-right text-xs">
                            ₹{h.price.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right sm:px-5">
                            <Delta value={h.pnl} percent={h.pnlPercent} className="text-xs" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Sheet>
            </div>

            {/* --- Side column ---------------------------------------- */}
            <div className="space-y-5">
              <Sheet>
                <SheetHead eyebrow="Ask the Copilot" title="Stuck on something?" />
                <SheetBody className="space-y-2">
                  {[
                    'Should I buy now or wait?',
                    'Explain index funds',
                    '/portfolio_health',
                  ].map((q) => (
                    <Link
                      key={q}
                      to={`/app/copilot?q=${encodeURIComponent(q)}`}
                      className="block rounded-sm border border-rule px-3 py-2.5 text-sm transition-colors hover:border-copilot/50 hover:bg-copilot/[0.06]"
                    >
                      {q}
                    </Link>
                  ))}
                  <Link to="/app/copilot" className="block pt-1">
                    <Button variant="outline" block size="sm">
                      Open the Copilot
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </Link>
                </SheetBody>
              </Sheet>

              <Sheet>
                <SheetHead eyebrow="Behaviour" title="Your marks this month" />
                <SheetBody className="space-y-3.5">
                  {report.scores.map((s) => (
                    <div key={s.key}>
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <span className="text-sm">{s.label}</span>
                        <span className="figure text-sm font-semibold">{s.score}/10</span>
                      </div>
                      <Meter score={s.score} />
                    </div>
                  ))}
                </SheetBody>
              </Sheet>

              <Sheet>
                <SheetHead eyebrow="Progress" title="Milestones" />
                <SheetBody>
                  <ul className="space-y-2">
                    {MILESTONES.map((m) => (
                      <li key={m.id} className="flex items-center gap-2.5 text-sm">
                        <span
                          className={
                            'flex h-4 w-4 shrink-0 items-center justify-center border text-[10px] ' +
                            (m.done
                              ? 'border-gain bg-gain/15 text-gain'
                              : 'border-rule text-transparent')
                          }
                          aria-hidden
                        >
                          ✓
                        </span>
                        <span className={m.done ? '' : 'text-ink-3'}>{m.label}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 border-t border-rule pt-3 text-xs text-ink-3">
                    {MILESTONES.filter((m) => m.done).length} of {MILESTONES.length} complete
                  </p>
                </SheetBody>
              </Sheet>

              <Chip tone="neutral" className="w-full justify-center py-2">
                Educational only · Not financial advice
              </Chip>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
