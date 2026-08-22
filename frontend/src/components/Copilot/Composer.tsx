import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, SendHorizontal } from 'lucide-react';
import { COMMANDS } from '@/lib/copilot-offline';
import { cn } from '@/lib/cn';

/* The composer.

   Two affordances beyond a plain input: slash commands complete as you type,
   and dictation is offered only when the browser actually supports it — a mic
   button that does nothing is worse than no mic button. */

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = 'en-IN'; // handles Hinglish far better than en-US
  rec.interimResults = false;
  rec.continuous = false;
  return rec;
}

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState('');
  const [listening, setListening] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSpeechAvailable(getRecognition() !== null);
    return () => recRef.current?.stop();
  }, []);

  // Grow with the content, up to a sensible ceiling.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const suggestions =
    value.startsWith('/') && !value.includes(' ')
      ? COMMANDS.filter((c) => c.cmd.startsWith(value.toLowerCase()))
      : [];

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  };

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = getRecognition();
    if (!rec) return;
    recRef.current = rec;

    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      setValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    rec.start();
    setListening(true);
  };

  return (
    <div className="relative">
      {suggestions.length > 0 && (
        <ul className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-sm border border-rule bg-sheet shadow-lift">
          {suggestions.map((c) => (
            <li key={c.cmd}>
              <button
                type="button"
                onClick={() => {
                  setValue(`${c.cmd} `);
                  areaRef.current?.focus();
                }}
                className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm hover:bg-ink/[0.05]"
              >
                <code className="font-mono text-xs font-semibold text-copilot">{c.cmd}</code>
                {c.args && <span className="font-mono text-xs text-ink-3">{c.args}</span>}
                <span className="ml-auto truncate text-xs text-ink-3">{c.help}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2 rounded-sm border border-rule bg-sheet p-2 focus-within:border-ink">
        <textarea
          ref={areaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Kuch bhi pooch — ya /stock TCS type kar"
          aria-label="Message the Copilot"
          className="scroll-thin max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-[0.9375rem] leading-relaxed text-ink placeholder:text-ink-3 focus:outline-none"
        />

        {speechAvailable && (
          <button
            type="button"
            onClick={toggleMic}
            aria-label={listening ? 'Stop dictation' : 'Dictate a message'}
            aria-pressed={listening}
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm transition-colors',
              listening ? 'bg-loss/12 text-loss' : 'text-ink-3 hover:bg-ink/[0.06] hover:text-ink',
            )}
          >
            {listening ? <MicOff className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
          </button>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || disabled}
          aria-label="Send message"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-ink text-paper transition-opacity hover:opacity-90 disabled:opacity-35"
        >
          <SendHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <p className="mt-1.5 px-1 text-[0.6875rem] text-ink-3">
        Educational only. The Copilot never guarantees a return or gives a target price.
      </p>
    </div>
  );
}
