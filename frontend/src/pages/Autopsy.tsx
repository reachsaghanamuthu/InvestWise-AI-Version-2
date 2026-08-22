import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Page } from '@/components/Common/AppShell';
import { Sheet, Empty } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Tabs, type TabDef } from '@/components/ui/Bits';
import { AutopsyOverview } from '@/components/Autopsy/AutopsyOverview';
import { BehavioralPatterns } from '@/components/Autopsy/BehavioralPatterns';
import { BehavioralScorecard } from '@/components/Autopsy/BehavioralScorecard';
import { AutopsyReportTab } from '@/components/Autopsy/AutopsyReport';
import { PracticeScenarios } from '@/components/Autopsy/PracticeScenarios';
import { ImprovementChart } from '@/components/Autopsy/ImprovementChart';
import { usePortfolio } from '@/store/usePortfolio';
import { useAuth } from '@/store/useAuth';
import { runAutopsy } from '@/lib/patterns';
import { SCENARIOS } from '@/data/demo';

export default function AutopsyPage() {
  const { transactions, quotes } = usePortfolio();
  const user = useAuth((s) => s.user);
  const [tab, setTab] = useState('overview');

  const report = useMemo(() => runAutopsy(transactions, quotes), [transactions, quotes]);
  const flagged = report.patterns.filter((p) => p.severity !== 'clear').length;

  const tabs: TabDef[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'patterns', label: 'Findings', badge: flagged || undefined },
    { id: 'scorecard', label: 'Marksheet' },
    { id: 'report', label: 'Written report' },
    { id: 'practice', label: 'Practice', badge: SCENARIOS.length },
    { id: 'progress', label: 'Progress' },
  ];

  if (transactions.length === 0) {
    return (
      <Page eyebrow="Portfolio autopsy" title="Nothing to examine yet">
        <Sheet>
          <Empty
            title="The table is empty"
            hint="An autopsy needs a body. Add the trades you have already made — including the ones that went badly, especially those."
            action={
              <Link to="/app/portfolio">
                <Button>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add your trades
                </Button>
              </Link>
            }
          />
        </Sheet>
      </Page>
    );
  }

  return (
    <Page
      eyebrow={`Case file · ${report.period}`}
      title="Portfolio autopsy"
      action={
        <span className="font-mono text-stat uppercase text-ink-3">
          {transactions.length} entries examined
        </span>
      }
    >
      <div className="mb-5 border-b border-rule">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === 'overview' && <AutopsyOverview report={report} />}
      {tab === 'patterns' && <BehavioralPatterns report={report} />}
      {tab === 'scorecard' && (
        <BehavioralScorecard report={report} studentName={user?.name ?? 'Student'} />
      )}
      {tab === 'report' && (
        <AutopsyReportTab
          report={report}
          transactions={transactions}
          studentName={user?.name ?? 'Student'}
        />
      )}
      {tab === 'practice' && <PracticeScenarios report={report} />}
      {tab === 'progress' && <ImprovementChart transactions={transactions} quotes={quotes} />}

      <p className="mt-6 text-xs leading-relaxed text-ink-3">
        Findings are produced by explicit rules over your transaction history, with the thresholds
        stated in each finding. They describe behaviour, not the quality of any company. Educational
        prototype — not financial advice.
      </p>
    </Page>
  );
}
