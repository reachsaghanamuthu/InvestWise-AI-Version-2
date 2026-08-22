import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { AutopsyReport as Report, Transaction } from '@/types';
import { Sheet, SheetBody } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Prose } from '@/components/ui/Prose';
import { Spinner } from '@/components/ui/Bits';
import { api } from '@/services/api';
import { offlineNarrative } from '@/lib/narrative';
import { longDate } from '@/lib/format';

/* Section D: the written report.

   Claude reads the findings the rule engine produced and writes them up for
   this specific person. It is given the numbers rather than asked to compute
   them, which is why the figures in the prose always match the figures in the
   tables. */

export function AutopsyReportTab({
  report,
  transactions,
  studentName,
}: {
  report: Report;
  transactions: Transaction[];
  studentName: string;
}) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [source, setSource] = useState<'ai' | 'offline' | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.autopsy.generate({ transactions, report });
      setNarrative(res.narrative);
      setSource('ai');
    } catch {
      setNarrative(offlineNarrative(report, studentName));
      setSource('offline');
    } finally {
      setLoading(false);
    }
  };

  if (!narrative && !loading) {
    return (
      <Sheet>
        <SheetBody className="py-10 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-copilot" aria-hidden />
          <h3 className="mt-3 font-display text-lg font-semibold">
            Get this month written up for you
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-2">
            The Copilot reads the {report.patterns.length} findings and your{' '}
            {transactions.length} entries, then writes the report the way a senior would explain it
            — specific to your trades, in Hinglish.
          </p>
          <div className="mt-5">
            <Button onClick={() => void generate()}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Write my report
            </Button>
          </div>
          <p className="mt-3 text-xs text-ink-3">
            Uses live market figures already computed above. It never invents a number.
          </p>
        </SheetBody>
      </Sheet>
    );
  }

  return (
    <Sheet>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
        <div>
          <p className="eyebrow">Written report · {report.period}</p>
          <p className="mt-0.5 text-xs text-ink-3">Generated {longDate(Date.now())}</p>
        </div>
        <div className="flex items-center gap-2">
          {source === 'offline' && (
            <span className="chip bg-ink/[0.07] text-ink-2">Offline version</span>
          )}
          <Button variant="quiet" size="sm" onClick={() => void generate()} loading={loading}>
            Rewrite
          </Button>
        </div>
      </div>

      <SheetBody>
        {loading ? (
          <div className="py-8">
            <Spinner label="Report likh raha hoon…" />
          </div>
        ) : (
          <>
            <Prose text={narrative ?? ''} className="max-w-2xl" />
            {source === 'offline' && (
              <p className="mt-5 border-t border-rule pt-3 text-xs leading-relaxed text-ink-3">
                The Claude API was not reachable, so this was composed locally from the same
                findings. Add <code className="font-mono">CLAUDE_API_KEY</code> to the backend
                environment for the full write-up.
              </p>
            )}
          </>
        )}
      </SheetBody>
    </Sheet>
  );
}
