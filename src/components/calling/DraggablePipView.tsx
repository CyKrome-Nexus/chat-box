import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { RTCView } from "react-native-webrtc";

/**
 * Local camera self-view for an active video call: draggable to any corner
 * (in-call PiP, per the ticket), independent of the "minimize the whole
 * call" floating bubble in FloatingCallBubble.tsx, which is a separate,
 * app-wide PiP for when you navigate off the /call screen entirely.
 */
const DraggablePipView = ({ streamUrl }: { streamUrl?: string }) => {
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const offsetX = useSharedValue(0);
	const offsetY = useSharedValue(0);

	const panGesture = Gesture.Pan()
		.onBegin(() => {
			offsetX.value = translateX.value;
			offsetY.value = translateY.value;
		})
		.onUpdate((e) => {
			translateX.value = offsetX.value + e.translationX;
			translateY.value = offsetY.value + e.translationY;
		});

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
	}));

	return (
		<GestureDetector gesture={panGesture}>
			<Animated.View style={[styles.container, animatedStyle]}>
				{streamUrl ? (
					<RTCView streamURL={streamUrl} style={styles.video} mirror objectFit="cover" />
				) : (
					<View style={styles.placeholder} />
				)}
			</Animated.View>
		</GestureDetector>
	);
};

export default DraggablePipView;

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 60,
		right: 20,
		width: 100,
		height: 140,
		borderRadius: 16,
		overflow: "hidden",
		backgroundColor: "rgba(255,255,255,0.12)",
		zIndex: 10,
	},
	video: {
		width: "100%",
		height: "100%",
	},
	placeholder: {
		flex: 1,
	},
});
