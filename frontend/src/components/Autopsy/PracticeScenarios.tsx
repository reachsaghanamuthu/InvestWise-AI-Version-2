import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { AutopsyReport, Scenario } from '@/types';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { SCENARIOS } from '@/data/demo';
import { cn } from '@/lib/cn';

/* Practice.

   Scenarios are ordered by what the report actually found — if you were
   flagged for panic selling, the market-crash scenario comes first, because
   rehearsing the decision you got wrong is the point of the exercise. */

const PATTERN_TO_SCENARIO: Record<string, string> = {
  'FINDING-01': 'sc-crash',
  'FINDING-02': 'sc-fomo',
  'FINDING-03': 'sc-tip',
  'FINDING-04': 'sc-windfall',
};

function orderFor(report: AutopsyReport): Scenario[] {
  const priority = report.patterns
    .filter((p) => p.severity === 'high' || p.severity === 'medium')
    .map((p) => PATTERN_TO_SCENARIO[p.code])
    .filter(Boolean);

  const seen = new Set<string>();
  const ordered: Scenario[] = [];

  for (const id of priority) {
    const s = SCENARIOS.find((x) => x.id === id);
    if (s && !seen.has(s.id)) {
      ordered.push(s);
      seen.add(s.id);
    }
  }
  for (const s of SCENARIOS) if (!seen.has(s.id)) ordered.push(s);

  return ordered;
}

function ScenarioCard({ scenario, flagged }: { scenario: Scenario; flagged: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = answered && scenario.options[picked].correct;

  return (
    <Sheet>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
        <div>
          <p className="eyebrow">{scenario.tag}</p>
          <h3 className="mt-0.5 font-display text-base font-semibold">{scenario.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {flagged && !answered && (
            <span className="chip bg-loss/12 text-loss">From your report</span>
          )}
          {answered && (
            <span className={cn('chip', correct ? 'bg-gain/12 text-gain' : 'bg-loss/12 text-loss')}>
              {correct ? `+${scenario.points} points` : '0 points'}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <p className="text-[0.9375rem] leading-relaxed text-ink-2">{scenario.situation}</p>

        <ul className="mt-4 space-y-2">
          {scenario.options.map((opt, i) => {
            const chosen = picked === i;
            const reveal = answered;

            return (
              <li key={opt.text}>
                <button
                  onClick={() => !answered && setPicked(i)}
                  disabled={answered}
                  aria-pressed={chosen}
                  className={cn(
                    'w-full rounded-sm border px-3.5 py-3 text-left text-sm transition-colors',
                    !reveal && 'border-rule hover:border-ink/40 hover:bg-ink/[0.03]',
                    reveal && opt.correct && 'border-gain/50 bg-gain/[0.07]',
                    reveal && !opt.correct && chosen && 'border-loss/50 bg-loss/[0.07]',
                    reveal && !opt.correct && !chosen && 'border-rule opacity-60',
                  )}
                >
                  <span className="flex items-start gap-2.5">
                    {reveal && (
                      <span className="shrink-0 pt-0.5" aria-hidden>
                        {opt.correct ? (
                          <Check className="h-4 w-4 text-gain" />
                        ) : chosen ? (
                          <X className="h-4 w-4 text-loss" />
                        ) : (
                          <span className="block h-4 w-4" />
                        )}
                      </span>
                    )}
                    <span>
                      <span className="block">{opt.text}</span>
                      {reveal && (
                        <span className="mt-1.5 block text-[0.8125rem] leading-relaxed text-ink-2">
                          {opt.explanation}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {answered && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-rule pt-3">
            <p className="text-sm text-ink-2">
              {correct
                ? 'Sahi. Ab yeh asli market mein bhi karna hai — wahi mushkil hai.'
                : 'Koi baat nahi. Yahan galat karna free hai; market mein nahi hota.'}
            </p>
            <Button variant="quiet" size="sm" onClick={() => setPicked(null)}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

export function PracticeScenarios({ report }: { report: AutopsyReport }) {
  const ordered = orderFor(report);
  const flaggedIds = new Set(
    report.patterns
      .filter((p) => p.severity === 'high' || p.severity === 'medium')
      .map((p) => PATTERN_TO_SCENARIO[p.code])
      .filter(Boolean),
  );

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-2">
        Five decisions, no money involved. The ones drawn from your own findings are marked and come
        first — those are the reflexes worth rehearsing.
      </p>

      {ordered.map((s) => (
        <ScenarioCard key={s.id} scenario={s} flagged={flaggedIds.has(s.id)} />
      ))}
    </div>
  );
}
