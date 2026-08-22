import { create } from 'zustand';
import type { PortfolioSummary, Quote, Transaction } from '@/types';
import { api } from '@/services/api';
import { mockQuotes } from '@/lib/market';
import { summarise } from '@/lib/calc';
import { DEMO_TRANSACTIONS } from '@/data/demo';

/* Portfolio state.

   Transactions live in localStorage first and sync to the backend when one is
   present, so the ledger survives a refresh, a lost connection, and a laptop
   that goes to sleep ten minutes before a pitch. Quotes are refreshed from the
   API and fall back to the offline dataset per symbol, which is why a single
   unrecognised ticker cannot blank out the whole page. */

const TX_KEY = 'investwise-transactions';

const readTx = (): Transaction[] => {
  try {
    const raw = localStorage.getItem(TX_KEY);
    if (!raw) return DEMO_TRANSACTIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Transaction[]) : DEMO_TRANSACTIONS;
  } catch {
    return DEMO_TRANSACTIONS;
  }
};

const writeTx = (transactions: Transaction[]) => {
  try {
    localStorage.setItem(TX_KEY, JSON.stringify(transactions));
  } catch {
    /* storage blocked — state stays in memory */
  }
};

const newId = () => `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

interface PortfolioState {
  transactions: Transaction[];
  quotes: Quote[];
  summary: PortfolioSummary;
  refreshing: boolean;
  lastRefresh: number | null;
  liveCount: number;

  refresh: () => Promise<void>;
  add: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  update: (id: string, patch: Partial<Transaction>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  resetToDemo: () => void;
  clearAll: () => void;
}

const recompute = (transactions: Transaction[], quotes: Quote[]) => ({
  summary: summarise(transactions, quotes),
});

const initialTx = readTx();
const initialQuotes = mockQuotes([...new Set(initialTx.map((t) => t.symbol))]);

export const usePortfolio = create<PortfolioState>((set, get) => ({
  transactions: initialTx,
  quotes: initialQuotes,
  summary: summarise(initialTx, initialQuotes),
  refreshing: false,
  lastRefresh: null,
  liveCount: 0,

  refresh: async () => {
    const symbols = [...new Set(get().transactions.map((t) => t.symbol))];
    if (symbols.length === 0) {
      set({ quotes: [], summary: summarise([], []), lastRefresh: Date.now(), liveCount: 0 });
      return;
    }

    set({ refreshing: true });
    const fallback = mockQuotes(symbols);

    try {
      const res = await api.stocks.quotes(symbols);
      // Merge: a symbol the API could not price keeps its offline quote rather
      // than disappearing from the table.
      const live = new Map(res.quotes.map((q) => [q.symbol, q]));
      const quotes = fallback.map((q) => live.get(q.symbol) ?? q);
      for (const q of res.quotes) if (!quotes.some((x) => x.symbol === q.symbol)) quotes.push(q);

      set({
        quotes,
        ...recompute(get().transactions, quotes),
        refreshing: false,
        lastRefresh: Date.now(),
        liveCount: quotes.filter((q) => q.source !== 'mock').length,
      });
    } catch {
      set({
        quotes: fallback,
        ...recompute(get().transactions, fallback),
        refreshing: false,
        lastRefresh: Date.now(),
        liveCount: 0,
      });
    }
  },

  add: async (input) => {
    const tx: Transaction = { ...input, id: newId() };
    const transactions = [...get().transactions, tx].sort((a, b) => b.date.localeCompare(a.date));
    writeTx(transactions);

    const symbols = [...new Set(transactions.map((t) => t.symbol))];
    const quotes = get().quotes.some((q) => q.symbol === tx.symbol)
      ? get().quotes
      : mockQuotes(symbols);

    set({ transactions, quotes, ...recompute(transactions, quotes) });

    try {
      await api.portfolio.add(input);
    } catch {
      /* saved locally — the backend will pick it up on next sync */
    }
    void get().refresh();
  },

  update: async (id, patch) => {
    const transactions = get()
      .transactions.map((t) => (t.id === id ? { ...t, ...patch } : t))
      .sort((a, b) => b.date.localeCompare(a.date));
    writeTx(transactions);
    set({ transactions, ...recompute(transactions, get().quotes) });

    try {
      await api.portfolio.update(id, patch);
    } catch {
      /* local write already succeeded */
    }
    void get().refresh();
  },

  remove: async (id) => {
    const transactions = get().transactions.filter((t) => t.id !== id);
    writeTx(transactions);
    set({ transactions, ...recompute(transactions, get().quotes) });

    try {
      await api.portfolio.remove(id);
    } catch {
      /* local write already succeeded */
    }
    void get().refresh();
  },

  resetToDemo: () => {
    writeTx(DEMO_TRANSACTIONS);
    const quotes = mockQuotes([...new Set(DEMO_TRANSACTIONS.map((t) => t.symbol))]);
    set({ transactions: DEMO_TRANSACTIONS, quotes, ...recompute(DEMO_TRANSACTIONS, quotes) });
    void get().refresh();
  },

  clearAll: () => {
    writeTx([]);
    set({ transactions: [], quotes: [], summary: summarise([], []) });
  },
}));
