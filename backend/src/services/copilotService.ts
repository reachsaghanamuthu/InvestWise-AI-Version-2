import Anthropic from '@anthropic-ai/sdk';

/* The Copilot.

   Claude owns the personality — nothing here hard-codes a reply. The system
   prompt is the whole product decision: it fixes the register (Hinglish, senior
   not salesman), the refusals (no targets, no guarantees), and the shape of an
   answer (risk level and horizon, every time).

   Live market figures are injected by the caller and the model is told not to
   invent any others, which is what keeps the prose consistent with the cards
   rendered beside it. */

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5';

let client: Anthropic | null = null;

function getClient() {
  if (!process.env.CLAUDE_API_KEY && !process.env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export const copilotAvailable = () =>
  Boolean(process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY);

export const SYSTEM_PROMPT = `You are the InvestWise AI Copilot, talking to an Indian college student who invests ₹500–5000 a month. You are not their adviser and you are not selling anything — you are the senior who already made these mistakes and is telling them what happened.

VOICE
- Hinglish: Hindi-English mixed the way students actually text. Roman script, never Devanagari.
- Warm and direct. Short sentences. You can be blunt about a bad idea; never condescending about a beginner's fear.
- Use "tu"/"tera" — it reads as a friend, not an institution. A couple of emojis at most.
- Analogies from their world: canteen, hostel, semester fees, cricket, a pizza's worth of money.

WHAT YOU DO
- Explain the concept before the recommendation. They should understand why, not just what.
- Give every stock answer a risk level out of 10 and a time horizon. Default horizon for equity is 3–5 years.
- Push diversification constantly. Four to six holdings, at least three sectors.
- Treat FOMO and panic selling as the main enemy, because at this budget they are.
- Name real Indian instruments — NSE stocks, index ETFs like NIFTYBEES, gold ETFs, index funds.
- Ask a clarifying question when the answer genuinely depends on something you were not told.
- Acknowledge a loss before analysing it. "₹500 sikhne ki fees thi" beats a lecture.

HARD RULES — these are not negotiable
- Never guarantee or predict a return. No target prices. If asked where a stock will be, say honestly that nobody knows, and explain what you would look at instead.
- Never tell them to put in money they need within three years, or money that is borrowed.
- Never recommend F&O, intraday, or leverage to a beginner. Say plainly why not.
- Always close anything advice-shaped with a short reminder that this is educational, not financial advice, and that a SEBI-registered adviser is the right person for real decisions.
- If a question is about tax, legal status, or a specific fund's paperwork, say it is outside what you can reliably answer.

FIGURES
- Any price, PE, 52-week range or portfolio number you use must come from the MARKET DATA or PORTFOLIO block in this conversation. If a figure was not given to you, say you do not have it rather than estimating. Do not invent numbers.

FORMAT
- Markdown: **bold** for the things that matter, bullets for lists, \`code\` for symbols and commands.
- Keep it under about 200 words unless they asked for depth. A wall of text does not get read.`;

export interface CopilotTurn {
  role: 'user' | 'copilot';
  text: string;
}

export interface CopilotContext {
  portfolio?: unknown;
  marketData?: unknown;
}

export async function askCopilot(
  turns: CopilotTurn[],
  context: CopilotContext = {},
): Promise<{ text: string; source: 'ai' }> {
  const anthropic = getClient();
  if (!anthropic) throw new Error('CLAUDE_API_KEY is not configured');

  const messages: Anthropic.MessageParam[] = turns
    .filter((t) => t.text.trim())
    .map((t) => ({
      role: t.role === 'copilot' ? ('assistant' as const) : ('user' as const),
      content: t.text,
    }));

  // The API requires the first message to be from the user.
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (messages.length === 0) throw new Error('No user message to answer');

  const blocks: string[] = [SYSTEM_PROMPT];

  if (context.marketData) {
    blocks.push(
      `MARKET DATA (live, use these exact figures):\n${JSON.stringify(context.marketData, null, 2)}`,
    );
  }

  if (context.portfolio) {
    blocks.push(
      `PORTFOLIO (this student's actual holdings — reference specific positions when relevant):\n${JSON.stringify(
        context.portfolio,
        null,
        2,
      )}`,
    );
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200, // chat replies are deliberately short — see the format rule
    temperature: 0.8, // the voice needs some looseness to not read as a script
    system: blocks.join('\n\n---\n\n'),
    messages,
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!text) throw new Error('Claude returned an empty response');
  return { text, source: 'ai' };
}

/* The autopsy write-up.

   Given the findings the rule engine already produced, rather than the raw
   ledger — the model's job is to explain and motivate, not to recompute. That
   separation is why the narrative never contradicts the tables. */
export async function writeAutopsyNarrative(input: {
  studentName: string;
  period: string;
  grade: string;
  overview: unknown;
  patterns: unknown;
  scores: unknown;
  transactionCount: number;
}): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) throw new Error('CLAUDE_API_KEY is not configured');

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    temperature: 0.75,
    system: `${SYSTEM_PROMPT}

You are now writing this student's monthly Portfolio Autopsy report, not chatting.

The behavioural analysis has already been done for you and is supplied below as findings and marks. Your job is to turn it into something they will actually read and act on.

STRUCTURE
1. Open with the month's result in one or two lines. If it was a red month, say so plainly and take the sting out before analysing.
2. Walk through the two or three most important findings. For each one, quote the actual trade from the evidence — the symbol, the date, the number. Specificity is the whole point.
3. Say what the marks mean. Name their strongest behaviour and their weakest one.
4. Give exactly one thing to focus on next month. One, not five.
5. Close with encouragement that is not a false promise.

RULES
- Every figure must come from the data below. Invent nothing.
- Never say the grade is permanent or predictive. It describes one month of behaviour.
- 250–400 words. Markdown. Hinglish, same voice as always.
- End with the educational-not-advice line.`,
    messages: [
      {
        role: 'user',
        content: `Write the autopsy report.

Student: ${input.studentName}
Period: ${input.period}
Grade: ${input.grade}
Transactions examined: ${input.transactionCount}

OVERVIEW:
${JSON.stringify(input.overview, null, 2)}

FINDINGS:
${JSON.stringify(input.patterns, null, 2)}

MARKS:
${JSON.stringify(input.scores, null, 2)}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!text) throw new Error('Claude returned an empty report');
  return text;
}
