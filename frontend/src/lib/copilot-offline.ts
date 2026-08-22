import type { ChatMessage, PortfolioSummary, Quote, RiskReading } from '@/types';
import { bandPosition, findInstrument, mockQuote, searchInstruments } from '@/lib/market';
import { money, pct } from '@/lib/format';

/* The Copilot's offline hand.

   Claude writes the real replies. This module exists so that a dead wifi, a
   missing key, or a rate limit never turns the demo into an error toast — it
   answers the slash commands and the handful of questions a beginner actually
   opens with, in the same voice, from local data. Every reply it produces is
   flagged in the UI as offline so nobody mistakes it for the model. */

export interface OfflineReply {
  text: string;
  quotes?: Quote[];
  risk?: RiskReading;
}

export const QUICK_REPLIES = [
  'Explain index funds',
  'I have ₹500 a month — where do I start?',
  'Is TCS a good stock right now?',
  'How do I manage risk?',
  'Should I buy now or wait?',
] as const;

export const COMMANDS = [
  { cmd: '/stock', args: 'SYMBOL', help: 'Live price and key metrics' },
  { cmd: '/compare', args: 'SYM1 vs SYM2', help: 'Two stocks, side by side' },
  { cmd: '/predict', args: 'SYMBOL', help: 'Where the recent trend points' },
  { cmd: '/risk', args: 'SYMBOL', help: 'Risk read on one stock' },
  { cmd: '/portfolio_health', args: '', help: 'A quick look at your book' },
] as const;

const DISCLAIMER = 'Yeh educational hai, financial advice nahi. Apna research zaroor karna. 🙏';

/* --- Risk scoring ------------------------------------------------------ */

export function riskOf(quote: Quote): RiskReading {
  const reasons: string[] = [];
  let score = 4;

  const band = bandPosition(quote);
  const spread = ((quote.high52 - quote.low52) / quote.low52) * 100;

  if (spread > 70) {
    score += 2;
    reasons.push(`52-week range is ${spread.toFixed(0)}% wide — this one swings hard.`);
  } else if (spread < 30) {
    score -= 1;
    reasons.push(`52-week range is only ${spread.toFixed(0)}% wide — relatively steady.`);
  }

  if (quote.peRatio != null) {
    if (quote.peRatio > 70) {
      score += 2;
      reasons.push(`PE of ${quote.peRatio} means a lot of future growth is already in the price.`);
    } else if (quote.peRatio < 20) {
      score -= 1;
      reasons.push(`PE of ${quote.peRatio} is undemanding for a large cap.`);
    } else {
      reasons.push(`PE of ${quote.peRatio} is in a normal band for its sector.`);
    }
  } else {
    score -= 1;
    reasons.push('It is an ETF, so you own a basket rather than one company.');
  }

  if (band > 0.9) {
    score += 1;
    reasons.push(`Trading at ${Math.round(band * 100)}% of its 52-week range — near the top.`);
  } else if (band < 0.2) {
    reasons.push(`Trading at ${Math.round(band * 100)}% of its 52-week range — near the bottom.`);
  }

  if ((quote.dividendYield ?? 0) > 3) {
    score -= 1;
    reasons.push(`Pays a ${quote.dividendYield}% dividend, which cushions a flat year.`);
  }

  score = Math.max(1, Math.min(10, Math.round(score)));

  const label =
    score <= 3 ? 'Low risk' : score <= 5 ? 'Moderate' : score <= 7 ? 'Elevated' : 'High risk';
  const horizon = score <= 3 ? '3+ years' : score <= 6 ? '3–5 years' : '5+ years, and only with money you can leave alone';

  return { score, label, horizon, reasons };
}

/* --- Formatting helpers ------------------------------------------------ */

function quoteLine(q: Quote) {
  const dir = q.changePercent >= 0 ? '📈' : '📉';
  return [
    `**${q.symbol}** · ${q.name}`,
    `${dir} **₹${q.price.toFixed(2)}** (${pct(q.changePercent)} today)`,
    `52-week: ₹${q.low52.toFixed(0)} – ₹${q.high52.toFixed(0)}`,
    q.peRatio != null ? `PE: ${q.peRatio}` : 'PE: not applicable (ETF)',
    `Dividend yield: ${q.dividendYield ?? 0}%`,
    `Sector: ${q.sector}`,
  ].join('\n');
}

