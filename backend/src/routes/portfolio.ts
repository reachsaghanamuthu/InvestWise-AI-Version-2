import { Router } from 'express';
import { z } from 'zod';
import {
  addTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from '../services/portfolioService.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { wrap } from '../middleware/errorHandler.js';

const router = Router();

const txSchema = z.object({
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  type: z.enum(['stock', 'mf', 'etf', 'bond']),
  side: z.enum(['buy', 'sell']),
  quantity: z.number().positive('Quantity must be above zero.'),
  price: z.number().positive('Price must be above zero.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.'),
  note: z.string().max(300).optional(),
});

router.use(requireAuth);

router.get(
  '/',
  wrap(async (req: AuthedRequest, res) => {
    res.json({ transactions: listTransactions(req.userId!) });
  }),
);

router.post(
  '/',
  wrap(async (req: AuthedRequest, res) => {
    const tx = txSchema.parse(req.body);
    res.status(201).json({ transaction: addTransaction(req.userId!, tx) });
  }),
);

router.patch(
  '/:id',
  wrap(async (req: AuthedRequest, res) => {
    const patch = txSchema.partial().parse(req.body);
    res.json({ transaction: updateTransaction(req.userId!, req.params.id, patch) });
  }),
);

router.delete(
  '/:id',
  wrap(async (req: AuthedRequest, res) => {
    deleteTransaction(req.userId!, req.params.id);
    res.json({ ok: true });
  }),
);

export default router;
