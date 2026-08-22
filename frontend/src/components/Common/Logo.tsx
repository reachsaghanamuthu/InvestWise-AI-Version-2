import { cn } from '@/lib/cn';

/* The mark is the page itself: a ruled sheet with the red margin line down the
   left, which is the same device the app uses to organise every screen. */

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-6 w-6', className)} aria-hidden focusable="false">
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="1"
        className="fill-none stroke-current"
        strokeWidth="1.6"
      />
      <line
        x1="8"
        y1="2.5"
        x2="8"
        y2="21.5"
        className="stroke-loss"
        strokeWidth="1.6"
      />
      <line x1="11" y1="8" x2="18.5" y2="8" className="stroke-current" strokeWidth="1.4" opacity="0.55" />
      <line x1="11" y1="12" x2="18.5" y2="12" className="stroke-current" strokeWidth="1.4" opacity="0.55" />
      <line x1="11" y1="16" x2="15" y2="16" className="stroke-current" strokeWidth="1.4" opacity="0.55" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Logo className="h-6 w-6 shrink-0 text-ink" />
      <span className="font-display text-[0.9375rem] font-bold tracking-tight">
        InvestWise<span className="text-loss"> AI</span>
      </span>
    </span>
  );
}
