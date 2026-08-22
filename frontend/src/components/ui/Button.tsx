import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/* Buttons are squared off, like a form control on a printed sheet. The primary
   action is solid ink; the destructive one is the red pen. */

type Variant = 'primary' | 'outline' | 'quiet' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink/90 active:bg-ink',
  outline: 'border border-ink/25 text-ink hover:border-ink/60 hover:bg-ink/[0.04]',
  quiet: 'text-ink-2 hover:bg-ink/[0.06] hover:text-ink',
  danger: 'border border-loss/40 text-loss hover:bg-loss/10',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-[0.9375rem]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, block, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-sm font-medium',
        'transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
