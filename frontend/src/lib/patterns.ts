import type {
  AutopsyOverview,
  AutopsyReport,
  PatternHit,
  PortfolioSummary,
  Quote,
  ScoreRow,
  Transaction,
} from '@/types';
import { bandPosition, findInstrument, niftyLevel } from '@/lib/market';
import { brokerageCost, realisedPnl, summarise } from '@/lib/calc';
import { money, monthLabel, shortDate, signedMoney } from '@/lib/format';

/* Rule-based behavioural analysis.

   Every finding must point at a specific trade the user actually made — a
   report that says "you may be overtrading" teaches nothing, while one that
   says "you sold INFY 9 days after buying, ₹340 down" is impossible to argue
   with. Confidence is reported honestly: these are heuristics run over a
   beginner's transaction history, not a diagnosis. */

const MONTH_MS = 30 * 86_400_000;

interface Ctx {
  transactions: Transaction[];
  quotes: Map<string, Quote>;
  summary: PortfolioSummary;
  monthTx: Transaction[];
  period: Date;
}

/* --- FINDING-01: panic selling ---------------------------------------- */
function detectPanicSelling(ctx: Ctx): PatternHit | null {
  const cost = new Map<string, { qty: number; cost: number; since: string }>();
  const panicked: { tx: Transaction; loss: number; held: number }[] = [];

  for (const tx of [...ctx.transactions].sort((a, b) => a.date.localeCompare(b.date))) {
    const pos = cost.get(tx.symbol) ?? { qty: 0, cost: 0, since: tx.date };
    if (tx.side === 'buy') {
      pos.qty += tx.quantity;
      pos.cost += tx.quantity * tx.price;
      if (pos.qty === tx.quantity) pos.since = tx.date;
    } else {
      const avg = pos.qty > 0 ? pos.cost / pos.qty : tx.price;
      const held = Math.round(
        (new Date(tx.date).getTime() - new Date(pos.since).getTime()) / 86_400_000,
      );
      const loss = (tx.price - avg) * Math.min(tx.quantity, pos.qty);
      // Sold at a loss, and held for under a month: the signature of a exit
      // driven by a red screen rather than by a changed thesis.
      if (loss < 0 && held <= 30) panicked.push({ tx, loss, held });
      const sold = Math.min(tx.quantity, pos.qty);
      pos.qty -= sold;
      pos.cost -= sold * avg;
    }
    cost.set(tx.symbol, pos);
  }

  if (panicked.length === 0) return null;

  const total = panicked.reduce((sum, p) => sum + p.loss, 0);
  const worst = panicked.reduce((a, b) => (a.loss < b.loss ? a : b));

  return {
    code: 'FINDING-01',
    name: 'Panic selling',
    severity: panicked.length >= 2 ? 'high' : 'medium',
    confidence: Math.min(0.92, 0.62 + panicked.length * 0.1),
    finding: `You sold ${worst.tx.symbol} ${worst.held} days after buying it, booking a ${money(
      Math.abs(worst.loss),
    )} loss. ${
      panicked.length > 1
        ? `${panicked.length} of your sells this period followed the same shape.`
        : ''
    }`.trim(),
    context:
      'Short holds that end in the red are usually a reaction to a dip, not to news. Historically, roughly 9 in 10 large-cap Indian stocks have recovered their drawdown within three months of a broad market correction.',
    advice:
      'Before any sell, write one line: what changed about the business? If the only answer is "the price", that is a dip, not a reason.',
    evidence: panicked.map(
      (p) =>
        `${shortDate(p.tx.date)} · SELL ${p.tx.quantity} ${p.tx.symbol} @ ₹${p.tx.price} · held ${p.held}d · ${signedMoney(p.loss)}`,
    ),
    cost: Math.abs(total),
  };
}

