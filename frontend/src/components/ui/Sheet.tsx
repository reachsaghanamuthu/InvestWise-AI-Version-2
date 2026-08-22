import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* A sheet is a document laid on the ledger page: square corners, a hairline
   border, and a header that reads like the top of a form rather than a card
   title. */

export function Sheet({
  children,
  className,
  ruled,
}: {
  children: ReactNode;
  className?: string;
  ruled?: boolean;
}) {
  return <div className={cn('sheet', ruled && 'ruled', className)}>{children}</div>;
}

export function SheetHead({
  title,
  eyebrow,
  action,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h3 className="truncate text-base font-semibold leading-tight">{title}</h3>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SheetBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-4 py-4 sm:px-5', className)}>{children}</div>;
}

/* An empty state is an instruction, not an apology. */
export function Empty({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-ink-3">{icon}</div>}
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-ink-2">{hint}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
