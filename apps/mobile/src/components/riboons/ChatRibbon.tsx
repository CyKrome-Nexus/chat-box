import { memo } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, LinearTransition, SlideOutLeft, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";

import Avatar from "../images/Avatar";
import { AppText, CircleButton, ScalePressable, palette, springs } from "@/src/components/ui";
import type { IChatRibbon } from "@/src/interfaces/list-interface";
import { conversationsApi } from "@/src/lib/api/services";
import { forgetConversation } from "@/src/lib/sync/chatSync";
import { formatRelative } from "@/src/lib/format/time";
import { hapticWarning } from "@/src/lib/haptics/haptics";
import { useAppTheme } from "@/src/lib/theme/ThemeContext";
import type { RootState } from "@/src/redux/store/store";
import { MAX_PINNED_CHATS, markChatRead, markChatUnread, patchChat, toggleArchiveChat, togglePinChat } from "@/src/redux/features/chatsSlice";

const ACTIONS_WIDTH = 132;
const MUTE_FOREVER_MS = 365 * 24 * 60 * 60 * 1000;

const ChatRibbon = ({ content, onSelect }: { content: IChatRibbon; onSelect?: (content: IChatRibbon) => void }) => {
	const dispatch = useDispatch();
	const theme = useAppTheme();
	const pinnedCount = useSelector((state: RootState) => state.chats.chats.filter((c) => c.pinned).length);
	const online = useSelector((state: RootState) => (content.peerId ? state.connection.presenceByUser[content.peerId] === "online" : false));
	const typing = useSelector((state: RootState) => (state.connection.typingByConversation[content.id]?.length ?? 0) > 0);
	const translateX = useSharedValue(0);
	const start = useSharedValue(0);

	const close = () => {
		translateX.value = withSpring(0, springs.snappy);
	};

	const pan = Gesture.Pan()
		.activeOffsetX([-12, 12])
		.failOffsetY([-10, 10])
		.onBegin(() => {
			start.value = translateX.value;
		})
		.onUpdate((event) => {
			const next = start.value + event.translationX;
			translateX.value = next > 0 ? next * 0.2 : Math.max(-ACTIONS_WIDTH - 40, next);
		})
		.onEnd((event) => {
			const open = translateX.value < -ACTIONS_WIDTH / 2 || event.velocityX < -600;
			translateX.value = withSpring(open ? -ACTIONS_WIDTH : 0, springs.snappy);
		});

	const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
	const actionsStyle = useAnimatedStyle(() => ({
		opacity: Math.min(1, -translateX.value / ACTIONS_WIDTH),
		transform: [{ scale: 0.8 + Math.min(0.2, (-translateX.value / ACTIONS_WIDTH) * 0.2) }],
	}));

	const toggleMute = () => {
		close();
		const mutedUntil = content.muted ? null : new Date(Date.now() + MUTE_FOREVER_MS).toISOString();
		dispatch(patchChat({ chatId: content.id, patch: { muted: !content.muted } }));
		void conversationsApi.mute(content.id, mutedUntil).catch(() => dispatch(patchChat({ chatId: content.id, patch: { muted: content.muted } })));
	};

	const remove = () => {
		hapticWarning();
		Alert.alert("Delete chat", `Delete your chat with ${content.name}? This clears it on your devices only.`, [
			{ text: "Cancel", style: "cancel", onPress: close },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => {
					forgetConversation(content.id);
					void conversationsApi.remove(content.id, "me").catch(() => undefined);
				},
			},
		]);
	};

	const longPress = () => {
		const unread = (content.notificationCount ?? 0) > 0;
		Alert.alert(content.name, undefined, [
			{ text: "Cancel", style: "cancel" },
			{
				text: content.pinned ? "Unpin" : "Pin",
				onPress: () => {
					if (!content.pinned && pinnedCount >= MAX_PINNED_CHATS) Alert.alert("Pin limit reached", `You can pin up to ${MAX_PINNED_CHATS} chats.`);
					else dispatch(togglePinChat(content.id));
				},
			},
			{ text: content.archived ? "Unarchive" : "Archive", onPress: () => dispatch(toggleArchiveChat(content.id)) },
			{ text: unread ? "Mark as read" : "Mark as unread", onPress: () => dispatch(unread ? markChatRead(content.id) : markChatUnread(content.id)) },
		]);
	};

	const open = () => {
		if (onSelect) return onSelect(content);
		router.push({ pathname: "/messages/Chat", params: { user: JSON.stringify(content) } });
	};

	const preview = typing ? "typing…" : content.draft ? `Draft: ${content.draft}` : (content.lastMessage ?? "Say hello 👋");
	const unread = content.notificationCount ?? 0;

	return (
		<Animated.View layout={LinearTransition.springify().damping(24)} entering={FadeIn.duration(220)} exiting={SlideOutLeft.duration(220)} style={styles.row}>
			<Animated.View style={[styles.actions, actionsStyle]}>
				<CircleButton icon={content.muted ? "notifications-off-outline" : "notifications-outline"} label={content.muted ? "Unmute" : "Mute"} variant="dark" size={40} iconSize={20} onPress={toggleMute} style={{ backgroundColor: palette.ink }} />
				<CircleButton icon="trash-outline" label="Delete chat" variant="danger" size={40} iconSize={20} onPress={remove} />
			</Animated.View>
			<GestureDetector gesture={pan}>
				<Animated.View style={[styles.ribbon, { backgroundColor: theme.colors.background }, rowStyle]}>
					<ScalePressable accessibilityLabel={`Open chat with ${content.name}`} onPress={() => (translateX.value !== 0 ? close() : open())} onLongPress={longPress} delayLongPress={350} scaleTo={0.985} style={styles.inner}>
						<Avatar data={content.avatar} showStatus={Boolean(content.peerId)} statusColor={online ? palette.online : "#9AA09E"} size={52} />
						<View style={styles.main}>
							<View style={styles.topLine}>
								<View style={styles.nameRow}>
									{content.pinned ? <Ionicons name="pin" size={13} color={palette.brandDark} /> : null}
									<AppText variant="title" numberOfLines={1} style={styles.name}>
										{content.name}
									</AppText>
								</View>
								<AppText variant="caption" tone="muted">
									{formatRelative(content.lastMessageAt)}
								</AppText>
							</View>
							<View style={styles.bottomLine}>
								<AppText variant="caption" tone={typing ? "brand" : "muted"} numberOfLines={1} style={styles.preview}>
									{preview}
								</AppText>
								{content.muted ? <Ionicons name="notifications-off" size={13} color={palette.muted} /> : null}
								{unread > 0 ? (
									<Animated.View key={unread} entering={FadeIn.springify()} style={[styles.badge, content.muted && { backgroundColor: palette.muted }]}>
										<AppText variant="caption" weight="semibold" tone="inverse">
											{unread > 99 ? "99+" : unread}
										</AppText>
									</Animated.View>
								) : null}
							</View>
						</View>
					</ScalePressable>
				</Animated.View>
			</GestureDetector>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	row: { position: "relative", justifyContent: "center" },
	actions: { position: "absolute", right: 24, flexDirection: "row", gap: 12, alignItems: "center" },
	ribbon: {},
	inner: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 24, paddingVertical: 12 },
	main: { flex: 1, gap: 6 },
	topLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
	nameRow: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
	name: { flexShrink: 1 },
	bottomLine: { flexDirection: "row", alignItems: "center", gap: 6 },
	preview: { flex: 1 },
	badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: "#F04A4C", alignItems: "center", justifyContent: "center" },
});

export default memo(ChatRibbon);
