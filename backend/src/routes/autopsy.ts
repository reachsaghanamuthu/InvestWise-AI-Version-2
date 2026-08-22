import { Router } from 'express';
import { z } from 'zod';
import { copilotAvailable, writeAutopsyNarrative } from '../services/copilotService.js';
import { optionalAuth, requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/errorHandler.js';
import { getUser } from '../services/authService.js';
import { listReports, saveReport } from '../services/portfolioService.js';

const router = Router();

/* The client runs the rule engine and posts the finished findings here. Keeping
   detection on the client means the autopsy still works with no backend at all;
   this endpoint only adds the written narrative on top. */
const narrativeSchema = z.object({
  transactions: z.array(z.unknown()).max(500),
  report: z.object({
    period: z.string().max(40),
    grade: z.string().max(4),
    overview: z.unknown(),
    patterns: z.array(z.unknown()),
    scores: z.array(z.unknown()),
  }),
});

router.post(
  '/narrative',
  optionalAuth,
  wrap(async (req: AuthedRequest, res) => {
    const body = narrativeSchema.parse(req.body);

    if (!copilotAvailable()) {
      throw httpError(
        'Report writing is not configured on this server. Set CLAUDE_API_KEY to enable it.',
        503,
      );
    }

    const studentName = req.userId ? getUser(req.userId).name : 'Student';

    const narrative = await writeAutopsyNarrative({
      studentName,
      period: body.report.period,
      grade: body.report.grade,
      overview: body.report.overview,
      patterns: body.report.patterns,
      scores: body.report.scores,
      transactionCount: body.transactions.length,
    });

    if (req.userId) {
      saveReport({
        userId: req.userId,
        period: body.report.period,
        grade: body.report.grade,
        narrative,
        payload: body.report,
      });
    }

    res.json({ narrative });
  }),
);

router.get(
  '/reports',
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    res.json({ reports: listReports(req.userId!) });
  }),
);

export default router;
