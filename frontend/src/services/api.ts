import type { AutopsyReport, ChatMessage, Quote, Transaction, User } from '@/types';

/* HTTP client.

   Every call is written to fail softly: the stores that use it always have a
   local answer ready, so a missing key or a dead backend degrades the app to
   offline data instead of to an error screen. `VITE_DEMO_MODE=true` skips the
   network entirely. */

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';
export const DEMO_MODE = (import.meta.env.VITE_DEMO_MODE as string | undefined) === 'true';

const TOKEN_KEY = 'investwise-token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked — session stays in memory only */
  }
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Set to false the first time the backend fails to answer, so the UI can say
    so honestly instead of retrying into a spinner. */
export let backendReachable: boolean | null = DEMO_MODE ? false : null;

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 12_000): Promise<T> {
  if (DEMO_MODE) throw new ApiError('Demo mode — network calls disabled', 0);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const token = getToken();

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

    backendReachable = true;

    const body = await res.text();
    const parsed = body ? JSON.parse(body) : null;

    if (!res.ok) {
      throw new ApiError(parsed?.error ?? parsed?.message ?? res.statusText, res.status);
    }
    return parsed as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    backendReachable = false;
    throw new ApiError(
      err instanceof Error && err.name === 'AbortError' ? 'Request timed out' : 'Backend unreachable',
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CopilotResponse {
  text: string;
  quotes?: Quote[];
  source: 'ai' | 'offline';
}

export const api = {
  ping: () => request<{ ok: boolean; live: boolean }>('/health', {}, 4000),

  auth: {
    signup: (body: { name: string; email: string; password: string; college?: string }) =>
      request<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request<{ user: User }>('/auth/me'),
  },

  stocks: {
    quote: (symbol: string) => request<Quote>(`/stocks/${encodeURIComponent(symbol)}`),
    quotes: (symbols: string[]) =>
      request<{ quotes: Quote[] }>(`/stocks?symbols=${encodeURIComponent(symbols.join(','))}`),
    search: (q: string) =>
      request<{ results: { symbol: string; name: string; sector: string }[] }>(
        `/stocks/search?q=${encodeURIComponent(q)}`,
      ),
  },

  copilot: {
    send: (body: { messages: Pick<ChatMessage, 'role' | 'text'>[]; portfolio?: unknown }) =>
      request<CopilotResponse>('/copilot/chat', { method: 'POST', body: JSON.stringify(body) }, 45_000),
  },

  portfolio: {
    list: () => request<{ transactions: Transaction[] }>('/portfolio'),
    add: (tx: Omit<Transaction, 'id'>) =>
      request<{ transaction: Transaction }>('/portfolio', { method: 'POST', body: JSON.stringify(tx) }),
    update: (id: string, tx: Partial<Transaction>) =>
      request<{ transaction: Transaction }>(`/portfolio/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(tx),
      }),
    remove: (id: string) => request<{ ok: true }>(`/portfolio/${id}`, { method: 'DELETE' }),
  },

  autopsy: {
    generate: (body: { transactions: Transaction[]; report: AutopsyReport }) =>
      request<{ narrative: string }>(
        '/autopsy/narrative',
        { method: 'POST', body: JSON.stringify(body) },
        60_000,
      ),
  },
};

/** One-shot probe used at boot so the header can show a truthful data source. */
export async function probeBackend() {
  if (DEMO_MODE) return { online: false, live: false };
  try {
    const res = await api.ping();
    return { online: true, live: res.live };
  } catch {
    return { online: false, live: false };
  }
}
