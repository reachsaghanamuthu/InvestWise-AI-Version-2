import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* Market data.

   Finnhub first, Alpha Vantage second, bundled dataset last. Everything is
   cached for five minutes, which is what keeps a live demo comfortably inside
   Finnhub's 60-calls-per-minute free tier even with a page polling every two
   minutes.

   The `source` field travels all the way to the browser badge, so a quote that
   came from the offline file is never displayed as live. */

export type QuoteSource = 'finnhub' | 'alphavantage' | 'mock';

export interface Quote {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  high52: number;
  low52: number;
  peRatio: number | null;
  dividendYield: number | null;
  source: QuoteSource;
  asOf: number;
}

interface Instrument {
  symbol: string;
  name: string;
  sector: string;
  type: string;
  price: number;
  prevClose: number;
  peRatio: number | null;
  dividendYield: number | null;
  high52: number;
  low52: number;
  volatility: number;
}

const CACHE_TTL = 5 * 60 * 1000;
const FINNHUB = 'https://finnhub.io/api/v1';
const ALPHA = 'https://www.alphavantage.co/query';

const dataPath = resolve(process.cwd(), 'database', 'mockData.json');
const bundled = JSON.parse(readFileSync(dataPath, 'utf-8')) as { stocks: Instrument[] };

const BY_SYMBOL = new Map(bundled.stocks.map((s) => [s.symbol, s]));

class FinancialDataService {
  private cache = new Map<string, { quote: Quote; at: number }>();
  private inflight = new Map<string, Promise<Quote>>();

  /** Reported by /health so the UI can label the feed honestly at boot. */
  get liveCapable() {
    return Boolean(process.env.FINNHUB_API_KEY || process.env.ALPHA_VANTAGE_API_KEY);
  }

