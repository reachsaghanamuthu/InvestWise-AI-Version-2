import { useEffect, useState } from 'react';
import { Radio, WifiOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { probeBackend } from '@/services/api';
import { usePortfolio } from '@/store/usePortfolio';
import { clockTime } from '@/lib/format';

/* Where the numbers came from.

   A prototype that quietly serves cached demo prices while implying a live
   feed is the one thing that would actually cost credibility in a pitch. This
   badge states the truth in the corner of every screen: live, or offline
   dataset, and when it last updated. */

export function DataSourceBadge({ compact, className }: { compact?: boolean; className?: string }) {
  const [live, setLive] = useState<boolean | null>(null);
  const liveCount = usePortfolio((s) => s.liveCount);
  const lastRefresh = usePortfolio((s) => s.lastRefresh);

  useEffect(() => {
    let cancelled = false;
    probeBackend().then((res) => {
      if (!cancelled) setLive(res.online && res.live);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLive = live === true || liveCount > 0;
  const label = live === null ? 'Checking feed' : isLive ? 'Live market data' : 'Offline dataset';

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-sm',
          isLive ? 'text-gain' : 'text-ink-3',
          className,
        )}
        title={label}
      >
        {isLive ? (
          <Radio className="h-4 w-4" aria-hidden />
        ) : (
          <WifiOff className="h-4 w-4" aria-hidden />
        )}
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 px-1', className)}>
      <span
        className={cn(
          'relative flex h-1.5 w-1.5 shrink-0 rounded-full',
          isLive ? 'bg-gain' : 'bg-ink-3',
        )}
        aria-hidden
      >
        {isLive && (
          <span className="absolute inset-0 animate-ping rounded-full bg-gain opacity-60" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-mono text-stat uppercase text-ink-2">{label}</span>
        {lastRefresh && (
          <span className="block truncate font-mono text-[0.625rem] text-ink-3">
            {clockTime(lastRefresh)}
          </span>
        )}
      </span>
    </div>
  );
}
