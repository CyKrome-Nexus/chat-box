import { useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	runOnJS,
	ZoomIn,
	ZoomOut,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { IMessage } from "@/src/interfaces/message-interface";
import { IAvatar } from "@/src/interfaces/list-interface";
import Avatar from "../images/Avatar";
import Colors from "@/src/constants/Colors";
import AttachmentContent from "./AttachmentContent";
import { IBubbleAnchor } from "./MessageActionsOverlay";

const SWIPE_REPLY_THRESHOLD = 56;
const SWIPE_REPLY_MAX = 84;

const formatTime = (timestamp: number) => {
	const date = new Date(timestamp);
	let hours = date.getHours();
	const minutes = date.getMinutes().toString().padStart(2, "0");
	const meridiem = hours >= 12 ? "PM" : "AM";
	hours = hours % 12 || 12;
	return `${hours}:${minutes} ${meridiem}`;
};

const StatusTicks = ({ status }: { status?: IMessage["status"] }) => {
	// Keyed entering/exiting so each status transition (clock -> sent ->
	// delivered -> read) animates in/out instead of just snapping.
	if (!status) {
		return (
			<Animated.View key="pending" entering={ZoomIn.duration(150)} exiting={ZoomOut.duration(100)}>
				<Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
			</Animated.View>
		);
	}

	if (status === "sent") {
		return (
			<Animated.View key="sent" entering={ZoomIn.duration(150)} exiting={ZoomOut.duration(100)}>
				<Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.8)" />
			</Animated.View>
		);
	}

	return (
		<Animated.View key={status} entering={ZoomIn.duration(150)} exiting={ZoomOut.duration(100)}>
			<Ionicons
				name="checkmark-done"
				size={14}
				color={status === "read" ? "#53BDEB" : "rgba(255,255,255,0.8)"}
			/>
		</Animated.View>
	);
};

const MessageBubble = ({
	message,
	avatar,
	onPressMedia,
	onPressVideoNote,
	onSwipeReply,
	onPressReplyQuote,
	onLongPressMessage,
	highlighted,
}: {
	message: IMessage;
	avatar?: IAvatar;
	onPressMedia?: (messageId: string) => void;
	onPressVideoNote?: (uri: string) => void;
	onSwipeReply?: (message: IMessage) => void;
	onPressReplyQuote?: (messageId: string) => void;
	onLongPressMessage?: (message: IMessage, anchor: IBubbleAnchor) => void;
	/** Brief flash after "jump to message" from a tapped reply quote. */
	highlighted?: boolean;
}) => {
	const isSender = message.type === "sender";
	const translateX = useSharedValue(0);
	const hasTriggeredHaptic = useRef(false);
	const bubbleRowRef = useRef<View>(null);

	const triggerReply = () => onSwipeReply?.(message);
	const triggerHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

	const triggerLongPress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		bubbleRowRef.current?.measureInWindow((x, y, width, height) => {
			onLongPressMessage?.(message, { x, y, width, height });
		});
	};

	const longPressGesture = Gesture.LongPress()
		.minDuration(350)
		.onStart(() => {
			runOnJS(triggerLongPress)();
		});

	const swipeGesture = Gesture.Pan()
		.activeOffsetX([10, 999])
		.failOffsetY([-12, 12])
		.onUpdate((e) => {
			// Rubber-band: linear up to the threshold, then heavily damped so it
			// keeps giving a little visual feedback without feeling like it'll
			// swipe away forever.
			const raw = Math.max(0, e.translationX);
			const damped =
				raw <= SWIPE_REPLY_THRESHOLD
					? raw
					: SWIPE_REPLY_THRESHOLD + (raw - SWIPE_REPLY_THRESHOLD) * 0.25;
			translateX.value = Math.min(SWIPE_REPLY_MAX, damped);

			if (translateX.value >= SWIPE_REPLY_THRESHOLD && !hasTriggeredHaptic.current) {
				hasTriggeredHaptic.current = true;
				runOnJS(triggerHaptic)();
			} else if (translateX.value < SWIPE_REPLY_THRESHOLD) {
				hasTriggeredHaptic.current = false;
			}
		})
		.onEnd(() => {
			if (translateX.value >= SWIPE_REPLY_THRESHOLD) {
				runOnJS(triggerReply)();
			}
			translateX.value = withSpring(0);
			hasTriggeredHaptic.current = false;
		});

	const rowAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }],
	}));
	const replyIconStyle = useAnimatedStyle(() => ({
		opacity: Math.min(1, translateX.value / SWIPE_REPLY_THRESHOLD),
		transform: [{ scale: 0.6 + 0.4 * Math.min(1, translateX.value / SWIPE_REPLY_THRESHOLD) }],
	}));

	const composedGesture = Gesture.Race(longPressGesture, swipeGesture);

	return (
		<GestureDetector gesture={composedGesture}>
			<View ref={bubbleRowRef} collapsable={false}>
				<Animated.View style={[styles.replyIcon, replyIconStyle]}>
					<Ionicons name="arrow-undo" size={18} color={Colors.focused} />
				</Animated.View>
				<Animated.View
					style={[
						styles.row,
						isSender ? styles.rowSender : styles.rowReceiver,
						rowAnimatedStyle,
					]}
				>
					{!isSender && <Avatar data={avatar} size={28} />}
					<View
						style={[
							styles.bubble,
							isSender ? styles.senderBubble : styles.receiverBubble,
							highlighted && styles.bubbleHighlighted,
						]}
					>
						{message.deletedForEveryone ? (
							<Text style={isSender ? styles.deletedTextSender : styles.deletedTextReceiver}>
								This message was deleted
							</Text>
						) : (
							<>
								{message.replyTo && (
									<TouchableOpacity
										onPress={() => onPressReplyQuote?.(message.replyTo!.messageId)}
										style={[styles.replyQuote, isSender ? styles.replyQuoteSender : styles.replyQuoteReceiver]}
									>
										<Text
											style={isSender ? styles.replyQuoteTextSender : styles.replyQuoteTextReceiver}
											numberOfLines={1}
										>
											{message.replyTo.text}
										</Text>
									</TouchableOpacity>
								)}
								{message.attachment && (
									<AttachmentContent
										messageId={message.id}
										conversationId={message.conversationId}
										attachment={message.attachment}
										isSender={isSender}
										onPressMedia={onPressMedia}
										onPressVideoNote={onPressVideoNote}
									/>
								)}
								{!!message.text && (
									<Text style={isSender ? styles.senderText : styles.receiverText}>
										{message.text}
									</Text>
								)}
								<View style={styles.metaRow}>
									{message.edited && (
										<Text style={isSender ? styles.senderTime : styles.receiverTime}>edited</Text>
									)}
									<Text style={isSender ? styles.senderTime : styles.receiverTime}>
										{formatTime(message.timestamp)}
									</Text>
									{isSender && <StatusTicks status={message.status} />}
								</View>
							</>
						)}
					</View>
					{message.reaction && (
						<View style={[styles.reactionBadge, isSender ? styles.reactionBadgeSender : styles.reactionBadgeReceiver]}>
							<Text style={styles.reactionBadgeText}>{message.reaction}</Text>
						</View>
					)}
				</Animated.View>
			</View>
		</GestureDetector>
	);
};

