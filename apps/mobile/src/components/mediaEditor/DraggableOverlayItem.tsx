import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	runOnJS,
} from "react-native-reanimated";

import { IOverlayItem } from "@/src/lib/media/overlayTypes";

/**
 * A single draggable/pinch-scalable/rotatable overlay (text annotation or
 * emoji sticker) on the media editor canvas. Position/scale/rotation are
 * committed back to the parent's item list on gesture end so the final
 * layout survives re-renders and gets baked in by view-shot.
 */
const DraggableOverlayItem = ({
	item,
	selected,
	onSelect,
	onChange,
}: {
	item: IOverlayItem;
	selected: boolean;
	onSelect: () => void;
	onChange: (patch: Partial<IOverlayItem>) => void;
}) => {
	const translateX = useSharedValue(item.x);
	const translateY = useSharedValue(item.y);
	const scale = useSharedValue(item.scale);
	const rotation = useSharedValue(item.rotation);
	const offsetX = useSharedValue(item.x);
	const offsetY = useSharedValue(item.y);
	const startScale = useSharedValue(item.scale);
	const startRotation = useSharedValue(item.rotation);

	useEffect(() => {
		translateX.value = item.x;
		translateY.value = item.y;
		scale.value = item.scale;
		rotation.value = item.rotation;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [item.id]);

	const commit = () => {
		onChange({
			x: translateX.value,
			y: translateY.value,
			scale: scale.value,
			rotation: rotation.value,
		});
	};

	const panGesture = Gesture.Pan()
		.onBegin(() => {
			offsetX.value = translateX.value;
			offsetY.value = translateY.value;
			runOnJS(onSelect)();
		})
		.onUpdate((e) => {
			translateX.value = offsetX.value + e.translationX;
			translateY.value = offsetY.value + e.translationY;
		})
		.onEnd(() => runOnJS(commit)());

	const pinchGesture = Gesture.Pinch()
		.onBegin(() => {
			startScale.value = scale.value;
		})
		.onUpdate((e) => {
			scale.value = Math.max(0.4, Math.min(4, startScale.value * e.scale));
		})
		.onEnd(() => runOnJS(commit)());

	const rotateGesture = Gesture.Rotation()
		.onBegin(() => {
			startRotation.value = rotation.value;
		})
		.onUpdate((e) => {
			rotation.value = startRotation.value + e.rotation;
		})
		.onEnd(() => runOnJS(commit)());

	const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture, rotateGesture);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: translateX.value },
			{ translateY: translateY.value },
			{ scale: scale.value },
			{ rotateZ: `${rotation.value}rad` },
		],
	}));

	return (
		<GestureDetector gesture={composedGesture}>
			<Animated.View style={[styles.item, selected && styles.itemSelected, animatedStyle]}>
				{item.kind === "sticker" ? (
					<Text style={styles.stickerText}>{item.content}</Text>
				) : (
					<Text style={[styles.overlayText, { color: item.color, fontFamily: item.fontFamily }]}>
						{item.content}
					</Text>
				)}
			</Animated.View>
		</GestureDetector>
	);
};

export default DraggableOverlayItem;

const styles = StyleSheet.create({
	item: {
		position: "absolute",
		padding: 4,
	},
	itemSelected: {
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.6)",
		borderStyle: "dashed",
		borderRadius: 4,
	},
	stickerText: {
		fontSize: 44,
	},
	overlayText: {
		fontSize: 26,
		fontWeight: "700",
		textShadowColor: "rgba(0,0,0,0.5)",
		textShadowRadius: 3,
	},
});
