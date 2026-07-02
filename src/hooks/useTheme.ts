import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_THEME, THEME_KEY } from '../lib/theme';

/** 테마 상태 — data-theme 속성 + localStorage 로 지속. */
export function useTheme() {
  const [theme, setThemeState] = useState<string>(
    () => localStorage.getItem(THEME_KEY) || DEFAULT_THEME,
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((id: string) => {
    localStorage.setItem(THEME_KEY, id);
    setThemeState(id);
  }, []);

  return { theme, setTheme };
}
