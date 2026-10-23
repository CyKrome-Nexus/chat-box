import { memo, useRef } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeInUp, runOnJS, useAnimatedStyle, useSharedValue, withSpring, ZoomIn, ZoomOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import type { IMessage } from "@/src/interfaces/message-interface";
import type { IAvatar } from "@/src/interfaces/list-interface";
import Avatar from "../images/Avatar";
import AttachmentContent from "./AttachmentContent";
import PollCard from "./PollCard";
import type { IBubbleAnchor } from "./MessageActionsOverlay";
import HighlightedText from "@/src/components/search/HighlightedText";
import { AppText, palette, springs } from "@/src/components/ui";
import { formatClock } from "@/src/lib/format/time";
import { useDisplayScale } from "@/src/lib/display/useDisplayScale";
import { useAppTheme } from "@/src/lib/theme/ThemeContext";

const SWIPE_REPLY_THRESHOLD = 56;
const SWIPE_REPLY_MAX = 84;

const StatusTicks = ({ status }: { status?: IMessage["status"] }) => {
	const icon =
		status === "failed"
			? { name: "alert-circle" as const, color: palette.danger }
			: !status || status === "pending"
				? { name: "time-outline" as const, color: palette.muted }
				: status === "sent"
					? { name: "checkmark" as const, color: palette.muted }
					: { name: "checkmark-done" as const, color: status === "read" ? "#34B7F1" : palette.muted };
	return (
		<Animated.View key={status ?? "pending"} entering={ZoomIn.springify().damping(14)} exiting={ZoomOut.duration(90)}>
			<Ionicons name={icon.name} size={14} color={icon.color} />
		</Animated.View>
	);
};

interface IMessageBubbleProps {
	message: IMessage;
	avatar?: IAvatar;
	isGroup?: boolean;
	showSender?: boolean;
	onPressMedia?: (messageId: string) => void;
	onPressVideoNote?: (uri: string) => void;
	onSwipeReply?: (message: IMessage) => void;
	onPressReplyQuote?: (messageId: string) => void;
	onLongPressMessage?: (message: IMessage, anchor: IBubbleAnchor) => void;
	highlighted?: boolean;
	searchQuery?: string;
}

