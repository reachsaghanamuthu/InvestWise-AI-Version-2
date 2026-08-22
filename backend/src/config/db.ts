import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/* Storage.

   SQLite through Node's built-in `node:sqlite` — no native module to compile,
   no database server to install, and the file is committed nowhere. That is
   the right trade for a prototype that has to run on a stranger's laptop the
   morning of a pitch. */

const FILE = process.env.DATABASE_FILE
  ? resolve(process.env.DATABASE_FILE)
  : resolve(process.cwd(), 'database', 'investwise.db');

mkdirSync(dirname(FILE), { recursive: true });

export const db = new DatabaseSync(FILE);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      email          TEXT NOT NULL UNIQUE,
      password_hash  TEXT NOT NULL,
      college        TEXT,
      risk_tolerance TEXT NOT NULL DEFAULT 'medium',
      monthly_budget INTEGER NOT NULL DEFAULT 2000,
      goal           TEXT,
      created_at     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol     TEXT NOT NULL,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL,
      side       TEXT NOT NULL,
      quantity   REAL NOT NULL,
      price      REAL NOT NULL,
      date       TEXT NOT NULL,
      note       TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, date);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id TEXT NOT NULL,
      role            TEXT NOT NULL,
      text            TEXT NOT NULL,
      created_at      INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, conversation_id, created_at);

    CREATE TABLE IF NOT EXISTS autopsy_reports (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period     TEXT NOT NULL,
      grade      TEXT NOT NULL,
      narrative  TEXT,
      payload    TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_report_user ON autopsy_reports(user_id, period);
  `);
}

export const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
