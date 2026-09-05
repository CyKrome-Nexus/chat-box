import { View, StyleSheet, useWindowDimensions } from "react-native";
import { PropsWithChildren, useEffect } from "react";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import {
	Gesture,
	GestureDetector,
	GestureUpdateEvent,
	PanGestureHandlerEventPayload,
} from "react-native-gesture-handler";

const ListDrawer = ({ children }: PropsWithChildren) => {
	const { height: windowHeight } = useWindowDimensions();

	const minHeight = windowHeight * 0.85;
	const maxHeight = windowHeight * 0.98;
	const startHeight = windowHeight * 0.95;
	const startTop = windowHeight - startHeight;

	const sheetHeight = useSharedValue(startHeight);
	const sheetTop = useSharedValue(startTop);
	const panStartTop = useSharedValue(startTop);
	const panStartHeight = useSharedValue(startHeight);

	// Re-snap to the open position whenever the window size changes
	// (rotation, split-screen, foldable unfold) so the sheet never keeps
	// stale bounds from the previous size.
	useEffect(() => {
		sheetHeight.value = withSpring(startHeight);
		sheetTop.value = withSpring(startTop);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [windowHeight]);

	const gesture = Gesture.Pan()
		.activeOffsetY([-10, 10])
		.onBegin(() => {
			panStartTop.value = sheetTop.value;
			panStartHeight.value = sheetHeight.value;
		})
		.onUpdate((e: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
			let nextTop = panStartTop.value + e.translationY;
			let nextHeight = panStartHeight.value - e.translationY;
			// Clamp for min and max
			if (nextHeight < minHeight) {
				nextHeight = minHeight;
				nextTop = panStartTop.value + (panStartHeight.value - minHeight);
			}
			if (nextHeight > maxHeight) {
				nextHeight = maxHeight;
				nextTop = panStartTop.value - (maxHeight - panStartHeight.value);
			}
			sheetTop.value = nextTop;
			sheetHeight.value = nextHeight;
		})
		.onEnd(() => {
			// decide which snap point is closer: maxHeight or minHeight
			if (maxHeight - sheetHeight.value < sheetHeight.value - minHeight) {
				sheetHeight.value = withSpring(maxHeight);
				sheetTop.value = withSpring(startTop);
			} else {
				sheetHeight.value = withSpring(minHeight);
				sheetTop.value = withSpring(startTop + (startHeight - minHeight));
			}
		});

	const listAnimated = useAnimatedStyle(() => ({
		top: sheetTop.value,
		height: sheetHeight.value,
	}));

	return (
		<Animated.View
			style={[styles.container, listAnimated]}
			pointerEvents="box-none"
		>
			{/*
			 * The pan gesture is scoped to just this handle bar, not the
			 * scrollable content below — that's what keeps it from fighting
			 * nested FlatLists for vertical pan/scroll gestures. `activeOffsetY`
			 * additionally requires a deliberate 10px vertical movement before
			 * the drag activates, so a light tap on the handle doesn't jitter it.
			 */}
			<GestureDetector gesture={gesture}>
				<View style={styles.topBar}>
					<View style={styles.handle} />
				</View>
			</GestureDetector>
			{children}
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		left: 0,
		right: 0,
		paddingHorizontal: 25,
		backgroundColor: "white",
		borderTopRightRadius: 60,
		borderTopLeftRadius: 60,
		overflow: "hidden",
	},
	topBar: {
		height: 40,
		justifyContent: "center",
		alignItems: "center",
	},
	handle: {
		height: 5,
		width: 50,
		borderRadius: 50,
		backgroundColor: "#E6E6E6",
	},
});

export default ListDrawer;
