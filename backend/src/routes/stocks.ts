import { Router } from 'express';
import { financialData } from '../services/financialDataService.js';
import { wrap, httpError } from '../middleware/errorHandler.js';

const router = Router();

/** GET /api/stocks?symbols=TCS,INFY — batched, so one page render is one call. */
router.get(
  '/',
  wrap(async (req, res) => {
    const raw = String(req.query.symbols ?? '').trim();
    if (!raw) throw httpError('Pass at least one symbol, e.g. ?symbols=TCS,INFY', 400);

    const symbols = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 40);
    res.json({ quotes: await financialData.getQuotes(symbols) });
  }),
);

router.get(
  '/search',
  wrap(async (req, res) => {
    const q = String(req.query.q ?? '');
    res.json({
      results: financialData.search(q).map((s) => ({
        symbol: s.symbol,
        name: s.name,
        sector: s.sector,
        type: s.type,
      })),
    });
  }),
);

router.get(
  '/:symbol',
  wrap(async (req, res) => {
    res.json(await financialData.getQuote(req.params.symbol));
  }),
);

export default router;
