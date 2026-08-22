import bcrypt from 'bcryptjs';
import { db, newId } from '../config/db.js';
import { httpError } from '../middleware/errorHandler.js';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  college: string | null;
  risk_tolerance: string;
  monthly_budget: number;
  goal: string | null;
  created_at: number;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  college?: string;
  riskTolerance: 'low' | 'medium' | 'high';
  monthlyBudget: number;
  goal?: string;
}

const toPublic = (row: UserRow): PublicUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  college: row.college ?? undefined,
  riskTolerance: (row.risk_tolerance as PublicUser['riskTolerance']) ?? 'medium',
  monthlyBudget: row.monthly_budget,
  goal: row.goal ?? undefined,
});

const normalise = (email: string) => email.trim().toLowerCase();

export function createUser(input: {
  name: string;
  email: string;
  password: string;
  college?: string;
}): PublicUser {
  const email = normalise(input.email);

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw httpError('An account with that email already exists. Sign in instead.', 409);
  }

  const id = newId('usr');
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, college, risk_tolerance, monthly_budget, goal, created_at)
     VALUES (?, ?, ?, ?, ?, 'medium', 2000, NULL, ?)`,
  ).run(id, input.name.trim(), email, bcrypt.hashSync(input.password, 10), input.college ?? null, Date.now());

  return toPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as UserRow);
}

export function verifyUser(email: string, password: string): PublicUser {
  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(normalise(email)) as unknown as UserRow | undefined;

  // The same message for a missing account and a wrong password, so the
  // endpoint cannot be used to discover which emails are registered.
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    throw httpError('That email and password do not match.', 401);
  }

  return toPublic(row);
}

export function getUser(id: string): PublicUser {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as UserRow | undefined;
  if (!row) throw httpError('Account not found.', 404);
  return toPublic(row);
}

export function updateUser(
  id: string,
  patch: Partial<Pick<PublicUser, 'name' | 'college' | 'riskTolerance' | 'monthlyBudget' | 'goal'>>,
): PublicUser {
  const current = getUser(id);

  db.prepare(
    `UPDATE users SET name = ?, college = ?, risk_tolerance = ?, monthly_budget = ?, goal = ?
     WHERE id = ?`,
  ).run(
    patch.name ?? current.name,
    patch.college ?? current.college ?? null,
    patch.riskTolerance ?? current.riskTolerance,
    patch.monthlyBudget ?? current.monthlyBudget,
    patch.goal ?? current.goal ?? null,
    id,
  );

  return getUser(id);
}
