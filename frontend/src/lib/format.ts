/* Formatting helpers. Rupees are the app's only currency, so the ₹ helper is
   the one every screen reaches for. */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹12,340 — for totals and anything that reads as a headline figure. */
export const money = (n: number) => inr.format(Math.round(n));

/** ₹1,234.50 — for unit prices, where the paise matter. */
export const price = (n: number) => inrPaise.format(n);

/** +4.2% / −1.8% — always signed, so the direction reads before the number. */
export const pct = (n: number, digits = 1) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(digits)}%`;

/** +₹430 / −₹120 */
export const signedMoney = (n: number) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${money(Math.abs(n))}`;

export const compact = (n: number) =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const shortDate = (iso: string | number) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

export const longDate = (iso: string | number) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export const clockTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export const monthLabel = (d: Date) =>
  d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

export const daysBetween = (from: string | number, to: number = Date.now()) =>
  Math.max(0, Math.floor((to - new Date(from).getTime()) / 86_400_000));

/** "3 weeks", "5 months" — how long something has been held, in plain words. */
export function heldFor(days: number) {
  if (days < 1) return 'today';
  if (days < 7) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 60) return `${Math.round(days / 7)} week${Math.round(days / 7) === 1 ? '' : 's'}`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
