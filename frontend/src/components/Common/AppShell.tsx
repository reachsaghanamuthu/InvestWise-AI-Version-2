import { type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BookOpenCheck,
  LayoutGrid,
  LogOut,
  MessageSquareText,
  Moon,
  Settings,
  Stethoscope,
  Sun,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/store/useTheme';
import { useAuth } from '@/store/useAuth';
import { initials } from '@/lib/format';
import { Wordmark } from '@/components/Common/Logo';
import { DataSourceBadge } from '@/components/Common/DataSourceBadge';

/* The shell.

   On desktop the navigation is the spine of the book — a narrow rail with the
   red margin rule between it and the page. On a phone it becomes a bottom bar,
   because that is where a student's thumb already is. */

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/app/copilot', label: 'Copilot', icon: MessageSquareText, end: false },
  { to: '/app/portfolio', label: 'Portfolio', icon: Wallet, end: false },
  { to: '/app/autopsy', label: 'Autopsy', icon: Stethoscope, end: false },
] as const;

function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <button
      onClick={toggle}
      className={cn(
        'inline-flex items-center gap-2 rounded-sm text-ink-2 transition-colors hover:bg-ink/[0.06] hover:text-ink',
        compact ? 'h-9 w-9 justify-center' : 'h-9 w-full px-2.5 text-sm',
      )}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {!compact && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const { pathname } = useLocation();

  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* --- Desktop rail ------------------------------------------------ */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-rule bg-sheet lg:flex">
        <div className="px-4 py-5">
          <NavLink to="/app" className="rounded-sm">
            <Wordmark />
          </NavLink>
        </div>

        {/* The red margin rule, running the full height of the spine */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-loss/25" aria-hidden />

        <nav className="flex-1 px-2.5">
          <p className="eyebrow px-2.5 pb-2 pt-1">The book</p>
          <ul className="space-y-0.5">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-ink/[0.07] font-semibold text-ink'
                        : 'text-ink-2 hover:bg-ink/[0.04] hover:text-ink',
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <p className="eyebrow px-2.5 pb-2 pt-5">Account</p>
          <ul className="space-y-0.5">
            <li>
              <NavLink
                to="/app/settings"
                className={({ isActive }) =>
                  cn(
                    'flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-ink/[0.07] font-semibold text-ink'
                      : 'text-ink-2 hover:bg-ink/[0.04] hover:text-ink',
                  )
                }
              >
                <Settings className="h-4 w-4 shrink-0" aria-hidden />
                Settings
              </NavLink>
            </li>
            <li>
              <ThemeToggle />
            </li>
          </ul>
        </nav>

        <div className="border-t border-rule p-3">
          <DataSourceBadge className="mb-3" />
          {user && (
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-ink font-mono text-xs font-semibold text-paper">
                {initials(user.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{user.name}</span>
                <span className="block truncate text-xs text-ink-3">
                  {user.college ?? user.email}
                </span>
              </span>
              <button
                onClick={logout}
                className="rounded-sm p-1.5 text-ink-3 transition-colors hover:bg-ink/[0.06] hover:text-loss"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* --- Mobile top bar ---------------------------------------------- */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-sheet/95 px-4 backdrop-blur lg:hidden">
        <NavLink to="/app" className="rounded-sm">
          <Wordmark />
        </NavLink>
        <div className="flex items-center gap-1">
          <DataSourceBadge compact />
          <ThemeToggle compact />
          <NavLink
            to="/app/settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-2 hover:bg-ink/[0.06] hover:text-ink"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" aria-hidden />
          </NavLink>
        </div>
      </header>

      {/* --- Page -------------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main id="main" className="flex-1 pb-24 lg:pb-0">
          {children}
        </main>

        <footer className="hidden border-t border-rule px-6 py-4 lg:block">
          <p className="flex items-center gap-2 text-xs text-ink-3">
            <BookOpenCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            InvestWise AI is an educational prototype. Nothing here is financial advice, and no
            return is ever guaranteed. Talk to a SEBI-registered adviser before investing real money.
          </p>
        </footer>
      </div>

      {/* --- Mobile bottom bar ------------------------------------------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-sheet/95 backdrop-blur lg:hidden"
        aria-label="Main"
      >
        <ul className="mx-auto flex max-w-md">
          {NAV.map(({ to, label, icon: Icon, end }) => {
            const active = end ? pathname === to : pathname.startsWith(to);
            return (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-[0.6875rem]',
                    active ? 'text-ink' : 'text-ink-3',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-10 items-center justify-center rounded-sm transition-colors',
                      active && 'bg-ink/[0.08]',
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <span className={cn(active && 'font-semibold')}>{label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <span className="sr-only" aria-live="polite">
        {current ? `${current.label} page` : ''}
      </span>
    </div>
  );
}

/* Page frame: the ruled margin every screen sits inside. */
export function Page({
  title,
  eyebrow,
  action,
  children,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="margin-rule">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
            <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">{title}</h1>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}
