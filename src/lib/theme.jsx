import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Theme Context - Manages light/dark mode with localStorage persistence
 */

const THEME_STORAGE_KEY = 'pm-taxonomy-theme';
const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

const ThemeContext = createContext(null);

/**
 * Get initial theme from localStorage or default to dark
 */
function getInitialTheme() {
  if (typeof window === 'undefined') return THEMES.DARK;
  
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === THEMES.LIGHT || stored === THEMES.DARK) {
    return stored;
  }
  
  // Default to dark mode (original design)
  return THEMES.DARK;
}

/**
 * Apply theme to document
 */
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === THEMES.LIGHT) {
    root.setAttribute('data-theme', 'light');
  } else {
    root.removeAttribute('data-theme');
  }
}

/**
 * Theme Provider Component
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Set theme and persist to localStorage
  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setTheme(theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK);
  }, [theme, setTheme]);

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === THEMES.DARK,
    isLight: theme === THEMES.LIGHT,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { THEMES };
