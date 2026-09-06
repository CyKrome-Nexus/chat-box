export type TWallpaperKind = "none" | "doodle" | "solid" | "gradient" | "photo";

export interface IWallpaperConfig {
	kind: TWallpaperKind;
	/** "doodle" — tint color for the pattern strokes. */
	doodleColor?: string;
	/** "solid" — background fill. */
	solidColor?: string;
	/** "gradient" — key into GRADIENT_PRESETS. */
	gradientKey?: string;
	/** "photo" — local file/content URI from the gallery picker. */
	photoUri?: string;
	/** "photo" — 0–100 Gaussian-style blur (expo-image's native blurRadius). */
	blur?: number;
	/** "photo" — 0–80, opacity of a black overlay for night-reading dimming. */
	dim?: number;
}

export const DEFAULT_WALLPAPER: IWallpaperConfig = { kind: "none" };
