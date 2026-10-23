import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	runOnJS,
} from "react-native-reanimated";
import { VideoView, useVideoPlayer } from "expo-video";

const DISMISS_DISTANCE_THRESHOLD = 120;
const DISMISS_VELOCITY_THRESHOLD = 800;

/**
 * One page of the lightbox's horizontal FlatList: pinch-to-zoom (images
 * only) and pan-to-dismiss, both disabled from fighting the FlatList's own
 * horizontal paging via `failOffsetX` and reporting zoom state up so the
 * parent can disable page-swiping while zoomed in.
 */
const LightboxPage = ({
	uri,
	type,
	width,
	onDismiss,
	onZoomChange,
}: {
	uri: string;
	type: "image" | "video";
	width: number;
	onDismiss: () => void;
	onZoomChange: (zoomed: boolean) => void;
}) => {
	const scale = useSharedValue(1);
	const savedScale = useSharedValue(1);
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const savedTranslateX = useSharedValue(0);
	const savedTranslateY = useSharedValue(0);
	const dismissY = useSharedValue(0);

	const videoPlayer = useVideoPlayer(type === "video" ? uri : "", (p) => {
		p.loop = true;
	});

	const reset = () => {
		scale.value = withSpring(1);
		savedScale.value = 1;
		translateX.value = withSpring(0);
		translateY.value = withSpring(0);
		savedTranslateX.value = 0;
		savedTranslateY.value = 0;
	};

	const pinchGesture = Gesture.Pinch()
		.enabled(type === "image")
		.onUpdate((e) => {
			scale.value = Math.max(1, savedScale.value * e.scale);
			runOnJS(onZoomChange)(scale.value > 1.05);
		})
		.onEnd(() => {
			savedScale.value = scale.value;
			if (scale.value === 1) reset();
		});

	const panGesture = Gesture.Pan();
	if (type === "image") panGesture.failOffsetX([-15, 15]);
	panGesture
		.onUpdate((e) => {
			if (scale.value > 1.05) {
				translateX.value = savedTranslateX.value + e.translationX;
				translateY.value = savedTranslateY.value + e.translationY;
			} else {
				dismissY.value = Math.max(0, e.translationY);
			}
		})
		.onEnd((e) => {
			if (scale.value > 1.05) {
				savedTranslateX.value = translateX.value;
				savedTranslateY.value = translateY.value;
				return;
			}

			if (dismissY.value > DISMISS_DISTANCE_THRESHOLD || e.velocityY > DISMISS_VELOCITY_THRESHOLD) {
				runOnJS(onDismiss)();
			} else {
				dismissY.value = withSpring(0);
			}
		});

	const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: translateX.value },
			{ translateY: translateY.value + dismissY.value },
			{ scale: scale.value },
		],
	}));

	return (
		<GestureDetector gesture={composedGesture}>
			<Animated.View style={[styles.page, { width }, animatedStyle]}>
				{type === "video" ? (
					<VideoView
						player={videoPlayer}
						style={styles.media}
						contentFit="contain"
						nativeControls
					/>
				) : (
					<Animated.Image source={{ uri }} style={styles.media} resizeMode="contain" />
				)}
			</Animated.View>
		</GestureDetector>
	);
};

export default LightboxPage;

const styles = StyleSheet.create({
	page: {
		height: "100%",
		justifyContent: "center",
		alignItems: "center",
	},
	media: {
		width: "100%",
		height: "80%",
	},
});
