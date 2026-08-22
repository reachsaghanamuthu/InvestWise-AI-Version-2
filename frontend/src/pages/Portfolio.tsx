import { useState } from 'react';
import { Pencil, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import type { Transaction } from '@/types';
import { Page } from '@/components/Common/AppShell';
import { Sheet, SheetBody, SheetHead, Empty } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Delta } from '@/components/ui/Bits';
import { AddTransaction } from '@/components/Portfolio/AddTransaction';
import { usePortfolio } from '@/store/usePortfolio';
import { heldFor, money, shortDate } from '@/lib/format';

/* The portfolio is a ledger: holdings on top, then every entry in date order
   with greenbar rows, the way an accounting printout reads. */

const SECTOR_TONES = [
  'bg-ink/70',
  'bg-copilot/70',
  'bg-gain/70',
  'bg-mark/70',
  'bg-loss/60',
  'bg-ink/35',
];

export default function PortfolioPage() {
  const { summary, transactions, add, update, remove, refresh, refreshing, resetToDemo } =
    usePortfolio();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setFormOpen(true);
  };

  return (
    <Page
      eyebrow="Your ledger"
      title="Portfolio"
      action={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} loading={refreshing}>
            {!refreshing && <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
            <span className="hidden sm:inline">Refresh prices</span>
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add trade
          </Button>
        </div>
      }
    >
      {transactions.length === 0 ? (
        <Sheet>
          <Empty
            title="Nothing recorded yet"
            hint="Add the trades you have already made. The autopsy needs at least a few entries before it can find anything worth telling you."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add a trade
                </Button>
                <Button variant="outline" onClick={resetToDemo}>
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Load sample ledger
                </Button>
              </div>
            }
          />
        </Sheet>
      ) : (
        <div className="space-y-5">
          {/* --- Totals + allocation ---------------------------------- */}
          <Sheet>
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-3 sm:px-5">
              <div>
                <p className="eyebrow">Invested</p>
                <p className="figure mt-1 text-xl font-semibold">{money(summary.invested)}</p>
              </div>
              <div>
                <p className="eyebrow">Current value</p>
                <p className="figure mt-1 text-xl font-semibold">{money(summary.value)}</p>
              </div>
              <div>
                <p className="eyebrow">Gain / loss</p>
                <p className="mt-1 text-xl font-semibold">
                  <Delta value={summary.pnl} percent={summary.pnlPercent} />
                </p>
              </div>
            </div>

            {summary.sectorAllocation.length > 0 && (
              <div className="border-t border-rule px-4 py-4 sm:px-5">
                <p className="eyebrow mb-2">Where the money sits</p>
                <div className="flex h-2.5 overflow-hidden rounded-sm" role="img" aria-label="Sector allocation">
                  {summary.sectorAllocation.map((s, i) => (
                    <div
                      key={s.label}
                      className={SECTOR_TONES[i % SECTOR_TONES.length]}
                      style={{ width: `${s.percent}%` }}
                      title={`${s.label}: ${s.percent.toFixed(1)}%`}
                    />
                  ))}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {summary.sectorAllocation.map((s, i) => (
                    <li key={s.label} className="flex items-center gap-1.5 text-xs text-ink-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-[1px] ${SECTOR_TONES[i % SECTOR_TONES.length]}`}
                        aria-hidden
                      />
                      {s.label}
                      <span className="figure text-ink-3">{s.percent.toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Sheet>

          {/* --- Holdings --------------------------------------------- */}
          <Sheet>
            <SheetHead eyebrow="Open positions" title={`${summary.holdings.length} holdings`} />
            {summary.holdings.length === 0 ? (
              <SheetBody>
                <p className="text-sm text-ink-2">
                  Every position has been sold. The trades are still in the ledger below, and the
                  autopsy still reads them.
                </p>
              </SheetBody>
            ) : (
              <div className="scroll-thin overflow-x-auto">
                <table className="greenbar w-full min-w-[44rem] text-sm">
                  <thead>
                    <tr className="border-b border-rule">
                      <th className="eyebrow px-4 py-2 text-left font-medium sm:px-5">Instrument</th>
                      <th className="eyebrow px-3 py-2 text-right font-medium">Qty</th>
                      <th className="eyebrow px-3 py-2 text-right font-medium">Avg cost</th>
                      <th className="eyebrow px-3 py-2 text-right font-medium">Price</th>
                      <th className="eyebrow px-3 py-2 text-right font-medium">Value</th>
                      <th className="eyebrow px-3 py-2 text-right font-medium">Held</th>
                      <th className="eyebrow px-4 py-2 text-right font-medium sm:px-5">P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.holdings.map((h) => (
                      <tr key={h.symbol} className="border-b border-rule/60 last:border-0">
                        <td className="px-4 py-2.5 sm:px-5">
                          <span className="font-mono text-xs font-semibold">{h.symbol}</span>
                          <span className="block truncate text-xs text-ink-3">{h.name}</span>
                        </td>
                        <td className="figure px-3 py-2.5 text-right text-xs">{h.quantity}</td>
                        <td className="figure px-3 py-2.5 text-right text-xs">
                          ₹{h.avgCost.toFixed(2)}
                        </td>
                        <td className="figure px-3 py-2.5 text-right text-xs">
                          ₹{h.price.toFixed(2)}
                        </td>
                        <td className="figure px-3 py-2.5 text-right text-xs">{money(h.value)}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-ink-3">
                          {heldFor(h.heldDays)}
                        </td>
                        <td className="px-4 py-2.5 text-right sm:px-5">
                          <Delta value={h.pnl} percent={h.pnlPercent} className="text-xs" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Sheet>

          {/* --- Every entry ------------------------------------------ */}
          <Sheet>
            <SheetHead
              eyebrow="Every entry"
              title={`${transactions.length} transactions`}
              action={
                <Button variant="quiet" size="sm" onClick={resetToDemo}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">Reset to sample</span>
                </Button>
              }
            />
            <div className="scroll-thin overflow-x-auto">
              <table className="greenbar w-full min-w-[42rem] text-sm">
                <thead>
                  <tr className="border-b border-rule">
                    <th className="eyebrow px-4 py-2 text-left font-medium sm:px-5">Date</th>
                    <th className="eyebrow px-3 py-2 text-left font-medium">Side</th>
                    <th className="eyebrow px-3 py-2 text-left font-medium">Symbol</th>
                    <th className="eyebrow px-3 py-2 text-right font-medium">Qty</th>
                    <th className="eyebrow px-3 py-2 text-right font-medium">Price</th>
                    <th className="eyebrow px-3 py-2 text-right font-medium">Total</th>
                    <th className="eyebrow px-4 py-2 text-right font-medium sm:px-5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...transactions]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((tx) => (
                      <tr key={tx.id} className="border-b border-rule/60 last:border-0">
                        <td className="figure px-4 py-2.5 text-xs sm:px-5">
                          {shortDate(tx.date)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={
                              'font-mono text-[0.625rem] font-semibold uppercase tracking-wider ' +
                              (tx.side === 'buy' ? 'text-gain' : 'text-loss')
                            }
                          >
                            {tx.side}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-xs font-semibold">{tx.symbol}</span>
                          {tx.note && (
                            <span className="block max-w-[16rem] truncate text-xs italic text-ink-3">
                              “{tx.note}”
                            </span>
                          )}
                        </td>
                        <td className="figure px-3 py-2.5 text-right text-xs">{tx.quantity}</td>
                        <td className="figure px-3 py-2.5 text-right text-xs">
                          ₹{tx.price.toFixed(2)}
                        </td>
                        <td className="figure px-3 py-2.5 text-right text-xs">
                          {money(tx.quantity * tx.price)}
                        </td>
                        <td className="px-4 py-2.5 text-right sm:px-5">
                          {confirmId === tx.id ? (
                            <span className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  void remove(tx.id);
                                  setConfirmId(null);
                                }}
                                className="rounded-sm px-2 py-1 font-mono text-[0.625rem] uppercase text-loss hover:bg-loss/10"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                className="rounded-sm px-2 py-1 font-mono text-[0.625rem] uppercase text-ink-3 hover:bg-ink/[0.06]"
                              >
                                Keep
                              </button>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <button
                                onClick={() => openEdit(tx)}
                                className="rounded-sm p-1.5 text-ink-3 hover:bg-ink/[0.06] hover:text-ink"
                                aria-label={`Edit ${tx.side} ${tx.symbol} on ${shortDate(tx.date)}`}
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden />
                              </button>
                              <button
                                onClick={() => setConfirmId(tx.id)}
                                className="rounded-sm p-1.5 text-ink-3 hover:bg-loss/10 hover:text-loss"
                                aria-label={`Delete ${tx.side} ${tx.symbol} on ${shortDate(tx.date)}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Sheet>

          <p className="text-xs leading-relaxed text-ink-3">
            Values update from live market data where available and fall back to a bundled dataset
            otherwise — the badge in the corner always says which. Educational prototype; not
            financial advice.
          </p>
        </div>
      )}

      <AddTransaction
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={(tx) => {
          if (editing) void update(editing.id, tx);
          else void add(tx);
        }}
      />
    </Page>
  );
}
