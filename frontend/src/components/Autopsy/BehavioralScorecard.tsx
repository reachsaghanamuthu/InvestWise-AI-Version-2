import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { AutopsyReport } from '@/types';
import { Sheet } from '@/components/ui/Sheet';
import { Meter } from '@/components/ui/Bits';
import { Stamp } from '@/components/ui/Stamp';
import { cn } from '@/lib/cn';

/* The marksheet.

   Five behaviours, marked out of ten, in the format every Indian student can
   read without instructions: numbered subject rows, marks, last term's marks
   for comparison, a grade, and a remarks column written in red pen. The remark
   is the point — it is the one place in the app that speaks the way a senior
   actually would, and it lands harder for sitting in a column labelled
   "Remarks" than it would in a card. */

const gradeFor = (score: number) =>
  score >= 9 ? 'A+' : score >= 8 ? 'A' : score >= 7 ? 'B+' : score >= 6 ? 'B' : score >= 5 ? 'C+' : score >= 4 ? 'C' : 'D';

function Trend({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) {
    return (
      <span className="font-mono text-[0.625rem] uppercase tracking-wider text-ink-3">first</span>
    );
  }

  const delta = current - previous;
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-mono text-xs',
        delta > 0 ? 'text-gain' : delta < 0 ? 'text-loss' : 'text-ink-3',
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {delta === 0 ? 'same' : Math.abs(delta)}
    </span>
  );
}

export function BehavioralScorecard({
  report,
  studentName,
}: {
  report: AutopsyReport;
  studentName: string;
}) {
  const average = report.scores.reduce((s, r) => s + r.score, 0) / (report.scores.length || 1);

  return (
    <div className="space-y-5">
      <Sheet className="relative overflow-hidden">
        {/* Marksheet header block */}
        <div className="ruled border-b border-rule px-4 py-4 sm:px-6 sm:py-5">
          <p className="eyebrow">Behavioural scorecard</p>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Statement of marks
          </h2>

          <dl className="mt-4 grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-3">Name</dt>
            <dd className="font-medium">{studentName}</dd>
            <dt className="text-ink-3">Period</dt>
            <dd className="figure">{report.period}</dd>
            <dt className="text-ink-3">Aggregate</dt>
            <dd className="figure font-semibold">
              {average.toFixed(1)} / 10 · Grade {report.grade}
            </dd>
          </dl>

          <div className="absolute right-3 top-3 sm:right-6 sm:top-6">
            <Stamp grade={report.grade} period={report.period} />
          </div>
        </div>

        {/* Desktop: the marksheet as a table */}
        <div className="scroll-thin hidden overflow-x-auto md:block">
          <table className="greenbar w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-rule">
                <th className="eyebrow px-4 py-2.5 text-left font-medium sm:px-6">No.</th>
                <th className="eyebrow px-3 py-2.5 text-left font-medium">Behaviour</th>
                <th className="eyebrow px-3 py-2.5 text-right font-medium">Marks</th>
                <th className="eyebrow px-3 py-2.5 text-left font-medium">Out of 10</th>
                <th className="eyebrow px-3 py-2.5 text-center font-medium">Last month</th>
                <th className="eyebrow px-3 py-2.5 text-center font-medium">Grade</th>
                <th className="eyebrow px-4 py-2.5 text-left font-medium sm:px-6">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {report.scores.map((row, i) => (
                <tr key={row.key} className="border-b border-rule/60 last:border-0 align-top">
                  <td className="figure px-4 py-3 text-ink-3 sm:px-6">
                    {String(i + 1).padStart(2, '0')}
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-medium">{row.label}</span>
                  </td>
                  <td className="figure px-3 py-3 text-right font-semibold">{row.score}</td>
                  <td className="w-40 px-3 py-3">
                    <div className="pt-1.5">
                      <Meter score={row.score} />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Trend current={row.score} previous={row.previous} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-display text-sm font-bold">{gradeFor(row.score)}</span>
                  </td>
                  <td className="px-4 py-3 sm:px-6">
                    <p className="max-w-xs font-medium italic leading-snug text-loss">
                      {row.remark}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: the same rows, stacked */}
        <ul className="divide-y divide-rule md:hidden">
          {report.scores.map((row, i) => (
            <li key={row.key} className="px-4 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-baseline gap-2">
                  <span className="figure text-xs text-ink-3">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-medium">{row.label}</span>
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="figure font-semibold">{row.score}/10</span>
                  <span className="font-display text-sm font-bold">{gradeFor(row.score)}</span>
                </span>
              </div>

              <div className="mt-2">
                <Meter score={row.score} />
              </div>

              <div className="mt-2 flex items-start justify-between gap-3">
                <p className="flex-1 text-sm font-medium italic leading-snug text-loss">
                  {row.remark}
                </p>
                <Trend current={row.score} previous={row.previous} />
              </div>
            </li>
          ))}
        </ul>
      </Sheet>

      {/* How to move each mark up */}
      <Sheet>
        <div className="border-b border-rule px-4 py-3 sm:px-6">
          <p className="eyebrow">How to move these up next month</p>
        </div>
        <ol className="divide-y divide-rule">
          {report.scores
            .slice()
            .sort((a, b) => a.score - b.score)
            .map((row) => (
              <li key={row.key} className="flex gap-4 px-4 py-3.5 sm:px-6">
                <span className="figure w-10 shrink-0 pt-0.5 text-sm font-semibold text-ink-3">
                  {row.score}/10
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{row.label}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-ink-2">
                    {row.improve}
                  </span>
                </span>
              </li>
            ))}
        </ol>
      </Sheet>
    </div>
  );
}
