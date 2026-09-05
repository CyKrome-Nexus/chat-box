import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

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
			translateX.value = savedTranslateX.value + e.translationX;
			translateY.value = savedTranslateY.value + e.translationY;
		})
		.onEnd(() => {
			savedTranslateX.value = translateX.value;
			savedTranslateY.value = translateY.value;
		});

	const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: translateX.value },
			{ translateY: translateY.value },
			{ scale: scale.value },
		],
	}));

	if (!uri) return null;

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.container}>
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
			</View>
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
