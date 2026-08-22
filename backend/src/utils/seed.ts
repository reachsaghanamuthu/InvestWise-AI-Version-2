import 'dotenv/config';
import { db, migrate } from '../config/db.js';
import { createUser } from '../services/authService.js';
import { addTransaction } from '../services/portfolioService.js';

/* Seeds the demo account.

   The ledger is the same one the frontend ships offline, so a judge sees
   identical findings whether or not the backend is running. */

const DEMO_EMAIL = 'aarav@demo.investwise.ai';
const DEMO_PASSWORD = 'investwise2026';

const TRANSACTIONS = [
  ['NIFTYBEES', 'Nippon India Nifty 50 BeES', 'etf', 'buy', 3, 262.4, '2026-03-05', 'First ever investment'],
  ['NIFTYBEES', 'Nippon India Nifty 50 BeES', 'etf', 'buy', 3, 271.1, '2026-04-06', null],
  ['NIFTYBEES', 'Nippon India Nifty 50 BeES', 'etf', 'buy', 4, 279.0, '2026-05-05', null],
  ['INFY', 'Infosys', 'stock', 'buy', 1, 1985.0, '2026-06-10', 'Everyone on X was posting about it'],
  ['INFY', 'Infosys', 'stock', 'sell', 1, 1846.0, '2026-06-18', 'Got scared after 3 red days'],
  ['TCS', 'Tata Consultancy Services', 'stock', 'buy', 1, 3180.0, '2026-07-03', null],
  ['HDFCBANK', 'HDFC Bank', 'stock', 'buy', 1, 1690.0, '2026-07-15', null],
  ['ZOMATO', 'Eternal (Zomato)', 'stock', 'buy', 3, 291.0, '2026-08-04', 'It was up 20% that week'],
  ['TATAMOTORS', 'Tata Motors', 'stock', 'buy', 1, 742.0, '2026-08-05', null],
  ['TATAMOTORS', 'Tata Motors', 'stock', 'sell', 1, 719.0, '2026-08-06', 'Changed my mind'],
  ['WIPRO', 'Wipro', 'stock', 'buy', 1, 295.0, '2026-08-07', null],
  ['WIPRO', 'Wipro', 'stock', 'buy', 1, 302.0, '2026-08-08', 'Averaging up'],
  ['WIPRO', 'Wipro', 'stock', 'sell', 2, 281.0, '2026-08-11', null],
  ['ZOMATO', 'Eternal (Zomato)', 'stock', 'sell', 3, 262.0, '2026-08-12', 'Cut my losses'],
  ['TATASTEEL', 'Tata Steel', 'stock', 'buy', 5, 168.0, '2026-08-13', null],
  ['HDFCBANK', 'HDFC Bank', 'stock', 'buy', 1, 1705.0, '2026-08-14', null],
  ['NIFTYBEES', 'Nippon India Nifty 50 BeES', 'etf', 'buy', 4, 288.0, '2026-08-18', null],
  ['GOLDBEES', 'Nippon India Gold BeES', 'etf', 'buy', 1, 83.5, '2026-08-20', null],
] as const;

migrate();

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO_EMAIL) as
  | { id: string }
  | undefined;

if (existing) {
  console.log('Demo account already exists — clearing its ledger and reseeding.');
  db.prepare('DELETE FROM transactions WHERE user_id = ?').run(existing.id);
}

const userId =
  existing?.id ??
  createUser({
    name: 'Aarav Mehta',
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    college: 'VJTI Mumbai',
  }).id;

for (const [symbol, name, type, side, quantity, price, date, note] of TRANSACTIONS) {
  addTransaction(userId, {
    symbol,
    name,
    type,
    side,
    quantity,
    price,
    date,
    note: note ?? undefined,
  });
}

console.log(`Seeded ${TRANSACTIONS.length} transactions for ${DEMO_EMAIL}`);
console.log(`Sign in with:  ${DEMO_EMAIL}  /  ${DEMO_PASSWORD}`);
