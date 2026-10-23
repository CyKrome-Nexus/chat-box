import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from "react-native-reanimated";

const THUMB_SIZE = 26;

/**
 * A generic continuous drag slider built on react-native-gesture-handler +
 * reanimated — the same primitives used throughout this app (voice note
 * studio scrubber, DisplayScaleSlider) instead of a native slider package
 * that would need a prebuild this environment can't verify. Used here for
 * the Wallpaper Studio's blur/dim sliders; `DisplayScaleSlider` is a thin
 * wrapper around this for the display-zoom setting.
 */
const GestureSlider = ({
	min,
	max,
	value,
	onChange,
	color,
}: {
	min: number;
	max: number;
	value: number;
	onChange: (value: number) => void;
	color: string;
}) => {
	const [trackWidth, setTrackWidth] = useState(0);
	const progress = useSharedValue((value - min) / (max - min));
	const startProgress = useSharedValue(0);

	const usableWidth = Math.max(1, trackWidth - THUMB_SIZE);

	const emitChange = (nextProgress: number) => {
		const nextValue = min + nextProgress * (max - min);
		onChange(Math.round(nextValue));
	};

	const gesture = Gesture.Pan()
		.onBegin(() => {
			startProgress.value = progress.value;
		})
		.onUpdate((e) => {
			const delta = usableWidth > 0 ? e.translationX / usableWidth : 0;
			const next = Math.min(1, Math.max(0, startProgress.value + delta));
			progress.value = next;
			runOnJS(emitChange)(next);
		});

	const thumbStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: progress.value * usableWidth }],
	}));
	const fillStyle = useAnimatedStyle(() => ({
		width: progress.value * usableWidth + THUMB_SIZE / 2,
		backgroundColor: color,
	}));

	return (
		<View style={styles.track} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
			<View style={styles.trackBackground} />
			<Animated.View style={[styles.trackFill, fillStyle]} />
			<GestureDetector gesture={gesture}>
				<Animated.View style={[styles.thumb, thumbStyle, { backgroundColor: color }]} hitSlop={16} />
			</GestureDetector>
		</View>
	);
};

export default GestureSlider;

const styles = StyleSheet.create({
	track: {
		height: THUMB_SIZE,
		justifyContent: "center",
	},
	trackBackground: {
		position: "absolute",
		left: THUMB_SIZE / 2,
		right: THUMB_SIZE / 2,
		height: 4,
		borderRadius: 2,
		backgroundColor: "#E4E9E8",
	},
	trackFill: {
		position: "absolute",
		left: 0,
		height: 4,
		borderRadius: 2,
	},
	thumb: {
		position: "absolute",
		left: 0,
		width: THUMB_SIZE,
		height: THUMB_SIZE,
		borderRadius: THUMB_SIZE / 2,
		shadowColor: "#000",
		shadowOpacity: 0.2,
		shadowRadius: 3,
		shadowOffset: { width: 0, height: 1 },
		elevation: 3,
	},
});
