import { db, newId } from '../config/db.js';
import { httpError } from '../middleware/errorHandler.js';

export interface Transaction {
  id: string;
  symbol: string;
  name: string;
  type: string;
  side: string;
  quantity: number;
  price: number;
  date: string;
  note?: string;
}

interface TxRow extends Omit<Transaction, 'note'> {
  user_id: string;
  note: string | null;
  created_at: number;
}

const toTransaction = (row: TxRow): Transaction => ({
  id: row.id,
  symbol: row.symbol,
  name: row.name,
  type: row.type,
  side: row.side,
  quantity: row.quantity,
  price: row.price,
  date: row.date,
  note: row.note ?? undefined,
});

export function listTransactions(userId: string): Transaction[] {
  const rows = db
    .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC')
    .all(userId) as unknown as TxRow[];
  return rows.map(toTransaction);
}

export function addTransaction(userId: string, tx: Omit<Transaction, 'id'>): Transaction {
  const id = newId('tx');
  db.prepare(
    `INSERT INTO transactions (id, user_id, symbol, name, type, side, quantity, price, date, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    tx.symbol.toUpperCase(),
    tx.name,
    tx.type,
    tx.side,
    tx.quantity,
    tx.price,
    tx.date,
    tx.note ?? null,
    Date.now(),
  );

  return toTransaction(
    db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as unknown as TxRow,
  );
}

export function updateTransaction(
  userId: string,
  id: string,
  patch: Partial<Omit<Transaction, 'id'>>,
): Transaction {
  const row = db
    .prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
    .get(id, userId) as unknown as TxRow | undefined;
  if (!row) throw httpError('That transaction is not in your ledger.', 404);

  const merged = { ...toTransaction(row), ...patch };

  db.prepare(
    `UPDATE transactions SET symbol = ?, name = ?, type = ?, side = ?, quantity = ?, price = ?, date = ?, note = ?
     WHERE id = ? AND user_id = ?`,
  ).run(
    merged.symbol.toUpperCase(),
    merged.name,
    merged.type,
    merged.side,
    merged.quantity,
    merged.price,
    merged.date,
    merged.note ?? null,
    id,
    userId,
  );

  return toTransaction(
    db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as unknown as TxRow,
  );
}

export function deleteTransaction(userId: string, id: string) {
  const result = db
    .prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
    .run(id, userId);
  if (result.changes === 0) throw httpError('That transaction is not in your ledger.', 404);
}

/* --- Chat history ------------------------------------------------------ */

export function saveMessage(
  userId: string,
  conversationId: string,
  role: 'user' | 'copilot',
  text: string,
) {
  db.prepare(
    `INSERT INTO chat_messages (id, user_id, conversation_id, role, text, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(newId('msg'), userId, conversationId, role, text, Date.now());
}

export function listMessages(userId: string, conversationId: string) {
  return db
    .prepare(
      `SELECT role, text, created_at FROM chat_messages
       WHERE user_id = ? AND conversation_id = ? ORDER BY created_at ASC`,
    )
    .all(userId, conversationId) as unknown as { role: string; text: string; created_at: number }[];
}

/* --- Autopsy reports --------------------------------------------------- */

export function saveReport(input: {
  userId: string;
  period: string;
  grade: string;
  narrative: string | null;
  payload: unknown;
}) {
  const id = newId('rpt');
  db.prepare(
    `INSERT INTO autopsy_reports (id, user_id, period, grade, narrative, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.userId,
    input.period,
    input.grade,
    input.narrative,
    JSON.stringify(input.payload),
    Date.now(),
  );
  return id;
}

export function listReports(userId: string) {
  return db
    .prepare(
      `SELECT id, period, grade, narrative, created_at FROM autopsy_reports
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 12`,
    )
    .all(userId) as unknown as {
    id: string;
    period: string;
    grade: string;
    narrative: string | null;
    created_at: number;
  }[];
}
