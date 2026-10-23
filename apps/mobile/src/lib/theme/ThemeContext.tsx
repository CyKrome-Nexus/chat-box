import { createContext, ReactNode, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useSelector } from "react-redux";

import { IThemePalette, THEME_PALETTES, TResolvedThemeMode, TThemeMode } from "./palettes";
import { DEFAULT_ACCENT_COLOR } from "./accentColors";

interface IAppTheme {
	mode: TThemeMode;
	/** "system" resolved against the OS's current light/dark scheme. */
	resolvedMode: TResolvedThemeMode;
	colors: IThemePalette;
	accent: string;
	isDark: boolean;
}

const AppThemeContext = createContext<IAppTheme | null>(null);

/**
 * A real React Context (not a mutated shared module) so that switching theme
 * mode or accent color re-renders every consumer immediately — no polling,
 * no restart, no visual flash, satisfying the ticket's "instantly" acceptance
 * criterion. Mounted once near the root (`_layout.tsx`) below the Redux
 * Provider, since it reads `settings.theme`/`settings.appearance.accentColor`.
 */
export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
	const themeMode = useSelector((state: any) => state.settings.theme as TThemeMode);
	const accentColor = useSelector((state: any) => state.settings.appearance.accentColor as string);
	const systemScheme = useColorScheme();

	const value = useMemo<IAppTheme>(() => {
		const resolvedMode: TResolvedThemeMode = themeMode === "system" ? (systemScheme === "dark" ? "dark" : "light") : themeMode;
		const colors = THEME_PALETTES[resolvedMode];
		return {
			mode: themeMode,
			resolvedMode,
			colors,
			accent: accentColor || DEFAULT_ACCENT_COLOR,
			isDark: colors.isDark,
		};
	}, [themeMode, accentColor, systemScheme]);

	return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

/** The theming engine's single read API — mode, resolved light/dark/OLED/sepia
 * palette, and the user's accent color. See docs/architecture/theming-engine.md
 * for exactly which surfaces currently consume this vs. still use the old
 * static `Colors` module. */
export const useAppTheme = (): IAppTheme => {
	const context = useContext(AppThemeContext);
	if (!context) {
		throw new Error("useAppTheme must be used within AppThemeProvider");
	}
	return context;
};
