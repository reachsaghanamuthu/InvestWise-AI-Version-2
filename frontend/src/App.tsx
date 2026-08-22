import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/Common/AppShell';
import { Spinner } from '@/components/ui/Bits';
import { useAuth } from '@/store/useAuth';
import { usePortfolio } from '@/store/usePortfolio';

import Landing from '@/pages/Landing';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';

/* Charts and the report renderer are only needed once someone is inside the
   app, so they load on demand rather than in the first bundle. */
const Copilot = lazy(() => import('@/pages/Copilot'));
const Portfolio = lazy(() => import('@/pages/Portfolio'));
const Autopsy = lazy(() => import('@/pages/Autopsy'));
const Settings = lazy(() => import('@/pages/Settings'));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const location = useLocation();

  if (!user) return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

function RouteLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner label="Opening the ledger" />
    </div>
  );
}

export default function App() {
  const user = useAuth((s) => s.user);
  const refresh = usePortfolio((s) => s.refresh);
  const { pathname } = useLocation();

  // Prices refresh on entry and then every two minutes — well inside Finnhub's
  // free rate limit once the backend's five-minute cache is in front of it.
  useEffect(() => {
    if (!user) return;
    void refresh();
    const id = setInterval(() => void refresh(), 120_000);
    return () => clearInterval(id);
  }, [user, refresh]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/app" replace /> : <Landing />} />
      <Route path="/auth" element={user ? <Navigate to="/app" replace /> : <Auth />} />

      <Route
        path="/app/*"
        element={
          <RequireAuth>
            <AppShell>
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route index element={<Dashboard />} />
                  <Route path="copilot" element={<Copilot />} />
                  <Route path="portfolio" element={<Portfolio />} />
                  <Route path="autopsy" element={<Autopsy />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/app" replace />} />
                </Routes>
              </Suspense>
            </AppShell>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