const MessageBubble = ({
	message,
	avatar,
	isGroup,
	showSender = true,
	onPressMedia,
	onPressVideoNote,
	onSwipeReply,
	onPressReplyQuote,
	onLongPressMessage,
	highlighted,
	searchQuery,
}: IMessageBubbleProps) => {
	const isSender = message.type === "sender";
	const { scaleFont } = useDisplayScale();
	const theme = useAppTheme();
	const translateX = useSharedValue(0);
	const hasTriggeredHaptic = useRef(false);
	const bubbleRef = useRef<View>(null);

	const triggerReply = () => onSwipeReply?.(message);
	const triggerHaptic = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	const triggerLongPress = () => {
		void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		bubbleRef.current?.measureInWindow((x, y, width, height) => onLongPressMessage?.(message, { x, y, width, height }));
	};

	const longPress = Gesture.LongPress()
		.minDuration(320)
		.onStart(() => runOnJS(triggerLongPress)());

	const swipe = Gesture.Pan()
		.activeOffsetX([10, 999])
		.failOffsetY([-12, 12])
		.onUpdate((event) => {
			const raw = Math.max(0, event.translationX);
			translateX.value = Math.min(SWIPE_REPLY_MAX, raw <= SWIPE_REPLY_THRESHOLD ? raw : SWIPE_REPLY_THRESHOLD + (raw - SWIPE_REPLY_THRESHOLD) * 0.25);
			if (translateX.value >= SWIPE_REPLY_THRESHOLD && !hasTriggeredHaptic.current) {
				hasTriggeredHaptic.current = true;
				runOnJS(triggerHaptic)();
			} else if (translateX.value < SWIPE_REPLY_THRESHOLD) {
				hasTriggeredHaptic.current = false;
			}
		})
		.onEnd(() => {
			if (translateX.value >= SWIPE_REPLY_THRESHOLD) runOnJS(triggerReply)();
			translateX.value = withSpring(0, springs.snappy);
			hasTriggeredHaptic.current = false;
		});

	const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
	const replyIconStyle = useAnimatedStyle(() => ({
		opacity: Math.min(1, translateX.value / SWIPE_REPLY_THRESHOLD),
		transform: [{ scale: 0.6 + 0.4 * Math.min(1, translateX.value / SWIPE_REPLY_THRESHOLD) }],
	}));

	if (message.kind === "system") {
		return (
			<Animated.View entering={FadeInUp.duration(200)} style={styles.systemRow}>
				<AppText variant="caption" tone="muted" align="center" style={[styles.systemPill, { backgroundColor: theme.colors.surfaceAlt }]}>
					{message.text}
				</AppText>
			</Animated.View>
		);
	}

	const isSticker = message.attachment?.type === "sticker" && !message.text;
	const textColor = isSender ? palette.white : theme.colors.incomingBubbleText;
	const showGroupIdentity = isGroup && !isSender && showSender;

	return (
		<GestureDetector gesture={Gesture.Race(longPress, swipe)}>
			<View collapsable={false} style={[styles.wrapper, !showSender && styles.grouped]}>
				<Animated.View style={[styles.replyIcon, replyIconStyle]}>
					<Ionicons name="arrow-undo" size={18} color={palette.brandDark} />
				</Animated.View>
				<Animated.View style={[styles.row, isSender ? styles.rowSender : styles.rowReceiver, rowStyle]}>
					{isGroup && !isSender ? <View style={styles.avatarSlot}>{showSender ? <Avatar data={avatar} size={40} /> : null}</View> : null}
					<View style={[styles.column, isSender ? styles.alignEnd : styles.alignStart]}>
						{showGroupIdentity && message.senderName ? (
							<AppText variant="label" style={[styles.senderName, message.senderColor ? { color: message.senderColor } : null]}>
								{message.senderName}
							</AppText>
						) : null}
						<View
							ref={bubbleRef}
							collapsable={false}
							style={[
								styles.bubble,
								isSticker
									? styles.stickerBubble
									: isSender
										? [styles.senderBubble, { backgroundColor: theme.accent }]
										: [styles.receiverBubble, { backgroundColor: theme.colors.incomingBubble }],
								highlighted && { borderWidth: 2, borderColor: palette.storyRing },
							]}
						>
							{message.deletedForEveryone ? (
								<AppText variant="label" weight="regular" style={[styles.deleted, { color: isSender ? "rgba(255,255,255,0.8)" : palette.muted }]}>
									This message was deleted
								</AppText>
							) : (
								<>
									{message.replyTo ? (
										<TouchableOpacity onPress={() => onPressReplyQuote?.(message.replyTo?.messageId ?? "")} style={[styles.quote, isSender ? styles.quoteSender : styles.quoteReceiver]}>
											<AppText variant="caption" weight="semibold" style={{ color: isSender ? palette.white : palette.brandDark }}>
												{message.replyTo.isSender ? "You" : "Reply"}
											</AppText>
											<AppText variant="caption" numberOfLines={2} style={{ color: isSender ? "rgba(255,255,255,0.85)" : palette.muted }}>
												{message.replyTo.text}
											</AppText>
										</TouchableOpacity>
									) : null}
									{message.attachment ? (
										<AttachmentContent
											messageId={message.id}
											conversationId={message.conversationId}
											attachment={message.attachment}
											isSender={isSender}
											onPressMedia={onPressMedia}
											onPressVideoNote={onPressVideoNote}
										/>
									) : null}
									{message.poll ? <PollCard messageId={message.id} conversationId={message.conversationId} poll={message.poll} isSender={isSender} /> : null}
									{message.contact ? (
										<View style={styles.contactCard}>
											<View style={[styles.contactIcon, { backgroundColor: isSender ? "rgba(255,255,255,0.2)" : palette.brandSoft }]}>
												<Ionicons name="person" size={18} color={isSender ? palette.white : palette.brandDark} />
											</View>
											<View>
												<AppText variant="label" style={{ color: textColor }}>
													{message.contact.name}
												</AppText>
												{message.contact.phone || message.contact.email ? (
													<AppText variant="caption" style={{ color: isSender ? "rgba(255,255,255,0.8)" : palette.muted }}>
														{message.contact.phone ?? message.contact.email}
													</AppText>
												) : null}
											</View>
										</View>
									) : null}
									{message.text && !message.poll && !message.contact ? (
										searchQuery ? (
											<HighlightedText
												text={message.text}
												query={searchQuery}
												style={StyleSheet.flatten([styles.text, { color: textColor, fontSize: scaleFont(14) }])}
												highlightStyle={styles.searchHighlight}
											/>
										) : (
											<AppText variant="label" weight="regular" style={[styles.text, { color: textColor, fontSize: scaleFont(14), lineHeight: scaleFont(20) }]}>
												{message.text}
											</AppText>
										)
									) : null}
								</>
							)}
						</View>
						{message.reactions?.length ? (
							<View style={[styles.reactions, { backgroundColor: theme.colors.background }]}>
								{message.reactions.map((reaction) => (
									<AppText key={reaction.emoji} variant="caption">
										{reaction.emoji}
										{reaction.userIds.length > 1 ? ` ${reaction.userIds.length}` : ""}
									</AppText>
								))}
							</View>
						) : null}
						<View style={[styles.meta, isSender ? styles.alignEnd : styles.alignStart]}>
							{message.edited && !message.deletedForEveryone ? (
								<AppText variant="tiny" tone="muted">
									Edited ·
								</AppText>
							) : null}
							<AppText variant="tiny" tone="muted">
								{formatClock(message.timestamp)}
							</AppText>
							{isSender && !message.deletedForEveryone ? <StatusTicks status={message.status} /> : null}
						</View>
					</View>
				</Animated.View>
			</View>
		</GestureDetector>
	);
};

