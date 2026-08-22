import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request {
  userId?: string;
}

const SECRET = process.env.JWT_SECRET || 'investwise-dev-secret-change-me';

export const signToken = (userId: string) =>
  jwt.sign({ sub: userId }, SECRET, { expiresIn: '30d' });

/** Rejects anything without a valid bearer token. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sign in to continue.' });
  }

  try {
    const payload = jwt.verify(header.slice(7), SECRET) as { sub?: string };
    if (!payload.sub) throw new Error('no subject');
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Sign in again.' });
  }
}

/** Attaches the user when a token is present, but lets anonymous through —
    used by the Copilot and stock routes so the demo works before signup. */
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), SECRET) as { sub?: string };
      req.userId = payload.sub;
    } catch {
      /* an invalid token on an optional route is simply anonymous */
    }
  }
  next();
}
