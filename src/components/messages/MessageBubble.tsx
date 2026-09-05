import { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
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
	onPressImage,
	onPressVideoNote,
	onSwipeReply,
}: {
	message: IMessage;
	avatar?: IAvatar;
	onPressImage?: (uri: string) => void;
	onPressVideoNote?: (uri: string) => void;
	onSwipeReply?: (message: IMessage) => void;
}) => {
	const isSender = message.type === "sender";
	const translateX = useSharedValue(0);
	const hasTriggeredHaptic = useRef(false);

	const triggerReply = () => onSwipeReply?.(message);
	const triggerHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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

	return (
		<GestureDetector gesture={swipeGesture}>
			<View>
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
						]}
					>
						{message.replyTo && (
							<View style={[styles.replyQuote, isSender ? styles.replyQuoteSender : styles.replyQuoteReceiver]}>
								<Text
									style={isSender ? styles.replyQuoteTextSender : styles.replyQuoteTextReceiver}
									numberOfLines={1}
								>
									{message.replyTo.text}
								</Text>
							</View>
						)}
						{message.attachment && (
							<AttachmentContent
								messageId={message.id}
								conversationId={message.conversationId}
								attachment={message.attachment}
								isSender={isSender}
								onPressImage={onPressImage}
								onPressVideoNote={onPressVideoNote}
							/>
						)}
						{!!message.text && (
							<Text style={isSender ? styles.senderText : styles.receiverText}>
								{message.text}
							</Text>
						)}
						<View style={styles.metaRow}>
							<Text style={isSender ? styles.senderTime : styles.receiverTime}>
								{formatTime(message.timestamp)}
							</Text>
							{isSender && <StatusTicks status={message.status} />}
						</View>
					</View>
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
});
