import { useState, useEffect } from 'react';
import themeManager from '../utils/themeManager';

/**
 * Hook để sử dụng theme trong components
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => themeManager.getTheme());

  useEffect(() => {
    const unsubscribe = themeManager.subscribe((newTheme) => {
      setTheme(newTheme);
    });
    return unsubscribe;
  }, []);

  const toggleTheme = () => {
    themeManager.toggleTheme();
  };

  const setSpecificTheme = (newTheme) => {
    themeManager.setTheme(newTheme);
  };

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme: setSpecificTheme,
  };
}
