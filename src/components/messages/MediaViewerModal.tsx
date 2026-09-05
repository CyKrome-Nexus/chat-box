import { useEffect } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
	runOnJS,
} from "react-native-reanimated";

const DISMISS_DISTANCE_THRESHOLD = 120;
const DISMISS_VELOCITY_THRESHOLD = 800;

const MediaViewerModal = ({
	uri,
	visible,
	onClose,
}: {
	uri?: string;
	visible: boolean;
	onClose: () => void;
}) => {
	const scale = useSharedValue(1);
	const savedScale = useSharedValue(1);
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const savedTranslateX = useSharedValue(0);
	const savedTranslateY = useSharedValue(0);
	const dismissY = useSharedValue(0);
	const backdropOpacity = useSharedValue(1);
	const entrance = useSharedValue(0);

	// Every fresh open should start from a clean slate — these shared values
	// otherwise persist across opens since this component stays mounted
	// (visible just toggles) rather than remounting per image.
	useEffect(() => {
		if (uri) {
			scale.value = 1;
			savedScale.value = 1;
			translateX.value = 0;
			translateY.value = 0;
			savedTranslateX.value = 0;
			savedTranslateY.value = 0;
			dismissY.value = 0;
			backdropOpacity.value = 1;
			entrance.value = 0;
			entrance.value = withTiming(1, { duration: 220 });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [uri]);

	const reset = () => {
		scale.value = withSpring(1);
		savedScale.value = 1;
		translateX.value = withSpring(0);
		translateY.value = withSpring(0);
		savedTranslateX.value = 0;
		savedTranslateY.value = 0;
	};

	const pinchGesture = Gesture.Pinch()
		.onUpdate((e) => {
			scale.value = Math.max(1, savedScale.value * e.scale);
		})
		.onEnd(() => {
			savedScale.value = scale.value;
			if (scale.value === 1) reset();
		});

	const panGesture = Gesture.Pan()
		.onUpdate((e) => {
			if (scale.value > 1.05) {
				// Panning around a zoomed-in image.
				translateX.value = savedTranslateX.value + e.translationX;
				translateY.value = savedTranslateY.value + e.translationY;
			} else {
				// Not zoomed — a vertical drag dismisses instead.
				dismissY.value = Math.max(0, e.translationY);
				backdropOpacity.value = Math.max(0.3, 1 - dismissY.value / 300);
			}
		})
		.onEnd((e) => {
			if (scale.value > 1.05) {
				savedTranslateX.value = translateX.value;
				savedTranslateY.value = translateY.value;
				return;
			}

			if (dismissY.value > DISMISS_DISTANCE_THRESHOLD || e.velocityY > DISMISS_VELOCITY_THRESHOLD) {
				runOnJS(onClose)();
			} else {
				dismissY.value = withSpring(0);
				backdropOpacity.value = withSpring(1);
			}
		});

	const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: entrance.value,
		transform: [
			{ translateX: translateX.value },
			{ translateY: translateY.value + dismissY.value },
			{ scale: scale.value * (0.85 + entrance.value * 0.15) },
		],
	}));

	const backdropStyle = useAnimatedStyle(() => ({
		opacity: backdropOpacity.value * entrance.value,
	}));

	if (!uri) return null;

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<Animated.View style={[styles.container, backdropStyle]}>
				<TouchableOpacity style={styles.closeButton} onPress={onClose}>
					<Ionicons name="close" size={28} color="#fff" />
				</TouchableOpacity>
				<GestureDetector gesture={composedGesture}>
					<Animated.Image
						source={{ uri }}
						style={[styles.image, animatedStyle]}
						resizeMode="contain"
					/>
				</GestureDetector>
			</Animated.View>
		</Modal>
	);
};

export default MediaViewerModal;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.95)",
		justifyContent: "center",
		alignItems: "center",
	},
	closeButton: {
		position: "absolute",
		top: 60,
		right: 20,
		zIndex: 1,
		padding: 8,
	},
	image: {
		width: "100%",
		height: "80%",
	},
});
