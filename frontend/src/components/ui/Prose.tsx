import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* A deliberately small Markdown renderer.

   The Copilot writes in bold, bullets, inline code and the occasional link —
   nothing more. Rendering only that subset by hand keeps a parser and its
   sanitiser out of the bundle, and means no message can inject markup: every
   branch below emits text nodes or elements we construct ourselves. */

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={key} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={key}
          className="rounded-sm bg-ink/[0.08] px-1 py-0.5 font-mono text-[0.85em] text-ink"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={key} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2];
      // Only http(s) links are rendered as links; anything else stays text.
      if (/^https?:\/\//i.test(href)) {
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-copilot underline underline-offset-2 hover:no-underline"
          >
            {link[1]}
          </a>
        );
      }
      return <Fragment key={key}>{link[1]}</Fragment>;
    }

    return <Fragment key={key}>{part}</Fragment>;
  });
}

export function Prose({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');

  let list: string[] = [];
  let code: string[] | null = null;

  const flushList = () => {
    if (!list.length) return;
    const items = list;
    list = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-1.5 space-y-1 pl-4">
        {items.map((item, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-4 text-ink-3" aria-hidden>
              •
            </span>
            {renderInline(item, `li-${blocks.length}-${i}`)}
          </li>
        ))}
      </ul>,
    );
  };

  for (const [i, raw] of lines.entries()) {
    const line = raw.trimEnd();

    if (line.startsWith('```')) {
      if (code) {
        blocks.push(
          <pre
            key={`pre-${i}`}
            className="scroll-thin my-2 overflow-x-auto rounded-sm border border-rule bg-paper p-3 font-mono text-xs"
          >
            <code>{code.join('\n')}</code>
          </pre>,
        );
        code = null;
      } else {
        flushList();
        code = [];
      }
      continue;
    }

    if (code) {
      code.push(raw);
      continue;
    }

    const bullet = line.match(/^\s*[•\-*]\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }

    flushList();

    if (!line.trim()) {
      continue;
    }

    const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (numbered) {
      blocks.push(
        <p key={`n-${i}`} className="my-1 flex gap-2">
          <span className="figure shrink-0 text-ink-3">{numbered[1]}.</span>
          <span>{renderInline(numbered[2], `n-${i}`)}</span>
        </p>,
      );
      continue;
    }

    blocks.push(
      <p key={`p-${i}`} className="my-1.5 first:mt-0 last:mb-0">
        {renderInline(line, `p-${i}`)}
      </p>,
    );
  }

  flushList();
  if (code) {
    blocks.push(
      <pre
        key="pre-tail"
        className="scroll-thin my-2 overflow-x-auto rounded-sm border border-rule bg-paper p-3 font-mono text-xs"
      >
        <code>{code.join('\n')}</code>
      </pre>,
    );
  }

  return <div className={cn('text-[0.9375rem] leading-relaxed', className)}>{blocks}</div>;
}
