import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';
import { pct, signedMoney } from '@/lib/format';

/* The small parts: chips, meters, form controls, skeletons. Each does exactly
   one job. */

/* --- Chip -------------------------------------------------------------- */

type Tone = 'neutral' | 'gain' | 'loss' | 'copilot' | 'mark';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink/[0.07] text-ink-2',
  gain: 'bg-gain/12 text-gain',
  loss: 'bg-loss/12 text-loss',
  copilot: 'bg-copilot/12 text-copilot',
  mark: 'bg-mark/15 text-mark',
};

export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return <span className={cn('chip', TONES[tone], className)}>{children}</span>;
}

/** A signed number that colours itself. Used everywhere P&L appears. */
export function Delta({
  value,
  percent,
  className,
}: {
  value?: number;
  percent?: number;
  className?: string;
}) {
  const basis = value ?? percent ?? 0;
  return (
    <span
      className={cn(
        'figure font-medium',
        basis > 0 ? 'text-gain' : basis < 0 ? 'text-loss' : 'text-ink-2',
        className,
      )}
    >
      {value !== undefined && signedMoney(value)}
      {value !== undefined && percent !== undefined && ' · '}
      {percent !== undefined && pct(percent)}
    </span>
  );
}

/* --- Meter ------------------------------------------------------------- */

/** A score out of ten, drawn as a filled rule. Colour encodes the band, and
    the number is always present for anyone who cannot rely on colour. */
export function Meter({ score, max = 10 }: { score: number; max?: number }) {
  const ratio = Math.max(0, Math.min(1, score / max));
  const tone = score >= 8 ? 'bg-gain' : score >= 5 ? 'bg-mark' : 'bg-loss';

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.09]"
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${score} out of ${max}`}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tone)}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

/* --- Form controls ----------------------------------------------------- */

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }
>(function Input({ label, hint, error, className, id, ...props }, ref) {
  const auto = useId();
  const inputId = id ?? auto;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${inputId}-note` : undefined}
        className={cn('field', error && 'border-loss focus:border-loss focus:ring-loss', className)}
        {...props}
      />
      {(error || hint) && (
        <p id={`${inputId}-note`} className={cn('mt-1 text-xs', error ? 'text-loss' : 'text-ink-3')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { label?: string }
>(function Select({ label, className, id, children, ...props }, ref) {
  const auto = useId();
  const selectId = id ?? auto;

  return (
    <div>
      {label && (
        <label htmlFor={selectId} className="field-label">
          {label}
        </label>
      )}
      <select ref={ref} id={selectId} className={cn('field appearance-none pr-8', className)} {...props}>
        {children}
      </select>
    </div>
  );
});

/* --- Loading ----------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skel', className)} aria-hidden />;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-2">
      <span className="inline-flex gap-1" aria-hidden>
        <i className="h-1.5 w-1.5 animate-blink rounded-full bg-current" />
        <i className="h-1.5 w-1.5 animate-blink rounded-full bg-current [animation-delay:0.2s]" />
        <i className="h-1.5 w-1.5 animate-blink rounded-full bg-current [animation-delay:0.4s]" />
      </span>
      {label && <span>{label}</span>}
    </div>
  );
}

/* --- Tabs -------------------------------------------------------------- */

export interface TabDef {
  id: string;
  label: string;
  badge?: string | number;
}

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn('scroll-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-px', className)}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              'shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors',
              selected
                ? 'border-loss font-semibold text-ink'
                : 'border-transparent text-ink-2 hover:border-rule hover:text-ink',
            )}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className="figure ml-1.5 text-xs text-ink-3">{tab.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
