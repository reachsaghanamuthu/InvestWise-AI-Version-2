import type { Holding, PortfolioSummary, Quote, Transaction } from '@/types';
import { daysBetween } from '@/lib/format';

/* Portfolio maths. Buys raise the position and the cost base; sells reduce
   both at the running average cost, which is how Indian brokerages report it
   and what the user will recognise from their own statement. */

const TYPE_LABEL: Record<string, string> = {
  stock: 'Stocks',
  mf: 'Mutual funds',
  etf: 'ETFs',
  bond: 'Bonds',
};

export function buildHoldings(transactions: Transaction[], quotes: Quote[]): Holding[] {
  const bySymbol = new Map<string, Quote>(quotes.map((q) => [q.symbol, q]));
  const ordered = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  const positions = new Map<
    string,
    { qty: number; cost: number; first: string; tx: Transaction }
  >();

  for (const tx of ordered) {
    const pos = positions.get(tx.symbol) ?? { qty: 0, cost: 0, first: tx.date, tx };
    if (tx.side === 'buy') {
      pos.qty += tx.quantity;
      pos.cost += tx.quantity * tx.price;
    } else {
      const avg = pos.qty > 0 ? pos.cost / pos.qty : tx.price;
      const sold = Math.min(tx.quantity, pos.qty);
      pos.qty -= sold;
      pos.cost -= sold * avg;
    }
    pos.tx = tx;
    positions.set(tx.symbol, pos);
  }

  const holdings: Holding[] = [];

  for (const [symbol, pos] of positions) {
    if (pos.qty <= 0.0001) continue; // fully exited — it lives in the autopsy, not the portfolio

    const quote = bySymbol.get(symbol);
    const avgCost = pos.cost / pos.qty;
    const price = quote?.price ?? avgCost;
    const value = pos.qty * price;
    const invested = pos.cost;

    holdings.push({
      symbol,
      name: quote?.name ?? pos.tx.name,
      type: pos.tx.type,
      sector: quote?.sector ?? 'Unclassified',
      quantity: +pos.qty.toFixed(4),
      avgCost,
      invested,
      price,
      value,
      pnl: value - invested,
      pnlPercent: invested > 0 ? ((value - invested) / invested) * 100 : 0,
      heldDays: daysBetween(pos.first),
      source: quote?.source ?? 'mock',
    });
  }

  return holdings.sort((a, b) => b.value - a.value);
}

function share(groups: Map<string, number>, total: number) {
  return [...groups.entries()]
    .map(([label, value]) => ({
      label,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function summarise(
  transactions: Transaction[],
  quotes: Quote[],
  now: Date = new Date(),
): PortfolioSummary {
  const holdings = buildHoldings(transactions, quotes);

  const invested = holdings.reduce((sum, h) => sum + h.invested, 0);
  const value = holdings.reduce((sum, h) => sum + h.value, 0);

  const byType = new Map<string, number>();
  const bySector = new Map<string, number>();
  for (const h of holdings) {
    const typeLabel = TYPE_LABEL[h.type] ?? h.type;
    byType.set(typeLabel, (byType.get(typeLabel) ?? 0) + h.value);
    bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + h.value);
  }

  const ranked = [...holdings].sort((a, b) => b.pnlPercent - a.pnlPercent);
  const month = now.toISOString().slice(0, 7);

  return {
    invested,
    value,
    pnl: value - invested,
    pnlPercent: invested > 0 ? ((value - invested) / invested) * 100 : 0,
    holdings,
    bestPerformer: ranked[0] ?? null,
    worstPerformer: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    allocation: share(byType, value),
    sectorAllocation: share(bySector, value),
    tradesThisMonth: transactions.filter((t) => t.date.startsWith(month)).length,
  };
}

/** Realised profit or loss on positions the user has already sold out of. */
export function realisedPnl(transactions: Transaction[]) {
  const ordered = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const running = new Map<string, { qty: number; cost: number }>();
  let realised = 0;

  for (const tx of ordered) {
    const pos = running.get(tx.symbol) ?? { qty: 0, cost: 0 };
    if (tx.side === 'buy') {
      pos.qty += tx.quantity;
      pos.cost += tx.quantity * tx.price;
    } else {
      const avg = pos.qty > 0 ? pos.cost / pos.qty : tx.price;
      const sold = Math.min(tx.quantity, pos.qty);
      realised += sold * (tx.price - avg);
      pos.qty -= sold;
      pos.cost -= sold * avg;
    }
    running.set(tx.symbol, pos);
  }

  return realised;
}

/** Rough brokerage drag — ₹20 or 0.03% a leg, the flat-fee model most student
    accounts are on. Used to price the cost of overtrading. */
export const brokerageCost = (transactions: Transaction[]) =>
  transactions.reduce((sum, t) => sum + Math.min(20, t.quantity * t.price * 0.0003) + 20, 0);
