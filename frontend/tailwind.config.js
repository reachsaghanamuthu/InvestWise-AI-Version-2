/** @type {import('tailwindcss').Config} */

// Colours are declared as CSS custom properties (space-separated RGB triplets)
// in src/index.css so that light "paper" mode and dark "ink" mode swap by
// re-declaring variables rather than by doubling every utility class.
const token = (name) => `rgb(var(--iw-${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: token('paper'),      // the page itself
        sheet: token('sheet'),      // a document laid on the page
        stripe: token('stripe'),    // greenbar ledger row
        rule: token('rule'),        // hairlines, ruled lines
        ink: token('ink'),          // primary text
        'ink-2': token('ink-2'),    // secondary text
        'ink-3': token('ink-3'),    // faint text, placeholders
        loss: token('loss'),        // red pen — losses, corrections, the stamp
        gain: token('gain'),        // ledger green — profit
        copilot: token('copilot'),  // blue pen — the AI's annotations
        mark: token('mark'),        // turmeric — points, milestones, grades
      },
      fontFamily: {
        display: ['"Zilla Slab"', 'Georgia', 'serif'],
        sans: ['Hind', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Utility text — eyebrows, column heads, stamp lines
        stat: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.12em' }],
      },
      boxShadow: {
        // A document resting on the page, not a floating glassy card
        sheet: '0 1px 0 rgb(var(--iw-rule) / 1), 0 6px 18px -14px rgb(0 0 0 / 0.45)',
        lift: '0 10px 28px -18px rgb(0 0 0 / 0.55)',
        stamp: '0 0 0 2px rgb(var(--iw-loss) / 0.85)',
      },
      keyframes: {
        'stamp-down': {
          '0%': { opacity: '0', transform: 'rotate(-14deg) scale(2.4)' },
          '55%': { opacity: '1', transform: 'rotate(-8deg) scale(0.94)' },
          '75%': { transform: 'rotate(-8deg) scale(1.04)' },
          '100%': { opacity: '1', transform: 'rotate(-8deg) scale(1)' },
        },
        'ink-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'rule-draw': {
          from: { transform: 'scaleY(0)' },
          to: { transform: 'scaleY(1)' },
        },
        blink: {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '1' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'stamp-down': 'stamp-down 0.5s cubic-bezier(0.2, 1.2, 0.3, 1) both',
        'ink-in': 'ink-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'rule-draw': 'rule-draw 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        blink: 'blink 1.2s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