const notFound = (symbol: string) => {
  const near = searchInstruments(symbol, 3);
  return {
    text: `Bhai, **${symbol.toUpperCase()}** mere paas nahi mila. ${
      near.length ? `Yeh matlab tha kya — ${near.map((n) => `**${n.symbol}**`).join(', ')}?` : 'Spelling check kar le ek baar.'
    }`,
  };
};

/* --- Command handlers -------------------------------------------------- */

function cmdStock(symbol: string): OfflineReply {
  const q = mockQuote(symbol);
  if (!q) return notFound(symbol);

  const band = bandPosition(q);
  const read =
    band > 0.85
      ? 'Abhi apni 52-week range ke top ke paas hai — rally already ho chuki hai. Poora paisa ek saath mat daal.'
      : band < 0.25
        ? 'Range ke bottom ke paas hai. Sasta lag raha hai, par pehle dekh ki business mein kuch toota toh nahi.'
        : 'Range ke beech mein hai — na sasta, na mehnga. Aaram se entry le sakta hai.';

  return {
    text: `${quoteLine(q)}\n\n${read}\n\n${DISCLAIMER}`,
    quotes: [q],
    risk: riskOf(q),
  };
}

function cmdCompare(a: string, b: string): OfflineReply {
  const qa = mockQuote(a);
  const qb = mockQuote(b);
  if (!qa) return notFound(a);
  if (!qb) return notFound(b);

  const ra = riskOf(qa);
  const rb = riskOf(qb);
  const cheaper =
    qa.peRatio != null && qb.peRatio != null
      ? qa.peRatio < qb.peRatio
        ? qa.symbol
        : qb.symbol
      : null;

  const lines = [
    `**${qa.symbol} vs ${qb.symbol}** — dekh le side by side:`,
    '',
    `**${qa.symbol}** — ₹${qa.price.toFixed(2)} (${pct(qa.changePercent)}) · PE ${qa.peRatio ?? '—'} · risk ${ra.score}/10 · ${qa.sector}`,
    `**${qb.symbol}** — ₹${qb.price.toFixed(2)} (${pct(qb.changePercent)}) · PE ${qb.peRatio ?? '—'} · risk ${rb.score}/10 · ${qb.sector}`,
    '',
    cheaper
      ? `Valuation pe **${cheaper}** sasta hai. Par sasta hamesha behtar nahi hota — dekh kaunsa business tu samajhta hai.`
      : 'In dono ka PE compare nahi kar sakte — ek ETF hai, ek stock.',
    qa.sector === qb.sector
      ? `⚠️ Dono **${qa.sector}** mein hain. Dono khareedega toh diversification nahi milega, sirf double bet lagega.`
      : `Achhi baat — dono alag sector mein hain (${qa.sector} aur ${qb.sector}), toh saath rakhne se spread milta hai.`,
    '',
    DISCLAIMER,
  ];

  return { text: lines.join('\n'), quotes: [qa, qb] };
}

function cmdPredict(symbol: string): OfflineReply {
  const q = mockQuote(symbol);
  if (!q) return notFound(symbol);

  const band = bandPosition(q);
  const trend = q.changePercent >= 0 ? 'upar' : 'neeche';

  return {
    text: [
      `**${q.symbol}** — trend read, prediction nahi. Koi bhi guarantee de raha hai toh jhoot bol raha hai. 🎯`,
      '',
      `Aaj ${trend} hai (${pct(q.changePercent)}), aur 52-week range ke **${Math.round(band * 100)}%** pe baitha hai.`,
      band > 0.8
        ? 'Momentum strong hai, par entry mehngi hai. Agar lena hai toh teen kisto mein le.'
        : band < 0.3
          ? 'Bottom ke paas hai. Value ho sakti hai, ya value trap bhi — result aur debt check kar.'
          : 'Beech mein hai, koi extreme signal nahi. Boring, aur boring theek hai.',
      '',
      `Honestly: 3–5 saal se kam ke liye kisi bhi single stock ka direction predict karna coin toss hai. Isliye main index fund pe zyada zor deta hoon.`,
      '',
      DISCLAIMER,
    ].join('\n'),
    quotes: [q],
    risk: riskOf(q),
  };
}

