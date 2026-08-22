import { create } from 'zustand';
import type { ChatMessage, Conversation, PortfolioSummary } from '@/types';
import { api } from '@/services/api';
import { greeting, offlineReply, riskOf } from '@/lib/copilot-offline';
import { mockQuote } from '@/lib/market';

/* Copilot state.

   Claude writes the replies. If that call fails for any reason, the offline
   brain answers instead and the message is tagged `offline` in the transcript,
   so the person can always tell which one they are talking to. */

const KEY = 'investwise-chats';

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const readChats = (): Conversation[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length ? (parsed as Conversation[]) : [];
  } catch {
    return [];
  }
};

const writeChats = (chats: Conversation[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(chats.slice(0, 25)));
  } catch {
    /* storage blocked */
  }
};

const freshChat = (name?: string): Conversation => ({
  id: newId(),
  title: 'New chat',
  createdAt: Date.now(),
  messages: [greeting(name)],
});

/** The first user message becomes the chat's name in the sidebar. */
const titleFrom = (text: string) =>
  text.replace(/\s+/g, ' ').trim().slice(0, 42) + (text.length > 42 ? '…' : '');

interface CopilotState {
  chats: Conversation[];
  activeId: string;
  sending: boolean;
  lastSource: 'ai' | 'offline' | null;

  active: () => Conversation;
  newChat: (name?: string) => void;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  clearHistory: (name?: string) => void;
  send: (text: string, summary: PortfolioSummary | null) => Promise<void>;
}

const seed = readChats();
const initial = seed.length ? seed : [freshChat()];

export const useCopilot = create<CopilotState>((set, get) => ({
  chats: initial,
  activeId: initial[0].id,
  sending: false,
  lastSource: null,

  active: () => get().chats.find((c) => c.id === get().activeId) ?? get().chats[0],

  newChat: (name) => {
    const chat = freshChat(name);
    const chats = [chat, ...get().chats];
    writeChats(chats);
    set({ chats, activeId: chat.id });
  },

  selectChat: (id) => set({ activeId: id }),

  deleteChat: (id) => {
    const remaining = get().chats.filter((c) => c.id !== id);
    const chats = remaining.length ? remaining : [freshChat()];
    writeChats(chats);
    set({ chats, activeId: get().activeId === id ? chats[0].id : get().activeId });
  },

  clearHistory: (name) => {
    const chats = [freshChat(name)];
    writeChats(chats);
    set({ chats, activeId: chats[0].id });
  },

  send: async (text, summary) => {
    const trimmed = text.trim();
    if (!trimmed || get().sending) return;

    const userMsg: ChatMessage = { id: newId(), role: 'user', text: trimmed, at: Date.now() };
    const pendingId = newId();
    const pending: ChatMessage = {
      id: pendingId,
      role: 'copilot',
      text: '',
      at: Date.now(),
      pending: true,
    };

    const withUser = get().chats.map((c) =>
      c.id === get().activeId
        ? {
            ...c,
            title: c.messages.some((m) => m.role === 'user') ? c.title : titleFrom(trimmed),
            messages: [...c.messages, userMsg, pending],
          }
        : c,
    );
    set({ chats: withUser, sending: true });

    const history = (get().active().messages ?? [])
      .filter((m) => !m.pending && m.id !== 'greeting')
      .slice(-12)
      .map((m) => ({ role: m.role, text: m.text }));

    let reply: ChatMessage;

    try {
      const res = await api.copilot.send({
        messages: [...history, { role: 'user', text: trimmed }],
        portfolio: summary
          ? {
              value: Math.round(summary.value),
              invested: Math.round(summary.invested),
              pnlPercent: +summary.pnlPercent.toFixed(2),
              holdings: summary.holdings.map((h) => ({
                symbol: h.symbol,
                sector: h.sector,
                quantity: h.quantity,
                avgCost: +h.avgCost.toFixed(2),
                pnlPercent: +h.pnlPercent.toFixed(2),
                heldDays: h.heldDays,
              })),
              sectorAllocation: summary.sectorAllocation.map((s) => ({
                sector: s.label,
                percent: +s.percent.toFixed(1),
              })),
              tradesThisMonth: summary.tradesThisMonth,
            }
          : null,
      });

      // The model names tickers in prose; we attach the live cards ourselves so
      // the metrics on screen always come from market data, never from the LLM.
      const mentioned = [...new Set((res.text.match(/\b[A-Z][A-Z&-]{2,11}\b/g) ?? []).slice(0, 3))]
        .map((s) => mockQuote(s))
        .filter((q): q is NonNullable<typeof q> => q !== null);
      const quotes = res.quotes?.length ? res.quotes : mentioned;

      reply = {
        id: pendingId,
        role: 'copilot',
        text: res.text,
        at: Date.now(),
        quotes: quotes.length ? quotes : undefined,
        risk: quotes.length === 1 ? riskOf(quotes[0]) : undefined,
      };
      set({ lastSource: res.source });
    } catch {
      const offline = offlineReply(trimmed, summary);
      reply = {
        id: pendingId,
        role: 'copilot',
        text: offline.text,
        at: Date.now(),
        quotes: offline.quotes,
        risk: offline.risk,
        failed: true,
      };
      set({ lastSource: 'offline' });
    }

    const chats = get().chats.map((c) =>
      c.id === get().activeId
        ? { ...c, messages: c.messages.map((m) => (m.id === pendingId ? reply : m)) }
        : c,
    );
    writeChats(chats);
    set({ chats, sending: false });
  },
}));
