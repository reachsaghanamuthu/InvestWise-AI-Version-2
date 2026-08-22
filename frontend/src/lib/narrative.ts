import type { AutopsyReport } from '@/types';
import { money, pct } from '@/lib/format';

/* The offline write-up.

   Claude normally writes this section. When the API is not reachable, this
   composes the same report from the findings the rule engine already produced,
   in the same voice — so the tab is never empty, and it is always labelled as
   the offline version. */

export function offlineNarrative(report: AutopsyReport, name: string): string {
  const first = name.split(' ')[0] || 'bhai';
  const o = report.overview;
  const flagged = report.patterns.filter((p) => p.severity !== 'clear');
  const best = report.scores.reduce((a, b) => (a.score >= b.score ? a : b));
  const worst = report.scores.reduce((a, b) => (a.score <= b.score ? a : b));

  const lines: string[] = [];

  lines.push(`**${first}, ${report.period} ka hisaab.** 📋`);
  lines.push('');
  lines.push(
    o.monthPnl >= 0
      ? `Portfolio ${money(o.value)} pe hai, ${pct(o.monthPnlPercent)} upar. Nifty ${pct(o.niftyPercent)} tha, toh tu ${o.monthPnlPercent >= o.niftyPercent ? 'aage' : 'peeche'} hai. Par asli baat number nahi hai — asli baat yeh hai ki tu number tak pahuncha kaise.`
      : `Portfolio ${money(o.value)} pe hai, ${pct(o.monthPnlPercent)} neeche. Pehle yeh sun: red mahina normal hai, aur is umar mein toh bilkul normal hai. Sawaal yeh hai ki tune us red pe react kaise kiya.`,
  );
  lines.push('');

  if (flagged.length === 0) {
    lines.push(
      'Is baar koi pattern nahi mila. Na panic sell, na FOMO buy, na overtrading. Yeh boring lagta hai par yahi asli win hai — zyadatar log 6 mahine mein yahan tak nahi pahunchte.',
    );
  } else {
    lines.push(`**Jo main dekh raha hoon (${flagged.length} cheezein):**`);
    lines.push('');
    for (const p of flagged.slice(0, 3)) {
      lines.push(`**${p.code} — ${p.name}**`);
      lines.push(p.finding);
      lines.push(`_Kya kar:_ ${p.advice}`);
      lines.push('');
    }
  }

  lines.push('**Marksheet ka matlab:**');
  lines.push('');
  lines.push(`• Sabse strong: **${best.label} — ${best.score}/10.** ${best.remark}`);
  lines.push(`• Sabse kamzor: **${worst.label} — ${worst.score}/10.** ${worst.remark}`);
  lines.push('');
  lines.push(`Agla mahina sirf ek cheez pe focus kar: **${worst.label.toLowerCase()}**. ${worst.improve}`);
  lines.push('');
  lines.push(
    `Overall grade **${report.grade}** hai. Isko permanent mat samajh — yeh sirf is mahine ke trades ka reflection hai, tere aage ka nahi. Agle mahine phir milte hain. 🤝`,
  );
  lines.push('');
  lines.push(
    '_Yeh educational analysis hai, financial advice nahi. Koi bhi return guaranteed nahi hota._',
  );

  return lines.join('\n');
}
