import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';
type Ctx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };

const ThemeContext = createContext<Ctx>({ theme: 'dark', toggle: () => {}, setTheme: () => {} });

const KEY = 'fufas:theme';

function initial(): Theme {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(initial);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        root.dataset.theme = theme;
        try {
            window.localStorage.setItem(KEY, theme);
        } catch {
            /* ignore */
        }
    }, [theme]);

    const setTheme = (t: Theme) => setThemeState(t);
    const toggle = () => setThemeState((p) => (p === 'dark' ? 'light' : 'dark'));

    return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    return useContext(ThemeContext);
}
