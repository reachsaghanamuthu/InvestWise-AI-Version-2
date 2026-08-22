import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Quote, Transaction } from '@/types';
import { Sheet } from '@/components/ui/Sheet';
import { monthlyTrend } from '@/lib/patterns';
import { compact } from '@/lib/format';
import { MILESTONES } from '@/data/demo';
import { cn } from '@/lib/cn';

/* Six months of trend.

   Four small charts rather than one with four lines on it: the metrics have
   different units and opposite good directions, so overlaying them would only
   look busy. Each panel states which way is better, because "trades per month
   going down" is progress and that is not obvious. */

interface PanelProps {
  label: string;
  better: string;
  tone: string;
  data: { month: string; v: number }[];
  format?: (n: number) => string;
  area?: boolean;
}

function Panel({ label, better, tone, data, format = String, area }: PanelProps) {
  const latest = data[data.length - 1]?.v ?? 0;
  const first = data[0]?.v ?? 0;
  const delta = latest - first;

  return (
    <div className="px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <p className="figure text-sm font-semibold">{format(latest)}</p>
      </div>

      <div className={cn('mt-3 h-24', tone)}>
        <ResponsiveContainer width="100%" height="100%">
          {area ? (
            <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
              <defs>
                <linearGradient id={`fill-${label.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgb(var(--iw-rule))"
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: 'rgb(var(--iw-ink-3))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Tooltip
                cursor={{ stroke: 'rgb(var(--iw-rule))' }}
                contentStyle={{
                  background: 'rgb(var(--iw-sheet))',
                  border: '1px solid rgb(var(--iw-rule))',
                  borderRadius: 2,
                  fontSize: 12,
                  color: 'rgb(var(--iw-ink))',
                }}
                formatter={(v: number) => [format(v), label]}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="currentColor"
                strokeWidth={1.75}
                fill={`url(#fill-${label.replace(/\W/g, '')})`}
              />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
              <CartesianGrid stroke="rgb(var(--iw-rule))" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: 'rgb(var(--iw-ink-3))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip
                cursor={{ stroke: 'rgb(var(--iw-rule))' }}
                contentStyle={{
                  background: 'rgb(var(--iw-sheet))',
                  border: '1px solid rgb(var(--iw-rule))',
                  borderRadius: 2,
                  fontSize: 12,
                  color: 'rgb(var(--iw-ink))',
                }}
                formatter={(v: number) => [format(v), label]}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke="currentColor"
                strokeWidth={1.75}
                dot={{ r: 2, strokeWidth: 0, fill: 'currentColor' }}
                activeDot={{ r: 3.5 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-xs text-ink-3">
        {better} · {delta === 0 ? 'flat' : `${delta > 0 ? '+' : '−'}${format(Math.abs(delta))} since ${data[0]?.month}`}
      </p>
    </div>
  );
}

export function ImprovementChart({
  transactions,
  quotes,
}: {
  transactions: Transaction[];
  quotes: Quote[];
}) {
  const trend = useMemo(() => monthlyTrend(transactions, quotes), [transactions, quotes]);

  const panels: PanelProps[] = [
    {
      label: 'Portfolio value',
      better: 'Up is better',
      tone: 'text-ink',
      data: trend.map((t) => ({ month: t.month, v: t.value })),
      format: (n) => `₹${compact(n)}`,
      area: true,
    },
    {
      label: 'Emotional control',
      better: 'Up is better',
      tone: 'text-gain',
      data: trend.map((t) => ({ month: t.month, v: t.emotionalControl })),
      format: (n) => `${n}/10`,
    },
    {
      label: 'Trades per month',
      better: 'Down is better at this budget',
      tone: 'text-loss',
      data: trend.map((t) => ({ month: t.month, v: t.trades })),
    },
    {
      label: 'Return vs Nifty 50',
      better: 'Above zero beats the index',
      tone: 'text-copilot',
      data: trend.map((t) => ({ month: t.month, v: t.vsNifty })),
      format: (n) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`,
    },
  ];

  return (
    <div className="space-y-5">
      <Sheet>
        <div className="border-b border-rule px-4 py-3 sm:px-5">
          <p className="eyebrow">Six-month trend</p>
          <p className="mt-1 text-sm text-ink-2">
            Recomputed from your ledger each month, not stored — if you edit a trade, the history
            edits with it.
          </p>
        </div>
        <div className="grid divide-y divide-rule sm:grid-cols-2 sm:divide-x">
          {panels.map((p) => (
            <Panel key={p.label} {...p} />
          ))}
        </div>
      </Sheet>

      <Sheet>
        <div className="border-b border-rule px-4 py-3 sm:px-5">
          <p className="eyebrow">Milestones</p>
        </div>
        <ul className="divide-y divide-rule">
          {MILESTONES.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center border text-[11px]',
                  m.done ? 'border-gain bg-gain/15 text-gain' : 'border-rule text-transparent',
                )}
                aria-hidden
              >
                ✓
              </span>
              <span className={cn('text-sm', !m.done && 'text-ink-3')}>{m.label}</span>
              {m.done && (
                <span className="ml-auto font-mono text-[0.625rem] uppercase tracking-wider text-gain">
                  done
                </span>
              )}
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
