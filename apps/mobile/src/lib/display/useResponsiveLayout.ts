import { useWindowDimensions } from "react-native";

/** Foldables/tablets switch to Master-Detail split view at this width. */
export const TABLET_BREAKPOINT_DP = 600;
/** Below this width, compact paddings/button sizing kick in. */
export const COMPACT_PHONE_BREAKPOINT_DP = 360;

export interface IResponsiveLayout {
	width: number;
	height: number;
	/** >= 600dp — tablets and unfolded foldables. Recomputed on every resize
	 * (rotation, split-screen, unfolding a foldable), so a component reading
	 * this re-renders into/out of split view without losing its own state —
	 * `useWindowDimensions` is a live subscription, not a one-time read. */
	isTablet: boolean;
	/** < 360dp — small/compact phones needing tighter paddings. */
	isCompactPhone: boolean;
}

export const useResponsiveLayout = (): IResponsiveLayout => {
	const { width, height } = useWindowDimensions();
	return {
		width,
		height,
		isTablet: width >= TABLET_BREAKPOINT_DP,
		isCompactPhone: width < COMPACT_PHONE_BREAKPOINT_DP,
	};
};
