import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquareText, Stethoscope } from 'lucide-react';
import { Wordmark } from '@/components/Common/Logo';
import { Button } from '@/components/ui/Button';
import { Stamp } from '@/components/ui/Stamp';
import { Meter } from '@/components/ui/Bits';
import { useTheme } from '@/store/useTheme';
import { Moon, Sun } from 'lucide-react';
import { DEMO_TRANSACTIONS } from '@/data/demo';
import { mockQuotes } from '@/lib/market';
import { runAutopsy } from '@/lib/patterns';
import { money } from '@/lib/format';

/* The landing page.

   The hero is not a pitch about the product — it is the product's actual
   output. The finding on the right is computed at render time by the same rule
   engine the app ships, over the same demo ledger, so what a visitor reads
   here is exactly what they would get after adding their own trades. */

export default function Landing() {
  const { theme, toggle } = useTheme();

  const report = useMemo(() => {
    const quotes = mockQuotes([...new Set(DEMO_TRANSACTIONS.map((t) => t.symbol))]);
    return runAutopsy(DEMO_TRANSACTIONS, quotes);
  }, []);

  const headline = report.patterns.find((p) => p.code === 'FINDING-01') ?? report.patterns[0];

  return (
    <div className="min-h-screen">
      {/* --- Masthead ---------------------------------------------------- */}
      <header className="border-b border-rule">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-2 hover:bg-ink/[0.06] hover:text-ink"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden />
              ) : (
                <Moon className="h-4 w-4" aria-hidden />
              )}
            </button>
            <Link to="/auth">
              <Button size="sm" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* --- Hero -------------------------------------------------------- */}
      <section className="border-b border-rule">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
          <div className="margin-rule flex flex-col justify-center">
            <p className="eyebrow mb-4">For Indian students investing ₹500–5000 a month</p>

            <h1 className="text-balance font-display text-[2.1rem] font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Your worst trade,
              <br />
              explained in the language
              <br />
              you actually think in.
            </h1>

            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-ink-2 sm:text-lg">
              InvestWise AI reads your transaction history, finds the pattern behind the loss, and
              grades your behaviour every month — in Hinglish, with the evidence attached. No tips,
              no targets, no guaranteed returns.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth?mode=signup">
                <Button size="lg" block className="sm:w-auto">
                  Open your ledger
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
              <Link to="/auth?demo=1">
                <Button size="lg" variant="outline" block className="sm:w-auto">
                  See it with sample trades
                </Button>
              </Link>
            </div>

            <p className="mt-4 font-mono text-stat uppercase text-ink-3">
              Educational prototype · Not financial advice
            </p>
          </div>

          {/* The report, computed live from the demo ledger */}
          <div className="relative">
            <div className="sheet ruled relative overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
                <div>
                  <p className="eyebrow">Portfolio autopsy</p>
                  <p className="mt-1 font-display text-lg font-semibold">{report.period}</p>
                </div>
                <div className="figure text-right text-xs text-ink-3">
                  <div>{report.overview.holdings} holdings</div>
                  <div>{money(report.overview.value)}</div>
                </div>
              </div>

              <div className="px-5 py-5">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-stat font-semibold uppercase text-loss">
                    {headline.code}
                  </span>
                  <span className="font-display text-base font-semibold">{headline.name}</span>
                </div>

                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink">{headline.finding}</p>

                {headline.evidence.length > 0 && (
                  <ul className="mt-4 space-y-1 border-l-2 border-loss/40 pl-3">
                    {headline.evidence.slice(0, 2).map((line) => (
                      <li key={line} className="figure text-xs text-ink-2">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-5 space-y-3 border-t border-rule pt-4">
                  {report.scores.slice(0, 3).map((s) => (
                    <div key={s.key}>
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <span className="text-sm">{s.label}</span>
                        <span className="figure text-sm font-semibold">{s.score}/10</span>
                      </div>
                      <Meter score={s.score} />
                    </div>
                  ))}
                </div>
              </div>

              {/* The verdict lands on the sheet */}
              <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-6">
                <Stamp grade={report.grade} period={report.period} />
              </div>
            </div>

            <p className="mt-3 px-1 text-xs text-ink-3">
              Live output from the rule engine, run over a sample student ledger of{' '}
              {DEMO_TRANSACTIONS.length} trades.
            </p>
          </div>
        </div>
      </section>

      {/* --- The two features -------------------------------------------- */}
      <section className="border-b border-rule">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <div className="margin-rule">
            <p className="eyebrow mb-3">What it does</p>
            <h2 className="max-w-2xl text-balance font-display text-2xl font-bold leading-tight sm:text-3xl">
              Two features, both aimed at the same problem: beginners lose money to their own
              reflexes, not to the market.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <article className="sheet flex flex-col p-6">
              <MessageSquareText className="h-6 w-6 text-copilot" aria-hidden />
              <h3 className="mt-4 font-display text-xl font-semibold">The Copilot</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                A senior who has already made these mistakes, not an adviser with something to sell.
                Ask it anything in Hinglish, or type{' '}
                <code className="rounded-sm bg-ink/[0.08] px-1 py-0.5 font-mono text-xs">
                  /stock TCS
                </code>{' '}
                for a live price with the metrics that matter.
              </p>
              <ul className="mt-5 space-y-2 border-t border-rule pt-4 text-sm text-ink-2">
                <li className="flex gap-2">
                  <span className="text-copilot" aria-hidden>
                    ·
                  </span>
                  Real NSE prices, PE, 52-week range and dividend yield
                </li>
                <li className="flex gap-2">
                  <span className="text-copilot" aria-hidden>
                    ·
                  </span>
                  Knows your holdings, so the answer fits your book
                </li>
                <li className="flex gap-2">
                  <span className="text-copilot" aria-hidden>
                    ·
                  </span>
                  Names a risk level and a time horizon every time
                </li>
              </ul>
            </article>

            <article className="sheet flex flex-col p-6">
              <Stethoscope className="h-6 w-6 text-loss" aria-hidden />
              <h3 className="mt-4 font-display text-xl font-semibold">The Autopsy</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                Once a month, every trade you made goes on the table. The report names the pattern,
                quotes the trades that prove it, and marks five behaviours out of ten — the way a
                marksheet does, remarks column included.
              </p>
              <ul className="mt-5 space-y-2 border-t border-rule pt-4 text-sm text-ink-2">
                <li className="flex gap-2">
                  <span className="text-loss" aria-hidden>
                    ·
                  </span>
                  Panic selling, FOMO buying, overtrading, concentration
                </li>
                <li className="flex gap-2">
                  <span className="text-loss" aria-hidden>
                    ·
                  </span>
                  Every finding cites the exact transactions behind it
                </li>
                <li className="flex gap-2">
                  <span className="text-loss" aria-hidden>
                    ·
                  </span>
                  Practice scenarios built from your own weak spots
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* --- Honest limits ----------------------------------------------- */}
      <section className="border-b border-rule">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <div className="margin-rule max-w-3xl">
            <p className="eyebrow mb-3">Where the numbers come from</p>
            <h2 className="font-display text-2xl font-bold leading-tight">
              This is a prototype, and it says so on every screen.
            </h2>
            <div className="mt-6 grid gap-x-8 gap-y-5 text-sm leading-relaxed text-ink-2 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-ink">Prices are real where we can get them.</span>{' '}
                Quotes come from Finnhub, cached for five minutes to stay inside the free tier. When
                a symbol or the network fails, the app falls back to a bundled dataset of 54 NSE
                instruments and labels the badge <em>Offline dataset</em> — never <em>Live</em>.
              </p>
              <p>
                <span className="font-semibold text-ink">The patterns are rules, not a model.</span>{' '}
                Panic selling, FOMO and overtrading are detected by explicit thresholds you can read
                in the source. Claude writes the narrative around them; it never invents the
                numbers.
              </p>
              <p>
                <span className="font-semibold text-ink">No returns are predicted.</span> The
                Copilot refuses to give a target price, because nobody can give you one honestly.
              </p>
              <p>
                <span className="font-semibold text-ink">Not a substitute for an adviser.</span>{' '}
                Everything here is educational. For decisions with real consequences, talk to
                someone SEBI-registered.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Close ------------------------------------------------------- */}
      <section>
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="margin-rule">
            <h2 className="max-w-xl text-balance font-display text-2xl font-bold leading-tight sm:text-3xl">
              Add three trades. Get the report that tells you what they say about you.
            </h2>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth?mode=signup">
                <Button size="lg" block className="sm:w-auto">
                  Open your ledger
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
              <Link to="/auth?demo=1">
                <Button size="lg" variant="outline" block className="sm:w-auto">
                  See it with sample trades
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <p className="text-xs leading-relaxed text-ink-3">
            InvestWise AI · An educational prototype built for Eureka! 2026. Nothing on this site is
            financial advice, no return is guaranteed, and past performance says nothing about
            future results. Market data is delayed and may be served from a bundled offline dataset.
          </p>
        </div>
      </footer>
    </div>
  );
}
