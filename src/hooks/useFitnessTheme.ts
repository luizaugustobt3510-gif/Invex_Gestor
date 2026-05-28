import { useEffect, useState } from 'react';

const KEY = 'fitness_theme';
export type FitnessTheme = 'dark' | 'light';

const read = (): FitnessTheme => {
  if (typeof window === 'undefined') return 'dark';
  const v = localStorage.getItem(KEY);
  return v === 'light' ? 'light' : 'dark';
};

export function useFitnessTheme() {
  const [theme, setThemeState] = useState<FitnessTheme>(read);

  const setTheme = (t: FitnessTheme) => {
    localStorage.setItem(KEY, t);
    setThemeState(t);
    window.dispatchEvent(new Event('fitness-theme-change'));
  };

  useEffect(() => {
    const sync = () => setThemeState(read());
    window.addEventListener('fitness-theme-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('fitness-theme-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { theme, setTheme, isLight: theme === 'light' };
}
