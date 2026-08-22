import type { ChatMessage } from '@/types';
import { Prose } from '@/components/ui/Prose';
import { RiskBlock, StockCard } from '@/components/Copilot/StockCard';
import { Spinner } from '@/components/ui/Bits';
import { clockTime } from '@/lib/format';
import { cn } from '@/lib/cn';

/* Messages are not bubbles.

   The Copilot writes in the margin, in blue pen — a rule down the left and the
   text beside it, the way a senior would annotate your notebook. The user's own
   lines sit on a tinted block on the right so the two hands never blur. */

export function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-sm bg-ink/[0.07] px-3.5 py-2.5 sm:max-w-[75%]">
          <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{message.text}</p>
          <p className="mt-1 text-right font-mono text-[0.625rem] text-ink-3">
            {clockTime(message.at)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-ink-in border-l-2 border-copilot/50 pl-3.5 sm:pl-4">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-mono text-stat font-semibold uppercase text-copilot">Copilot</span>
        {message.failed && (
          <span className="font-mono text-[0.625rem] uppercase tracking-wider text-ink-3">
            offline reply
          </span>
        )}
        {!message.pending && (
          <span className="font-mono text-[0.625rem] text-ink-3">{clockTime(message.at)}</span>
        )}
      </div>

      {message.pending ? (
        <Spinner label="Soch raha hoon…" />
      ) : (
        <>
          <Prose text={message.text} />

          {(message.quotes?.length || message.risk) && (
            <div
              className={cn(
                'mt-3 grid gap-2.5',
                (message.quotes?.length ?? 0) > 1 ? 'sm:grid-cols-2' : 'max-w-sm',
              )}
            >
              {message.quotes?.map((q) => (
                <StockCard key={q.symbol} quote={q} compact={(message.quotes?.length ?? 0) > 1} />
              ))}
              {message.risk && <RiskBlock risk={message.risk} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
