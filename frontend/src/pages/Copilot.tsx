import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Trash2 } from 'lucide-react';
import { Message } from '@/components/Copilot/Message';
import { Composer } from '@/components/Copilot/Composer';
import { Button } from '@/components/ui/Button';
import { useCopilot } from '@/store/useCopilot';
import { usePortfolio } from '@/store/usePortfolio';
import { useAuth } from '@/store/useAuth';
import { QUICK_REPLIES } from '@/lib/copilot-offline';
import { cn } from '@/lib/cn';

/* The Copilot screen.

   A transcript column with the chat list beside it. The list collapses on
   desktop and hides entirely on mobile, because on a phone the conversation is
   the only thing that should be on screen. */

export default function CopilotPage() {
  const [params, setParams] = useSearchParams();
  const [showHistory, setShowHistory] = useState(false);

  const { chats, activeId, sending, send, newChat, selectChat, deleteChat, clearHistory } =
    useCopilot();
  const summary = usePortfolio((s) => s.summary);
  const user = useAuth((s) => s.user);

  const active = chats.find((c) => c.id === activeId) ?? chats[0];
  const endRef = useRef<HTMLDivElement>(null);
  const askedRef = useRef<string | null>(null);

  // A question handed over from the dashboard is asked once, then cleared from
  // the URL so a refresh does not re-send it.
  useEffect(() => {
    const q = params.get('q');
    if (!q || askedRef.current === q) return;
    askedRef.current = q;
    void send(q, summary);
    setParams({}, { replace: true });
  }, [params, send, summary, setParams]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [active?.messages.length, sending]);

  const showQuickReplies = (active?.messages.filter((m) => m.role === 'user').length ?? 0) === 0;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* --- Chat list ---------------------------------------------------- */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-rule bg-sheet transition-[width] duration-200 lg:flex',
          showHistory ? 'w-64' : 'w-0 overflow-hidden border-r-0',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-rule px-3 py-3">
          <p className="eyebrow">Chats</p>
          <button
            onClick={() => clearHistory(user?.name)}
            className="rounded-sm p-1 text-ink-3 hover:text-loss"
            aria-label="Clear all chats"
            title="Clear all chats"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <div className="p-2">
          <Button variant="outline" size="sm" block onClick={() => newChat(user?.name)}>
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
            New chat
          </Button>
        </div>

        <ul className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {chats.map((c) => (
            <li key={c.id} className="group relative">
              <button
                onClick={() => selectChat(c.id)}
                className={cn(
                  'w-full truncate rounded-sm px-2.5 py-2 pr-8 text-left text-sm transition-colors',
                  c.id === activeId
                    ? 'bg-ink/[0.07] font-medium text-ink'
                    : 'text-ink-2 hover:bg-ink/[0.04]',
                )}
              >
                {c.title}
              </button>
              <button
                onClick={() => deleteChat(c.id)}
                className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded-sm p-1 text-ink-3 hover:text-loss group-hover:block"
                aria-label={`Delete chat: ${c.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* --- Transcript --------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="hidden rounded-sm p-1.5 text-ink-3 hover:bg-ink/[0.06] hover:text-ink lg:inline-flex"
              aria-label={showHistory ? 'Hide chat list' : 'Show chat list'}
            >
              {showHistory ? (
                <PanelLeftClose className="h-4 w-4" aria-hidden />
              ) : (
                <PanelLeftOpen className="h-4 w-4" aria-hidden />
              )}
            </button>
            <div className="min-w-0">
              <p className="eyebrow">Investment Copilot</p>
              <h1 className="truncate text-base font-semibold leading-tight">
                {active?.title ?? 'New chat'}
              </h1>
            </div>
          </div>

          <Button variant="quiet" size="sm" onClick={() => newChat(user?.name)}>
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">New chat</span>
          </Button>
        </header>

        <div className="scroll-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 sm:px-6">
            {active?.messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t border-rule bg-paper px-4 py-3 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {showQuickReplies && (
              <div className="scroll-thin -mx-1 mb-2.5 flex gap-2 overflow-x-auto px-1 pb-1">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => void send(q, summary)}
                    className="shrink-0 whitespace-nowrap rounded-sm border border-rule px-2.5 py-1.5 text-xs text-ink-2 transition-colors hover:border-copilot/50 hover:bg-copilot/[0.06] hover:text-ink"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <Composer onSend={(text) => void send(text, summary)} disabled={sending} />
          </div>
        </div>
      </div>
    </div>
  );
}
