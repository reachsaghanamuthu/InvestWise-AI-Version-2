import { cn } from '@/lib/cn';

/* The stamp.

   Every autopsy report ends with a grade, and the grade arrives the way a
   verdict arrives on a physical document — pressed on at an angle, slightly
   uneven, over the top of whatever was already printed there. It is the one
   loud element in the interface, so nothing else competes with it.

   `mix-blend-multiply` is what sells it on paper: the red sinks into the sheet
   instead of sitting on top. In dark mode that blend would swallow the ink, so
   there it lightens instead. */

interface StampProps {
  grade: string;
  period: string;
  className?: string;
  animate?: boolean;
}

export function Stamp({ grade, period, className, animate = true }: StampProps) {
  return (
    <div
      className={cn(
        'pointer-events-none select-none',
        'mix-blend-multiply dark:mix-blend-screen',
        animate && 'animate-stamp-down',
        className,
      )}
      style={{ transform: animate ? undefined : 'rotate(-8deg)' }}
      role="img"
      aria-label={`Behavioural grade ${grade} for ${period}`}
    >
      <div className="relative border-[3px] border-loss/80 px-4 py-2 text-loss">
        {/* The inner keyline that every rubber stamp has */}
        <div className="pointer-events-none absolute inset-[3px] border border-loss/50" />

        <div className="relative flex items-center gap-3">
          <div className="text-left">
            <div className="font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.2em]">
              Autopsy
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase leading-none tracking-[0.14em] opacity-80">
              {period}
            </div>
          </div>

          <div className="h-9 w-px bg-loss/50" />

          <div className="font-display text-4xl font-bold leading-none tracking-tight">{grade}</div>
        </div>
      </div>
    </div>
  );
}

/* A quieter relative used inline in lists, where a full stamp would shout. */
export function GradeMark({ grade, className }: { grade: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 min-w-7 items-center justify-center border-2 border-loss/70 px-1.5',
        'font-display text-sm font-bold text-loss',
        className,
      )}
    >
      {grade}
    </span>
  );
}
