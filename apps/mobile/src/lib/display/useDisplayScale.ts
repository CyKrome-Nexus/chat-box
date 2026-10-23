import { PixelRatio } from "react-native";
import { useSelector } from "react-redux";

export const DISPLAY_SCALE_MIN = 0.8;
export const DISPLAY_SCALE_MAX = 1.65;

export interface IDisplayScalePreset {
	key: string;
	label: string;
	value: number;
}

export const DISPLAY_SCALE_PRESETS: IDisplayScalePreset[] = [
	{ key: "small", label: "Small", value: 0.8 },
	{ key: "default", label: "Default", value: 1 },
	{ key: "medium", label: "Medium", value: 1.15 },
	{ key: "large", label: "Large", value: 1.3 },
	{ key: "extraLarge", label: "Extra Large", value: 1.5 },
	{ key: "maximum", label: "Maximum", value: 1.65 },
];

export const clampDisplayScale = (value: number): number =>
	Math.min(DISPLAY_SCALE_MAX, Math.max(DISPLAY_SCALE_MIN, value));

/**
 * The app's single source of truth for "how big should everything be right
 * now". `useSystemTextSize` (default on) derives the scale from the OS's own
 * Dynamic Type (iOS) / Display Size (Android) accessibility setting via
 * `PixelRatio.getFontScale()` — a real value the OS reports, clamped into the
 * same 80%–165% band the in-app slider covers so an extreme OS setting can't
 * blow past the layout budget this app has actually been checked against.
 * Turning the override on ignores the OS value and uses the manual slider
 * (`settings.display.zoomLevel`) instead. Either way, every consumer re-runs
 * on the next render once the underlying value changes, so the whole app
 * updates in real time — there is no restart step.
 */
export const useDisplayScale = () => {
	const zoomLevel = useSelector((state: any) => state.settings.display.zoomLevel as number);
	const useSystemTextSize = useSelector((state: any) => state.settings.display.useSystemTextSize as boolean);

	const scale = useSystemTextSize ? clampDisplayScale(PixelRatio.getFontScale()) : clampDisplayScale(zoomLevel);

	const scaleFont = (size: number) => Math.round(size * scale);
	const scaleSpacing = (size: number) => Math.round(size * scale);

	return { scale, scaleFont, scaleSpacing, zoomLevel, useSystemTextSize };
};
