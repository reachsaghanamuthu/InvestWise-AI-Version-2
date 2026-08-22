import raw from '@/data/stocks.json';
import type { InvestmentType, Quote } from '@/types';

/* The offline market. Real prices come from the backend (Finnhub → Alpha
   Vantage); this dataset is what keeps the demo standing when the API is rate
   limited, the key is missing, or the venue wifi gives up. Anything served
   from here is labelled `mock` all the way to the UI — we never dress it up as
   live. */

export interface Instrument {
  symbol: string;
  name: string;
  sector: string;
  type: InvestmentType;
  price: number;
  prevClose: number;
  peRatio: number | null;
  dividendYield: number | null;
  high52: number;
  low52: number;
  volatility: number;
}

export const INSTRUMENTS = (raw.stocks as Instrument[]).slice();

const BY_SYMBOL = new Map(INSTRUMENTS.map((s) => [s.symbol, s]));

export const findInstrument = (symbol: string) =>
  BY_SYMBOL.get(symbol.trim().toUpperCase()) ?? null;

/** Ranked lookup: exact symbol first, then symbol prefix, then name. */
export function searchInstruments(query: string, limit = 8): Instrument[] {
  const q = query.trim().toUpperCase();
  if (!q) return INSTRUMENTS.slice(0, limit);

  const scored = INSTRUMENTS.map((s) => {
    const name = s.name.toUpperCase();
    let score = -1;
    if (s.symbol === q) score = 100;
    else if (s.symbol.startsWith(q)) score = 80;
    else if (name.startsWith(q)) score = 60;
    else if (s.symbol.includes(q)) score = 40;
    else if (name.includes(q)) score = 30;
    return { s, score };
  }).filter((x) => x.score > 0);

  scored.sort((a, b) => b.score - a.score || a.s.symbol.localeCompare(b.s.symbol));
  return scored.slice(0, limit).map((x) => x.s);
}

/* A slow, smooth intraday wobble so a two-minute demo shows a moving tape
   without the numbers ever looking random. Same minute → same price. */
function drift(instrument: Instrument, at: number) {
  const minutes = Math.floor(at / 60_000);
  const seed = instrument.symbol.length + instrument.symbol.charCodeAt(0);
  const wave = Math.sin((minutes + seed) / 7) * 0.35 + Math.sin((minutes + seed) / 23) * 0.65;
  return wave * instrument.volatility * 0.4; // percent
}

export function mockQuote(symbol: string, at: number = Date.now()): Quote | null {
  const s = findInstrument(symbol);
  if (!s) return null;

  const price = +(s.price * (1 + drift(s, at) / 100)).toFixed(2);
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
    asOf: at,
  };
}

export const mockQuotes = (symbols: string[]) =>
  symbols.map((s) => mockQuote(s)).filter((q): q is Quote => q !== null);

/** The benchmark every report compares against. */
export function niftyLevel(at: number = Date.now()) {
  const base = 25_140;
  const minutes = Math.floor(at / 60_000);
  const pct = Math.sin(minutes / 31) * 0.42;
  return { level: +(base * (1 + pct / 100)).toFixed(2), changePercent: +pct.toFixed(2) };
}

/** Where a price sits in its 52-week band, 0 (at the low) to 1 (at the high). */
export function bandPosition(q: Pick<Quote, 'price' | 'high52' | 'low52'>) {
  const span = q.high52 - q.low52;
  if (span <= 0) return 0.5;
  return Math.min(1, Math.max(0, (q.price - q.low52) / span));
}
