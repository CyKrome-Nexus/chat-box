import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	Dimensions,
	Alert,
} from "react-native";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	LinearTransition,
	SlideOutRight,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";

import BIcon from "../buttons/BIcon";
import { bin, notificationBell } from "@/src/constants/svgs/icons";
import Avatar from "../images/Avatar";
import { IChatRibbon } from "@/src/interfaces/list-interface";
import {
	deleteChat,
	MAX_PINNED_CHATS,
	markChatRead,
	markChatUnread,
	toggleArchiveChat,
	toggleMuteChat,
	togglePinChat,
} from "@/src/redux/features/chatsSlice";
import Colors from "@/src/constants/Colors";
import { useDisplayScale } from "@/src/lib/display/useDisplayScale";

const BUTTON_WIDTH = Dimensions.get("window").width * 0.45;

const ChatRibbon = ({
	content,
	onSelect,
}: {
	content: IChatRibbon;
	/** Master-detail (tablet/foldable) selects a chat into the right pane
	 * instead of pushing a new stack screen — see MasterDetailLayout.tsx. */
	onSelect?: (content: IChatRibbon) => void;
}) => {
	const dispatch = useDispatch();
	const { scaleFont } = useDisplayScale();
	const pinnedCount = useSelector(
		(state: any) => state.chats.chats.filter((c: IChatRibbon) => c.pinned).length
	);
	const translateX = useSharedValue(0);
	const offsetX = useSharedValue(0);

	const closeSwipe = () => {
		translateX.value = withSpring(0);
	};

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

	const handleToggleMute = () => {
		dispatch(toggleMuteChat(content.id));
		closeSwipe();
	};

	const handleToggleArchive = () => {
		dispatch(toggleArchiveChat(content.id));
		closeSwipe();
	};

	const handleTogglePin = () => {
		if (!content.pinned && pinnedCount >= MAX_PINNED_CHATS) {
			Alert.alert("Pin limit reached", `You can only pin up to ${MAX_PINNED_CHATS} chats.`);
			return;
		}
		dispatch(togglePinChat(content.id));
	};

	const handleLongPress = () => {
		const isUnread = (content.notificationCount || 0) > 0;
		Alert.alert(content.name, undefined, [
			{ text: "Cancel", style: "cancel" },
			{
				text: content.pinned ? "Unpin" : "Pin",
				onPress: handleTogglePin,
			},
			{
				text: isUnread ? "Mark as Read" : "Mark as Unread",
				onPress: () => dispatch(isUnread ? markChatRead(content.id) : markChatUnread(content.id)),
			},
		]);
	};

	const handleDelete = () => {
		Alert.alert(
			"Delete conversation",
			`Delete conversation with ${content.name}?`,
			[
				{ text: "Cancel", style: "cancel", onPress: closeSwipe },
				{
					text: "Delete",
					style: "destructive",
					onPress: () => dispatch(deleteChat(content.id)),
				},
			]
		);
	};

	const handlePressRibbon = () => {
		if (translateX.value !== 0) {
			closeSwipe();
			return;
		}

		if (onSelect) {
			onSelect(content);
			return;
		}

		router.push({
			pathname: `/messages/Chat`,
			params: {
				user: JSON.stringify(content),
			},
		});
	};

	return (
		<Animated.View
			style={styles.row}
			layout={LinearTransition.duration(200)}
			exiting={SlideOutRight.duration(250)}
		>
			{/* Hidden buttons sliding in/out */}
			<Animated.View style={[styles.hiddenButtons, buttonsAnimated]}>
				<BIcon
					svg={notificationBell}
					width={45}
					height={45}
					iconHeight={45}
					iconWidth={45}
					onPress={handleToggleMute}
				/>
				<TouchableOpacity style={styles.archiveButton} onPress={handleToggleArchive}>
					<Ionicons name={content.archived ? "arrow-undo" : "archive"} size={22} color="#fff" />
				</TouchableOpacity>
				<BIcon
					svg={bin}
					width={45}
					height={45}
					iconHeight={45}
					iconWidth={45}
					onPress={handleDelete}
				/>
			</Animated.View>

			{/* Swipeable ribbon content */}
			<GestureDetector gesture={gesture}>
				<Animated.View style={[styles.ribbon, ribbonAnimated]}>
					<TouchableOpacity
						style={styles.container}
						onPress={handlePressRibbon}
						onLongPress={handleLongPress}
					>
						<View style={styles.content}>
							<Avatar
								data={content?.avatar}
								showStatus={content?.status === "ONLINE"}
								isWhite={true}
							/>
							<View style={styles.mainContent}>
								<View style={styles.nameRow}>
									{content.pinned && <Ionicons name="pin" size={13} color={Colors.focused} />}
									<Text style={{ fontSize: scaleFont(22), fontWeight: "bold" }} numberOfLines={1}>
										{content?.name}
									</Text>
									{content?.muted && (
										<Ionicons name="notifications-off-outline" size={14} color="#797C7B" />
									)}
								</View>
								{content.draft ? (
									<Text style={[styles.draftText, { fontSize: scaleFont(12) }]} numberOfLines={1}>
										Draft: {content.draft}
									</Text>
								) : (
									<Text style={{ fontSize: scaleFont(12), color: "#797C7B" }} numberOfLines={1}>
										{content?.lastMessage}
									</Text>
								)}
							</View>
						</View>
						<View style={styles.statusContent}>
							{content?.lastStatus ? (
								<Text style={[styles.statusText, { fontSize: scaleFont(12) }]}>{content?.lastStatus}</Text>
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
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	row: {
		width: "100%",
		position: "relative",
		minHeight: 80,
		marginBottom: 4,
		overflow: "hidden",
	},
	archiveButton: {
		width: 45,
		height: 45,
		borderRadius: 22,
		backgroundColor: "#F5A623",
		justifyContent: "center",
		alignItems: "center",
	},
	draftText: {
		fontSize: 12,
		color: "#11BC6B",
		fontWeight: "600",
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
		zIndex: 2,
		backgroundColor: "white",
	},
	container: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
		minHeight: 80,
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
	nameRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	statusContent: {
		flex: 0.28,
		alignItems: "flex-end",
		alignSelf: "stretch",
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
