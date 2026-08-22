import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { InvestmentType, Side, Transaction } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Bits';
import { searchInstruments, findInstrument, mockQuote } from '@/lib/market';
import { money } from '@/lib/format';

/* Add or edit one transaction.

   The symbol field completes against the bundled instrument list, and picking
   a suggestion pre-fills today's price — so the common case (recording a trade
   you just made) is three fields instead of six. */

const TODAY = new Date().toISOString().slice(0, 10);

export function AddTransaction({
  open,
  onClose,
  onSubmit,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (tx: Omit<Transaction, 'id'>) => void;
  editing?: Transaction | null;
}) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('stock');
  const [side, setSide] = useState<Side>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(TODAY);
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSymbol(editing.symbol);
      setName(editing.name);
      setType(editing.type);
      setSide(editing.side);
      setQuantity(String(editing.quantity));
      setPrice(String(editing.price));
      setDate(editing.date);
      setNote(editing.note ?? '');
    } else {
      setSymbol('');
      setName('');
      setType('stock');
      setSide('buy');
      setQuantity('');
      setPrice('');
      setDate(TODAY);
      setNote('');
    }
    setTouched(false);
    setTimeout(() => firstFieldRef.current?.focus(), 20);
  }, [open, editing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const suggestions = useMemo(
    () => (symbol.trim().length >= 1 ? searchInstruments(symbol, 6) : []),
    [symbol],
  );

  const matched = findInstrument(symbol);
  const qtyNum = Number(quantity);
  const priceNum = Number(price);
  const total = qtyNum > 0 && priceNum > 0 ? qtyNum * priceNum : 0;

  const errors = {
    symbol: !symbol.trim() ? 'Which instrument?' : null,
    quantity: !(qtyNum > 0) ? 'Enter a quantity above zero.' : null,
    price: !(priceNum > 0) ? 'Enter the price you paid per unit.' : null,
    date: date > TODAY ? 'That date is in the future.' : null,
  };
  const valid = !Object.values(errors).some(Boolean);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;

    onSubmit({
      symbol: symbol.trim().toUpperCase(),
      name: name.trim() || matched?.name || symbol.trim().toUpperCase(),
      type,
      side,
      quantity: qtyNum,
      price: priceNum,
      date,
      note: note.trim() || undefined,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (!dialogRef.current?.contains(e.target as Node)) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-tx-title"
        className="scroll-thin max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-sm border border-rule bg-sheet shadow-lift sm:rounded-sm"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-rule bg-sheet px-4 py-3 sm:px-5">
          <div>
            <p className="eyebrow">{editing ? 'Edit entry' : 'New entry'}</p>
            <h2 id="add-tx-title" className="font-display text-lg font-semibold">
              {editing ? 'Edit this trade' : 'Record a trade'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm p-1.5 text-ink-3 hover:bg-ink/[0.06] hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-4 py-4 sm:px-5">
          {/* Buy / sell */}
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Trade side">
            {(['buy', 'sell'] as Side[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={side === s}
                onClick={() => setSide(s)}
                className={
                  'rounded-sm border px-3 py-2.5 text-sm font-medium capitalize transition-colors ' +
                  (side === s
                    ? s === 'buy'
                      ? 'border-gain bg-gain/10 text-gain'
                      : 'border-loss bg-loss/10 text-loss'
                    : 'border-rule text-ink-2 hover:border-ink/40')
                }
              >
                {s}
              </button>
            ))}
          </div>

          {/* Symbol with completion */}
          <div className="relative">
            <Input
              ref={firstFieldRef}
              label="Stock or fund"
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value.toUpperCase());
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
              placeholder="TCS, NIFTYBEES, HDFCBANK…"
              autoComplete="off"
              error={touched ? errors.symbol ?? undefined : undefined}
              hint={matched ? matched.name : 'Type a symbol or a company name.'}
            />

            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-sm border border-rule bg-sheet shadow-lift">
                {suggestions.map((s) => (
                  <li key={s.symbol}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSymbol(s.symbol);
                        setName(s.name);
                        setType(s.type);
                        const q = mockQuote(s.symbol);
                        if (q && !price) setPrice(q.price.toFixed(2));
                        setShowSuggestions(false);
                      }}
                      className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-ink/[0.05]"
                    >
                      <span className="min-w-0">
                        <span className="font-mono text-xs font-semibold">{s.symbol}</span>
                        <span className="ml-2 truncate text-xs text-ink-3">{s.name}</span>
                      </span>
                      <span className="figure shrink-0 text-xs text-ink-2">
                        ₹{s.price.toFixed(2)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="10"
              error={touched ? errors.quantity ?? undefined : undefined}
            />
            <Input
              label="Price per unit (₹)"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1712.35"
              error={touched ? errors.price ?? undefined : undefined}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              max={TODAY}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={touched ? errors.date ?? undefined : undefined}
            />
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as InvestmentType)}
            >
              <option value="stock">Stock</option>
              <option value="etf">ETF</option>
              <option value="mf">Mutual fund</option>
              <option value="bond">Bond</option>
            </Select>
          </div>

          <Input
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why did you make this trade?"
            hint="The autopsy quotes your own notes back to you. Be honest here."
          />

          {total > 0 && (
            <p className="border-t border-rule pt-3 text-sm text-ink-2">
              Total {side === 'buy' ? 'invested' : 'received'}:{' '}
              <span className="figure font-semibold text-ink">{money(total)}</span>
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" block onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" block>
              {editing ? 'Save changes' : 'Add to ledger'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