function cmdRisk(symbol: string): OfflineReply {
  const q = mockQuote(symbol);
  if (!q) return notFound(symbol);
  const r = riskOf(q);

  return {
    text: [
      `**${q.symbol}** ka risk: **${r.score}/10 — ${r.label}**`,
      '',
      ...r.reasons.map((x) => `• ${x}`),
      '',
      `Time horizon jo main suggest karunga: **${r.horizon}**.`,
      r.score >= 7
        ? 'Itna risky hai toh apne portfolio ka 10% se zyada mat daalna.'
        : 'Core holding ban sakta hai, par akela nahi — 3–4 aur cheezein saath rakh.',
      '',
      DISCLAIMER,
    ].join('\n'),
    quotes: [q],
    risk: r,
  };
}

function cmdPortfolioHealth(summary: PortfolioSummary | null): OfflineReply {
  if (!summary || summary.holdings.length === 0) {
    return {
      text: [
        'Abhi tera portfolio khaali hai — kuch bhi analyse karne ko nahi. 📭',
        '',
        'Portfolio tab pe jaa ke do-teen transactions add kar, phir main poora health check kar dunga: diversification, concentration, sab.',
      ].join('\n'),
    };
  }

  const top = summary.sectorAllocation[0];
  const lines = [
    `**Portfolio health check** — ${summary.holdings.length} holdings, ${money(summary.value)} value.`,
    '',
    `Invested: ${money(summary.invested)} · Ab: **${money(summary.value)}** (${pct(summary.pnlPercent)})`,
    summary.bestPerformer
      ? `Best: **${summary.bestPerformer.symbol}** ${pct(summary.bestPerformer.pnlPercent)}`
      : '',
    summary.worstPerformer
      ? `Worst: **${summary.worstPerformer.symbol}** ${pct(summary.worstPerformer.pnlPercent)}`
      : '',
    '',
  ];

  if (top && top.percent > 50) {
    lines.push(
      `⚠️ **${top.percent.toFixed(0)}% ek hi sector mein** (${top.label}). Yeh sabse bada issue hai — agla paisa kahin aur daal.`,
    );
  } else {
    lines.push(`✅ Sector spread theek hai — sabse bada ${top?.label} pe ${top?.percent.toFixed(0)}%.`);
  }

  if (summary.holdings.length < 3) {
    lines.push(`⚠️ Sirf ${summary.holdings.length} holding hai. 4–6 tak le jaa, alag sectors mein.`);
  }

  if (summary.tradesThisMonth > 10) {
    lines.push(`⚠️ Is mahine ${summary.tradesThisMonth} trades. Brokerage kha raha hai returns.`);
  }

  lines.push('', 'Poori detail ke liye Autopsy tab dekh — wahan har pattern ka evidence hai.', '', DISCLAIMER);
  return { text: lines.filter(Boolean).join('\n') };
}

/* --- Natural language fallbacks ---------------------------------------- */