/* --- FINDING-02: FOMO buying ------------------------------------------ */
function detectFomoBuying(ctx: Ctx): PatternHit | null {
  const hits: { tx: Transaction; band: number }[] = [];

  for (const tx of ctx.transactions) {
    if (tx.side !== 'buy') continue;
    const inst = findInstrument(tx.symbol);
    if (!inst) continue;
    const band = bandPosition({ price: tx.price, high52: inst.high52, low52: inst.low52 });
    // Bought in the top 15% of the 52-week range: chasing a run, not finding value.
    if (band >= 0.85) hits.push({ tx, band });
  }

  if (hits.length === 0) return null;

  const worst = hits.reduce((a, b) => (a.band > b.band ? a : b));
  const inst = findInstrument(worst.tx.symbol);
  const nowQuote = ctx.quotes.get(worst.tx.symbol);
  const since = nowQuote ? ((nowQuote.price - worst.tx.price) / worst.tx.price) * 100 : null;

  return {
    code: 'FINDING-02',
    name: 'FOMO buying',
    severity: hits.length >= 2 ? 'high' : 'medium',
    confidence: Math.min(0.88, 0.6 + hits.length * 0.09),
    finding: `You bought ${worst.tx.symbol} at ₹${worst.tx.price}, which was ${Math.round(
      worst.band * 100,
    )}% of the way up its 52-week range (₹${inst?.low52} – ₹${inst?.high52}).${
      since !== null ? ` It is ${since >= 0 ? 'up' : 'down'} ${Math.abs(since).toFixed(1)}% since.` : ''
    }`,
    context:
      'Buying near a 52-week high is not automatically wrong — momentum is real. It becomes a problem when the reason for the buy is that the chart already moved, because that leaves no margin if it stalls.',
    advice:
      'Split the ticket. Put a third in now and set a calendar reminder for the rest, so a stalled rally costs you a third of the regret instead of all of it.',
    evidence: hits.map(
      (h) =>
        `${shortDate(h.tx.date)} · BUY ${h.tx.quantity} ${h.tx.symbol} @ ₹${h.tx.price} · ${Math.round(h.band * 100)}% of 52w range`,
    ),
  };
}

/* --- FINDING-03: overtrading ------------------------------------------ */
function detectOvertrading(ctx: Ctx): PatternHit | null {
  if (ctx.monthTx.length <= 10) return null;

  const fees = brokerageCost(ctx.monthTx);
  const invested = ctx.summary.invested || 1;

  return {
    code: 'FINDING-03',
    name: 'Overtrading',
    severity: ctx.monthTx.length >= 16 ? 'high' : 'medium',
    confidence: 0.95,
    finding: `${ctx.monthTx.length} trades this month on a ${money(
      invested,
    )} book. At roughly ₹20 a leg that is about ${money(fees)} in brokerage — ${(
      (fees / invested) *
      100
    ).toFixed(1)}% of everything you have invested, paid before a single stock moved.`,
    context:
      'On a ₹500–5000 monthly budget, flat brokerage is the largest controllable drag on returns. A trade has to clear the fee twice — once going in, once coming out — before it earns you anything.',
    advice:
      'Cap yourself at four trades a month and make the fifth one wait for next month. If the idea is still good in 30 days, it was a real idea.',
    evidence: [
      `${ctx.monthTx.length} transactions between ${shortDate(ctx.monthTx[0].date)} and ${shortDate(
        ctx.monthTx[ctx.monthTx.length - 1].date,
      )}`,
      `Estimated brokerage drag: ${money(fees)}`,
    ],
    cost: fees,
  };
}

/* --- FINDING-04: concentration ---------------------------------------- */
function detectConcentration(ctx: Ctx): PatternHit | null {
  const { summary } = ctx;
  if (summary.value <= 0) return null;

  const topHolding = summary.holdings[0];
  const topSector = summary.sectorAllocation[0];
  const holdingPct = topHolding ? (topHolding.value / summary.value) * 100 : 0;
  const sectorPct = topSector?.percent ?? 0;

  const sectorHeavy = sectorPct > 50 && summary.holdings.length > 1;
  const stockHeavy = holdingPct > 50;
  if (!sectorHeavy && !stockHeavy) return null;

  const finding = sectorHeavy
    ? `${sectorPct.toFixed(0)}% of your portfolio sits in ${topSector.label}. If that one sector has a bad quarter, so do you — there is nothing else in the book to carry it.`
    : `${holdingPct.toFixed(0)}% of your portfolio is a single position, ${topHolding.symbol}. That is not a portfolio, it is a bet with extra steps.`;

  return {
    code: 'FINDING-04',
    name: sectorHeavy ? 'Concentrated in one sector' : 'Concentrated in one stock',
    severity: Math.max(sectorPct, holdingPct) > 70 ? 'high' : 'medium',
    confidence: 0.9,
    finding,
    context:
      'Concentration is the fastest way to get an unforgettable result in either direction. Four to six holdings across three sectors removes most single-name risk without needing more money.',
    advice: `Your next ${money(1000)} does not go into ${
      sectorHeavy ? topSector.label : topHolding.symbol
    }. Put it somewhere uncorrelated — an index ETF like NIFTYBEES counts.`,
    evidence: summary.sectorAllocation
      .slice(0, 3)
      .map((s) => `${s.label}: ${s.percent.toFixed(1)}% (${money(s.value)})`),
  };
}

