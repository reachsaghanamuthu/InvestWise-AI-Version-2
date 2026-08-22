import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from '@/components/Common/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Bits';
import { useAuth } from '@/store/useAuth';

type Mode = 'login' | 'signup';

export default function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const { login, signup, continueAsDemo, status, error } = useAuth();

  // ?demo=1 from the landing page drops straight into the sample ledger.
  useEffect(() => {
    if (params.get('demo') === '1') {
      continueAsDemo();
      navigate('/app', { replace: true });
    }
  }, [params, continueAsDemo, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    if (password.length < 8) {
      setFieldError('Use at least 8 characters.');
      return;
    }
    if (mode === 'signup' && name.trim().length < 2) {
      setFieldError('Tell us what to call you.');
      return;
    }

    const ok =
      mode === 'login'
        ? await login(email.trim(), password)
        : await signup({ name: name.trim(), email: email.trim(), password, college: college.trim() || undefined });

    if (ok) navigate('/app', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="rounded-sm">
            <Wordmark />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-sm text-sm text-ink-2 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="margin-rule mb-7">
            <p className="eyebrow mb-2">{mode === 'login' ? 'Returning' : 'New account'}</p>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {mode === 'login' ? 'Open your ledger' : 'Start your ledger'}
            </h1>
            <p className="mt-2 text-sm text-ink-2">
              {mode === 'login'
                ? 'Your trades, your report, exactly where you left them.'
                : 'Two minutes to set up. Add your first trade straight after.'}
            </p>
          </div>

          <form onSubmit={onSubmit} className="sheet space-y-4 p-5">
            {mode === 'signup' && (
              <>
                <Input
                  label="Name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Mehta"
                  required
                />
                <Input
                  label="College (optional)"
                  autoComplete="organization"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="VJTI Mumbai"
                />
              </>
            )}

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
              required
            />

            <Input
              label="Password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
              error={fieldError ?? error ?? undefined}
              required
            />

            <Button type="submit" size="lg" block loading={status === 'loading'}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>

            <p className="text-center text-sm text-ink-2">
              {mode === 'login' ? 'No account yet?' : 'Already have one?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setFieldError(null);
                }}
                className="rounded-sm font-medium text-ink underline underline-offset-2 hover:no-underline"
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </form>

          <div className="mt-5 border-t border-rule pt-5">
            <Button
              variant="outline"
              block
              onClick={() => {
                continueAsDemo();
                navigate('/app', { replace: true });
              }}
            >
              Explore with sample trades
            </Button>
            <p className="mt-2.5 text-center text-xs text-ink-3">
              Loads a student ledger of 18 trades so you can see a full report immediately.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
