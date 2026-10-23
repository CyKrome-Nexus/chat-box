import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from "react-native-reanimated";

import Avatar from "@/src/components/images/Avatar";
import { dismissInAppBanner } from "@/src/redux/features/connectionSlice";
import { IChatRibbon } from "@/src/interfaces/list-interface";

const AUTO_DISMISS_MS = 4000;
const SWIPE_DISMISS_THRESHOLD = -40;

/**
 * Foreground in-app notification banner — shown when a message arrives for
 * a conversation other than the one currently open. Tap to open, swipe up
 * to dismiss. See docs/architecture/push-notifications.md.
 */
const InAppMessageBanner = () => {
	const dispatch = useDispatch();
	const banner = useSelector((state: any) => state.connection.pendingBanner);
	const chats = useSelector((state: any) => state.chats.chats as IChatRibbon[]);
	const translateY = useSharedValue(-120);
	const opacity = useSharedValue(0);

	useEffect(() => {
		if (!banner) return;
		translateY.value = withSpring(0);
		opacity.value = withTiming(1, { duration: 150 });

		const timer = setTimeout(() => dispatch(dismissInAppBanner()), AUTO_DISMISS_MS);
		return () => clearTimeout(timer);
	}, [banner, dispatch, translateY, opacity]);

	const handleDismiss = () => dispatch(dismissInAppBanner());

	const swipeGesture = Gesture.Pan()
		.activeOffsetY([-10, 10])
		.onUpdate((e) => {
			translateY.value = Math.min(0, e.translationY);
		})
		.onEnd(() => {
			if (translateY.value < SWIPE_DISMISS_THRESHOLD) {
				translateY.value = withTiming(-120);
				runOnJS(handleDismiss)();
			} else {
				translateY.value = withSpring(0);
			}
		});

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
		opacity: opacity.value,
	}));

	if (!banner) return null;

	const handlePress = () => {
		dispatch(dismissInAppBanner());
		const chat = chats.find((c) => c.id === banner.conversationId);
		if (chat) router.push({ pathname: "/messages/Chat", params: { user: JSON.stringify(chat) } });
	};

	return (
		<GestureDetector gesture={swipeGesture}>
			<Animated.View style={[styles.container, animatedStyle]}>
				<TouchableOpacity style={styles.content} activeOpacity={0.9} onPress={handlePress}>
					<Avatar data={{ url: banner.avatarUrl || "" }} size={40} />
					<Animated.View style={styles.textColumn}>
						<Text style={styles.name} numberOfLines={1}>
							{banner.chatName}
						</Text>
						<Text style={styles.text} numberOfLines={1}>
							{banner.text}
						</Text>
					</Animated.View>
				</TouchableOpacity>
			</Animated.View>
		</GestureDetector>
	);
};

export default InAppMessageBanner;

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 50,
		left: 12,
		right: 12,
		zIndex: 100,
		backgroundColor: "#fff",
		borderRadius: 16,
		shadowColor: "#000",
		shadowOpacity: 0.2,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 8,
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		padding: 12,
	},
	textColumn: {
		flex: 1,
	},
	name: {
		fontSize: 14,
		fontWeight: "700",
		color: "#000E08",
	},
	text: {
		fontSize: 13,
		color: "#797C7B",
		marginTop: 2,
	},
});