  search(query: string, limit = 8) {
    const q = query.trim().toUpperCase();
    if (!q) return bundled.stocks.slice(0, limit);

    return bundled.stocks
      .map((s) => {
        const name = s.name.toUpperCase();
        let score = -1;
        if (s.symbol === q) score = 100;
        else if (s.symbol.startsWith(q)) score = 80;
        else if (name.startsWith(q)) score = 60;
        else if (s.symbol.includes(q)) score = 40;
        else if (name.includes(q)) score = 30;
        return { s, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.s);
  }

  async getQuote(symbol: string): Promise<Quote> {
    const key = symbol.trim().toUpperCase();

    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL) return hit.quote;

    // Collapse concurrent requests for the same symbol into one upstream call.
    const existing = this.inflight.get(key);
    if (existing) return existing;

    const task = this.fetchQuote(key)
      .then((quote) => {
        this.cache.set(key, { quote, at: Date.now() });
        return quote;
      })
      .finally(() => this.inflight.delete(key));

    this.inflight.set(key, task);
    return task;
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()))].filter(Boolean);
    const results = await Promise.allSettled(unique.map((s) => this.getQuote(s)));
    return results
      .filter((r): r is PromiseFulfilledResult<Quote> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  private async fetchQuote(symbol: string): Promise<Quote> {
    if (process.env.FINNHUB_API_KEY) {
      try {
        return await this.fromFinnhub(symbol);
      } catch {
        /* fall through to Alpha Vantage */
      }
    }

    if (process.env.ALPHA_VANTAGE_API_KEY) {
      try {
        return await this.fromAlphaVantage(symbol);
      } catch {
        /* fall through to the bundled dataset */
      }
    }

    return this.fromBundled(symbol);
  }

  /* Finnhub quotes NSE symbols as SYMBOL.NS. The company profile and metrics
     endpoints are separate calls, so we only spend them when the quote itself
     came back with a usable price. */
  private async fromFinnhub(symbol: string): Promise<Quote> {
    const token = process.env.FINNHUB_API_KEY as string;
    const vendorSymbol = `${symbol}.NS`;

    const res = await fetch(
      `${FINNHUB}/quote?symbol=${encodeURIComponent(vendorSymbol)}&token=${token}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) throw new Error(`Finnhub ${res.status}`);

    const data = (await res.json()) as {
      c?: number; // current
      d?: number; // change
      dp?: number; // change percent
      h?: number;
      l?: number;
      pc?: number; // previous close
    };

    if (!data.c || data.c <= 0) throw new Error('Finnhub returned no price');

    const fallback = BY_SYMBOL.get(symbol);
    let high52 = fallback?.high52 ?? data.h ?? data.c;
    let low52 = fallback?.low52 ?? data.l ?? data.c;
    let peRatio = fallback?.peRatio ?? null;
    let dividendYield = fallback?.dividendYield ?? null;

    try {
      const metricRes = await fetch(
        `${FINNHUB}/stock/metric?symbol=${encodeURIComponent(vendorSymbol)}&metric=all&token=${token}`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (metricRes.ok) {
        const m = (await metricRes.json()) as {
          metric?: Record<string, number | undefined>;
        };
        high52 = m.metric?.['52WeekHigh'] ?? high52;
        low52 = m.metric?.['52WeekLow'] ?? low52;
        peRatio = m.metric?.peBasicExclExtraTTM ?? peRatio;
        dividendYield = m.metric?.dividendYieldIndicatedAnnual ?? dividendYield;
      }
    } catch {
      /* metrics are optional — the price is what matters */
    }

    return {
      symbol,
      name: fallback?.name ?? symbol,
      sector: fallback?.sector ?? 'Unclassified',
      price: +data.c.toFixed(2),
      change: +(data.d ?? 0).toFixed(2),
      changePercent: +(data.dp ?? 0).toFixed(2),
      high52: +Math.max(high52, data.c).toFixed(2),
      low52: +Math.min(low52, data.c).toFixed(2),
      peRatio: peRatio != null ? +Number(peRatio).toFixed(1) : null,
      dividendYield: dividendYield != null ? +Number(dividendYield).toFixed(2) : null,
      source: 'finnhub',
      asOf: Date.now(),
    };
  }

  private async fromAlphaVantage(symbol: string): Promise<Quote> {
    const key = process.env.ALPHA_VANTAGE_API_KEY as string;
    const res = await fetch(
      `${ALPHA}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(`${symbol}.BSE`)}&apikey=${key}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error(`Alpha Vantage ${res.status}`);

    const json = (await res.json()) as { 'Global Quote'?: Record<string, string> };
    const q = json['Global Quote'];
    const price = Number(q?.['05. price']);
    if (!price) throw new Error('Alpha Vantage returned no price');

    const fallback = BY_SYMBOL.get(symbol);
    const prev = Number(q?.['08. previous close']) || price;

    return {
      symbol,
      name: fallback?.name ?? symbol,
      sector: fallback?.sector ?? 'Unclassified',
      price: +price.toFixed(2),
      change: +(price - prev).toFixed(2),
      changePercent: +(((price - prev) / prev) * 100).toFixed(2),
      high52: fallback?.high52 ?? price,
      low52: fallback?.low52 ?? price,
      peRatio: fallback?.peRatio ?? null,
      dividendYield: fallback?.dividendYield ?? null,
      source: 'alphavantage',
      asOf: Date.now(),
    };
  }

  /* The offline tape. Deliberately identical to the frontend's fallback so the
     two never disagree about a price when both are running without keys. */
  private fromBundled(symbol: string): Quote {
    const s = BY_SYMBOL.get(symbol);
    if (!s) {
      const err = new Error(`Unknown symbol: ${symbol}`) as Error & { status?: number };
      err.status = 404;
      throw err;
    }

    const minutes = Math.floor(Date.now() / 60_000);
    const seed = s.symbol.length + s.symbol.charCodeAt(0);
    const wave = Math.sin((minutes + seed) / 7) * 0.35 + Math.sin((minutes + seed) / 23) * 0.65;
    const price = +(s.price * (1 + (wave * s.volatility * 0.4) / 100)).toFixed(2);
    const change = +(price - s.prevClose).toFixed(2);

    return {
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      price,
      change,
      changePercent: +((change / s.prevClose) * 100).toFixed(2),
      high52: Math.max(s.high52, price),
      low52: Math.min(s.low52, price),
      peRatio: s.peRatio,
      dividendYield: s.dividendYield,
      source: 'mock',
      asOf: Date.now(),
    };
  }
}

export const financialData = new FinancialDataService();
