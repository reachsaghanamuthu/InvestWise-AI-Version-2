import { create } from 'zustand';
import type { User } from '@/types';
import { ApiError, api, setToken } from '@/services/api';
import { DEMO_USER } from '@/data/demo';

/* Auth.

   The backend owns real accounts. When it is unreachable the app signs the
   person into a local demo account instead of blocking them at the door —
   losing a pitch to a network error is not an acceptable failure mode. The
   session records which of the two happened so the UI can say so. */

const USER_KEY = 'investwise-user';

const readUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

const writeUser = (user: User | null) => {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage blocked */
  }
};

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading';
  mode: 'server' | 'local' | null;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (input: { name: string; email: string; password: string; college?: string }) => Promise<boolean>;
  continueAsDemo: () => void;
  updateProfile: (patch: Partial<User>) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: readUser(),
  status: 'idle',
  mode: readUser() ? 'local' : null,
  error: null,

  login: async (email, password) => {
    set({ status: 'loading', error: null });
    try {
      const res = await api.auth.login({ email, password });
      setToken(res.token);
      writeUser(res.user);
      set({ user: res.user, mode: 'server', status: 'idle' });
      return true;
    } catch (err) {
      // A real rejection (wrong password) must surface; an unreachable
      // backend must not.
      if (err instanceof ApiError && err.status >= 400) {
        set({ status: 'idle', error: err.message });
        return false;
      }
      const user: User = { ...DEMO_USER, email, name: email.split('@')[0] || DEMO_USER.name };
      writeUser(user);
      set({ user, mode: 'local', status: 'idle' });
      return true;
    }
  },

  signup: async ({ name, email, password, college }) => {
    set({ status: 'loading', error: null });
    try {
      const res = await api.auth.signup({ name, email, password, college });
      setToken(res.token);
      writeUser(res.user);
      set({ user: res.user, mode: 'server', status: 'idle' });
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400) {
        set({ status: 'idle', error: err.message });
        return false;
      }
      const user: User = { ...DEMO_USER, id: `local-${Date.now()}`, name, email, college };
      writeUser(user);
      set({ user, mode: 'local', status: 'idle' });
      return true;
    }
  },

  continueAsDemo: () => {
    writeUser(DEMO_USER);
    set({ user: DEMO_USER, mode: 'local', error: null });
  },

  updateProfile: (patch) =>
    set((state) => {
      if (!state.user) return state;
      const user = { ...state.user, ...patch };
      writeUser(user);
      return { user };
    }),

  logout: () => {
    setToken(null);
    writeUser(null);
    set({ user: null, mode: null, error: null });
  },
}));