export default memo(MessageBubble);

const styles = StyleSheet.create({
	wrapper: { marginTop: 14 },
	grouped: { marginTop: 4 },
	row: { flexDirection: "row", gap: 12, maxWidth: "100%" },
	rowSender: { justifyContent: "flex-end", alignSelf: "flex-end" },
	rowReceiver: { justifyContent: "flex-start", alignSelf: "flex-start" },
	avatarSlot: { width: 40 },
	column: { maxWidth: "80%" },
	alignEnd: { alignItems: "flex-end" },
	alignStart: { alignItems: "flex-start" },
	replyIcon: { position: "absolute", left: 4, top: "50%", marginTop: -12 },
	senderName: { marginBottom: 8 },
	bubble: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
	senderBubble: { borderTopRightRadius: 0 },
	receiverBubble: { borderTopLeftRadius: 0 },
	stickerBubble: { backgroundColor: "transparent", paddingHorizontal: 0, paddingVertical: 0 },
	text: { flexShrink: 1 },
	deleted: { fontStyle: "italic" },
	quote: { borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6, gap: 2 },
	quoteSender: { backgroundColor: "rgba(255,255,255,0.15)", borderLeftColor: palette.white },
	quoteReceiver: { backgroundColor: "rgba(36,120,109,0.08)", borderLeftColor: palette.brandDark },
	contactCard: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 180 },
	contactIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
	reactions: {
		flexDirection: "row",
		gap: 4,
		marginTop: -8,
		marginHorizontal: 8,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 12,
		shadowColor: "#000",
		shadowOpacity: 0.12,
		shadowRadius: 3,
		shadowOffset: { width: 0, height: 1 },
		elevation: 2,
	},
	meta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
	systemRow: { alignItems: "center", marginVertical: 10 },
	systemPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, overflow: "hidden" },
	searchHighlight: { backgroundColor: "#FFF3B0", color: palette.ink },
});