/* --- FINDING-05: no plan / all clear ---------------------------------- */
function detectRhythm(ctx: Ctx, otherFindings: number): PatternHit {
  const buys = ctx.transactions
    .filter((t) => t.side === 'buy')
    .sort((a, b) => a.date.localeCompare(b.date));

  const months = new Set(buys.map((b) => b.date.slice(0, 7)));
  const disciplined = months.size >= 3 && buys.length >= months.size;

  if (disciplined && otherFindings === 0) {
    return {
      code: 'FINDING-05',
      name: 'No red flags',
      severity: 'clear',
      confidence: 0.8,
      finding: `You bought in ${months.size} separate months and did not flinch out of anything. There is no pattern here to correct.`,
      context:
        'This is the boring behaviour that compounds. Most beginners never reach three consecutive months of buying without a panic exit.',
      advice:
        'Keep the amount fixed and the date fixed. The habit is the edge — protect it as the numbers get bigger and the temptation to time things grows.',
      evidence: [`Buys in ${months.size} distinct months`, `${buys.length} total purchases`],
    };
  }

  return {
    code: 'FINDING-05',
    name: 'No regular rhythm',
    severity: months.size <= 1 ? 'medium' : 'low',
    confidence: 0.7,
    finding: `Your buys land in ${months.size} month${months.size === 1 ? '' : 's'} with no fixed date or amount, so how much you invest depends on how you felt that week.`,
    context:
      'A fixed monthly amount removes the single hardest decision in investing — when to buy — and averages your entry price for free.',
    advice:
      'Pick a date and an amount you would not notice missing. ₹500 on the 5th beats ₹3000 whenever you remember.',
    evidence: [
      `${buys.length} buys across ${months.size} month${months.size === 1 ? '' : 's'}`,
      months.size > 0 ? `Months with activity: ${[...months].join(', ')}` : 'No purchases recorded',
    ],
  };
}

/* --- Scorecard --------------------------------------------------------- */

const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

function buildScores(ctx: Ctx, patterns: PatternHit[], previous?: ScoreRow[]): ScoreRow[] {
  const { summary, transactions, monthTx } = ctx;
  const has = (code: string) => patterns.some((p) => p.code === code && p.severity !== 'clear');
  const prev = new Map((previous ?? []).map((p) => [p.key, p.score]));

  const buys = transactions.filter((t) => t.side === 'buy');
  const months = new Set(buys.map((b) => b.date.slice(0, 7)));

  // Diversification via a Herfindahl index over sectors: 1 = everything in one
  // sector, lower = better spread.
  const hhi = summary.sectorAllocation.reduce((sum, s) => sum + (s.percent / 100) ** 2, 0) || 1;
  const diversification = clamp(10 - (hhi - 0.2) * 11);

  const tradePenalty = Math.max(0, monthTx.length - 4) * 0.6;
  const discipline = clamp(9 - tradePenalty - (has('FINDING-05') ? 2 : 0));

  const highPe = summary.holdings.filter((h) => {
    const inst = findInstrument(h.symbol);
    return inst?.peRatio != null && inst.peRatio > 60;
  }).length;
  const research = clamp(
    8 - highPe * 1.5 - (has('FINDING-02') ? 2 : 0) + (summary.holdings.length >= 3 ? 1 : 0),
  );

  const emotional = clamp(9 - (has('FINDING-01') ? 4 : 0) - (has('FINDING-02') ? 2 : 0));
  const consistency = clamp(3 + months.size * 1.8);

  const rows: Omit<ScoreRow, 'previous'>[] = [
    {
      key: 'discipline',
      label: 'Discipline',
      score: discipline,
      remark:
        discipline >= 8
          ? 'Plan bana ke chala. Yahi chahiye tha.'
          : discipline >= 5
            ? 'Plan hai, par har hafte badal jaata hai. Ek rule likh ke chipka de.'
            : 'Koi plan nahi dikh raha — trades mood ke hisaab se ho rahe hain.',
      improve: 'Write your rule down once: amount, date, and max trades per month. Then follow it for 90 days.',
    },
    {
      key: 'research',
      label: 'Research',
      score: research,
      remark:
        research >= 8
          ? 'Jo khareeda, samajh ke khareeda. Solid.'
          : research >= 5
            ? 'Thoda homework ho raha hai, par valuation check karna abhi baaki hai.'
            : 'Naam sun ke khareed liya lagta hai. PE aur business dono dekh.',
      improve: 'Before buying, note three lines: what the company sells, its PE against its sector, and why you want it for three years.',
    },
    {
      key: 'emotional',
      label: 'Emotional control',
      score: emotional,
      remark:
        emotional >= 8
          ? 'Red din pe bhi haath nahi kaanpa. Bada deal hai.'
          : emotional >= 5
            ? 'Ek-do baar dar ke bech diya. Normal hai, par mehnga padta hai.'
            : 'Gira toh becha, chadha toh khareeda. Ulta chal raha hai bhai.',
      improve: 'Next dip, do nothing for 72 hours. Write what you wanted to do, then check the price a week later.',
    },
    {
      key: 'diversification',
      label: 'Diversification',
      score: diversification,
      remark:
        diversification >= 8
          ? 'Achha spread hai. Ek sector gire toh poora portfolio nahi girega.'
          : diversification >= 5
            ? 'Thoda ek taraf jhuka hua hai. Ek aur sector add kar.'
            : 'Saara paisa ek hi jagah. Yeh portfolio nahi, single bet hai.',
      improve: 'Aim for four to six holdings across at least three sectors. An index ETF does this in one purchase.',
    },
    {
      key: 'consistency',
      label: 'Consistency',
      score: consistency,
      remark:
        consistency >= 8
          ? 'Har mahine invest kiya. Compounding ka asli fuel yahi hai.'
          : consistency >= 5
            ? 'Kabhi kiya kabhi nahi. Thoda regular ho ja.'
            : 'Ek hi baar paisa daala aur ruk gaya. SIP jaisa socho.',
      improve: 'Set a ₹500 auto-transfer on a fixed date. Consistency beats size at this budget.',
    },
  ];

  return rows.map((r) => ({ ...r, previous: prev.get(r.key) ?? null }));
}

