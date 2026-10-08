'use client';

import { useState, useEffect, useCallback } from 'react';

export type ThemeColor = 'blue' | 'green';
export type ThemeMode = 'light' | 'dark';

export const getMola5satyStyles = (theme: ThemeColor, mode: ThemeMode): React.CSSProperties => {
  if (theme === 'green') {
    if (mode === 'dark') {
      return {
        '--bg': '#04130d',
        '--card-bg': '#072418',
        '--ink': '#ecfdf5',
        '--ink-dim': 'rgba(236, 253, 245, 0.7)',
        '--ink-faint': 'rgba(236, 253, 245, 0.12)',
        '--border': '#059669',
        '--accent': '#10b981',
        '--accent-hover': '#34d399',
        '--accent-dim': 'rgba(16, 185, 129, 0.15)',
        '--success': '#10b981',
        '--warning': '#fbbf24',
      } as React.CSSProperties;
    }
    // green light
    return {
      '--bg': '#f0fdf4',
      '--card-bg': '#ffffff',
      '--ink': '#064e3b',
      '--ink-dim': '#374151',
      '--ink-faint': 'rgba(6, 78, 59, 0.08)',
      '--border': '#bbf7d0',
      '--accent': '#059669',
      '--accent-hover': '#047857',
      '--accent-dim': 'rgba(5, 150, 105, 0.12)',
      '--success': '#059669',
      '--warning': '#d97706',
    } as React.CSSProperties;
  }

  // theme === 'blue'
  if (mode === 'dark') {
    return {
      '--bg': '#080d1a',
      '--card-bg': '#0d1629',
      '--ink': '#f8fafc',
      '--ink-dim': 'rgba(248, 250, 252, 0.7)',
      '--ink-faint': 'rgba(248, 250, 252, 0.12)',
      '--border': '#1e3a8a',
      '--accent': '#3b82f6',
      '--accent-hover': '#60a5fa',
      '--accent-dim': 'rgba(59, 130, 246, 0.15)',
      '--success': '#10b981',
      '--warning': '#f59e0b',
    } as React.CSSProperties;
  }

  // blue light (default)
  return {
    '--bg': '#f0f4f9',
    '--card-bg': '#ffffff',
    '--ink': '#0f172a',
    '--ink-dim': '#475569',
    '--ink-faint': 'rgba(15, 23, 42, 0.08)',
    '--border': '#cbd5e1',
    '--accent': '#2563eb',
    '--accent-hover': '#1d4ed8',
    '--accent-dim': 'rgba(37, 99, 235, 0.12)',
    '--success': '#10b981',
    '--warning': '#f59e0b',
  } as React.CSSProperties;
};

export function useMola5satyTheme() {
  const [theme, setThemeState] = useState<ThemeColor>('blue');
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readStored = () => {
      const storedTheme = (localStorage.getItem('mola5saty_theme') as ThemeColor) || 'blue';
      const storedMode = (localStorage.getItem('mola5saty_mode') as ThemeMode) || 'light';
      setThemeState(storedTheme === 'green' ? 'green' : 'blue');
      setModeState(storedMode === 'dark' ? 'dark' : 'light');

      if (storedMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    readStored();
    window.addEventListener('mola5saty_theme_change', readStored);
    window.addEventListener('storage', readStored);

    return () => {
      window.removeEventListener('mola5saty_theme_change', readStored);
      window.removeEventListener('storage', readStored);
    };
  }, []);

  const setTheme = useCallback((newTheme: ThemeColor) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mola5saty_theme', newTheme);
      window.dispatchEvent(new Event('mola5saty_theme_change'));
    }
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mola5saty_mode', newMode);
      if (newMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      window.dispatchEvent(new Event('mola5saty_theme_change'));
    }
  }, []);

  const toggleMode = useCallback(() => {
    const nextMode = mode === 'light' ? 'dark' : 'light';
    setMode(nextMode);
  }, [mode, setMode]);

  const styles = getMola5satyStyles(theme, mode);

  return {
    theme,
    mode,
    isDarkMode: mode === 'dark',
    setTheme,
    setMode,
    toggleMode,
    styles,
  };
}
