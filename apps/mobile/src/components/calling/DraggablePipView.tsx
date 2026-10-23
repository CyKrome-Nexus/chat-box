import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RTCView } from "react-native-webrtc";

import { springs } from "@/src/components/ui";

const WIDTH = 88;
const HEIGHT = 120;
const MARGIN = 20;

// Local camera preview that can be flung to any corner and snaps there.
const DraggablePipView = ({ streamUrl }: { streamUrl?: string }) => {
	const { width, height } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const minY = insets.top + 48;
	const maxY = height - insets.bottom - HEIGHT - 120;
	const x = useSharedValue(width - WIDTH - MARGIN);
	const y = useSharedValue(minY);
	const startX = useSharedValue(0);
	const startY = useSharedValue(0);

	const pan = Gesture.Pan()
		.onBegin(() => {
			startX.value = x.value;
			startY.value = y.value;
		})
		.onUpdate((event) => {
			x.value = startX.value + event.translationX;
			y.value = startY.value + event.translationY;
		})
		.onEnd((event) => {
			const projectedX = x.value + event.velocityX * 0.15;
			const projectedY = y.value + event.velocityY * 0.15;
			x.value = withSpring(projectedX < width / 2 - WIDTH / 2 ? MARGIN : width - WIDTH - MARGIN, { ...springs.gentle, velocity: event.velocityX });
			y.value = withSpring(projectedY < (minY + maxY) / 2 ? minY : maxY, { ...springs.gentle, velocity: event.velocityY });
		});

	const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }] }));

	return (
		<GestureDetector gesture={pan}>
			<Animated.View style={[styles.container, style]}>
				{streamUrl ? <RTCView streamURL={streamUrl} style={styles.video} mirror objectFit="cover" zOrder={1} /> : <View style={styles.placeholder} />}
			</Animated.View>
		</GestureDetector>
	);
};

export default DraggablePipView;

const styles = StyleSheet.create({
	container: { position: "absolute", left: 0, top: 0, width: WIDTH, height: HEIGHT, borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.12)", zIndex: 10, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)" },
	video: { width: "100%", height: "100%" },
	placeholder: { flex: 1 },
});
