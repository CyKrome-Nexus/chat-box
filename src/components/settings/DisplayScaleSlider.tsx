import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from "react-native-reanimated";

import Colors from "@/src/constants/Colors";
import { DISPLAY_SCALE_MAX, DISPLAY_SCALE_MIN } from "@/src/lib/display/useDisplayScale";

const THUMB_SIZE = 26;

/**
 * A continuous 80%–165% drag slider built on react-native-gesture-handler +
 * reanimated (both already app dependencies elsewhere, e.g. the voice note
 * studio's scrubber) rather than pulling in a native slider package that
 * would need a prebuild this environment can't verify.
 */
const DisplayScaleSlider = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
	const [trackWidth, setTrackWidth] = useState(0);
	const progress = useSharedValue((value - DISPLAY_SCALE_MIN) / (DISPLAY_SCALE_MAX - DISPLAY_SCALE_MIN));
	const startProgress = useSharedValue(0);

	const usableWidth = Math.max(1, trackWidth - THUMB_SIZE);

	const emitChange = (nextProgress: number) => {
		const nextValue = DISPLAY_SCALE_MIN + nextProgress * (DISPLAY_SCALE_MAX - DISPLAY_SCALE_MIN);
		onChange(Math.round(nextValue * 100) / 100);
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
	}));

	return (
		<View
			style={styles.track}
			onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
		>
			<View style={styles.trackBackground} />
			<Animated.View style={[styles.trackFill, fillStyle]} />
			<GestureDetector gesture={gesture}>
				<Animated.View style={[styles.thumb, thumbStyle]} hitSlop={16} />
			</GestureDetector>
		</View>
	);
};

export default DisplayScaleSlider;

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
		backgroundColor: Colors.focused,
	},
	thumb: {
		position: "absolute",
		left: 0,
		width: THUMB_SIZE,
		height: THUMB_SIZE,
		borderRadius: THUMB_SIZE / 2,
		backgroundColor: Colors.focused,
		shadowColor: "#000",
		shadowOpacity: 0.2,
		shadowRadius: 3,
		shadowOffset: { width: 0, height: 1 },
		elevation: 3,
	},
});
