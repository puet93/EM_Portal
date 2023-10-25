import { createContext, useContext, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

enum Theme {
	DARK = 'dark',
	LIGHT = 'light',
}

type ThemeContextType = [Theme | null, Dispatch<SetStateAction<Theme | null>>];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const prefersDarkMQ = '(prefers-color-scheme: dark)';
const getPreferredTheme = () =>
	window.matchMedia(prefersDarkMQ).matches ? Theme.DARK : Theme.LIGHT;

function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState<Theme | null>(() => {
		if (typeof window !== 'object') {
			return Theme.DARK;
		}

		return getPreferredTheme();
	});

	return (
		<ThemeContext.Provider value={[theme, setTheme]}>
			{children}
		</ThemeContext.Provider>
	);
}

function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}

export { Theme, ThemeProvider, useTheme };
