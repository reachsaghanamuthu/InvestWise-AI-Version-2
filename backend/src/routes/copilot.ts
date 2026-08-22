import { Router } from 'express';
import { z } from 'zod';
import { askCopilot, copilotAvailable } from '../services/copilotService.js';
import { financialData } from '../services/financialDataService.js';
import { optionalAuth, type AuthedRequest } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/errorHandler.js';
import { saveMessage } from '../services/portfolioService.js';

const router = Router();

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'copilot']),
        text: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(24),
  portfolio: z.unknown().optional(),
  conversationId: z.string().max(64).optional(),
});

/* Any NSE symbol the student mentions gets its live quote attached to the
   prompt, so Claude answers about TCS with today's TCS rather than with
   whatever it remembers. */
async function marketContextFor(text: string) {
  const mentioned = [...new Set(text.toUpperCase().match(/\b[A-Z][A-Z&-]{2,11}\b/g) ?? [])]
    .filter((s) => financialData.search(s, 1)[0]?.symbol === s)
    .slice(0, 4);

  if (mentioned.length === 0) return undefined;
  const quotes = await financialData.getQuotes(mentioned);
  return quotes.length ? quotes : undefined;
}

router.post(
  '/chat',
  optionalAuth,
  wrap(async (req: AuthedRequest, res) => {
    const body = chatSchema.parse(req.body);

    if (!copilotAvailable()) {
      // A clear, specific 503 — the client falls back to its offline brain and
      // labels the reply, which is better than a vague failure.
      throw httpError(
        'The Copilot is not configured on this server. Set CLAUDE_API_KEY to enable it.',
        503,
      );
    }

    const latest = body.messages[body.messages.length - 1];
    const marketData = await marketContextFor(latest.text);

    const result = await askCopilot(body.messages, {
      portfolio: body.portfolio ?? undefined,
      marketData,
    });

    if (req.userId && body.conversationId) {
      saveMessage(req.userId, body.conversationId, 'user', latest.text);
      saveMessage(req.userId, body.conversationId, 'copilot', result.text);
    }

    res.json({ text: result.text, quotes: marketData ?? [], source: result.source });
  }),
);

export default router;
