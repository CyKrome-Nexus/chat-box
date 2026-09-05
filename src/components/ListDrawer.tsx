import { View, Text, StyleSheet, Dimensions } from "react-native";
import { PropsWithChildren } from "react";
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

const MIN_HEIGHT = Dimensions.get("window").height * 0.85;
const MAX_HEIGHT = Dimensions.get("window").height * 0.98;
const START_HEIGHT =
	Dimensions.get("window").height - Dimensions.get("window").height * 0.05;
const START_TOP = Dimensions.get("window").height - START_HEIGHT;

const ListDrawer = ({ children }: PropsWithChildren) => {
	const sheetHeight = useSharedValue(START_HEIGHT);
	const sheetTop = useSharedValue(START_TOP);
	const panStartTop = useSharedValue(START_TOP);
	const panStartHeight = useSharedValue(START_HEIGHT);

	const gesture = Gesture.Pan()
		.onBegin(() => {
			panStartTop.value = sheetTop.value;
			panStartHeight.value = sheetHeight.value;
		})
		.onUpdate((e: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
			let nextTop = panStartTop.value + e.translationY;
			let nextHeight = panStartHeight.value - e.translationY;
			// Clamp for min and max
			if (nextHeight < MIN_HEIGHT) {
				nextHeight = MIN_HEIGHT;
				nextTop = panStartTop.value + (panStartHeight.value - MIN_HEIGHT);
			}
			if (nextHeight > MAX_HEIGHT) {
				nextHeight = MAX_HEIGHT;
				nextTop = panStartTop.value - (MAX_HEIGHT - panStartHeight.value);
			}
			sheetTop.value = nextTop;
			sheetHeight.value = nextHeight;
			// console.log(`
			//     Next Top > ${nextTop}
			//     Next Height > ${nextHeight}
			//     Min Height > ${MIN_HEIGHT}
			//     Max Height > ${MAX_HEIGHT}
			//     Height > ${sheetHeight.value}

			// `)
		})
		.onEnd(() => {
			// decide which snap point is closer: MAX_HEIGHT or MIN_HEIGHT
			if (MAX_HEIGHT - sheetHeight.value < sheetHeight.value - MIN_HEIGHT) {
				sheetHeight.value = withSpring(MAX_HEIGHT);
				sheetTop.value = withSpring(START_TOP); // adjust top if you're animating top too
			} else {
				sheetHeight.value = withSpring(MIN_HEIGHT);
				sheetTop.value = withSpring(START_TOP + (START_HEIGHT - MIN_HEIGHT));
			}
			// console.log(`
			//     Min Height > ${MIN_HEIGHT}
			//     Max Height > ${MAX_HEIGHT}
			//     Height > ${sheetHeight.value}
			// `)
		});

	const listAnimated = useAnimatedStyle(() => ({
		top: sheetTop.value,
		height: sheetHeight.value,
	}));

	return (
		// <View style={{ flex: 1 }}>
		<Animated.View
			style={[styles.container, listAnimated]}
			pointerEvents="box-none"
		>
			<GestureDetector gesture={gesture}>
				<View style={styles.topBar}>
					<View style={styles.handle} />
				</View>
			</GestureDetector>
			{children}
		</Animated.View>
		// </View>
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
	chatListFooterContainer: {
		padding: 20,
		justifyContent: "center",
		alignItems: "center",
		// borderColor: 'red',
		// borderWidth: 3,
	},
	chatListFooterText: {
		color: "#797C7B",
	},
});

export default ListDrawer;
