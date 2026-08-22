import { useState } from 'react';
import { Page } from '@/components/Common/AppShell';
import { Sheet, SheetBody, SheetHead } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Bits';
import { useAuth } from '@/store/useAuth';
import { useTheme } from '@/store/useTheme';
import { usePortfolio } from '@/store/usePortfolio';
import { useCopilot } from '@/store/useCopilot';

export default function SettingsPage() {
  const { user, updateProfile, logout, mode } = useAuth();
  const { theme, set: setTheme } = useTheme();
  const { clearAll, resetToDemo, transactions } = usePortfolio();
  const clearChats = useCopilot((s) => s.clearHistory);

  const [name, setName] = useState(user?.name ?? '');
  const [college, setCollege] = useState(user?.college ?? '');
  const [budget, setBudget] = useState(String(user?.monthlyBudget ?? 2000));
  const [risk, setRisk] = useState(user?.riskTolerance ?? 'medium');
  const [goal, setGoal] = useState(user?.goal ?? '');
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const save = () => {
    updateProfile({
      name: name.trim() || user?.name || '',
      college: college.trim() || undefined,
      monthlyBudget: Number(budget) || 0,
      riskTolerance: risk as 'low' | 'medium' | 'high',
      goal: goal.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Page eyebrow="Account" title="Settings">
      <div className="grid gap-5 lg:grid-cols-2">
        <Sheet>
          <SheetHead eyebrow="Profile" title="About you" />
          <SheetBody className="space-y-4">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              label="College"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="Optional"
            />
            <Input
              label="Monthly investing budget (₹)"
              type="number"
              min="0"
              step="100"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              hint="Used to size the advice — ₹500 and ₹5000 get different answers."
            />
            <Select
              label="Risk tolerance"
              value={risk}
              onChange={(e) => setRisk(e.target.value as 'low' | 'medium' | 'high')}
            >
              <option value="low">Low — a red month would keep me up at night</option>
              <option value="medium">Medium — I can sit through a bad quarter</option>
              <option value="high">High — I can leave this money alone for years</option>
            </Select>
            <Input
              label="Goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Build a ₹1,00,000 corpus before graduation"
            />

            <div className="flex items-center gap-3 pt-1">
              <Button onClick={save}>Save changes</Button>
              {saved && <span className="text-sm text-gain">Saved.</span>}
            </div>
          </SheetBody>
        </Sheet>

        <div className="space-y-5">
          <Sheet>
            <SheetHead eyebrow="Appearance" title="Theme" />
            <SheetBody>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Theme">
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    role="radio"
                    aria-checked={theme === t}
                    onClick={() => setTheme(t)}
                    className={
                      'rounded-sm border px-3 py-3 text-sm capitalize transition-colors ' +
                      (theme === t
                        ? 'border-ink bg-ink/[0.06] font-medium'
                        : 'border-rule text-ink-2 hover:border-ink/40')
                    }
                  >
                    {t === 'light' ? 'Paper' : 'Ink'}
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-xs text-ink-3">Remembered on this device.</p>
            </SheetBody>
          </Sheet>

          <Sheet>
            <SheetHead eyebrow="Session" title="Data and account" />
            <SheetBody className="space-y-3">
              <p className="text-sm text-ink-2">
                {mode === 'server'
                  ? 'Signed in against the backend. Your ledger syncs to the server.'
                  : 'Working locally on this device. Your ledger is stored in this browser only.'}
              </p>

              <div className="flex flex-wrap gap-2 border-t border-rule pt-3">
                <Button variant="outline" size="sm" onClick={resetToDemo}>
                  Reset to sample ledger
                </Button>
                <Button variant="outline" size="sm" onClick={() => clearChats(user?.name)}>
                  Clear chat history
                </Button>
              </div>

              <div className="border-t border-rule pt-3">
                {confirmClear ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-ink-2">
                      Delete all {transactions.length} entries? This cannot be undone.
                    </span>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        clearAll();
                        setConfirmClear(false);
                      }}
                    >
                      Delete everything
                    </Button>
                    <Button variant="quiet" size="sm" onClick={() => setConfirmClear(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)}>
                    Delete all transactions
                  </Button>
                )}
              </div>

              <div className="border-t border-rule pt-3">
                <Button variant="quiet" size="sm" onClick={logout}>
                  Sign out
                </Button>
              </div>
            </SheetBody>
          </Sheet>

          <Sheet>
            <SheetHead eyebrow="Legal" title="The disclaimers, in full" />
            <SheetBody className="space-y-2.5 text-sm leading-relaxed text-ink-2">
              <p>
                InvestWise AI is an educational prototype built for a hackathon. It is not a
                SEBI-registered investment adviser, and nothing it produces is financial advice.
              </p>
              <p>
                No return is guaranteed or predicted. Market data may be delayed, and is served from
                a bundled offline dataset whenever the live feed is unavailable — the badge in the
                navigation always says which one is in use.
              </p>
              <p>
                Behavioural findings are heuristics over your own transaction history. They describe
                patterns in your trading, not the quality of any company or fund.
              </p>
              <p>
                Your ledger is stored in this browser, and on the backend only if you signed in
                against one. Delete it any time with the button above.
              </p>
            </SheetBody>
          </Sheet>
        </div>
      </div>
    </Page>
  );
}
