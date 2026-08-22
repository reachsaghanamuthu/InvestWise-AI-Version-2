import { Router } from 'express';
import { z } from 'zod';
import { createUser, getUser, updateUser, verifyUser } from '../services/authService.js';
import { requireAuth, signToken, type AuthedRequest } from '../middleware/auth.js';
import { wrap } from '../middleware/errorHandler.js';

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2, 'Tell us what to call you.').max(80),
  email: z.string().email('That does not look like an email address.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(200),
  college: z.string().max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().email('That does not look like an email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

router.post(
  '/signup',
  wrap(async (req, res) => {
    const body = signupSchema.parse(req.body);
    const user = createUser(body);
    res.status(201).json({ token: signToken(user.id), user });
  }),
);

router.post(
  '/login',
  wrap(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = verifyUser(body.email, body.password);
    res.json({ token: signToken(user.id), user });
  }),
);

router.get(
  '/me',
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    res.json({ user: getUser(req.userId!) });
  }),
);

const profileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  college: z.string().max(120).optional(),
  riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
  monthlyBudget: z.number().int().min(0).max(10_000_000).optional(),
  goal: z.string().max(240).optional(),
});

router.patch(
  '/me',
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    const patch = profileSchema.parse(req.body);
    res.json({ user: updateUser(req.userId!, patch) });
  }),
);

export default router;
