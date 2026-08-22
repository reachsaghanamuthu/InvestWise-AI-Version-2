import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/* Errors say what went wrong and what to do about it, in the interface's own
   voice. Stack traces stay in the log, never in the response body. */

export interface HttpError extends Error {
  status?: number;
  expose?: boolean;
}

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ error: 'No such endpoint.' });
};

export function errorHandler(
  err: HttpError | ZodError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(400).json({
      error: first ? `${first.path.join('.')}: ${first.message}` : 'That request was not valid.',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  const status = err.status ?? 500;

  // 5xx we raised on purpose (a missing API key, say) carries a message the
  // person can act on, so it is passed through. Anything unexpected is logged
  // and answered generically — stack traces never leave the server.
  if (status >= 500) {
    console.error('[error]', err.message, err.stack);
    if (!err.expose) {
      return res.status(500).json({ error: 'Something broke on our side. Try again.' });
    }
  }

  res.status(status).json({ error: err.message });
}

/** Wraps an async handler so a rejected promise reaches the error handler
    instead of hanging the request. */
export const wrap =
  <T extends Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: T, res: Response, next: NextFunction) => {
    void fn(req, res, next).catch(next);
  };

export function httpError(message: string, status: number): HttpError {
  const err = new Error(message) as HttpError;
  err.status = status;
  err.expose = true; // we wrote this message for the user to read
  return err;
}
