/* Shared domain types. Kept deliberately small — this is an MVP, and every
   field here is one a screen actually renders. */

export type InvestmentType = 'stock' | 'mf' | 'etf' | 'bond';
export type Side = 'buy' | 'sell';
export type QuoteSource = 'finnhub' | 'alphavantage' | 'mock';

export interface User {
  id: string;
  name: string;
  email: string;
  college?: string;
  riskTolerance: 'low' | 'medium' | 'high';
  monthlyBudget: number;
  goal?: string;
}

export interface Transaction {
  id: string;
  symbol: string;
  name: string;
  type: InvestmentType;
  side: Side;
  quantity: number;
  price: number; // per unit, in rupees
  date: string; // ISO yyyy-mm-dd
  note?: string;
}

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

export interface Holding {
  symbol: string;
  name: string;
  type: InvestmentType;
  sector: string;
  quantity: number;
  avgCost: number;
  invested: number;
  price: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  heldDays: number;
  source: QuoteSource;
}

export interface PortfolioSummary {
  invested: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  holdings: Holding[];
  bestPerformer: Holding | null;
  worstPerformer: Holding | null;
  allocation: { label: string; value: number; percent: number }[];
  sectorAllocation: { label: string; value: number; percent: number }[];
  tradesThisMonth: number;
}

/* --- Copilot ----------------------------------------------------------- */

export type ChatRole = 'user' | 'copilot';

export interface RiskReading {
  score: number; // 1–10
  label: string;
  horizon: string;
  reasons: string[];
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  at: number;
  quotes?: Quote[];
  risk?: RiskReading;
  pending?: boolean;
  failed?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
}

/* --- Autopsy ----------------------------------------------------------- */

export type Severity = 'high' | 'medium' | 'low' | 'clear';

export interface PatternHit {
  code: string; // FINDING-01 … used as the report's numbering
  name: string;
  severity: Severity;
  confidence: number; // 0–1
  finding: string; // what we saw
  context: string; // the historical / market context
  advice: string; // what to do about it
  evidence: string[]; // specific trades that triggered it
  cost?: number; // rupees this pattern plausibly cost them
}

export interface ScoreRow {
  key: string;
  label: string;
  score: number; // 1–10
  previous: number | null;
  remark: string; // the Hinglish remark, written in red pen
  improve: string;
}

export interface AutopsyOverview {
  value: number;
  invested: number;
  monthPnl: number;
  monthPnlPercent: number;
  holdings: number;
  best: { symbol: string; pnlPercent: number } | null;
  worst: { symbol: string; pnlPercent: number } | null;
  niftyPercent: number;
  allocation: { label: string; percent: number }[];
}

export interface AutopsyReport {
  id: string;
  period: string; // "August 2026"
  generatedAt: number;
  grade: string; // B+, C, A- … the stamp
  overview: AutopsyOverview;
  patterns: PatternHit[];
  scores: ScoreRow[];
  narrative: string | null; // Claude's Hinglish write-up
  narrativeSource: 'ai' | 'offline';
}

export interface ScenarioOption {
  text: string;
  correct: boolean;
  explanation: string;
}

export interface Scenario {
  id: string;
  tag: string;
  title: string;
  situation: string;
  options: ScenarioOption[];
  points: number;
}

export interface Milestone {
  id: string;
  label: string;
  done: boolean;
}

export interface MonthPoint {
  month: string;
  value: number;
  emotionalControl: number;
  trades: number;
  vsNifty: number;
}