export default MessageBubble;

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "flex-end",
		gap: 8,
		marginVertical: 4,
		maxWidth: "100%",
	},
	rowSender: {
		justifyContent: "flex-end",
		alignSelf: "flex-end",
	},
	rowReceiver: {
		justifyContent: "flex-start",
		alignSelf: "flex-start",
	},
	replyIcon: {
		position: "absolute",
		left: 4,
		top: "50%",
		marginTop: -12,
	},
	bubble: {
		maxWidth: "78%",
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	senderBubble: {
		backgroundColor: Colors.focused,
		borderBottomRightRadius: 4,
	},
	receiverBubble: {
		backgroundColor: "#F2F8F7",
		borderBottomLeftRadius: 4,
	},
	senderText: {
		color: "#FFFFFF",
		fontSize: 16,
	},
	receiverText: {
		color: "#000E08",
		fontSize: 16,
	},
	replyQuote: {
		borderLeftWidth: 3,
		borderRadius: 6,
		paddingHorizontal: 8,
		paddingVertical: 4,
		marginBottom: 6,
	},
	replyQuoteSender: {
		backgroundColor: "rgba(255,255,255,0.15)",
		borderLeftColor: "#fff",
	},
	replyQuoteReceiver: {
		backgroundColor: "rgba(36,120,109,0.08)",
		borderLeftColor: Colors.focused,
	},
	replyQuoteTextSender: {
		color: "rgba(255,255,255,0.85)",
		fontSize: 13,
	},
	replyQuoteTextReceiver: {
		color: "#5B6260",
		fontSize: 13,
	},
	metaRow: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-end",
		gap: 4,
		marginTop: 4,
	},
	senderTime: {
		fontSize: 11,
		color: "rgba(255,255,255,0.8)",
	},
	receiverTime: {
		fontSize: 11,
		color: "#797C7B",
	},
	bubbleHighlighted: {
		borderWidth: 2,
		borderColor: Colors.focused,
	},
	deletedTextSender: {
		color: "rgba(255,255,255,0.75)",
		fontSize: 14,
		fontStyle: "italic",
	},
	deletedTextReceiver: {
		color: "#797C7B",
		fontSize: 14,
		fontStyle: "italic",
	},
	reactionBadge: {
		position: "absolute",
		bottom: -10,
		backgroundColor: "#fff",
		borderRadius: 10,
		paddingHorizontal: 4,
		paddingVertical: 1,
		shadowColor: "#000",
		shadowOpacity: 0.15,
		shadowRadius: 3,
		shadowOffset: { width: 0, height: 1 },
		elevation: 2,
	},
	reactionBadgeSender: {
		right: 6,
	},
	reactionBadgeReceiver: {
		left: 34,
	},
	reactionBadgeText: {
		fontSize: 12,
	},
});
