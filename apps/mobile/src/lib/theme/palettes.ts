export type TThemeMode = "system" | "light" | "dark" | "oledBlack" | "sepia";
/** What a theme mode actually resolves to once "system" is asked of the OS. */
export type TResolvedThemeMode = "light" | "dark" | "oledBlack" | "sepia";

export interface IThemePalette {
	background: string;
	surface: string;
	surfaceAlt: string;
	text: string;
	subtext: string;
	border: string;
	headerBackground: string;
	headerText: string;
	tabBarBackground: string;
	incomingBubble: string;
	incomingBubbleText: string;
	isDark: boolean;
}

/**
 * Five real, distinct palettes. Accent (the brand/interactive color used for
 * outgoing bubbles, buttons, active tab icons) is layered on top separately
 * via `useAppTheme()`'s `accent` field — see accentColors.ts — since it's a
 * user-customizable value independent of light/dark/OLED/sepia.
 */
export const THEME_PALETTES: Record<TResolvedThemeMode, IThemePalette> = {
	light: {
		background: "#FFFFFF",
		surface: "#F2F8F7",
		surfaceAlt: "#F7F7F7",
		text: "#000E08",
		subtext: "#797C7B",
		border: "#F0F0F0",
		headerBackground: "#FFFFFF",
		headerText: "#000E08",
		tabBarBackground: "#FFFFFF",
		incomingBubble: "#F2F8F7",
		incomingBubbleText: "#000E08",
		isDark: false,
	},
	dark: {
		background: "#181818",
		surface: "#242424",
		surfaceAlt: "#202020",
		text: "#F5F5F5",
		subtext: "#A0A5A3",
		border: "#2E2E2E",
		headerBackground: "#181818",
		headerText: "#F5F5F5",
		tabBarBackground: "#181818",
		incomingBubble: "#242424",
		incomingBubbleText: "#F5F5F5",
		isDark: true,
	},
	oledBlack: {
		background: "#000000",
		surface: "#0D0D0D",
		surfaceAlt: "#000000",
		text: "#FFFFFF",
		subtext: "#8C908E",
		border: "#1A1A1A",
		headerBackground: "#000000",
		headerText: "#FFFFFF",
		tabBarBackground: "#000000",
		incomingBubble: "#111111",
		incomingBubbleText: "#FFFFFF",
		isDark: true,
	},
	sepia: {
		background: "#F5ECD9",
		surface: "#EFE1C4",
		surfaceAlt: "#F0E6CE",
		text: "#4A3B28",
		subtext: "#8A7859",
		border: "#E3D4B0",
		headerBackground: "#F5ECD9",
		headerText: "#4A3B28",
		tabBarBackground: "#F5ECD9",
		incomingBubble: "#EFE1C4",
		incomingBubbleText: "#4A3B28",
		isDark: false,
	},
};