const CANNED: { match: RegExp; reply: string }[] = [
  {
    match: /index fund|nifty ?bees|etf kya|what.*index/i,
    reply: [
      'Index fund = ek hi cheez khareed ke poori market khareedna. 🧺',
      '',
      'Socha jaa: alag-alag 50 stocks pick karne ke bajaye, tu **NIFTYBEES** khareedta hai aur automatically India ki top 50 companies ka chhota hissa mil jaata hai. Ek company doob gayi toh baaki 49 sambhaal lete hain.',
      '',
      'College student ke liye yeh best starting point kyun hai:',
      '• ₹285 se shuru — ek pizza se kam',
      '• Research ka bojh nahi, tu poori market khareed raha hai',
      '• Expense ratio 0.05% ke aas-paas, active fund se kaafi sasta',
      '',
      'Mera default suggestion: **pehle 6 mahine sirf NIFTYBEES**, har mahine fixed date pe. Habit ban jaaye phir single stocks try karna.',
      '',
      DISCLAIMER,
    ].join('\n'),
  },
  {
    match: /crypto|bitcoin|btc|doge/i,
    reply: [
      'Dekh bhai, FOMO mat khaa. Crypto = **8/10 risky**, aur India mein 30% flat tax + 1% TDS bhi lagta hai. 🪙',
      '',
      'Agar phir bhi interest hai toh order yeh hona chahiye:',
      '1. Pehle ₹500/month index fund — 6 mahine tak, bina break',
      '2. Ek stock jise tu genuinely samajhta hai',
      '3. Uske baad, **5–10% se zyada nahi** experimental cheezon mein',
      '',
      'Sab kuch ek jagah mat lagaa dena. Sahi?',
      '',
      DISCLAIMER,
    ].join('\n'),
  },
  {
    match: /(500|thousand|1000|budget).*(start|shuru|where|kaha)|start.*₹?500|where do i start/i,
    reply: [
      '₹500 se shuru karna bilkul sahi hai — amount se zyada **consistency** matter karti hai. 💪',
      '',
      'Pehle 6 mahine ka plan:',
      '• **₹400 → NIFTYBEES** (index ETF, ₹285 ka ek unit)',
      '• **₹100 → cash bacha ke rakh**, dip aaye toh use karna',
      '• Fixed date choose kar — har mahine ki 5 tareekh, jo bhi ho',
      '',
      'Chhe mahine baad tera ₹3000 invested hoga aur — zyada important — tere paas ek habit hogi. Tab tak ek stock research kar ke rakh, seventh month mein woh add karna.',
      '',
      'Time horizon: **kam se kam 3–5 saal**. Isse kam ho toh FD behtar hai, seriously.',
      '',
      DISCLAIMER,
    ].join('\n'),
  },
  {
    match: /manage risk|risk kaise|diversif/i,
    reply: [
      'Risk manage karne ka matlab risk khatam karna nahi hai — usko **size** karna hai. 🎚️',
      '',
      'Char rules jo tere budget pe kaam karte hain:',
      '• **Ek stock mein 25% se zyada nahi.** 4 holdings minimum.',
      '• **Teen alag sector.** Saare IT stocks alag nahi hote, saath girte hain.',
      '• **Emergency fund pehle.** 2–3 mahine ka kharcha bank mein, market se bahar.',
      '• **Sirf woh paisa jo 3 saal tak nahi chahiye.** Semester fees ka paisa market mein nahi jaata.',
      '',
      'Aur sabse bada risk control: dip pe bechna band karna. Autopsy tab tere apne trades pe yeh dikhata hai.',
      '',
      DISCLAIMER,
    ].join('\n'),
  },
  {
    match: /buy now or wait|abhi lu|timing|market timing/i,
    reply: [
      'Sach bataun? **Nobody knows.** Jo confidently bataye woh bech raha hai kuch. ⏰',
      '',
      'Data yeh kehta hai: market timing ki koshish mein log average se kam kamaate hain, kyunki best 10 din miss ho jaate hain aur woh aksar worst din ke turant baad aate hain.',
      '',
      'Iska practical jawab:',
      '• Ek saath ₹5000 hai? **Teen kisto mein daal** — aaj, ek mahine baad, do mahine baad.',
      '• Har mahine ₹500 hai? **Fixed date pe daal**, price dekhe bina. Yeh khud averaging kar deta hai.',
      '',
      'Time *in* the market > timing the market. Ghisa hua line hai, par ghisa isliye hai kyunki sach hai.',
      '',
      DISCLAIMER,
    ].join('\n'),
  },
  {
    match: /lost|loss ho gaya|nuksan|gaya paisa/i,
    reply: [
      'Arre, woh **sikhne ki fees** thi. Har investor ne di hai, koi exception nahi. 🫂',
      '',
      'Ab asli sawaal — kya hua tha? Do mein se ek hoga:',
      '• **Dip pe dar ke becha** → yeh sabse common hai, aur sabse theek karne laayak',
      '• **Business hi kharab tha** → yeh research ka gap hai, alag fix hai',
      '',
      'Bataa na, kaunsa stock tha aur kab becha? Main tere Autopsy report mein exactly dikha dunga ki us trade mein kya hua.',
      '',
      'Ek baat yaad rakh: loss tab tak notional hai jab tak tu bech na de. Bechna hi asli decision hota hai.',
    ].join('\n'),
  },
];