export function gradeFor(scores: ScoreRow[]) {
  const avg = scores.reduce((s, r) => s + r.score, 0) / (scores.length || 1);
  if (avg >= 9) return 'A+';
  if (avg >= 8) return 'A';
  if (avg >= 7) return 'B+';
  if (avg >= 6) return 'B';
  if (avg >= 5) return 'C+';
  if (avg >= 4) return 'C';
  return 'D';
}

/* --- The report -------------------------------------------------------- */

export function runAutopsy(
  transactions: Transaction[],
  quotes: Quote[],
  options: { period?: Date; previousScores?: ScoreRow[] } = {},
): AutopsyReport {
  const period = options.period ?? new Date();
  const summary = summarise(transactions, quotes, period);
  const monthKey = period.toISOString().slice(0, 7);

  const ctx: Ctx = {
    transactions,
    quotes: new Map(quotes.map((q) => [q.symbol, q])),
    summary,
    monthTx: transactions
      .filter((t) => t.date.startsWith(monthKey))
      .sort((a, b) => a.date.localeCompare(b.date)),
    period,
  };

  const detected = [
    detectPanicSelling(ctx),
    detectFomoBuying(ctx),
    detectOvertrading(ctx),
    detectConcentration(ctx),
  ].filter((p): p is PatternHit => p !== null);

  const patterns = [...detected, detectRhythm(ctx, detected.length)];
  const scores = buildScores(ctx, patterns, options.previousScores);

  const nifty = niftyLevel(period.getTime());
  const monthPnl = summary.pnl + realisedPnl(ctx.monthTx);

  const overview: AutopsyOverview = {
    value: summary.value,
    invested: summary.invested,
    monthPnl,
    monthPnlPercent: summary.invested > 0 ? (monthPnl / summary.invested) * 100 : 0,
    holdings: summary.holdings.length,
    best: summary.bestPerformer
      ? { symbol: summary.bestPerformer.symbol, pnlPercent: summary.bestPerformer.pnlPercent }
      : null,
    worst: summary.worstPerformer
      ? { symbol: summary.worstPerformer.symbol, pnlPercent: summary.worstPerformer.pnlPercent }
      : null,
    niftyPercent: nifty.changePercent,
    allocation: summary.allocation.map((a) => ({ label: a.label, percent: a.percent })),
  };

  return {
    id: `autopsy-${monthKey}`,
    period: monthLabel(period),
    generatedAt: Date.now(),
    grade: gradeFor(scores),
    overview,
    patterns,
    scores,
    narrative: null,
    narrativeSource: 'offline',
  };
}

/* Six months of history for the trend charts. Derived from the real
   transaction log where it exists, so the line moves with the user's data
   instead of being decorative. */
export function monthlyTrend(transactions: Transaction[], quotes: Quote[], monthsBack = 6) {
  const out = [];
  const now = new Date();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const at = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const cutoff = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      .toISOString()
      .slice(0, 10);
    const upTo = transactions.filter((t) => t.date <= cutoff);
    const report = runAutopsy(upTo, quotes, { period: at });
    const emotional = report.scores.find((s) => s.key === 'emotional')?.score ?? 5;

    out.push({
      month: at.toLocaleDateString('en-IN', { month: 'short' }),
      value: Math.round(report.overview.value),
      emotionalControl: emotional,
      trades: upTo.filter((t) => t.date.startsWith(at.toISOString().slice(0, 7))).length,
      vsNifty: +(report.overview.monthPnlPercent - report.overview.niftyPercent).toFixed(1),
    });
  }

  return out;
}
