import { create } from 'zustand';

type Theme = 'light' | 'dark';

const KEY = 'investwise-theme';

const read = (): Theme => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const apply = (theme: Theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage blocked — the class still applied */
  }
};

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (theme: Theme) => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: read(),
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    apply(next);
    set({ theme: next });
  },
  set: (theme) => {
    apply(theme);
    set({ theme });
  },
}));