/* --- Entry point ------------------------------------------------------- */

export function offlineReply(input: string, summary: PortfolioSummary | null): OfflineReply {
  const text = input.trim();
  const lower = text.toLowerCase();

  // Slash commands first — they are exact by design.
  const slash = text.match(/^\/(\w+)\s*(.*)$/);
  if (slash) {
    const [, cmd, rest] = slash;
    switch (cmd.toLowerCase()) {
      case 'stock':
        return rest ? cmdStock(rest.split(/\s+/)[0]) : { text: 'Symbol bhi bata — jaise `/stock TCS`.' };
      case 'compare': {
        const parts = rest.split(/\s+vs\s+|\s+/i).filter(Boolean);
        return parts.length >= 2
          ? cmdCompare(parts[0], parts[1])
          : { text: 'Do symbol chahiye — jaise `/compare TCS vs INFY`.' };
      }
      case 'predict':
        return rest ? cmdPredict(rest.split(/\s+/)[0]) : { text: 'Symbol bata — `/predict INFY`.' };
      case 'risk':
        return rest ? cmdRisk(rest.split(/\s+/)[0]) : { text: 'Symbol bata — `/risk ZOMATO`.' };
      case 'portfolio_health':
      case 'portfolio':
        return cmdPortfolioHealth(summary);
      default:
        return {
          text: `**/${cmd}** mujhe nahi pata. Yeh available hain:\n\n${COMMANDS.map(
            (c) => `• \`${c.cmd} ${c.args}\` — ${c.help}`,
          ).join('\n')}`,
        };
    }
  }

  // "analyze TCS", "is INFY good", "should I buy RELIANCE"
  const mention = text.match(/\b([A-Z][A-Z&-]{2,11})\b/);
  if (mention && findInstrument(mention[1])) {
    if (/compare|vs\b/i.test(lower)) {
      const both = text.match(/\b([A-Z][A-Z&-]{2,11})\b.*?\b([A-Z][A-Z&-]{2,11})\b/);
      if (both && findInstrument(both[2])) return cmdCompare(both[1], both[2]);
    }
    if (/risk/i.test(lower)) return cmdRisk(mention[1]);
    if (/predict|kahan jaayega|target/i.test(lower)) return cmdPredict(mention[1]);
    return cmdStock(mention[1]);
  }

  if (/portfolio|mera portfolio|health/i.test(lower)) return cmdPortfolioHealth(summary);

  for (const c of CANNED) {
    if (c.match.test(lower)) return { text: c.reply };
  }

  return {
    text: [
      'Main abhi **offline mode** mein hoon (Claude API se connection nahi hai), toh mere jawab limited hain. 🔌',
      '',
      'Yeh sab abhi bhi kaam karta hai, poore live data ke saath:',
      ...COMMANDS.map((c) => `• \`${c.cmd} ${c.args}\` — ${c.help}`),
      '',
      'Ya index funds, risk, crypto, ya "₹500 se kaise shuru karun" pooch le — un sab pe main offline bhi jawab de sakta hoon.',
    ].join('\n'),
  };
}

export const greeting = (name?: string): ChatMessage => ({
  id: 'greeting',
  role: 'copilot',
  at: Date.now(),
  text: [
    `Namaste${name ? ` ${name}` : ''}! Main tera Investment Copilot hoon. 👋`,
    '',
    'Main koi advisor nahi hoon jo tujhe cheezein bechne aaya hai — main woh senior hoon jisne pehle hi ye galtiyan kar li hain.',
    '',
    'Kuch bhi pooch le. Ya seedha `/stock TCS` type kar ke live price dekh le.',
  ].join('\n'),
});
