import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	Dimensions,
} from "react-native";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import BIcon from "../buttons/BIcon";
import { bin, notificationBell } from "@/src/constants/svgs/icons";
import Avatar from "../images/Avatar";
import { router } from "expo-router";

const BUTTON_WIDTH = Dimensions.get("window").width * 0.3;

const ChatRibbon = ({ content }: { content: any }) => {
	const translateX = useSharedValue(0);
	const offsetX = useSharedValue(0);

	// Buttons slide from right into view as ribbon slides left
	const buttonsAnimated = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value + BUTTON_WIDTH }],
	}));

	// Ribbon moves horizontally based on gesture
	const ribbonAnimated = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }],
	}));

	const gesture = Gesture.Pan()
		.activeOffsetX([-10, 10])
		.onBegin(() => {
			offsetX.value = translateX.value;
		})
		.onUpdate((e) => {
			const nextTranslation = offsetX.value + e.translationX;
			translateX.value = Math.min(0, Math.max(-BUTTON_WIDTH, nextTranslation));
		})
		.onEnd(() => {
			if (translateX.value < -BUTTON_WIDTH / 2) {
				translateX.value = withSpring(-BUTTON_WIDTH);
			} else {
				translateX.value = withSpring(0);
			}
		});

	return (
		<View style={styles.row}>
			{/* Hidden buttons sliding in/out */}
			<Animated.View style={[styles.hiddenButtons, buttonsAnimated]}>
				<BIcon
					svg={notificationBell}
					width={45}
					height={45}
					iconHeight={45}
					iconWidth={45}
				/>
				<BIcon
					svg={bin}
					width={45}
					height={45}
					iconHeight={45}
					iconWidth={45}
				/>
			</Animated.View>

			{/* Swipeable ribbon content */}
			<GestureDetector gesture={gesture}>
				<Animated.View style={[styles.ribbon, ribbonAnimated]}>
					<TouchableOpacity
						style={styles.container}
						onPress={() => router.push({
							pathname: `/messages/Chat`,
							params: {
								user: JSON.stringify(content)
							}
						})}
					>
						<View style={styles.content}>
							<Avatar
								data={content?.avatar}
								showStatus={content?.status}
								isWhite={true}
							/>
							<View style={styles.mainContent}>
								<Text style={{ fontSize: 22, fontWeight: "bold" }}>
									{content?.name}
								</Text>
								<Text style={{ fontSize: 12, color: "#797C7B" }}>
									{content?.lastMessage}
								</Text>
							</View>
						</View>
						<View style={styles.statusContent}>
							{content?.lastStatus ? (
								<Text style={styles.statusText}>{content?.lastStatus}</Text>
							) : null}
							{content?.notificationCount && content?.notificationCount > 0 ? (
								<View style={styles.notificationCountDot}>
									<Text style={styles.notificationCountText}>
										{content?.notificationCount}
									</Text>
								</View>
							) : null}
						</View>
					</TouchableOpacity>
				</Animated.View>
			</GestureDetector>
		</View>
	);
};

const styles = StyleSheet.create({
	row: {
		width: "100%",
		position: "relative",
		height: 80,
		marginBottom: 4,
		overflow: "hidden",
	},
	hiddenButtons: {
		position: "absolute",
		right: 0,
		top: 0,
		bottom: 0,
		flexDirection: "row",
		height: "100%",
		width: BUTTON_WIDTH,
		justifyContent: "space-evenly",
		alignItems: "center",
		zIndex: 1,
	},
	ribbon: {
		width: "100%",
		height: "100%",
		zIndex: 2,
		backgroundColor: "white",
	},
	container: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
		height: 80,
		paddingVertical: 10,
		// paddingHorizontal: 20,  // This is handled in ListDrawer Component Itself
		gap: 5,
	},
	avatar: {
		justifyContent: "flex-end",
		alignItems: "flex-end",
		borderRadius: 30,
		backgroundColor: "blue",
		height: 60,
		width: 60,
	},
	content: {
		gap: 10,
		flex: 0.8,
		flexDirection: "row",
		overflow: "hidden",
	},
	mainContent: {
		justifyContent: "center",
		flex: 1,
		gap: 1,
	},
	statusContent: {
		flex: 0.28,
		alignItems: "flex-end",
		height: "100%",
		gap: 10,
		paddingBottom: 2,
		paddingRight: 10,
	},
	statusText: {
		color: "#797C7B",
		fontWeight: "500",
	},
	notificationCountDot: {
		backgroundColor: "#F04A4C",
		borderRadius: 11,
		height: 22,
		width: 22,
		justifyContent: "center",
		alignItems: "center",
	},
	notificationCountText: {
		color: "white",
		fontWeight: "400",
	},
});

export default ChatRibbon;
