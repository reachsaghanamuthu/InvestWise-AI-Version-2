import type { AutopsyReport, PatternHit, Severity } from '@/types';
import { Sheet } from '@/components/ui/Sheet';
import { money } from '@/lib/format';
import { cn } from '@/lib/cn';

/* The findings.

   Numbered, because a report's findings genuinely are an enumerated list —
   FINDING-01 is a reference you can point at, not decoration. Each one carries
   the evidence that triggered it, so nothing here is assertable without proof.
*/

const SEVERITY: Record<Severity, { label: string; className: string }> = {
  high: { label: 'Needs work', className: 'text-loss border-loss/40 bg-loss/[0.07]' },
  medium: { label: 'Watch this', className: 'text-mark border-mark/40 bg-mark/[0.08]' },
  low: { label: 'Minor', className: 'text-ink-2 border-rule bg-ink/[0.04]' },
  clear: { label: 'All clear', className: 'text-gain border-gain/40 bg-gain/[0.07]' },
};

function Finding({ pattern }: { pattern: PatternHit }) {
  const tone = SEVERITY[pattern.severity];

  return (
    <Sheet>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-stat font-semibold uppercase text-loss">
            {pattern.code}
          </span>
          <h3 className="font-display text-base font-semibold">{pattern.name}</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn('chip border', tone.className)}>{tone.label}</span>
          <span className="font-mono text-[0.625rem] uppercase tracking-wider text-ink-3">
            {Math.round(pattern.confidence * 100)}% confidence
          </span>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <p className="text-[0.9375rem] leading-relaxed">{pattern.finding}</p>

        {pattern.evidence.length > 0 && (
          <div className="mt-4">
            <p className="eyebrow mb-1.5">Evidence</p>
            <ul className="space-y-1 border-l-2 border-loss/40 pl-3">
              {pattern.evidence.map((line) => (
                <li key={line} className="figure text-xs text-ink-2">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {pattern.cost !== undefined && pattern.cost > 0 && (
          <p className="mt-4 border-t border-rule pt-3 text-sm">
            <span className="eyebrow">Cost </span>
            <span className="figure ml-1 font-semibold text-loss">
              {money(pattern.cost)}
            </span>
            <span className="ml-1 text-ink-3">this period</span>
          </p>
        )}

        <div className="mt-4 space-y-3 border-t border-rule pt-4 text-sm leading-relaxed">
          <p className="text-ink-2">
            <span className="font-semibold text-ink">Context: </span>
            {pattern.context}
          </p>
          <p className="text-ink-2">
            <span className="font-semibold text-ink">Do this instead: </span>
            {pattern.advice}
          </p>
        </div>
      </div>
    </Sheet>
  );
}

export function BehavioralPatterns({ report }: { report: AutopsyReport }) {
  const flagged = report.patterns.filter((p) => p.severity !== 'clear');

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-2">
        {flagged.length === 0
          ? 'Nothing in this month’s trades tripped a rule. That is rarer than you think.'
          : `${flagged.length} pattern${flagged.length === 1 ? '' : 's'} found in ${report.overview.holdings > 0 ? 'your' : 'the'} trading this period. Each finding names the trades that triggered it — check them against your own memory of why you made them.`}
      </p>

      {report.patterns.map((p) => (
        <Finding key={p.code} pattern={p} />
      ))}
    </div>
  );
}
